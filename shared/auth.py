"""
Módulo de autenticação compartilhado para microserviços
"""
import jwt
import os
from functools import wraps
from flask import request, jsonify

# Configurações de segurança
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

def decode_token(token: str):
    """Decodifica um token JWT"""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None  # Token expirado
    except jwt.InvalidTokenError:
        return None  # Token inválido

def token_required(f):
    """Decorator para exigir autenticação"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Token mal formatado'}), 401

        if not token:
            return jsonify({'error': 'Token é obrigatório'}), 401

        payload = decode_token(token)
        if payload is None:
            return jsonify({'error': 'Token inválido ou expirado'}), 401

        request.current_user = payload
        return f(*args, **kwargs)
    return decorated

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
