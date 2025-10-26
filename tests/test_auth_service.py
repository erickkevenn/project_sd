import os
import json
import shutil
import pytest


USERS_PATH = os.path.join("services", "auth", "data", "users.json")


@pytest.fixture(autouse=True)
def backup_users_json():
    os.makedirs(os.path.dirname(USERS_PATH), exist_ok=True)
    backup_path = USERS_PATH + ".bak"
    if os.path.exists(USERS_PATH):
        shutil.copyfile(USERS_PATH, backup_path)
    else:
        with open(USERS_PATH, "w", encoding="utf-8") as f:
            json.dump({}, f)
    try:
        yield
    finally:
        if os.path.exists(backup_path):
            shutil.move(backup_path, USERS_PATH)


def test_auth_register_and_login():
    from services.auth.app import create_app

    app = create_app()
    client = app.test_client()

    # Register
    resp = client.post(
        "/auth/register",
        json={"username": "test_user", "password": "secret123", "roles": ["user"], "permissions": ["read"]},
    )
    assert resp.status_code in (200, 201)
    data = resp.get_json()
    assert data and data.get("user", {}).get("username") == "test_user"

    # Login
    resp = client.post(
        "/auth/login", json={"username": "test_user", "password": "secret123"}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data and data.get("user", {}).get("username") == "test_user"

    # Invalid login
    resp = client.post(
        "/auth/login", json={"username": "test_user", "password": "wrong"}
    )
    assert resp.status_code == 401


