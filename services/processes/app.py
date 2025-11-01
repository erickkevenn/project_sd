"""
Serviço de Processos isolado com persistência JSON (CRUD básico)
"""

import os
import json
import threading
import re
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify


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


def create_app() -> Flask:
    app = Flask(__name__)

    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data")
    store_file = os.path.join(data_dir, "processes.json")
    store = JsonStore(store_file, default={})
    PROCESSES: Dict[str, Any] = store.load()

    import uuid, datetime

    @app.get("/")
    def root_index():
        return {"service": "processes", "health": "/health"}, 200

    @app.get("/favicon.ico")
    def favicon():
        return ("", 204)

    @app.get("/health")
    def health():
        return {"status": "ok", "count": len(PROCESSES)}, 200

    @app.get("/processes")
    def list_processes():
        # Filtra por escritório se header presente
        office_id = request.headers.get("X-Office-ID")
        if office_id:
            filtered = [p for p in PROCESSES.values() if p.get("office_id") == office_id]
            return jsonify(filtered), 200
        return jsonify(list(PROCESSES.values())), 200

    @app.get("/processes/by-number/<process_number>")
    def get_process_by_number(process_number: str):
        """Busca processo pelo número (ex: PROC-001) ao invés do ID interno"""
        office_id = request.headers.get("X-Office-ID")
        for proc in PROCESSES.values():
            if proc.get("number") == process_number:
                if office_id and proc.get("office_id") != office_id:
                    break  # não revela existência
                return jsonify(proc), 200
        return jsonify({"error": "Process not found"}), 404

    @app.post("/processes")
    def create_process():
        data = request.get_json(force=True) or {}
        required = ["number", "title"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Field '{field}' is required"}), 400

        # Normaliza e valida o número do processo: deve começar com 'PROC-' seguido apenas de dígitos (ex.: PROC-001, PROC-12, PROC-001000)
        number_raw = str(data.get("number", "")).strip()
        number = number_raw.upper()
        if not re.match(r"^PROC-\d+$", number):
            return jsonify({"error": "Formato do número inválido. Use 'PROC-' seguido apenas de números (ex.: PROC-001, PROC-12, PROC-001000)."}), 400

        # Impede duplicidade de número de processo
        for existing in PROCESSES.values():
            if existing.get("number") == number:
                return jsonify({"error": "Já existe um processo com este número. Altere o número e tente novamente."}), 409

        proc_id = str(uuid.uuid4())[:8]
        office_id = request.headers.get("X-Office-ID")
        item = {
            "id": proc_id,
            "number": number,
            "title": str(data.get("title")),
            "description": str(data.get("description", "")),
            "status": str(data.get("status", "open")),
            "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).isoformat(),
            "updated_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).isoformat(),
            "office_id": office_id,
        }
        PROCESSES[proc_id] = item
        store.save(PROCESSES)
        return jsonify(item), 201

    @app.get("/processes/<proc_id>")
    def get_process(proc_id: str):
        item = PROCESSES.get(proc_id)
        if not item:
            return jsonify({"error": "Process not found"}), 404
        office_id = request.headers.get("X-Office-ID")
        if office_id and item.get("office_id") != office_id:
            return jsonify({"error": "Process not found"}), 404
        return jsonify(item), 200

    @app.put("/processes/<proc_id>")
    def update_process(proc_id: str):
        if proc_id not in PROCESSES:
            return jsonify({"error": "Process not found"}), 404
        data = request.get_json(force=True) or {}
        current = PROCESSES[proc_id]
        office_id = request.headers.get("X-Office-ID")
        if office_id and current.get("office_id") != office_id:
            return jsonify({"error": "Process not found"}), 404
        item = current.copy()

        # Se atualizar o número, valida formato e duplicidade
        if "number" in data:
            new_number = str(data["number"]).strip().upper()
            if not re.match(r"^PROC-\d+$", new_number):
                return jsonify({"error": "Formato do número inválido. Use 'PROC-' seguido apenas de números."}), 400
            for k, existing in PROCESSES.items():
                if k != proc_id and existing.get("number") == new_number:
                    return jsonify({"error": "Já existe um processo com este número."}), 409
            item["number"] = new_number

        for field in ["title", "description", "status"]:
            if field in data:
                item[field] = str(data[field])
        item["updated_at"] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).isoformat()
        PROCESSES[proc_id] = item
        store.save(PROCESSES)
        return jsonify(item), 200

    @app.delete("/processes/<proc_id>")
    def delete_process(proc_id: str):
        if proc_id not in PROCESSES:
            return jsonify({"error": "Process not found"}), 404
        office_id = request.headers.get("X-Office-ID")
        if office_id and PROCESSES[proc_id].get("office_id") != office_id:
            return jsonify({"error": "Process not found"}), 404
        deleted = PROCESSES.pop(proc_id)
        store.save(PROCESSES)
        return jsonify({"message": "Process deleted successfully", "deleted_process": deleted}), 200

    return app


if __name__ == "__main__":
    PORT = int(os.getenv("PROCESSES_PORT", "5005"))
    app = create_app()
    print(f"Processes Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)


