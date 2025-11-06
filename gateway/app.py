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
    RegisterSchema, ProcessSchema, CreateUserSchema
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
    @limiter.exempt
    def root():
        """Redireciona para a UI"""
        return send_from_directory(UI_DIR, "index.html")
    
    @app.route("/ui")
    @limiter.exempt
    def ui():
        """Serve a interface de usuário"""
        return send_from_directory(UI_DIR, "index.html")
    
    @app.route("/ui/<path:filename>")
    @limiter.exempt
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
    @limiter.exempt
    def favicon():
        """Serve favicon (logo.svg)"""
        return send_from_directory(UI_DIR, "logo.svg", mimetype='image/svg+xml')
    
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
    
    # Admin cria usuários do escritório
    @app.post("/api/users")
    @require_auth
    @require_role("admin")
    @validate_json(CreateUserSchema)
    def create_user():
        try:
            payload = dict(request.validated_data)
            # força associação ao mesmo escritório do admin logado
            payload["office_id"] = request.current_user.get("office_id")
            response_data, status_code = service_client.forward_request(
                "auth", "POST", "/auth/users", json_body=payload
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
            email = data['email']
            password = data['password']
            
            # Delegar autenticação ao serviço Auth
            auth_resp, auth_status = service_client.forward_request(
                "auth", "POST", "/auth/login", json_body={"email": email, "password": password}
            )
            if auth_status != 200:
                log_security_event("LOGIN_FAILED", f"Failed login attempt for {email} from {request.remote_addr}")
                return jsonify({"error": "Invalid credentials"}), 401

            user_info = auth_resp.get("user", {"roles": [], "permissions": []})

            # Gera token JWT localmente (gateway emite JWT)
            token = generate_token(
                email,
                user_info.get('roles', []),
                user_info.get('permissions', []),
                user_info.get('office_id'),
                user_info.get('name'),
                user_info.get('user_type')
            )
            
            log_security_event("LOGIN_SUCCESS", f"Successful login for {email} from {request.remote_addr}")
            
            return jsonify({
                "token": token,
                "user": {
                    "email": email,
                    "username": email.split('@')[0],  # Compatibility
                    "name": user_info.get('name', email.split('@')[0]),
                    "roles": user_info.get('roles', []),
                    "permissions": user_info.get('permissions', []),
                    "office_id": user_info.get('office_id'),
                    "office": user_info.get('office', email.split('@')[1]),
                    "user_type": user_info.get('user_type')
                }
            }), 200
            
        except Exception as e:
            log_security_event("LOGIN_ERROR", f"Login error: {str(e)}")
            return jsonify({"error": "Login failed"}), 500
    
    @app.get("/api/auth/me")
    @require_auth
    def get_current_user():
        """Retorna informações do usuário atual"""
        user_data = {
            "email": request.current_user.get('email'),
            "name": request.current_user.get('name'),
            "user_type": request.current_user.get('user_type'),
            "roles": request.current_user.get('roles', []),
            "permissions": request.current_user.get('permissions', []),
            "office_id": request.current_user.get('office_id')
        }
        
        # Buscar nome do escritório
        office_id = request.current_user.get('office_id')
        if office_id:
            try:
                office_resp, office_status = service_client.forward_request(
                    "auth", "GET", f"/offices/{office_id}"
                )
                if office_status == 200 and office_resp:
                    user_data['office'] = office_resp.get('name') or office_resp.get('office_name') or 'Escritório'
            except Exception as e:
                log_security_event("OFFICE_INFO_ERROR", f"Failed to load office info: {str(e)}")
                user_data['office'] = 'Escritório'
        
        return jsonify({"user": user_data}), 200
    
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
            # Valida obrigatoriedade de `process_id` e existência do processo
            process_id = request.validated_data.get('process_id')
            if not process_id:
                return jsonify({"error": "Field 'process_id' is required to create a document"}), 400

            # Usa função helper para validar processo
            exists, proc_data, error = service_client.validate_process_exists(process_id)
            if not exists:
                return jsonify(error[0]), error[1]

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
    
    @app.put("/api/documents/<doc_id>")
    @require_auth
    @require_permission("write")
    @limiter.limit("10 per minute")
    def update_document(doc_id):
        """Atualiza um documento"""
        try:
            payload = request.get_json(force=True)
            response_data, status_code = service_client.forward_request(
                "documents", "PUT", f"/documents/{doc_id}", json_body=payload
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
            # Valida presence de process_id
            process_id = request.validated_data.get('process_id')
            if not process_id:
                return jsonify({"error": "Field 'process_id' is required to create a deadline"}), 400

            # Usa função helper para validar processo
            exists, proc_data, error = service_client.validate_process_exists(process_id)
            if not exists:
                return jsonify(error[0]), error[1]

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
            # Valida presence de process_id
            process_id = request.validated_data.get('process_id')
            if not process_id:
                return jsonify({"error": "Field 'process_id' is required to create a hearing"}), 400

            # Usa função helper para validar processo
            exists, proc_data, error = service_client.validate_process_exists(process_id)
            if not exists:
                return jsonify(error[0]), error[1]

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
            # Helper: gera próximo número de processo no padrão PROC-XXX
            def generate_next_process_number() -> str:
                try:
                    procs, status = service_client.forward_request("processes", "GET", "/processes")
                    if status == 200 and isinstance(procs, list):
                        nums = []
                        for p in procs:
                            n = (p.get("number") or "")
                            if isinstance(n, str) and n.upper().startswith("PROC-") and n[5:].isdigit():
                                nums.append(int(n[5:]))
                        next_num = (max(nums) + 1) if nums else 1
                        return f"PROC-{next_num:03d}"
                except Exception:
                    pass
                return "PROC-001"

            # Se há definição de processo no payload, cria o processo primeiro (garantindo número válido)
            used_process_number = None
            process_payload = payload.get("process") if isinstance(payload.get("process"), dict) else None
            try:
                # Define número inicial (do payload se válido; senão, próximo disponível do escritório)
                def next_from(base: str) -> str:
                    try:
                        n = int(base[5:])
                        return f"PROC-{n+1:03d}"
                    except Exception:
                        return generate_next_process_number()

                desired_number = None
                if process_payload:
                    candidate = str(process_payload.get("number", "")).strip().upper()
                    if candidate.startswith("PROC-") and candidate[5:].isdigit():
                        desired_number = candidate
                if not desired_number:
                    desired_number = generate_next_process_number()

                attempts = 0
                max_attempts = 20
                last_error = None
                while attempts < max_attempts and used_process_number is None:
                    body = {
                        "number": desired_number,
                        "title": process_payload.get("title") if process_payload and process_payload.get("title") else f"Processo {desired_number}",
                        "description": process_payload.get("description", "") if process_payload else "",
                    }

                    proc_data, proc_status = service_client.forward_request(
                        "processes", "POST", "/processes", json_body=body
                    )
                    if proc_status == 201 and isinstance(proc_data, dict):
                        used_process_number = proc_data.get('number') or desired_number
                        results['process'] = {"status": proc_status, "data": proc_data}
                        break
                    if proc_status == 409:
                        # Número global já existe (talvez em outro escritório) → incrementa e tenta de novo
                        desired_number = next_from(desired_number)
                        attempts += 1
                        continue
                    # Outro erro
                    last_error = {"status": proc_status, "data": proc_data}
                    break

                if used_process_number is None:
                    results['process'] = last_error or {"status": "error", "data": {"error": "Failed to create process"}}
            except Exception as e:
                # Se criação falhar completamente, ainda podemos tentar seguir caso itens tragam process_id válido
                results['process'] = {"status": "error", "error": str(e)}

            # Helper: valida/normaliza NÚMERO do processo para criação de recursos
            def resolve_and_validate_process_number(item: dict):
                nonlocal used_process_number
                pid = item.get('process_id') or used_process_number
                if not pid:
                    return None, ({"error": "Field 'process_id' is required for related items"}, 400)
                try:
                    # Se parece um número (PROC-xxx), valida via by-number
                    if isinstance(pid, str) and pid.strip().upper().startswith('PROC-'):
                        number = pid.strip().upper()
                        pr, ps = service_client.forward_request("processes", "GET", f"/processes/by-number/{number}")
                        if ps != 200:
                            return None, ({"error": f"Process '{number}' not found"}, 404)
                        used_process_number = number
                        return number, (None, None)
                    # Caso contrário, tenta tratar como ID interno e obter o número
                    pr, ps = service_client.forward_request("processes", "GET", f"/processes/{pid}")
                    if ps != 200 or not isinstance(pr, dict) or not pr.get('number'):
                        return None, ({"error": "Associated process not found"}, 404)
                    used_process_number = pr.get('number')
                    return used_process_number, (None, None)
                except Exception:
                    return None, ({"error": "Failed to validate process existence"}, 503)

            # Cria documento
            if "document" in payload:
                try:
                    doc_item = payload["document"]
                    pid, err = resolve_and_validate_process_number(doc_item)
                    if err[0] is not None:
                        results["document"] = {"status": err[1], "data": err[0]}
                    else:
                        # Garante que o documento use o NÚMERO do processo
                        doc_item["process_id"] = used_process_number
                        # Define autor como usuário logado se ausente ou genérico
                        try:
                            current_user = getattr(request, 'current_user', {}) or {}
                            default_author = current_user.get('name') or current_user.get('email') or "Usuário"
                            if not doc_item.get("author") or str(doc_item.get("author")).strip().lower() in ("sistema", "system"):
                                doc_item["author"] = default_author
                        except Exception:
                            pass
                        doc_data, doc_status = service_client.forward_request(
                            "documents", "POST", "/documents", json_body=doc_item
                        )
                        results["document"] = {"status": doc_status, "data": doc_data}
                except Exception as e:
                    results["document"] = {"status": "error", "error": str(e)}

            # Cria prazo
            if "deadline" in payload:
                try:
                    dl_item = payload["deadline"]
                    pid, err = resolve_and_validate_process_number(dl_item)
                    if err[0] is not None:
                        results["deadline"] = {"status": err[1], "data": err[0]}
                    else:
                        dl_item["process_id"] = used_process_number
                        deadline_data, deadline_status = service_client.forward_request(
                            "deadlines", "POST", "/deadlines", json_body=dl_item
                        )
                        results["deadline"] = {"status": deadline_status, "data": deadline_data}
                except Exception as e:
                    results["deadline"] = {"status": "error", "error": str(e)}

            # Cria audiência
            if "hearing" in payload:
                try:
                    hr_item = payload["hearing"]
                    pid, err = resolve_and_validate_process_number(hr_item)
                    if err[0] is not None:
                        results["hearing"] = {"status": err[1], "data": err[0]}
                    else:
                        hr_item["process_id"] = used_process_number
                        hearing_data, hearing_status = service_client.forward_request(
                            "hearings", "POST", "/hearings", json_body=hr_item
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
