"""
Serviço de Prazos isolado com persistência JSON
"""

import os
import json
import threading
from typing import Dict, Any, List, Optional

from flask import Flask, request, jsonify


class JsonListStore:
    """Persistência simples em arquivo JSON (lista de dicts)."""

    def __init__(self, file_path: str, default: Optional[List[Dict[str, Any]]] = None):
        self.file_path = file_path
        self.default: List[Dict[str, Any]] = default or []
        self._lock = threading.Lock()
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            self._atomic_write(self.default)

    def _atomic_write(self, data: List[Dict[str, Any]]) -> None:
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(temp_path, self.file_path)

    def load(self) -> List[Dict[str, Any]]:
        with self._lock:
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if not isinstance(data, list):
                    return self.default.copy()
                return data
            except Exception:
                return self.default.copy()

    def save(self, data: List[Dict[str, Any]]) -> None:
        with self._lock:
            self._atomic_write(data)


def create_app() -> Flask:
    app = Flask(__name__)

    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data")
    store_file = os.path.join(data_dir, "deadlines.json")
    store = JsonListStore(store_file, default=[])
    DEADLINES: List[Dict[str, Any]] = store.load()

    import uuid, datetime

    @app.get("/")
    def root_index():
        return {"service": "deadlines", "health": "/health"}, 200

    @app.get("/favicon.ico")
    def favicon():
        return ("", 204)

    @app.get("/health")
    def health():
        return {"status": "ok", "count": len(DEADLINES)}, 200

    @app.get("/deadlines")
    def list_deadlines():
        return jsonify(DEADLINES), 200

    @app.post("/deadlines")
    def create_deadline():
        data = request.get_json(force=True)
        item = {
            "id": str(uuid.uuid4())[:8],
            "process_id": data.get("process_id", ""),
            "due_date": data.get("due_date", ""),
            "description": data.get("description", ""),
        }
        DEADLINES.append(item)
        store.save(DEADLINES)
        return jsonify(item), 201

    @app.get("/deadlines/today")
    def deadlines_today():
        today = datetime.date.today().isoformat()
        todays = [d for d in DEADLINES if d.get("due_date") == today]
        return jsonify({"date": today, "items": todays}), 200

    @app.delete("/deadlines/<deadline_id>")
    def delete_deadline(deadline_id):
        nonlocal DEADLINES
        for i, deadline in enumerate(DEADLINES):
            if deadline.get("id") == deadline_id:
                deleted_deadline = DEADLINES.pop(i)
                store.save(DEADLINES)
                return jsonify({
                    "message": "Deadline deleted successfully",
                    "deleted_deadline": deleted_deadline
                }), 200
        return jsonify({"error": "Deadline not found"}), 404

    return app


if __name__ == "__main__":
    PORT = int(os.getenv("DEADLINES_PORT", "5002"))
    app = create_app()
    print(f"Deadlines Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)


