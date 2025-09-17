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

def setup_middleware(app):
    """Configura todos os middlewares"""
    error_handler(app)
    request_logging(app)
    cors_headers(app)
    security_headers(app)
