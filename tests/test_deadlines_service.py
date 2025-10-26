import os
import json
import shutil
import pytest


DEAD_PATH = os.path.join("services", "deadlines", "data", "deadlines.json")


@pytest.fixture(autouse=True)
def backup_deadlines_json():
    os.makedirs(os.path.dirname(DEAD_PATH), exist_ok=True)
    backup_path = DEAD_PATH + ".bak"
    if os.path.exists(DEAD_PATH):
        shutil.copyfile(DEAD_PATH, backup_path)
    else:
        with open(DEAD_PATH, "w", encoding="utf-8") as f:
            json.dump([], f)
    try:
        yield
    finally:
        if os.path.exists(backup_path):
            shutil.move(backup_path, DEAD_PATH)


def test_deadlines_crud():
    from services.deadlines.app import create_app

    app = create_app()
    client = app.test_client()

    # Create
    resp = client.post(
        "/deadlines",
        json={"process_id": "P1", "due_date": "2099-01-01", "description": "d"},
    )
    assert resp.status_code == 201
    created = resp.get_json()
    deadline_id = created["id"]

    # List
    resp = client.get("/deadlines")
    assert resp.status_code == 200

    # Today (should be 200 always)
    resp = client.get("/deadlines/today")
    assert resp.status_code == 200

    # Delete
    resp = client.delete(f"/deadlines/{deadline_id}")
    assert resp.status_code == 200


