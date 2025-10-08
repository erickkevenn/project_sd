"""
Configurações centralizadas do API Gateway
"""

import os
from typing import Dict, List
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

class Config:
    """Configurações base"""
    
    # Configurações básicas
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # Portas e URLs
    GATEWAY_PORT = int(os.getenv("GATEWAY_PORT", "8000"))
    SERVICES = {
        "documents": os.getenv("DOCUMENTS_URL", "http://127.0.0.1:5001"),
        "deadlines": os.getenv("DEADLINES_URL", "http://127.0.0.1:5002"),
        "hearings": os.getenv("HEARINGS_URL", "http://127.0.0.1:5003"),
    }
    
    # Configurações gRPC
    GRPC_ENABLED = os.getenv("GRPC_ENABLED", "true").lower() == "true"
    GRPC_SERVICES = {
        "documents": os.getenv("DOCUMENTS_GRPC_URL", "127.0.0.1:50001"),
        "deadlines": os.getenv("DEADLINES_GRPC_URL", "127.0.0.1:50002"),
        "hearings": os.getenv("HEARINGS_GRPC_URL", "127.0.0.1:50003"),
    }
    GRPC_TIMEOUT = int(os.getenv("GRPC_TIMEOUT", "5"))
    
    # Timeouts e limites
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "5"))
    
    # CORS
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:8000').split(',')
    
    # Rate Limiting
    RATE_LIMIT_STORAGE = os.getenv("RATELIMIT_STORAGE_URL", "memory://")
    DEFAULT_RATE_LIMITS = ["10000 per day", "1000 per hour", "200 per minute"]
    LOGIN_RATE_LIMIT = "100 per minute"
    
    # Security Headers
    FORCE_HTTPS = os.getenv("FORCE_HTTPS", "false").lower() == "true"
    STRICT_TRANSPORT_SECURITY = os.getenv("HSTS_ENABLED", "false").lower() == "true"
    
    # Content Security Policy
    CSP_POLICY = {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline'",
        'style-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        'img-src': "'self' data:",
        'connect-src': "'self'",
        'font-src': "'self' https://cdnjs.cloudflare.com"
    }
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

class DevelopmentConfig(Config):
    """Configurações para desenvolvimento"""
    DEBUG = True
    FORCE_HTTPS = False
    STRICT_TRANSPORT_SECURITY = False

class ProductionConfig(Config):
    """Configurações para produção"""
    DEBUG = False
    FORCE_HTTPS = True
    STRICT_TRANSPORT_SECURITY = True
    DEFAULT_RATE_LIMITS = ["1000 per day", "100 per hour", "20 per minute"]
    LOGIN_RATE_LIMIT = "10 per minute"

class TestingConfig(Config):
    """Configurações para testes"""
    DEBUG = True
    TESTING = True
    DEFAULT_RATE_LIMITS = ["100000 per day", "10000 per hour", "1000 per minute"]
    LOGIN_RATE_LIMIT = "1000 per minute"

# Mapeamento de configurações por ambiente
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}

def get_config() -> Config:
    """Retorna a configuração baseada no ambiente"""
    env = os.getenv('FLASK_ENV', 'development')
    return config_map.get(env, DevelopmentConfig)
