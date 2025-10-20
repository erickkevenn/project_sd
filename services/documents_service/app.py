import os
import sys
import json
import uuid
from flask import Flask, request, jsonify

# Adiciona o diretório raiz ao path para importar módulos compartilhados
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from shared.auth import token_required, require_permission
from shared.validation import validate_json, DocumentSchema

app = Flask(__name__)

DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'documentos.json'))

def load_documents():
    """Carrega documentos do arquivo JSON"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_documents(documents):
    """Salva documentos no arquivo JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(documents, f, indent=2, ensure_ascii=False)

@app.route("/health", methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "healthy", "service": "documents"})

@app.route("/documents", methods=['GET'])
@token_required
@require_permission("read")
def get_documents():
    """Lista todos os documentos"""
    documents = load_documents()
    return jsonify(documents)

@app.route("/documents", methods=['POST'])
@token_required
@require_permission("write")
@validate_json(DocumentSchema)
def create_document():
    """Cria um novo documento"""
    documents = load_documents()
    new_document = request.validated_data
    new_document['id'] = f"doc_{uuid.uuid4().hex[:6]}"
    documents.append(new_document)
    save_documents(documents)

    return jsonify(new_document), 201

@app.route("/documents/<document_id>", methods=['GET'])
@token_required
@require_permission("read")
def get_document(document_id):
    """Obtém um documento específico"""
    documents = load_documents()
    document = next((d for d in documents if d['id'] == document_id), None)
    if document:
        return jsonify(document)
    return jsonify({"error": "Documento não encontrado"}), 404

@app.route("/documents/<document_id>", methods=['PUT'])
@token_required
@require_permission("write")
@validate_json(DocumentSchema)
def update_document(document_id):
    """Atualiza um documento"""
    documents = load_documents()
    document_index = next((i for i, d in enumerate(documents) if d['id'] == document_id), None)

    if document_index is None:
        return jsonify({"error": "Documento não encontrado"}), 404

    documents[document_index].update(request.validated_data)
    save_documents(documents)

    return jsonify(documents[document_index])

@app.route("/documents/<document_id>", methods=['DELETE'])
@token_required
@require_permission("delete")
def delete_document(document_id):
    """Deleta um documento"""
    documents = load_documents()
    document = next((d for d in documents if d['id'] == document_id), None)
    if not document:
        return jsonify({"error": "Documento não encontrado"}), 404

    documents = [d for d in documents if d['id'] != document_id]
    save_documents(documents)

    return jsonify({"message": "Documento deletado com sucesso"})

if __name__ == "__main__":
    app.run(port=5003, debug=True)