from flask import Flask, request, jsonify
import os, uuid

PORT = int(os.getenv("HEARINGS_PORT", "5003"))
app = Flask(__name__)
HEARINGS = []

@app.get("/")
def root_index():
    return {"service":"hearings","health":"/health"}, 200

@app.get("/favicon.ico")
def favicon():
    return ("", 204)

@app.get("/health")
def health():
    return {"status": "ok", "count": len(HEARINGS)}

@app.post("/hearings")
def create_hearing():
    data = request.get_json(force=True)
    item = {
        "id": str(uuid.uuid4())[:8],
        "process_id": data.get("process_id", ""),
        "date": data.get("date", ""),
        "courtroom": data.get("courtroom", "Sala 1")
    }
    HEARINGS.append(item)
    return jsonify(item), 201

@app.get("/hearings")
def list_hearings():
    date = request.args.get("date")
    items = HEARINGS
    if date:
        items = [h for h in HEARINGS if h.get("date") == date]
    return jsonify({"items": items}), 200

if __name__ == "__main__":
    print(f"Hearings Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)
