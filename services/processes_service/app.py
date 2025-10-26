
import os
import sys
import json
import uuid
from flask import Flask, request, jsonify

# Adiciona o diretório raiz ao path para importar módulos compartilhados
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from shared.auth import token_required, require_permission
from shared.validation import validate_json, ProcessSchema

app = Flask(__name__)

DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'processos.json'))

def load_processes():
    """Carrega processos do arquivo JSON"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_processes(processes):
    """Salva processos no arquivo JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(processes, f, indent=2, ensure_ascii=False)

@app.route("/health", methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "healthy", "service": "processes"})

@app.route("/processes", methods=['GET'])
@token_required
@require_permission("read")
def get_processes():
    """Lista todos os processos"""
    processes = load_processes()
    return jsonify(processes)

@app.route("/processes", methods=['POST'])
@token_required
@require_permission("write")
@validate_json(ProcessSchema)
def create_process():
    """Cria um novo processo"""
    processes = load_processes()
    new_process = request.validated_data
    new_process['id'] = f"proc_{uuid.uuid4().hex[:6]}"
    processes.append(new_process)
    save_processes(processes)

    return jsonify(new_process), 201

@app.route("/processes/validate", methods=['POST'])
@validate_json(ProcessSchema)
def validate_process():
    """Valida os dados de um processo"""
    return jsonify({"message": "Validacao bem-sucedida"}), 200

@app.route("/processes/<process_id>", methods=['GET'])
@token_required
@require_permission("read")
def get_process(process_id):
    """Obtém um processo específico"""
    processes = load_processes()
    process = next((p for p in processes if p['id'] == process_id), None)
    if process:
        return jsonify(process)
    return jsonify({"error": "Processo não encontrado"}), 404

@app.route("/processes/<process_id>", methods=['PUT'])
@token_required
@require_permission("write")
@validate_json(ProcessSchema)
def update_process(process_id):
    """Atualiza um processo"""
    processes = load_processes()
    process_index = next((i for i, p in enumerate(processes) if p['id'] == process_id), None)

    if process_index is None:
        return jsonify({"error": "Processo não encontrado"}), 404

    processes[process_index].update(request.validated_data)
    save_processes(processes)

    return jsonify(processes[process_index])

@app.route("/processes/<process_id>", methods=['DELETE'])
@token_required
@require_permission("delete")
def delete_process(process_id):
    """Deleta um processo"""
    processes = load_processes()
    process = next((p for p in processes if p['id'] == process_id), None)
    if not process:
        return jsonify({"error": "Processo não encontrado"}), 404

    processes = [p for p in processes if p['id'] != process_id]
    save_processes(processes)

    return jsonify({"message": "Processo deletado com sucesso"})

if __name__ == "__main__":
    app.run(port=5002, debug=True)
