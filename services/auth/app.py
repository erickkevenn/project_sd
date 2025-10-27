"""
Serviço de Autenticação isolado com persistência JSON
Endpoints:
- POST /auth/register
- POST /auth/login
"""

import os
import json
import threading
import hashlib
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


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_app() -> Flask:
    app = Flask(__name__)

    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "data")
    store_file = os.path.join(data_dir, "users.json")
    store = JsonStore(store_file, default={})
    USERS: Dict[str, Any] = store.load()

    # Seed de usuários padrão se o arquivo estiver vazio
    if not USERS:
        USERS = {
            "admin": {
                "password_hash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",  # admin123
                "roles": ["admin", "lawyer", "user"],
                "permissions": ["read", "write", "delete", "orchestrate"],
                "office_id": "office-admin",
            },
            "lawyer": {
                "password_hash": "ac3226b60081e5f9f9f1f784838aca038eb7c2f7411cb90702b6c2bfe07a45a9",  # lawyer123
                "roles": ["lawyer", "user"],
                "permissions": ["read", "write", "orchestrate"],
                "office_id": "office-lawyer",
            },
            "intern": {
                "password_hash": "534d9b45e4168ad5e7ab39ddde0387982ec6a2a18b992f62738b23fcde72f7e7",  # intern123
                "roles": ["user"],
                "permissions": ["read"],
                "office_id": "office-intern",
            },
        }
        store.save(USERS)

    # Normalização: garante office_id para todos os usuários existentes
    try:
        import uuid as _uuid
        changed = False
        for _u, _data in list(USERS.items()):
            if not isinstance(_data, dict):
                continue
            if not _data.get("office_id"):
                _data["office_id"] = _uuid.uuid4().hex[:12]
                changed = True
        if changed:
            store.save(USERS)
    except Exception:
        pass

    @app.get("/")
    def root_index():
        return {"service": "auth", "health": "/health"}, 200

    @app.get("/favicon.ico")
    def favicon():
        return ("", 204)

    @app.get("/health")
    def health():
        return {"status": "ok", "count": len(USERS)}, 200

    @app.post("/auth/register")
    def register():
        data = request.get_json(force=True) or {}
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        roles = data.get("roles") or ["user"]
        # Por padrão, conceder read+write para permitir uso imediato da API
        permissions = data.get("permissions") or ["read", "write"]

        # Gera um office_id para o novo escritório (multi-tenant)
        import uuid as _uuid
        office_id = data.get("office_id") or _uuid.uuid4().hex[:12]

        if len(username) < 3 or len(password) < 6:
            return jsonify({"error": "Invalid username or password"}), 400

        if username in USERS:
            return jsonify({"error": "Username already exists"}), 409

        USERS[username] = {
            "password_hash": hash_password(password),
            "roles": roles,
            "permissions": permissions,
            "office_id": office_id,
        }
        store.save(USERS)

        return jsonify({
            "user": {
                "username": username,
                "roles": roles,
                "permissions": permissions,
                "office_id": office_id,
            }
        }), 201

    @app.post("/auth/login")
    def login():
        data = request.get_json(force=True) or {}
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))

        user = USERS.get(username)
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        if user.get("password_hash") != hash_password(password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Garante office_id para contas antigas
        if not user.get("office_id"):
            import uuid as _uuid
            user["office_id"] = _uuid.uuid4().hex[:12]
            USERS[username] = user
            store.save(USERS)

        return jsonify({
            "user": {
                "username": username,
                "roles": user.get("roles", []),
                "permissions": user.get("permissions", []),
                "office_id": user.get("office_id"),
            }
        }), 200

    return app


if __name__ == "__main__":
    PORT = int(os.getenv("AUTH_PORT", "5004"))
    app = create_app()
    print(f"Auth Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)


