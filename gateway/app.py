"""
API Gateway Principal - Versão Refatorada
Implementa arquitetura limpa e padrões de código limpo
"""
import os
import logging
import mimetypes

import requests

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

# Imports locais
from config import get_config
from middleware import setup_middleware, protocol_selector
from services import ServiceClient, HealthChecker
from security import (
    require_auth, require_permission, require_role, validate_json,
    LoginSchema, log_security_event
)
from exceptions import GatewayException

# Importa schemas do módulo compartilhado
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.validation import DocumentSchema, DeadlineSchema, HearingSchema, ProcessSchema

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
    
    CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"], "allow_headers": "*"}})
    
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
    health_checker = HealthChecker()
    service_client = ServiceClient()
    
    # Registra rotas
    register_routes(app, health_checker, limiter, service_client)
    
    return app

def register_routes(app, health_checker, limiter, service_client):
    """Registra todas as rotas da aplicação"""

    def forward_request(service_name, path, method="GET", json_data=None, params=None):
        """Forwards a request to a microservice."""
        try:
            url = f"{config.SERVICES[service_name]}{path}"
            headers = {}
            if 'Authorization' in request.headers:
                headers['Authorization'] = request.headers['Authorization']

            response = requests.request(
                method,
                url,
                json=json_data,
                params=params,
                headers=headers,
                timeout=config.REQUEST_TIMEOUT
            )
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            log_security_event("SERVICE_ERROR", f"Error calling {service_name}: {str(e)}")
            return jsonify({"error": f"Error calling {service_name}"}), 502
    
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
            health_info = health_checker.check_all_services()
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
    @app.route("/api/<path:path>", methods=['OPTIONS'])
    def handle_options(path):
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin'))
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH')
        return response

    @app.post("/api/auth/login")
    @limiter.limit(config.LOGIN_RATE_LIMIT)
    @validate_json(LoginSchema)
    def login():
        """Endpoint de login com autenticação"""
        try:
            # Transforma os dados para o formato esperado pelo serviço de autenticação
            auth_data = {
                "login": request.validated_data["username"],
                "senha": request.validated_data["password"]
            }
            response = requests.post(f"{config.SERVICES['auth']}/login", json=auth_data)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            log_security_event("LOGIN_ERROR", f"Login error: {str(e)}")
            return jsonify({"error": "Login failed"}), 500
    
    @app.get("/api/auth/me")
    @require_auth
    def get_current_user():
        """Retorna informações do usuário atual"""
        try:
            headers = {'Authorization': request.headers.get('Authorization')}
            response = requests.get(f"{config.SERVICES['auth']}/me", headers=headers)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            log_security_event("AUTH_ME_ERROR", f"Error getting current user: {str(e)}")
            return jsonify({"error": "Failed to get user information"}), 500
    
    # === Rotas de Processos ===
    @app.get("/api/processes")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_processes():
        """Lista todos os processos"""
        return forward_request("processes", "/processes", params=request.args)

    @app.post("/api/processes")
    @require_auth
    @require_permission("write")
    @validate_json(ProcessSchema)
    @limiter.limit("10 per minute")
    def create_process():
        """Cria um novo processo"""
        return forward_request("processes", "/processes", method="POST", json_data=request.validated_data)

    @app.get("/api/processes/<process_id>")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def get_process(process_id):
        """Obtém um processo específico"""
        return forward_request("processes", f"/processes/{process_id}")

    @app.put("/api/processes/<process_id>")
    @require_auth
    @require_permission("write")
    @validate_json(ProcessSchema)
    @limiter.limit("10 per minute")
    def update_process(process_id):
        """Atualiza um processo"""
        return forward_request("processes", f"/processes/{process_id}", method="PUT", json_data=request.validated_data)

    @app.delete("/api/processes/<process_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_process(process_id):
        """Remove um processo específico"""
        return forward_request("processes", f"/processes/{process_id}", method="DELETE")

    # === Rotas de Documentos ===
    @app.get("/api/documents")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_documents():
        """Lista todos os documentos"""
        return forward_request("documents", "/documents", params=request.args)
    
    @app.post("/api/documents")
    @require_auth
    @require_permission("write")
    @validate_json(DocumentSchema)
    @limiter.limit("10 per minute")
    def create_document():
        """Cria um novo documento"""
        return forward_request("documents", "/documents", method="POST", json_data=request.validated_data)
    
    @app.get("/api/documents/<doc_id>")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def get_document(doc_id):
        """Obtém um documento específico"""
        return forward_request("documents", f"/documents/{doc_id}")
    
    @app.delete("/api/documents/<doc_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_document(doc_id):
        """Remove um documento específico"""
        return forward_request("documents", f"/documents/{doc_id}", method="DELETE")
    
    # === Rotas de Prazos ===
    @app.get("/api/deadlines")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_deadlines():
        """Lista todos os prazos"""
        return forward_request("deadlines", "/deadlines")
    

    
    @app.get("/api/deadlines/today")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def deadlines_today():
        """Lista prazos de hoje"""
        return forward_request("deadlines", "/deadlines/today")
    

    
    # === Rotas de Audiências ===
    @app.get("/api/hearings")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def list_hearings():
        """Lista audiências com filtros opcionais"""
        return forward_request("hearings", "/hearings", params=request.args)
    
    @app.get("/api/hearings/today")
    @require_auth
    @require_permission("read")
    @limiter.limit("30 per minute")
    def hearings_today():
        """Lista audiências de hoje"""
        return forward_request("hearings", "/hearings/today")
    
    @app.post("/api/hearings")
    @require_auth
    @require_permission("write")
    @validate_json(HearingSchema)
    @limiter.limit("10 per minute")
    def create_hearing():
        """Cria uma nova audiência"""
        return forward_request("hearings", "/hearings", method="POST", json_data=request.validated_data)
    
    @app.delete("/api/hearings/<hearing_id>")
    @require_auth
    @require_permission("delete")
    @limiter.limit("10 per minute")
    def delete_hearing(hearing_id):
        """Remove uma audiência específica"""
        return forward_request("hearings", f"/hearings/{hearing_id}", method="DELETE")
    
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
