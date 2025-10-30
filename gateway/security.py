"""
Módulo de segurança para o API Gateway
Implementa autenticação JWT, autorização, validação e outras medidas de segurança
"""

import jwt
import re
import os
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from marshmallow import Schema, fields, ValidationError
import hashlib
import secrets
from typing import Dict, List, Optional

# Configurações de segurança
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# Usuários de exemplo (em produção, usar banco de dados)
USERS_DB = {
    "admin": {
        "password_hash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",  # senha: admin123
        "roles": ["admin", "lawyer", "user"],
        "permissions": ["read", "write", "delete", "orchestrate"]
    },
    "lawyer": {
        "password_hash": "ac3226b60081e5f9f9f1f784838aca038eb7c2f7411cb90702b6c2bfe07a45a9",  # senha: lawyer123
        "roles": ["lawyer", "user"],
        "permissions": ["read", "write", "orchestrate"]
    },
    "intern": {
        "password_hash": "534d9b45e4168ad5e7ab39ddde0387982ec6a2a18b992f62738b23fcde72f7e7",  # senha: intern123
        "roles": ["user"],
        "permissions": ["read"]
    }
}

class LoginSchema(Schema):
    """Schema para validação de login"""
    username = fields.Str(required=True, validate=lambda x: len(x) >= 3)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 6)

class DocumentSchema(Schema):
    """Schema para validação de documentos"""
    title = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    content = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    author = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    process_id = fields.Str(missing=None)

class DeadlineSchema(Schema):
    """Schema para validação de prazos"""
    process_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    due_date = fields.Str(required=True)  # Aceita string de data no formato YYYY-MM-DD
    description = fields.Str(missing="")

class HearingSchema(Schema):
    """Schema para validação de audiências"""
    process_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    date = fields.Str(required=True)  # Aceita string de data no formato YYYY-MM-DD
    courtroom = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    description = fields.Str(missing="")

class RegisterSchema(Schema):
    """Schema para validação de registro de usuário"""
    username = fields.Str(required=True, validate=lambda x: len(x) >= 3)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 6)
    roles = fields.List(fields.Str(), missing=["user"])
    permissions = fields.List(fields.Str(), missing=["read", "write"])

class ProcessSchema(Schema):
    """Schema para processos"""
    number = fields.Str(required=True, validate=lambda x: bool(re.match(r"^PROC-\d+$", x.strip().upper())))
    title = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    description = fields.Str(missing="")
    status = fields.Str(missing="open")

def hash_password(password: str) -> str:
    """Gera hash da senha usando SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verifica se a senha corresponde ao hash"""
    return hash_password(password) == password_hash

def generate_token(username: str, roles: List[str], permissions: List[str], office_id: Optional[str] = None) -> str:
    """Gera token JWT"""
    payload = {
        'username': username,
        'roles': roles,
        'permissions': permissions,
        'office_id': office_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.datetime.utcnow(),
        'jti': secrets.token_hex(16)  # JWT ID único
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict]:
    """Decodifica e valida token JWT"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def authenticate_user(username: str, password: str) -> Optional[Dict]:
    """Autentica usuário"""
    user = USERS_DB.get(username)
    if user and verify_password(password, user['password_hash']):
        return user
    return None

def require_auth(f):
    """Decorator para exigir autenticação"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if payload is None:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Adiciona informações do usuário ao contexto da requisição
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated_function

def require_permission(permission: str):
    """Decorator para exigir permissão específica"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_permissions = request.current_user.get('permissions', [])
            if permission not in user_permissions:
                return jsonify({'error': f'Permission "{permission}" required'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_role(role: str):
    """Decorator para exigir role específico"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_roles = request.current_user.get('roles', [])
            if role not in user_roles:
                return jsonify({'error': f'Role "{role}" required'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_json(schema_class):
    """Decorator para validação de JSON usando Marshmallow"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                schema = schema_class()
                json_data = request.get_json(force=True)
                if not json_data:
                    return jsonify({'error': 'JSON payload required'}), 400
                
                # Valida e deserializa os dados
                validated_data = schema.load(json_data)
                request.validated_data = validated_data
                return f(*args, **kwargs)
            except ValidationError as err:
                return jsonify({'error': 'Validation failed', 'details': err.messages}), 400
            except Exception as e:
                return jsonify({'error': 'Invalid JSON payload'}), 400
        return decorated_function
    return decorator

def sanitize_input(data):
    """Sanitiza entrada removendo apenas caracteres realmente perigosos"""
    if isinstance(data, str):
        # Remove apenas caracteres de controle e caracteres nulos
        # Mantém aspas e outros caracteres necessários para JSON
        dangerous_chars = ['<', '>', '\x00']
        for char in dangerous_chars:
            data = data.replace(char, '')
        return data.strip()
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    return data

def get_client_ip():
    """Obtém IP real do cliente considerando proxies"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    return request.remote_addr

def log_security_event(event_type: str, details: str, user: str = None):
    """Log de eventos de segurança"""
    timestamp = datetime.datetime.utcnow().isoformat()
    client_ip = get_client_ip()
    
    log_entry = {
        'timestamp': timestamp,
        'event_type': event_type,
        'details': details,
        'user': user,
        'client_ip': client_ip,
        'user_agent': request.headers.get('User-Agent', 'Unknown')
    }
    
    # Em produção, enviar para sistema de logging centralizado
    current_app.logger.warning(f"SECURITY_EVENT: {log_entry}")
