from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from SQLAgent import get_agent, ask_question

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow requests from the frontend

# Pre-load the agent when the server starts
print("Initializing SQL Agent...")
_agent = get_agent()
if _agent:
    print("SQL Agent ready.")
else:
    print("WARNING: SQL Agent failed to initialize. Check GROQ_API_KEY and DATABASE_URL.")


@app.route("/")
def index():
    return jsonify({
        "service": "NagarSeva SQL Agent",
        "status": "running" if _agent else "agent_unavailable",
        "description": "Natural language to SQL query interface for municipal data.",
    })


@app.route("/health")
def health():
    return jsonify({"status": "ok", "agent_ready": _agent is not None})


@app.route("/ask", methods=["POST"])
def ask():
    """
    POST /ask?question=<your question>&language=<english|hindi|gujarati>
    Body: (optional) { "question": "...", "language": "..." }
    Returns: { "result": { "content": "..." }, "question": "..." }
    """
    if not _agent:
        return jsonify({"error": "Agent not initialized. Check server logs."}), 503

    # Accept question from query string or JSON body
    question = request.args.get("question") or (request.get_json(silent=True) or {}).get("question", "")
    language = request.args.get("language", "english")

    if not question:
        return jsonify({"error": "Missing 'question' parameter."}), 400

    # Append language instruction if not English
    if language == "hindi":
        question = f"{question}\n\nPlease respond in Hindi (Devanagari script)."
    elif language == "gujarati":
        question = f"{question}\n\nPlease respond in Gujarati script."

    try:
        answer = ask_question(question, _agent)
        return jsonify({
            "question": request.args.get("question") or question,
            "result": {"content": answer},
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Run on port 5001 to avoid conflict with the Node.js backend (3000)
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, host="0.0.0.0", port=port)