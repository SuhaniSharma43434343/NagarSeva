from flask import Flask, request, jsonify
import hmac
import os
import threading
from dotenv import load_dotenv
from SQLAgent import get_agent, ask_question

load_dotenv()
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16384
service_key = os.getenv("INTERNAL_API_KEY", "")
if os.getenv("APP_ENV") == "production" and not service_key:
    raise RuntimeError("INTERNAL_API_KEY is required in production")
agent_lock = threading.Lock()

@app.before_request
def authenticate():
    if request.path in ("/", "/health", "/ready"):
        return None
    if service_key and not hmac.compare_digest(request.headers.get("X-Service-Key", ""), service_key):
        return jsonify({"error": "Unauthorized"}), 401

@app.get("/")
@app.get("/health")
def health():
    return jsonify({"service": "NagarSeva SQL Agent", "status": "ok"})

@app.get("/ready")
def ready():
    with agent_lock:
        agent = get_agent()
    return jsonify({"status": "ready" if agent else "unavailable"}), 200 if agent else 503

@app.post("/ask")
def ask():
    body = request.get_json(silent=True) or {}
    question = request.args.get("question") or body.get("question", "")
    language = request.args.get("language") or body.get("language", "english")
    if not isinstance(question, str) or not question.strip() or len(question) > 4000:
        return jsonify({"error": "Provide a question between 1 and 4000 characters."}), 400
    if language not in ("english", "hindi", "gujarati"):
        return jsonify({"error": "Unsupported language."}), 400
    original = question
    if language == "hindi":
        question += "\nPlease respond in Hindi (Devanagari script)."
    elif language == "gujarati":
        question += "\nPlease respond in Gujarati script."
    try:
        with agent_lock:
            agent = get_agent()
        if agent is None:
            return jsonify({"error": "Agent unavailable. Check server configuration."}), 503
        return jsonify({"question": original, "result": {"content": ask_question(question, agent)}})
    except Exception:
        app.logger.exception("SQL agent request failed")
        return jsonify({"error": "Unable to answer the question right now."}), 502

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")))
