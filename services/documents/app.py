"""
Serviço de Documentos isolado com persistência JSON
"""

import os
import json
import threading
from typing import Dict, Any, Optional

from flask import request

from services.base_service import BaseService


class JsonStore:
    """Persistência simples em arquivo JSON (dict)."""

    def __init__(self, file_path: str, default: Optional[Dict[str, Any]] = None):
        self.file_path = file_path
        self.default: Dict[str, Any] = default or {}
        self._lock = threading.Lock()
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            self._atomic_write(self.default)

    def _atomic_write(self, data: Dict[str, Any]) -> None:
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(temp_path, self.file_path)

    def load(self) -> Dict[str, Any]:
        with self._lock:
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if not isinstance(data, dict):
                    return self.default.copy()
                return data
            except Exception:
                return self.default.copy()

    def save(self, data: Dict[str, Any]) -> None:
        with self._lock:
            self._atomic_write(data)


class DocumentsService(BaseService):
    """Serviço de gerenciamento de documentos com persistência JSON."""

    def __init__(self):
        import os as _os
        port = int(_os.getenv("DOCS_PORT", "5001"))
        super().__init__("documents", port)

        base_dir = os.path.dirname(__file__)
        data_dir = os.path.join(base_dir, "data")
        store_file = os.path.join(data_dir, "documents.json")
        self.store = JsonStore(store_file, default={})
        self.data_store = self.store.load()

        self._register_routes()

    def _persist(self) -> None:
        self.store.save(self.data_store)

    def _register_routes(self):
        """Registra rotas específicas do serviço de documentos"""

        @self.app.get("/documents")
        def list_documents():
            self.log_request("LIST_DOCUMENTS", f"Total: {len(self.data_store)}")

            process_id = request.args.get("process_id")
            if process_id:
                filtered_docs = [
                    doc for doc in self.data_store.values()
                    if doc.get("process_id") == process_id
                ]
                return self.create_success_response(filtered_docs)

            return self.create_success_response(list(self.data_store.values()))

        @self.app.post("/documents")
        def create_document():
            try:
                data = request.get_json(force=True)

                required_fields = ["title", "content", "author"]
                error = self.validate_required_fields(data, required_fields)
                if error:
                    return self.create_error_response(error, 400)

                doc_id = self.generate_id()
                document = {
                    "id": doc_id,
                    "title": self.sanitize_string(data["title"]),
                    "content": self.sanitize_string(data["content"]),
                    "author": self.sanitize_string(data["author"]),
                    "process_id": data.get("process_id"),
                    "created_at": self._get_current_timestamp(),
                    "updated_at": self._get_current_timestamp(),
                }

                self.data_store[doc_id] = document
                self._persist()

                self.log_request("CREATE_DOCUMENT", f"ID: {doc_id}, Title: {document['title']}")
                return self.create_success_response(document, 201)

            except Exception as e:
                self.logger.error(f"Error creating document: {str(e)}")
                return self.create_error_response("Failed to create document", 500)

        @self.app.get("/documents/<doc_id>")
        def get_document(doc_id: str):
            self.log_request("GET_DOCUMENT", f"ID: {doc_id}")

            if doc_id not in self.data_store:
                return self.create_error_response("Document not found", 404)

            return self.create_success_response(self.data_store[doc_id])

        @self.app.put("/documents/<doc_id>")
        def update_document(doc_id: str):
            try:
                if doc_id not in self.data_store:
                    return self.create_error_response("Document not found", 404)

                data = request.get_json(force=True)
                document = self.data_store[doc_id].copy()

                updatable_fields = ["title", "content", "author", "process_id"]
                for field in updatable_fields:
                    if field in data:
                        document[field] = self.sanitize_string(str(data[field]))

                document["updated_at"] = self._get_current_timestamp()
                self.data_store[doc_id] = document
                self._persist()

                self.log_request("UPDATE_DOCUMENT", f"ID: {doc_id}")
                return self.create_success_response(document)

            except Exception as e:
                self.logger.error(f"Error updating document: {str(e)}")
                return self.create_error_response("Failed to update document", 500)

        @self.app.delete("/documents/<doc_id>")
        def delete_document(doc_id: str):
            self.log_request("DELETE_DOCUMENT", f"ID: {doc_id}")

            if doc_id not in self.data_store:
                return self.create_error_response("Document not found", 404)

            deleted_doc = self.data_store.pop(doc_id)
            self._persist()

            return self.create_success_response({
                "message": "Document deleted successfully",
                "deleted_document": deleted_doc,
            })

    def _get_current_timestamp(self) -> str:
        from datetime import datetime
        return datetime.utcnow().isoformat()


# Instância do serviço
service = DocumentsService()

if __name__ == "__main__":
    print(f"Documents Service on {service.port}")
    service.run()


