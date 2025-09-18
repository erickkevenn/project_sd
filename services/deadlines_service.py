from flask import Flask, request, jsonify
import os, datetime, uuid

PORT = int(os.getenv("DEADLINES_PORT", "5002"))
app = Flask(__name__)
DEADLINES = []

@app.get("/")
def root_index():
    return {"service":"deadlines","health":"/health"}, 200

@app.get("/favicon.ico")
def favicon():
    return ("", 204)

@app.get("/health")
def health():
    return {"status": "ok", "count": len(DEADLINES)}

@app.get("/deadlines")
def list_deadlines():
    return jsonify(DEADLINES), 200

@app.post("/deadlines")
def create_deadline():
    data = request.get_json(force=True)
    item = {
        "id": str(uuid.uuid4())[:8],
        "process_id": data.get("process_id", ""),
        "due_date": data.get("due_date", ""),
    }
    DEADLINES.append(item)
    return jsonify(item), 201

@app.get("/deadlines/today")
def deadlines_today():
    today = datetime.date.today().isoformat()
    todays = [d for d in DEADLINES if d.get("due_date") == today]
    return jsonify({"date": today, "items": todays}), 200

@app.delete("/deadlines/<deadline_id>")
def delete_deadline(deadline_id):
    global DEADLINES
    for i, deadline in enumerate(DEADLINES):
        if deadline.get("id") == deadline_id:
            deleted_deadline = DEADLINES.pop(i)
            return jsonify({
                "message": "Deadline deleted successfully",
                "deleted_deadline": deleted_deadline
            }), 200
    return jsonify({"error": "Deadline not found"}), 404

if __name__ == "__main__":
    print(f"Deadlines Service on {PORT}")
    app.run(port=PORT, host="0.0.0.0", debug=True)
