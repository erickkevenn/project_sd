from flask import Flask, request, jsonify, send_from_directory
import requests, os, uuid, datetime
from flask_cors import CORS

GATEWAY_PORT = int(os.getenv("GATEWAY_PORT", "8000"))
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UI_DIR = os.path.join(BASE_DIR, "ui")

SERVICES = {
    "documents": os.getenv("DOCUMENTS_URL", "http://127.0.0.1:5001"),
    "deadlines": os.getenv("DEADLINES_URL", "http://127.0.0.1:5002"),
    "hearings":  os.getenv("HEARINGS_URL",  "http://127.0.0.1:5003"),
}
TIMEOUT = 5

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

def correlation_id():
    return request.headers.get("X-Correlation-ID", str(uuid.uuid4()))

def forward(service_name: str, method: str, path: str, json_body=None, params=None):
    base = SERVICES[service_name]
    url = f"{base}{path}"
    headers = {}
    if "Authorization" in request.headers:
        headers["Authorization"] = request.headers["Authorization"]
    headers["X-Correlation-ID"] = correlation_id()
    try:
        resp = requests.request(method, url, json=json_body, params=params, headers=headers, timeout=TIMEOUT)
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": f"{service_name} timeout"}), 504
    except Exception as e:
        return jsonify({"error": f"{service_name} error: {str(e)}"}), 502

@app.get("/")
def root_index():
    return {"service":"gateway","health":"/health","ui":"/ui",
            "api":["/api/documents","/api/deadlines","/api/hearings","/api/audiences",
                   "/api/orchestrate/file-case","/api/process/<id>/summary","/api/seed"]}

@app.get("/favicon.ico")
def favicon():
    return ("", 204)

@app.get("/ui")
def serve_ui():
    return send_from_directory(UI_DIR, "gateway_ui.html")

@app.get("/health")
def health():
    return {"status": "ok", "services": SERVICES}

# ---- Documents
@app.get("/api/documents")
def list_documents():
    return forward("documents", "GET", "/documents")

@app.post("/api/documents")
def create_document():
    return forward("documents", "POST", "/documents", json_body=request.get_json())

@app.get("/api/documents/<doc_id>")
def get_document(doc_id):
    return forward("documents", "GET", f"/documents/{doc_id}")

# ---- Deadlines
@app.get("/api/deadlines")
def list_deadlines():
    return forward("deadlines", "GET", "/deadlines")

@app.post("/api/deadlines")
def create_deadline():
    return forward("deadlines", "POST", "/deadlines", json_body=request.get_json())

@app.get("/api/deadlines/today")
def deadlines_today():
    return forward("deadlines", "GET", "/deadlines/today")

# ---- Hearings (native) + Audiences (alias)
@app.get("/api/hearings")
def list_hearings():
    return forward("hearings", "GET", "/hearings", params=request.args)

@app.post("/api/hearings")
def create_hearing():
    return forward("hearings", "POST", "/hearings", json_body=request.get_json())

@app.get("/api/audiences")
def list_audiences():
    return forward("hearings", "GET", "/hearings")

@app.post("/api/audiences")
def create_audience():
    return forward("hearings", "POST", "/hearings", json_body=request.get_json())

# ---- Orchestration
@app.get("/api/process/<proc_id>/summary")
def process_summary(proc_id):
    def safe_get(service, path):
        try:
            r = requests.get(f"{SERVICES[service]}{path}", timeout=TIMEOUT)
            return r.json()
        except Exception as e:
            return {"error": str(e)}
    docs = safe_get("documents", "/documents")
    dls  = safe_get("deadlines", "/deadlines")
    hrs  = safe_get("hearings",  "/hearings")
    return jsonify({
        "process_id": proc_id,
        "documents": docs if isinstance(docs, list) else docs.get("items", docs),
        "deadlines": dls if isinstance(dls, list) else dls.get("items", dls),
        "audiences": hrs.get("items", hrs),
    }), 200

@app.post("/api/orchestrate/file-case")
def orchestrate_file_case():
    payload = request.get_json(force=True)
    corr = correlation_id()
    headers = {"X-Correlation-ID": corr, "Content-Type": "application/json"}
    if "Authorization" in request.headers:
        headers["Authorization"] = request.headers["Authorization"]

    results = {}
    try:
        r_doc = requests.post(f"{SERVICES['documents']}/documents", json=payload.get("document", {}), headers=headers, timeout=TIMEOUT)
        results["document"] = r_doc.json()
        r_dead = requests.post(f"{SERVICES['deadlines']}/deadlines", json=payload.get("deadline", {}), headers=headers, timeout=TIMEOUT)
        results["deadline"] = r_dead.json()
        r_hear = requests.post(f"{SERVICES['hearings']}/hearings", json=payload.get("hearing", {}), headers=headers, timeout=TIMEOUT)
        results["hearing"] = r_hear.json()
    except Exception as e:
        return jsonify({"error":"orchestration_failed","detail":str(e),"partial":results,"correlation_id":corr}), 502
    return jsonify({"status":"ok","correlation_id":corr,"results":results}), 200

# ---- Seed across services
@app.post("/api/seed")
def seed_demo():
    headers = {"Content-Type": "application/json"}
    results = {}
    try:
        r1 = requests.post(f"{SERVICES['documents']}/documents", json={"title":"Petição Inicial (seed)","content":"...","author":"Erick"}, headers=headers, timeout=TIMEOUT)
        results["document"] = r1.json()
        today = datetime.date.today().isoformat()
        r2 = requests.post(f"{SERVICES['deadlines']}/deadlines", json={"process_id":"SEED-001","due_date": today}, headers=headers, timeout=TIMEOUT)
        results["deadline_today"] = r2.json()
        r3 = requests.post(f"{SERVICES['deadlines']}/deadlines", json={"process_id":"SEED-002","due_date":"2025-10-12"}, headers=headers, timeout=TIMEOUT)
        results["deadline_future"] = r3.json()
        r4 = requests.post(f"{SERVICES['hearings']}/hearings", json={"process_id":"SEED-001","date":"2025-11-01","courtroom":"Sala 2"}, headers=headers, timeout=TIMEOUT)
        results["hearing"] = r4.json()
    except Exception as e:
        return jsonify({"error":"seed_failed","detail":str(e)}), 500
    return jsonify({"status":"seeded","results":results}), 201

if __name__ == "__main__":
    print(f"API Gateway running on port {GATEWAY_PORT}")
    app.run(port=GATEWAY_PORT, host="0.0.0.0", debug=True)
