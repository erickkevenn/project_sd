
import os
import sys
import json
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify

# Adiciona o diretório raiz do projeto ao sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import hashlib

def hash_password(password: str) -> str:
    """Gera hash da senha usando SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verifica se a senha corresponde ao hash"""
    return hash_password(password) == password_hash

app = Flask(__name__)

# Configurações de segurança
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'usuarios.json'))

def load_users():
    """Carrega usuários do arquivo JSON"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_users(users):
    """Salva usuários no arquivo JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def authenticate_user(login, password):
    """Autentica um usuário"""
    users = load_users()
    for user in users:
        if user['login'] == login and verify_password(password, user['senha']):
            return user
    return None

def generate_token(user_data):
    """Gera um token JWT"""
    permissions = []
    roles = []
    
    if user_data['role'] == 'Admin':
        permissions = ["read", "write", "delete", "orchestrate"]
        roles = ["admin", "lawyer", "user"]
    elif user_data['role'] == 'Advogado':
        permissions = ["read", "write", "orchestrate"]
        roles = ["lawyer", "user"]
    elif user_data['role'] == 'Estagiario':
        permissions = ["read"]
        roles = ["user"]

    payload = {
        'id': user_data['id'],
        'username': user_data['login'],
        'roles': roles,
        'permissions': permissions,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token):
    """Decodifica um token JWT"""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None  # Token expirado
    except jwt.InvalidTokenError:
        return None  # Token inválido

def token_required(f):
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

@app.route("/health", methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "healthy", "service": "auth"})

@app.route("/login", methods=['POST'])
def login():
    """Endpoint de login"""
    data = request.get_json()
    if not data or 'login' not in data or 'senha' not in data:
        return jsonify({"error": "Login e senha são obrigatórios"}), 400

    user = authenticate_user(data['login'], data['senha'])

    if not user:
        return jsonify({"error": "Credenciais inválidas"}), 401

    token = generate_token(user)
    return jsonify({'token': token})

@app.route("/me", methods=['GET'])
@token_required
def me():
    """Retorna informações do usuário logado"""
    return jsonify(request.current_user)

@app.route("/validate_token", methods=['POST'])
@token_required
def validate_token():
    """Valida um token de autenticação"""
    return jsonify({"message": "Token válido"}), 200

if __name__ == "__main__":
    app.run(port=5001, debug=True)
