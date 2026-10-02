"""Local tutor server. Serves the app and judges writing on this machine only."""

import json
from pathlib import Path

from server.haiku import judge_flaws, judge_writing
from server.judge import local_flaws, local_writing, score_zone
from server.runner import run_ahead

try:
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
except ImportError:  # pragma: no cover
    from http.server import BaseHTTPRequestHandler, HTTPServer as ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
HOST = "127.0.0.1"
PORT = 8765


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/app", "/app/"):
            self._redirect("/app/index.html")
            return
        if not path.startswith("/app/"):
            self.send_error(404)
            return
        rel = path[len("/app/") :]
        target = (APP / rel).resolve()
        try:
            target.relative_to(APP)
        except ValueError:
            self.send_error(404)
            return
        if not target.is_file():
            self.send_error(404)
            return
        kind = "text/html"
        if target.suffix == ".css":
            kind = "text/css"
        elif target.suffix == ".js":
            kind = "text/javascript"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", kind + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length") or "0")
        if length > 20000:
            self._json(413, {"error": "That request is too large."})
            return
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "Send JSON."})
            return
        if path == "/api/write":
            self._json(200, self._write(body))
            return
        if path == "/api/review-score":
            self._json(200, score_zone(bool(body.get("production")), body.get("score")))
            return
        if path == "/api/review-flaws":
            self._json(200, self._flaws(body))
            return
        self.send_error(404)

    def _write(self, body):
        code = str(body.get("code") or "")
        ran = run_ahead(code)
        judged = judge_writing(body.get("apiKey") or "", code, ran["tests_pass"], local_writing)
        return {
            "testsPass": ran["tests_pass"],
            "failures": ran["failures"],
            "pass": bool(judged.get("pass")) and ran["tests_pass"],
            "note": judged.get("note") or "",
            "by": judged.get("by") or "rubric",
        }

    def _flaws(self, body):
        judged = judge_flaws(body.get("apiKey") or "", str(body.get("text") or ""), local_flaws)
        return {
            "pass": bool(judged.get("pass")),
            "note": judged.get("note") or "",
            "missed": judged.get("missed") or [],
            "by": judged.get("by") or "rubric",
        }

    def _json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    def log_message(self, fmt, *args):
        return


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Python Campaign at http://%s:%s/app/" % (HOST, PORT))
    server.serve_forever()


if __name__ == "__main__":
    main()
