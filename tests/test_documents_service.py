import os
import json
import shutil
import pytest


DOCS_PATH = os.path.join("services", "documents", "data", "documents.json")


@pytest.fixture(autouse=True)
def backup_documents_json():
    os.makedirs(os.path.dirname(DOCS_PATH), exist_ok=True)
    backup_path = DOCS_PATH + ".bak"
    if os.path.exists(DOCS_PATH):
        shutil.copyfile(DOCS_PATH, backup_path)
    else:
        with open(DOCS_PATH, "w", encoding="utf-8") as f:
            json.dump({}, f)
    try:
        yield
    finally:
        if os.path.exists(backup_path):
            shutil.move(backup_path, DOCS_PATH)


def test_documents_crud():
    from services.documents.app import service

    app = service.app
    client = app.test_client()

    # Create
    resp = client.post(
        "/documents",
        json={"title": "Doc", "content": "Texto", "author": "Autor"},
    )
    assert resp.status_code == 201
    created = resp.get_json()
    doc_id = created["id"]

    # List
    resp = client.get("/documents")
    assert resp.status_code == 200

    # Get
    resp = client.get(f"/documents/{doc_id}")
    assert resp.status_code == 200

    # Update
    resp = client.put(f"/documents/{doc_id}", json={"title": "Doc2"})
    assert resp.status_code == 200
    assert resp.get_json()["title"] == "Doc2"

    # Delete
    resp = client.delete(f"/documents/{doc_id}")
    assert resp.status_code == 200


