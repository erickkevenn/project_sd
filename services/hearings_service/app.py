import os
import sys
import json
import uuid
import datetime
from flask import Flask, request, jsonify

# Adiciona o diretório raiz ao path para importar módulos compartilhados
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from shared.auth import token_required, require_permission
from shared.validation import validate_json, HearingSchema

app = Flask(__name__)

DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'audiencias.json'))

def load_hearings():
    """Carrega audiências do arquivo JSON"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_hearings(hearings):
    """Salva audiências no arquivo JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(hearings, f, indent=2, ensure_ascii=False)

@app.route("/health", methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "healthy", "service": "hearings"})

@app.route("/hearings", methods=['GET'])
@token_required
@require_permission("read")
def get_hearings():
    """Lista todas as audiências"""
    hearings = load_hearings()
    return jsonify(hearings)

@app.route("/hearings/today", methods=['GET'])
@token_required
@require_permission("read")
def get_today_hearings():
    """Lista as audiências de hoje"""
    hearings = load_hearings()
    today = datetime.date.today().isoformat()
    today_hearings = [
        h for h in hearings if h.get('data_hora') and h.get('data_hora').startswith(today)
    ]
    return jsonify(today_hearings)

@app.route("/hearings", methods=['POST'])
@token_required
@require_permission("write")
@validate_json(HearingSchema)
def create_hearing():
    """Cria uma nova audiência"""
    hearings = load_hearings()
    new_hearing = request.validated_data
    new_hearing['id'] = f"aud_{uuid.uuid4().hex[:6]}"
    hearings.append(new_hearing)
    save_hearings(hearings)

    return jsonify(new_hearing), 201

@app.route("/hearings/<hearing_id>", methods=['GET'])
@token_required
@require_permission("read")
def get_hearing(hearing_id):
    """Obtém uma audiência específica"""
    hearings = load_hearings()
    hearing = next((h for h in hearings if h['id'] == hearing_id), None)
    if hearing:
        return jsonify(hearing)
    return jsonify({"error": "Audiência não encontrada"}), 404

@app.route("/hearings/<hearing_id>", methods=['PUT'])
@token_required
@require_permission("write")
@validate_json(HearingSchema)
def update_hearing(hearing_id):
    """Atualiza uma audiência"""
    hearings = load_hearings()
    hearing_index = next((i for i, h in enumerate(hearings) if h['id'] == hearing_id), None)

    if hearing_index is None:
        return jsonify({"error": "Audiência não encontrada"}), 404

    hearings[hearing_index].update(request.validated_data)
    save_hearings(hearings)

    return jsonify(hearings[hearing_index])

@app.route("/hearings/<hearing_id>", methods=['DELETE'])
@token_required
@require_permission("delete")
def delete_hearing(hearing_id):
    """Deleta uma audiência"""
    hearings = load_hearings()
    hearing = next((h for h in hearings if h['id'] == hearing_id), None)
    if not hearing:
        return jsonify({"error": "Audiência não encontrada"}), 404

    hearings = [h for h in hearings if h['id'] != hearing_id]
    save_hearings(hearings)

    return jsonify({"message": "Audiência deletada com sucesso"})

if __name__ == "__main__":
    app.run(port=5005, debug=True)