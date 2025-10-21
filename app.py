from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join('data', 'usuarios.json')

def read_users():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def write_users(users):
    with open(DATA_FILE, 'w') as f:
        json.dump(users, f, indent=4)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400

    required_fields = ['nome', 'email', 'login', 'senha', 'cnpj', 'razao_social', 'nome_fantasia', 'endereco_rua', 'endereco_numero', 'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'endereco_cep']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    users = read_users()

    if any(u['login'] == data['login'] for u in users):
        return jsonify({'error': 'Login already exists'}), 409

    new_user = {
        "id": f"user_{uuid.uuid4()}",
        "nome": data['nome'],
        "email": data['email'],
        "login": data['login'],
        "senha": data['senha'],
        "role": "Admin",
        "cnpj": data['cnpj'],
        "razao_social": data['razao_social'],
        "nome_fantasia": data['nome_fantasia'],
        "endereco_rua": data['endereco_rua'],
        "endereco_numero": data['endereco_numero'],
        "endereco_complemento": data.get('endereco_complemento'),
        "endereco_bairro": data['endereco_bairro'],
        "endereco_cidade": data['endereco_cidade'],
        "endereco_estado": data['endereco_estado'],
        "endereco_cep": data['endereco_cep'],
        "funcionarios": []
    }

    users.append(new_user)
    write_users(users)

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not 'login' in data or not 'senha' in data:
        return jsonify({'error': 'Missing login or senha'}), 400

    users = read_users()

    user = next((u for u in users if u['login'] == data['login'] and u['senha'] == data['senha']), None)

    if user:
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': 'Invalid login or senha'}), 401

if __name__ == '__main__':
    app.run(debug=True, port=5000)
