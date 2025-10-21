from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
import jwt
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
CORS(app)

# It's recommended to load this from an environment variable
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-default-secret-key')

DATA_FILE = os.path.join('data', 'usuarios.json')

def read_users():
    if not os.path.exists(DATA_FILE) or os.path.getsize(DATA_FILE) == 0:
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_users(users):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=4)

# --- Authentication Decorator ---
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid Authorization header format'}), 401

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = next((u for u in read_users() if u['id'] == data['user_id']), None)
            if current_user is None:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

# --- Endpoints ---
@app.route('/register', methods=['POST'])
def register():
    """Registers a new office (Admin user)."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    required_fields = ['nome', 'email', 'login', 'senha', 'cnpj', 'razao_social']
    if not all(field in data for field in required_fields):
        return jsonify({'error': f'Missing required fields: {required_fields}'}), 400

    users = read_users()

    if any(u['login'] == data['login'] for u in users):
        return jsonify({'error': 'Login already exists'}), 409

    new_user = {
        "id": f"user_{uuid.uuid4()}",
        "nome": data['nome'],
        "email": data['email'],
        "login": data['login'],
        "senha": data['senha'], # Storing plain text as requested
        "role": "Admin",
        "cnpj": data['cnpj'],
        "razao_social": data['razao_social'],
        "nome_fantasia": data.get('nome_fantasia', ''),
        "endereco_rua": data.get('endereco_rua', ''),
        "endereco_numero": data.get('endereco_numero', ''),
        "endereco_complemento": data.get('endereco_complemento', ''),
        "endereco_bairro": data.get('endereco_bairro', ''),
        "endereco_cidade": data.get('endereco_cidade', ''),
        "endereco_estado": data.get('endereco_estado', ''),
        "endereco_cep": data.get('endereco_cep', ''),
        "funcionarios": []
    }

    users.append(new_user)
    write_users(users)

    return jsonify({'message': 'Admin user registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'login' not in data or 'senha' not in data:
        return jsonify({'error': 'Missing login or senha'}), 400

    users = read_users()
    user = next((u for u in users if u['login'] == data['login'] and u['senha'] == data['senha']), None)

    if user:
        token = jwt.encode({
            'user_id': user['id'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token})
    
    return jsonify({'error': 'Invalid login or senha'}), 401

@app.route('/employees', methods=['POST'])
@require_auth
def create_employee(current_user):
    """Creates a new employee (Advogado or Estagiario) for the Admin's office."""
    if current_user['role'] != 'Admin':
        return jsonify({'error': 'Only Admins can create employees'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    required_fields = ['nome', 'email', 'login', 'senha', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'error': f'Missing required fields: {required_fields}'}), 400

    role = data.get('role')
    if role not in ['Advogado', 'Estagiario']:
        return jsonify({'error': 'Role must be either Advogado or Estagiario'}), 400

    if role == 'Advogado' and 'oab' not in data:
        return jsonify({'error': 'Missing oab for Advogado'}), 400

    users = read_users()

    if any(u['login'] == data['login'] for u in users):
        return jsonify({'error': 'Login already exists'}), 409

    # The new employee belongs to the Admin's office.
    # For simplicity, we use the Admin's ID as the office ID.
    escritorio_id = current_user['id']

    new_employee = {
        "id": f"user_{uuid.uuid4()}",
        "nome": data['nome'],
        "email": data['email'],
        "login": data['login'],
        "senha": data['senha'], # Storing plain text as requested
        "role": role,
        "escritorio_id": escritorio_id
    }

    if role == 'Advogado':
        new_employee['oab'] = data['oab']

    users.append(new_employee)
    
    # Also add the employee ID to the admin's list of employees
    for user in users:
        if user['id'] == current_user['id']:
            user.setdefault('funcionarios', []).append(new_employee['id'])
            break
            
    write_users(users)

    return jsonify({'message': f'{role} created successfully'}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)