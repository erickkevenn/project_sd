import os, requests, datetime

GATEWAY = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000")

def test_health():
    r = requests.get(f"{GATEWAY}/health", timeout=3)
    assert r.status_code == 200
    assert "services" in r.json()

def test_documents_flow():
    payload = {"title":"Teste","content":"...", "author":"QA"}
    r = requests.post(f"{GATEWAY}/api/documents", json=payload, timeout=5)
    assert r.status_code in (200,201)
    data = r.json()
    doc_id = data["id"]
    r = requests.get(f"{GATEWAY}/api/documents/{doc_id}", timeout=5)
    assert r.status_code == 200
    assert r.json()["title"] == "Teste"

def test_deadlines_today():
    today = datetime.date.today().isoformat()
    ins = {"process_id":"T-01","due_date": today}
    r = requests.post(f"{GATEWAY}/api/deadlines", json=ins, timeout=5)
    assert r.status_code in (200,201)
    r = requests.get(f"{GATEWAY}/api/deadlines/today", timeout=5)
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(d.get("process_id") == "T-01" for d in items)

def test_hearings_list():
    ins = {"process_id":"H-01","date":"2025-11-01","courtroom":"Sala 2"}
    r = requests.post(f"{GATEWAY}/api/hearings", json=ins, timeout=5)
    assert r.status_code in (200,201)
    r = requests.get(f"{GATEWAY}/api/hearings", params={"date":"2025-11-01"}, timeout=5)
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(h.get("process_id") == "H-01" for h in items)

def test_orchestrate():
    req = {
        "document": {"title":"Inicial","content":"...", "author":"Erick"},
        "deadline": {"process_id":"0001","due_date":"2025-10-12"},
        "hearing":  {"process_id":"0001","date":"2025-11-01","courtroom":"Sala 2"}
    }
    r = requests.post(f"{GATEWAY}/api/orchestrate/file-case", json=req, timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert "results" in body
