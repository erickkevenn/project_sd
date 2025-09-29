"""
Middleware e decoradores para o API Gateway
"""

from functools import wraps
from flask import request, jsonify, current_app
import logging

from exceptions import GatewayException
from security import log_security_event

logger = logging.getLogger(__name__)

def error_handler(app):
    """Registra handlers de erro globais"""
    
    @app.errorhandler(GatewayException)
    def handle_gateway_exception(error):
        """Handler para exceções customizadas do Gateway"""
        log_security_event("GATEWAY_ERROR", f"{error.__class__.__name__}: {error.message}")
        
        response = {
            "error": error.message,
            "status_code": error.status_code
        }
        
        if error.details:
            response["details"] = error.details
        
        return jsonify(response), error.status_code
    
    @app.errorhandler(429)
    def handle_rate_limit(error):
        """Handler para rate limit"""
        log_security_event("RATE_LIMIT_EXCEEDED", f"Rate limit exceeded from {request.remote_addr}")
        return jsonify({
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later."
        }), 429
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handler para endpoints não encontrados"""
        return jsonify({
            "error": "Endpoint not found",
            "message": f"The requested endpoint {request.path} was not found."
        }), 404
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handler para erros internos"""
        log_security_event("INTERNAL_ERROR", f"Internal server error: {str(error)}")
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later."
        }), 500

def request_logging(app):
    """Middleware para logging de requisições"""
    
    @app.before_request
    def log_request():
        """Log da requisição recebida"""
        logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")
        
        # Log de headers importantes (sem dados sensíveis)
        important_headers = ['User-Agent', 'X-Correlation-ID', 'Content-Type']
        headers_info = {k: v for k, v in request.headers.items() if k in important_headers}
        
        if headers_info:
            logger.debug(f"Headers: {headers_info}")
    
    @app.after_request
    def log_response(response):
        """Log da resposta enviada"""
        logger.info(f"Response: {response.status_code} for {request.method} {request.path}")
        return response

def cors_headers(app):
    """Middleware para headers CORS customizados"""
    
    @app.after_request
    def add_cors_headers(response):
        """Adiciona headers CORS customizados se necessário"""
        # Headers já são gerenciados pelo Flask-CORS, mas podemos adicionar customizações aqui
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response

def security_headers(app):
    """Middleware para headers de segurança adicionais"""
    
    @app.after_request
    def add_security_headers(response):
        """Adiciona headers de segurança"""
        # Headers já são gerenciados pelo Flask-Talisman, mas podemos adicionar extras
        response.headers['X-API-Version'] = '1.0'
        response.headers['X-RateLimit-Remaining'] = getattr(request, 'rate_limit_remaining', 'N/A')
        return response

def grpc_middleware(app):
    """Middleware para interceptar e processar requisições gRPC"""
    
    @app.before_request
    def check_grpc_preference():
        """Verifica se a requisição prefere gRPC"""
        # Verifica header personalizado para preferência gRPC
        prefer_grpc = request.headers.get('X-Prefer-Protocol', '').lower() == 'grpc'
        
        # Verifica parâmetro de query
        grpc_param = request.args.get('protocol', '').lower() == 'grpc'
        
        # Define flag para uso posterior nas rotas
        request.prefer_grpc = prefer_grpc or grpc_param
        
        if request.prefer_grpc:
            logger.debug(f"Requisição {request.path} marcada para usar gRPC")
    
    @app.after_request
    def add_grpc_headers(response):
        """Adiciona headers relacionados ao gRPC"""
        if hasattr(request, 'used_grpc') and request.used_grpc:
            response.headers['X-Protocol-Used'] = 'grpc'
        else:
            response.headers['X-Protocol-Used'] = 'http'
        
        # Indica se gRPC está disponível
        try:
            from services import GRPC_AVAILABLE
            from config import get_config
            config = get_config()
            
            grpc_enabled = hasattr(config, 'GRPC_ENABLED') and config.GRPC_ENABLED
            grpc_status = 'available' if (GRPC_AVAILABLE and grpc_enabled) else 'unavailable'
            response.headers['X-GRPC-Status'] = grpc_status
        except Exception:
            response.headers['X-GRPC-Status'] = 'unavailable'
        
        return response

def protocol_selector():
    """Decorator para selecionar automaticamente o protocolo (HTTP/gRPC)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Verifica se deve usar gRPC
            should_use_grpc = getattr(request, 'prefer_grpc', False)
            
            if should_use_grpc:
                logger.info(f"Usando gRPC para {request.path}")
                request.used_grpc = True
            else:
                logger.debug(f"Usando HTTP para {request.path}")
                request.used_grpc = False
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def setup_middleware(app):
    """Configura todos os middlewares"""
    error_handler(app)
    request_logging(app)
    cors_headers(app)
    security_headers(app)
    grpc_middleware(app)
