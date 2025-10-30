"""
Serviço de Autenticação isolado com persistência JSON
Endpoints:
- POST /auth/register (suporta cadastro de escritório + usuário)
- POST /auth/login
- POST /auth/users (criação de usuário pelo admin)
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
    users_file = os.path.join(data_dir, "users.json")
    offices_file = os.path.join(data_dir, "offices.json")
    users_store = JsonStore(users_file, default={})
    offices_store = JsonStore(offices_file, default={})
    USERS: Dict[str, Any] = users_store.load()
    OFFICES: Dict[str, Any] = offices_store.load()

    # Domínios permitidos para login por e-mail e seu mapeamento de tipo de usuário
    ALLOWED_LOGIN_DOMAINS = {
        "admin.com": "admin",
        "advogado.com": "advogado",
        "estagiario.com": "estagiario",
    }

    # Seed de usuários padrão se o arquivo estiver vazio (agora com emails)
    if not USERS:
        USERS = {
            "admin@admin.com": {
                "password_hash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",  # admin123
                "email": "admin@admin.com",
                "name": "Administrador",
                "roles": ["admin", "advogado", "user"],
                "permissions": ["read", "write", "delete", "orchestrate", "create_user"],
                "office_id": "office-default",
            },
            "advogado@advogado.com": {
                "password_hash": "ac3226b60081e5f9f9f1f784838aca038eb7c2f7411cb90702b6c2bfe07a45a9",  # lawyer123
                "email": "advogado@advogado.com",
                "name": "Advogado Principal",
                "roles": ["advogado", "user"],
                "permissions": ["read", "write", "orchestrate"],
                "office_id": "office-default",
            },
            "estagiario@estagiario.com": {
                "password_hash": "534d9b45e4168ad5e7ab39ddde0387982ec6a2a18b992f62738b23fcde72f7e7",  # intern123
                "email": "estagiario@estagiario.com",
                "name": "Estagiário",
                "roles": ["estagiario", "user"],
                "permissions": ["read"],
                "office_id": "office-default",
            },
        }
    users_store.save(USERS)

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
            users_store.save(USERS)
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

    def _roles_permissions_from_user_type(user_type: Optional[str]):
        """
        Define roles e permissões baseado no tipo de usuário.
        
        Admin: Todas as permissões + criar usuários + deletar tudo
        Advogado: Criar processos, documentos, prazos, audiências + visualizar tudo
        Estagiário: Apenas visualizar
        """
        user_type = (user_type or '').lower().strip()
        if user_type == 'admin':
            return ["admin", "advogado", "user"], ["read", "write", "delete", "orchestrate", "create_user"]
        if user_type == 'advogado':
            return ["advogado", "user"], ["read", "write", "orchestrate"]
        if user_type == 'estagiario':
            return ["estagiario", "user"], ["read"]
        # default minimal
        return ["user"], ["read"]

    def _user_type_from_email(username: str) -> Optional[str]:
        if "@" not in (username or ""):
            return None
        try:
            domain = username.split("@", 1)[1].lower()
        except Exception:
            return None
        return ALLOWED_LOGIN_DOMAINS.get(domain)

    @app.post("/auth/register")
    def register():
        """
        Registro de usuário usando EMAIL (obrigatório).
        O papel é automaticamente detectado pelo domínio do email.
        """
        data = request.get_json(force=True) or {}
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        name = str(data.get("name", "")).strip()

        # Cadastro do escritório (opcional)
        office_name = str(data.get("office_name", "")).strip()
        cnpj = str(data.get("cnpj", "")).strip()
        responsible_name = str(data.get("responsible_name", "")).strip()
        oab_number = str(data.get("oab_number", "")).strip()
        phone = str(data.get("phone", "")).strip()

        # Validações
        if not email or "@" not in email:
            return jsonify({"error": "Email válido é obrigatório"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Senha deve ter no mínimo 6 caracteres"}), 400

        # Detecta tipo de usuário pelo domínio do email
        user_type = _user_type_from_email(email)
        if not user_type:
            return jsonify({"error": "Domínio de e-mail não permitido. Use @admin.com, @advogado.com ou @estagiario.com"}), 400

        if email in USERS:
            return jsonify({"error": "Email já cadastrado"}), 409

        # Define roles e permissões automaticamente
        roles, permissions = _roles_permissions_from_user_type(user_type)

        import uuid as _uuid
        # Office ID: usa o enviado, senão cria um novo
        office_id = data.get("office_id") or _uuid.uuid4().hex[:12]

        # Cria/atualiza escritório
        if office_id not in OFFICES:
            OFFICES[office_id] = {
                "id": office_id,
                "name": office_name or "Escritório",
                "cnpj": cnpj,
                "responsible_name": responsible_name,
                "oab_number": oab_number,
                "email": email,
                "phone": phone,
            }
        else:
            # atualiza alguns campos se enviados
            off = OFFICES[office_id]
            for k, v in (('name', office_name), ('cnpj', cnpj), ('responsible_name', responsible_name),
                         ('oab_number', oab_number), ('email', email), ('phone', phone)):
                if v:
                    off[k] = v

        offices_store.save(OFFICES)

        # Cria usuário
        USERS[email] = {
            "password_hash": hash_password(password),
            "email": email,
            "name": name or email.split("@")[0],
            "user_type": user_type,
            "roles": roles,
            "permissions": permissions,
            "office_id": office_id,
        }
        users_store.save(USERS)

        return jsonify({
            "user": {
                "email": email,
                "name": USERS[email]["name"],
                "user_type": user_type,
                "roles": roles,
                "permissions": permissions,
                "office_id": office_id,
            },
            "office": OFFICES.get(office_id)
        }), 201

    @app.post("/auth/login")
    def login():
        """Login usando EMAIL e senha"""
        data = request.get_json(force=True) or {}
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        # Validar email
        if not email or "@" not in email:
            return jsonify({"error": "Email válido é obrigatório"}), 400

        # Validar domínio permitido
        if not _user_type_from_email(email):
            return jsonify({"error": "Domínio de e-mail não permitido. Use @admin.com, @advogado.com ou @estagiario.com"}), 400

        user = USERS.get(email)
        if not user:
            return jsonify({"error": "Credenciais inválidas"}), 401

        if user.get("password_hash") != hash_password(password):
            return jsonify({"error": "Credenciais inválidas"}), 401

        # Garante office_id e campos novos para contas antigas
        if not user.get("office_id"):
            import uuid as _uuid
            user["office_id"] = _uuid.uuid4().hex[:12]
        if not user.get("email"):
            user["email"] = email
        if not user.get("user_type"):
            user["user_type"] = _user_type_from_email(email)
        USERS[email] = user
        users_store.save(USERS)

        return jsonify({
            "user": {
                "email": email,
                "name": user.get("name", email.split("@")[0]),
                "user_type": user.get("user_type"),
                "roles": user.get("roles", []),
                "permissions": user.get("permissions", []),
                "office_id": user.get("office_id"),
            }
        }), 200

    @app.post("/auth/users")
    def create_user_by_admin():
        """
        Criação de usuário por admin usando EMAIL.
        O papel é automaticamente detectado pelo domínio.
        """
        data = request.get_json(force=True) or {}
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        name = str(data.get("name", "")).strip()
        office_id = str(data.get("office_id", "")).strip()
        
        if not office_id:
            return jsonify({"error": "office_id is required"}), 400
        
        if not email or "@" not in email:
            return jsonify({"error": "Email válido é obrigatório"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Senha deve ter no mínimo 6 caracteres"}), 400
        
        if email in USERS:
            return jsonify({"error": "Email já cadastrado"}), 409

        # Detecta tipo automaticamente pelo domínio
        user_type = _user_type_from_email(email)
        if not user_type:
            return jsonify({"error": "Domínio de e-mail não permitido. Use @admin.com, @advogado.com ou @estagiario.com"}), 400

        roles, permissions = _roles_permissions_from_user_type(user_type)

        USERS[email] = {
            "password_hash": hash_password(password),
            "email": email,
            "name": name or email.split("@")[0],
            "user_type": user_type,
            "roles": roles,
            "permissions": permissions,
            "office_id": office_id,
        }
        users_store.save(USERS)

        return jsonify({
            "user": {
                "email": email,
                "name": USERS[email]["name"],
                "user_type": user_type,
                "roles": USERS[email]["roles"],
                "permissions": USERS[email]["permissions"],
                "office_id": office_id,
            }
        }), 201

    @app.get("/offices/<office_id>")
    def get_office(office_id):
        """Retorna informações de um escritório"""
        office = OFFICES.get(office_id)
        if not office:
            return jsonify({"error": "Office not found"}), 404
        return jsonify(office), 200

    return app


if __name__ == "__main__":
    PORT = int(os.getenv("AUTH_PORT", "5004"))
    app = create_app()
    print(f"Auth Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)


