from flask import Flask, request, jsonify
import uuid, os

PORT = int(os.getenv("DOCS_PORT", "5001"))
app = Flask(__name__)
DOCUMENTS = {}

@app.get("/")
def root_index():
    return {"service":"documents","health":"/health"}, 200

@app.get("/favicon.ico")
def favicon():
    return ("", 204)

@app.get("/health")
def health():
    return {"status": "ok", "count": len(DOCUMENTS)}

@app.get("/documents")
def list_documents():
    return jsonify(list(DOCUMENTS.values())), 200

@app.post("/documents")
def create_document():
    data = request.get_json(force=True)
    doc_id = str(uuid.uuid4())[:8]
    doc = {
        "id": doc_id,
        "title": data.get("title", "Untitled"),
        "content": data.get("content", ""),
        "author": data.get("author", "unknown")
    }
    DOCUMENTS[doc_id] = doc
    return jsonify(doc), 201

@app.get("/documents/<doc_id>")
def get_document(doc_id):
    if doc_id not in DOCUMENTS:
        return jsonify({"error": "not_found"}), 404
    return jsonify(DOCUMENTS[doc_id]), 200

if __name__ == "__main__":
    print(f"Documents Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)
