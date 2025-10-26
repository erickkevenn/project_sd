"""
API Gateway Principal - Versão Refatorada
Implementa arquitetura limpa e padrões de código limpo
"""
import os
import logging
import mimetypes

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

# Imports locais
from config import get_config
from middleware import setup_middleware, protocol_selector
from services import ServiceClient, HealthChecker, GrpcClient
from security import (
    require_auth, require_permission, require_role, validate_json,
    LoginSchema, DocumentSchema, DeadlineSchema, HearingSchema,
    authenticate_user, generate_token, log_security_event,
    RegisterSchema, ProcessSchema
)
from exceptions import GatewayException

# Configuração
config = get_config()
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UI_DIR = os.path.join(BASE_DIR, "ui")

def create_app():
    """Factory function para criar a aplicação Flask"""
    app = Flask(__name__)
    
    # Configuração da aplicação
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['DEBUG'] = config.DEBUG
    
    # Configuração de logging
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL),
        format=config.LOG_FORMAT
    )
    
    # CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": config.ALLOWED_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Correlation-ID"]
        },
        r"/ui": {"origins": config.ALLOWED_ORIGINS},
        r"/health": {"origins": config.ALLOWED_ORIGINS}
    })
    
    # Rate Limiting
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=config.DEFAULT_RATE_LIMITS,
        storage_uri=config.RATE_LIMIT_STORAGE
    )
    limiter.init_app(app)
    
    # Security Headers
    talisman = Talisman(
        app,
        force_https=config.FORCE_HTTPS,
        strict_transport_security=config.STRICT_TRANSPORT_SECURITY,
        content_security_policy=config.CSP_POLICY
    )
    
    # Middleware
    setup_middleware(app)
    
    # Serviços
    service_client = ServiceClient()
    grpc_client = GrpcClient()
    health_checker = HealthChecker(service_client)
    
    # Registra rotas
    register_routes(app, service_client, grpc_client, health_checker, limiter)
    
    return app

def register_routes(app, service_client, grpc_client, health_checker, limiter):
    """Registra todas as rotas da aplicação"""
    
    # === Rotas de UI ===
    @app.route("/")
    def root():
        """Redireciona para a UI"""
        return send_from_directory(UI_DIR, "index.html")
    
    @app.route("/ui")
    def ui():
        """Serve a interface de usuário"""
        return send_from_directory(UI_DIR, "index.html")
    
    @app.route("/ui/<path:filename>")
    def ui_static(filename):
        """Serve arquivos estáticos da UI (CSS, JS, etc.)"""

        # Determina o tipo MIME baseado na extensão do arquivo
        mimetype = mimetypes.guess_type(filename)[0]
        if filename.endswith('.css'):
            mimetype = 'text/css'
        elif filename.endswith('.js'):
            mimetype = 'application/javascript'
        
        response = send_from_directory(UI_DIR, filename)
        if mimetype:
            response.headers['Content-Type'] = mimetype
        
        return response
    
    @app.route("/favicon.ico")
    def favicon():
        """Favicon vazio"""
        return "", 204
    
    # === Rotas de Health Check ===
    @app.route("/health")
    def health():
        """Endpoint de health check"""
        try:
            # Modo rápido: não consulta os serviços dependentes
            if request.args.get('fast', '0') in ('1', 'true', 'yes'):
                return jsonify({
                    "status": "healthy",
                    "mode": "fast",
                    "services": list(service_client.services.keys())
                }), 200

            health_info = health_checker.check_all_services()
            
            # Adiciona informações sobre gRPC se disponível
            try:
                if grpc_client.is_available():
                    health_info["grpc"] = {
                        "status": "available",
                        "services": list(grpc_client.channels.keys())
                    }
                else:
                    health_info["grpc"] = {"status": "unavailable"}
            except Exception:
                health_info["grpc"] = {"status": "unavailable"}
            
            status_code = 200 if health_info["status"] == "healthy" else 503
            return jsonify(health_info), status_code
        except Exception as e:
            log_security_event("HEALTH_CHECK_ERROR", f"Health check failed: {str(e)}")
            return jsonify({
                "status": "error",
                "message": "Health check failed",
                "error": str(e)
            }), 500
    
    # === Rotas de Autenticação ===
    @app.post("/api/auth/register")
    @limiter.limit(config.LOGIN_RATE_LIMIT)
    @validate_json(RegisterSchema)
    def register():
        """Cadastro de usuário (delegado ao serviço Auth)"""
        try:
            response_data, status_code = service_client.forward_request(
                "auth", "POST", "/auth/register", json_body=request.validated_data
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    @app.post("/api/auth/login")
    @limiter.limit(config.LOGIN_RATE_LIMIT)
    @validate_json(LoginSchema)
    def login():
        """Endpoint de login com autenticação"""
        try:
            data = request.validated_data
            username = data['username']
            password = data['password']
            
            # Delegar autenticação ao serviço Auth
            auth_resp, auth_status = service_client.forward_request(
                "auth", "POST", "/auth/login", json_body={"username": username, "password": password}
            )
            if auth_status != 200:
                log_security_event("LOGIN_FAILED", f"Failed login attempt for {username} from {request.remote_addr}")
                return jsonify({"error": "Invalid credentials"}), 401

            user_info = auth_resp.get("user", {"roles": [], "permissions": []})

            # Gera token JWT localmente (gateway emite JWT)
            token = generate_token(username, user_info.get('roles', []), user_info.get('permissions', []))
            
            log_security_event("LOGIN_SUCCESS", f"Successful login for {username} from {request.remote_addr}")
            
            return jsonify({
                "token": token,
                "user": {
                    "username": username,
                    "roles": user_info.get('roles', []),
                    "permissions": user_info.get('permissions', [])
                }
            }), 200
            
        except Exception as e:
            log_security_event("LOGIN_ERROR", f"Login error: {str(e)}")
            return jsonify({"error": "Login failed"}), 500
    
    @app.get("/api/auth/me")
    @require_auth
    def get_current_user():
        """Retorna informações do usuário atual"""
        return jsonify({
            "user": {
                "username": request.current_user['username'],
                "roles": request.current_user['roles'],
                "permissions": request.current_user['permissions']
            }
        }), 200
    
    # === Rotas de Documentos ===
    @app.get("/api/documents")
    @require_auth
    @require_permission("read")
    @protocol_selector()
    @limiter.limit("30 per minute")
    def list_documents():
        """Lista todos os documentos"""
        try:
            # Verifica se deve usar gRPC
            if getattr(request, 'prefer_grpc', False) and grpc_client.is_available('documents'):
                response_data, status_code = grpc_client.call_service(
                    "documents", "ListItems", {"limit": 100, "offset": 0}
                )
            else:
                response_data, status_code = service_client.forward_request(
                    "documents", "GET", "/documents"
                )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.post("/api/documents")
    @require_auth
    @require_permission("write")
    @validate_json(DocumentSchema)
    @protocol_selector()
    @limiter.limit("10 per minute")
    def create_document():
        """Cria um novo documento"""
        try:
            # Verifica se deve usar gRPC
            if getattr(request, 'prefer_grpc', False) and grpc_client.is_available('documents'):
                response_data, status_code = grpc_client.call_service(
                    "documents", "CreateItem", request.validated_data
                )
            else:
                response_data, status_code = service_client.forward_request(
                    "documents", "POST", "/documents", json_body=request.validated_data
                )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.get("/api/documents/<doc_id>")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def get_document(doc_id):
        """Obtém um documento específico"""
        try:
            response_data, status_code = service_client.forward_request(
                "documents", "GET", f"/documents/{doc_id}"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.delete("/api/documents/<doc_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_document(doc_id):
        """Remove um documento específico"""
        try:
            response_data, status_code = service_client.forward_request(
                "documents", "DELETE", f"/documents/{doc_id}"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    # === Rotas de Prazos ===
    @app.get("/api/deadlines")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_deadlines():
        """Lista todos os prazos"""
        try:
            response_data, status_code = service_client.forward_request(
                "deadlines", "GET", "/deadlines"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.post("/api/deadlines")
    @require_auth
    @require_permission("write")
    @validate_json(DeadlineSchema)
    @limiter.limit("10 per minute")
    def create_deadline():
        """Cria um novo prazo"""
        try:
            response_data, status_code = service_client.forward_request(
                "deadlines", "POST", "/deadlines", json_body=request.validated_data
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.get("/api/deadlines/today")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def deadlines_today():
        """Lista prazos de hoje"""
        try:
            response_data, status_code = service_client.forward_request(
                "deadlines", "GET", "/deadlines/today"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.delete("/api/deadlines/<deadline_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_deadline(deadline_id):
        """Remove um prazo específico"""
        try:
            response_data, status_code = service_client.forward_request(
                "deadlines", "DELETE", f"/deadlines/{deadline_id}"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    # === Rotas de Audiências ===
    @app.get("/api/hearings")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_hearings():
        """Lista audiências com filtros opcionais"""
        try:
            response_data, status_code = service_client.forward_request(
                "hearings", "GET", "/hearings", params=request.args
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code

    # === Rotas de Processos ===
    @app.get("/api/processes")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_processes():
        try:
            response_data, status_code = service_client.forward_request(
                "processes", "GET", "/processes"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code

    @app.post("/api/processes")
    @require_auth
    @require_permission("write")
    @validate_json(ProcessSchema)
    @limiter.limit("10 per minute")
    def create_process():
        try:
            response_data, status_code = service_client.forward_request(
                "processes", "POST", "/processes", json_body=request.validated_data
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code

    @app.get("/api/processes/<proc_id>")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def get_process(proc_id):
        try:
            response_data, status_code = service_client.forward_request(
                "processes", "GET", f"/processes/{proc_id}"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code

    @app.put("/api/processes/<proc_id>")
    @require_auth
    @require_permission("write")
    @validate_json(ProcessSchema)
    @limiter.limit("10 per minute")
    def update_process(proc_id):
        try:
            response_data, status_code = service_client.forward_request(
                "processes", "PUT", f"/processes/{proc_id}", json_body=request.validated_data
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code

    @app.delete("/api/processes/<proc_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_process(proc_id):
        try:
            response_data, status_code = service_client.forward_request(
                "processes", "DELETE", f"/processes/{proc_id}"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.get("/api/hearings/today")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def hearings_today():
        """Lista audiências de hoje"""
        try:
            response_data, status_code = service_client.forward_request(
                "hearings", "GET", "/hearings/today"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.post("/api/hearings")
    @require_auth
    @require_permission("write")
    @validate_json(HearingSchema)
    @limiter.limit("10 per minute")
    def create_hearing():
        """Cria uma nova audiência"""
        try:
            response_data, status_code = service_client.forward_request(
                "hearings", "POST", "/hearings", json_body=request.validated_data
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    @app.delete("/api/hearings/<hearing_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_hearing(hearing_id):
        """Remove uma audiência específica"""
        try:
            response_data, status_code = service_client.forward_request(
                "hearings", "DELETE", f"/hearings/{hearing_id}"
            )
            return jsonify(response_data), status_code
        except GatewayException as e:
            return jsonify({"error": e.message}), e.status_code
    
    # === Rotas de Orquestração ===
    @app.get("/api/process/<proc_id>/summary")
    @require_auth
    @require_permission("read")
    @limiter.limit("20 per minute")
    def process_summary(proc_id):
        """Obtém resumo de um processo (orquestração)"""
        try:
            # Busca dados em paralelo de todos os serviços
            results = {}
            
            # Documentos do processo
            try:
                docs_data, docs_status = service_client.forward_request(
                    "documents", "GET", "/documents", params={"process_id": proc_id}
                )
                results["documents"] = docs_data if docs_status == 200 else []
            except:
                results["documents"] = []
            
            # Prazos do processo
            try:
                deadlines_data, deadlines_status = service_client.forward_request(
                    "deadlines", "GET", "/deadlines", params={"process_id": proc_id}
                )
                results["deadlines"] = deadlines_data if deadlines_status == 200 else []
            except:
                results["deadlines"] = []
            
            # Audiências do processo
            try:
                hearings_data, hearings_status = service_client.forward_request(
                    "hearings", "GET", "/hearings", params={"process_id": proc_id}
                )
                results["hearings"] = hearings_data if hearings_status == 200 else []
            except:
                results["hearings"] = []
            
            return jsonify({
                "process_id": proc_id,
                "summary": results
            }), 200
            
        except Exception as e:
            log_security_event("ORCHESTRATION_ERROR", f"Process summary error: {str(e)}")
            return jsonify({"error": "Failed to get process summary"}), 500
    
    @app.post("/api/orchestrate/file-case")
    @require_auth
    @require_permission("orchestrate")
    @limiter.limit("5 per minute")
    def orchestrate_file_case():
        """Orquestra criação de caso completo"""
        try:
            payload = request.get_json(force=True)
            results = {}
            
            # Cria documento
            if "document" in payload:
                try:
                    doc_data, doc_status = service_client.forward_request(
                        "documents", "POST", "/documents", json_body=payload["document"]
                    )
                    results["document"] = {"status": doc_status, "data": doc_data}
                except Exception as e:
                    results["document"] = {"status": "error", "error": str(e)}
            
            # Cria prazo
            if "deadline" in payload:
                try:
                    deadline_data, deadline_status = service_client.forward_request(
                        "deadlines", "POST", "/deadlines", json_body=payload["deadline"]
                    )
                    results["deadline"] = {"status": deadline_status, "data": deadline_data}
                except Exception as e:
                    results["deadline"] = {"status": "error", "error": str(e)}
            
            # Cria audiência
            if "hearing" in payload:
                try:
                    hearing_data, hearing_status = service_client.forward_request(
                        "hearings", "POST", "/hearings", json_body=payload["hearing"]
                    )
                    results["hearing"] = {"status": hearing_status, "data": hearing_data}
                except Exception as e:
                    results["hearing"] = {"status": "error", "error": str(e)}
            
            log_security_event("ORCHESTRATION_SUCCESS", f"Case filed successfully")
            
            return jsonify({
                "status": "ok",
                "message": "Case orchestration completed",
                "results": results
            }), 200
            
        except Exception as e:
            log_security_event("ORCHESTRATION_ERROR", f"Orchestration failed: {str(e)}")
            return jsonify({"error": "Orchestration failed"}), 500
    
    # === Rotas de Desenvolvimento ===
    @app.post("/api/seed")
    @limiter.limit("2 per minute")
    def seed_demo():
        """Endpoint para popular dados de exemplo (apenas desenvolvimento)"""
        if not config.DEBUG:
            return jsonify({"error": "Seed endpoint disabled in production"}), 403
        
        try:
            # Dados de exemplo
            sample_data = {
                "documents": [
                    {"title": "Petição Inicial", "content": "Conteúdo da petição...", "author": "Dr. Silva"},
                    {"title": "Contestação", "content": "Conteúdo da contestação...", "author": "Dr. Santos"}
                ],
                "deadlines": [
                    {"process_id": "PROC-001", "due_date": "2025-12-31", "description": "Prazo para recurso"},
                    {"process_id": "PROC-002", "due_date": "2025-11-15", "description": "Prazo para manifestação"}
                ],
                "hearings": [
                    {"process_id": "PROC-001", "date": "2025-10-15", "courtroom": "Sala 1", "description": "Audiência de instrução"},
                    {"process_id": "PROC-002", "date": "2025-11-20", "courtroom": "Sala 2", "description": "Audiência de conciliação"}
                ]
            }
            
            results = {}
            
            # Popula cada serviço
            for service_name, items in sample_data.items():
                results[service_name] = []
                for item in items:
                    try:
                        response_data, status_code = service_client.forward_request(
                            service_name, "POST", f"/{service_name}", json_body=item
                        )
                        results[service_name].append({"status": status_code, "data": response_data})
                    except Exception as e:
                        results[service_name].append({"status": "error", "error": str(e)})
            
            log_security_event("SEED_DATA", "Demo data seeded successfully")
            
            return jsonify({
                "message": "Demo data seeded successfully",
                "results": results
            }), 200
            
        except Exception as e:
            log_security_event("SEED_ERROR", f"Seed failed: {str(e)}")
            return jsonify({"error": "Failed to seed demo data"}), 500

# Instância da aplicação
app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=config.GATEWAY_PORT,
        debug=config.DEBUG
    )
