"""
Classe base para microserviços
Implementa funcionalidades comuns e padrões
"""

from flask import Flask, request, jsonify
import logging
import os
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

class BaseService:
    """Classe base para microserviços"""
    
    def __init__(self, service_name: str, port: int):
        self.service_name = service_name
        self.port = port
        self.app = Flask(__name__)
        self.data_store = {}
        
        # Configuração de logging
        logging.basicConfig(
            level=logging.INFO,
            format=f'%(asctime)s - {service_name} - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(service_name)
        
        # Registra rotas padrão
        self._register_base_routes()
    
    def _register_base_routes(self):
        """Registra rotas básicas comuns a todos os serviços"""
        
        @self.app.route("/")
        def root():
            return {
                "service": self.service_name,
                "status": "running",
                "health": "/health",
                "version": "1.0.0"
            }, 200
        
        @self.app.route("/favicon.ico")
        def favicon():
            return "", 204
        
        @self.app.route("/health")
        def health():
            return {
                "status": "ok",
                "service": self.service_name,
                "count": len(self.data_store),
                "timestamp": datetime.utcnow().isoformat()
            }, 200
    
    def generate_id(self) -> str:
        """Gera um ID único"""
        return str(uuid.uuid4())[:8]
    
    def validate_required_fields(self, data: Dict[str, Any], required_fields: list) -> Optional[str]:
        """Valida campos obrigatórios"""
        for field in required_fields:
            if field not in data or not data[field]:
                return f"Field '{field}' is required"
        return None
    
    def sanitize_string(self, value: str) -> str:
        """Sanitiza string de entrada"""
        if not isinstance(value, str):
            return str(value)
        return value.strip()
    
    def log_request(self, action: str, details: str = ""):
        """Log de requisições"""
        self.logger.info(f"{action} - {request.method} {request.path} - {details}")
    
    def create_error_response(self, message: str, status_code: int = 400) -> tuple:
        """Cria resposta de erro padronizada"""
        return jsonify({
            "error": message,
            "service": self.service_name,
            "timestamp": datetime.utcnow().isoformat()
        }), status_code
    
    def create_success_response(self, data: Any, status_code: int = 200) -> tuple:
        """Cria resposta de sucesso padronizada"""
        if isinstance(data, dict):
            data["service"] = self.service_name
            data["timestamp"] = datetime.utcnow().isoformat()
        
        return jsonify(data), status_code
    
    def run(self, debug: bool = True):
        """Executa o serviço"""
        self.logger.info(f"{self.service_name} Service starting on port {self.port}")
        self.app.run(
            port=self.port,
            host="0.0.0.0",
            debug=debug
        )
