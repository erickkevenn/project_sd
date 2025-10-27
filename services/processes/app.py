"""
Serviço de Processos isolado com persistência JSON (CRUD básico)
"""

import os
import json
import threading
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
        return jsonify(list(PROCESSES.values())), 200

    @app.post("/processes")
    def create_process():
        data = request.get_json(force=True) or {}
        required = ["number", "title"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Field '{field}' is required"}), 400
        proc_id = str(uuid.uuid4())[:8]
        item = {
            "id": proc_id,
            "number": str(data.get("number")),
            "title": str(data.get("title")),
            "description": str(data.get("description", "")),
            "status": str(data.get("status", "open")),
            "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).isoformat(),
            "updated_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).isoformat(),
        }
        PROCESSES[proc_id] = item
        store.save(PROCESSES)
        return jsonify(item), 201

    @app.get("/processes/<proc_id>")
    def get_process(proc_id: str):
        item = PROCESSES.get(proc_id)
        if not item:
            return jsonify({"error": "Process not found"}), 404
        return jsonify(item), 200

    @app.put("/processes/<proc_id>")
    def update_process(proc_id: str):
        if proc_id not in PROCESSES:
            return jsonify({"error": "Process not found"}), 404
        data = request.get_json(force=True) or {}
        item = PROCESSES[proc_id].copy()
        for field in ["number", "title", "description", "status"]:
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
        deleted = PROCESSES.pop(proc_id)
        store.save(PROCESSES)
        return jsonify({"message": "Process deleted successfully", "deleted_process": deleted}), 200

    return app


if __name__ == "__main__":
    PORT = int(os.getenv("PROCESSES_PORT", "5005"))
    app = create_app()
    print(f"Processes Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)


