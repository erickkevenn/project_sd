import os
import json
import shutil
import pytest


PROC_PATH = os.path.join("services", "processes", "data", "processes.json")


@pytest.fixture(autouse=True)
def backup_processes_json():
    os.makedirs(os.path.dirname(PROC_PATH), exist_ok=True)
    backup_path = PROC_PATH + ".bak"
    if os.path.exists(PROC_PATH):
        shutil.copyfile(PROC_PATH, backup_path)
    else:
        with open(PROC_PATH, "w", encoding="utf-8") as f:
            json.dump({}, f)
    try:
        yield
    finally:
        if os.path.exists(backup_path):
            shutil.move(backup_path, PROC_PATH)


def test_processes_crud():
    from services.processes.app import create_app

    app = create_app()
    client = app.test_client()

    # Create
    resp = client.post(
        "/processes",
        json={"number": "0001", "title": "Ação", "description": "Teste"},
    )
    assert resp.status_code == 201
    created = resp.get_json()
    proc_id = created["id"]

    # List
    resp = client.get("/processes")
    assert resp.status_code == 200
    items = resp.get_json()
    assert any(p.get("id") == proc_id for p in items)

    # Get
    resp = client.get(f"/processes/{proc_id}")
    assert resp.status_code == 200

    # Update
    resp = client.put(f"/processes/{proc_id}", json={"title": "Ação Atualizada"})
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "Ação Atualizada"

    # Delete
    resp = client.delete(f"/processes/{proc_id}")
    assert resp.status_code == 200


