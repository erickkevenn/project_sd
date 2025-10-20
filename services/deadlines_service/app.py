import os
import sys
import json
import datetime
import uuid
from flask import Flask, request, jsonify

# Adiciona o diretório raiz ao path para importar módulos compartilhados
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from shared.auth import token_required, require_permission
from shared.validation import validate_json, DeadlineSchema

app = Flask(__name__)

DEADLINES_DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'prazos.json'))

def load_deadlines():
    """Carrega prazos do arquivo JSON"""
    try:
        with open(DEADLINES_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_deadlines(deadlines):
    """Salva prazos no arquivo JSON"""
    with open(DEADLINES_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(deadlines, f, indent=2, ensure_ascii=False)

@app.route("/health", methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "healthy", "service": "deadlines"})

@app.route("/deadlines", methods=['GET'])
@token_required
@require_permission("read")
def get_deadlines():
    """Lista todos os prazos"""
    deadlines = load_deadlines()
    return jsonify(deadlines)

@app.route("/deadlines", methods=['POST'])
@token_required
@require_permission("write")
@validate_json(DeadlineSchema)
def create_deadline():
    """Cria um novo prazo"""
    deadlines = load_deadlines()
    new_deadline = request.validated_data
    new_deadline['id'] = f"prazo_{uuid.uuid4().hex[:6]}"
    deadlines.append(new_deadline)
    save_deadlines(deadlines)

    return jsonify(new_deadline), 201

@app.route("/deadlines/<deadline_id>", methods=['GET'])
@token_required
@require_permission("read")
def get_deadline(deadline_id):
    """Obtém um prazo específico"""
    deadlines = load_deadlines()
    deadline = next((d for d in deadlines if d['id'] == deadline_id), None)
    if deadline:
        return jsonify(deadline)
    return jsonify({"error": "Prazo não encontrado"}), 404

@app.route("/deadlines/<deadline_id>", methods=['PUT'])
@token_required
@require_permission("write")
@validate_json(DeadlineSchema)
def update_deadline(deadline_id):
    """Atualiza um prazo"""
    deadlines = load_deadlines()
    deadline_index = next((i for i, d in enumerate(deadlines) if d['id'] == deadline_id), None)

    if deadline_index is None:
        return jsonify({"error": "Prazo não encontrado"}), 404

    deadlines[deadline_index].update(request.validated_data)
    save_deadlines(deadlines)

    return jsonify(deadlines[deadline_index])

@app.route("/deadlines/<deadline_id>", methods=['DELETE'])
@token_required
@require_permission("delete")
def delete_deadline(deadline_id):
    """Deleta um prazo"""
    deadlines = load_deadlines()
    deadline = next((d for d in deadlines if d['id'] == deadline_id), None)
    if not deadline:
        return jsonify({"error": "Prazo não encontrado"}), 404

    deadlines = [d for d in deadlines if d['id'] != deadline_id]
    save_deadlines(deadlines)

    return jsonify({"message": "Prazo deletado com sucesso"})

@app.route("/deadlines/today", methods=['GET'])
@token_required
@require_permission("read")
def get_today_deadlines():
    """Lista os prazos de hoje"""
    deadlines = load_deadlines()
    today = datetime.date.today().isoformat()
    today_deadlines = [
        d for d in deadlines if d.get('data_prazo') and d.get('data_prazo').startswith(today)
    ]
    return jsonify(today_deadlines)

if __name__ == "__main__":
    app.run(port=5004, debug=True)