"""
Microserviço de Documentos - Versão Refatorada
Implementa CRUD para documentos jurídicos
"""

from flask import request, jsonify
import os
from base_service import BaseService
from typing import Dict, Any, List, Optional

class DocumentsService(BaseService):
    """Serviço de gerenciamento de documentos"""
    
    def __init__(self):
        port = int(os.getenv("DOCS_PORT", "5001"))
        super().__init__("documents", port)
        self._register_routes()
    
    def _register_routes(self):
        """Registra rotas específicas do serviço de documentos"""
        
        @self.app.get("/documents")
        def list_documents():
            """Lista todos os documentos"""
            self.log_request("LIST_DOCUMENTS", f"Total: {len(self.data_store)}")
            
            # Filtro opcional por process_id
            process_id = request.args.get('process_id')
            if process_id:
                filtered_docs = [
                    doc for doc in self.data_store.values() 
                    if doc.get('process_id') == process_id
                ]
                return self.create_success_response(filtered_docs)
            
            return self.create_success_response(list(self.data_store.values()))
        
        @self.app.post("/documents")
        def create_document():
            """Cria um novo documento"""
            try:
                data = request.get_json(force=True)
                
                # Validação de campos obrigatórios
                required_fields = ['title', 'content', 'author']
                error = self.validate_required_fields(data, required_fields)
                if error:
                    return self.create_error_response(error, 400)
                
                # Exige que o documento esteja associado a um processo
                if not data.get('process_id'):
                    return self.create_error_response("Field 'process_id' is required to create a document", 400)
                
                # Cria documento
                doc_id = self.generate_id()
                document = {
                    "id": doc_id,
                    "title": self.sanitize_string(data['title']),
                    "content": self.sanitize_string(data['content']),
                    "author": self.sanitize_string(data['author']),
                    "process_id": data.get('process_id'),
                    "created_at": self._get_current_timestamp(),
                    "updated_at": self._get_current_timestamp()
                }
                
                self.data_store[doc_id] = document
                
                self.log_request("CREATE_DOCUMENT", f"ID: {doc_id}, Title: {document['title']}")
                
                return self.create_success_response(document, 201)
                
            except Exception as e:
                self.logger.error(f"Error creating document: {str(e)}")
                return self.create_error_response("Failed to create document", 500)
        
        @self.app.get("/documents/<doc_id>")
        def get_document(doc_id: str):
            """Obtém um documento específico"""
            self.log_request("GET_DOCUMENT", f"ID: {doc_id}")
            
            if doc_id not in self.data_store:
                return self.create_error_response("Document not found", 404)
            
            return self.create_success_response(self.data_store[doc_id])
        
        @self.app.put("/documents/<doc_id>")
        def update_document(doc_id: str):
            """Atualiza um documento existente"""
            try:
                if doc_id not in self.data_store:
                    return self.create_error_response("Document not found", 404)
                
                data = request.get_json(force=True)
                document = self.data_store[doc_id].copy()
                
                # Atualiza campos permitidos
                updatable_fields = ['title', 'content', 'author', 'process_id']
                for field in updatable_fields:
                    if field in data:
                        document[field] = self.sanitize_string(str(data[field]))
                
                document['updated_at'] = self._get_current_timestamp()
                self.data_store[doc_id] = document
                
                self.log_request("UPDATE_DOCUMENT", f"ID: {doc_id}")
                
                return self.create_success_response(document)
                
            except Exception as e:
                self.logger.error(f"Error updating document: {str(e)}")
                return self.create_error_response("Failed to update document", 500)
        
        @self.app.delete("/documents/<doc_id>")
        def delete_document(doc_id: str):
            """Remove um documento"""
            self.log_request("DELETE_DOCUMENT", f"ID: {doc_id}")
            
            if doc_id not in self.data_store:
                return self.create_error_response("Document not found", 404)
            
            deleted_doc = self.data_store.pop(doc_id)
            
            return self.create_success_response({
                "message": "Document deleted successfully",
                "deleted_document": deleted_doc
            })
    
    def _get_current_timestamp(self) -> str:
        """Retorna timestamp atual em formato ISO"""
        from datetime import datetime
        return datetime.utcnow().isoformat()

# Instância do serviço
service = DocumentsService()

if __name__ == "__main__":
    print(f"Documents Service on {service.port}")
    service.run()
