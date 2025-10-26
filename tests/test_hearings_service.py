import os
import json
import shutil
import pytest


HEAR_PATH = os.path.join("services", "hearings", "data", "hearings.json")


@pytest.fixture(autouse=True)
def backup_hearings_json():
    os.makedirs(os.path.dirname(HEAR_PATH), exist_ok=True)
    backup_path = HEAR_PATH + ".bak"
    if os.path.exists(HEAR_PATH):
        shutil.copyfile(HEAR_PATH, backup_path)
    else:
        with open(HEAR_PATH, "w", encoding="utf-8") as f:
            json.dump([], f)
    try:
        yield
    finally:
        if os.path.exists(backup_path):
            shutil.move(backup_path, HEAR_PATH)


def test_hearings_crud():
    from services.hearings.app import create_app

    app = create_app()
    client = app.test_client()

    # Create
    resp = client.post(
        "/hearings",
        json={"process_id": "P1", "date": "2099-01-01", "courtroom": "Sala 1", "description": "d"},
    )
    assert resp.status_code == 201
    created = resp.get_json()
    hearing_id = created["id"]

    # List
    resp = client.get("/hearings")
    assert resp.status_code == 200

    # Today (should be 200 always)
    resp = client.get("/hearings/today")
    assert resp.status_code == 200

    # Delete
    resp = client.delete(f"/hearings/{hearing_id}")
    assert resp.status_code == 200


