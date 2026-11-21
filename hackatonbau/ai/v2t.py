import json
import os
import tempfile
from threading import Lock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from faster_whisper import WhisperModel

HOST = "127.0.0.1"
PORT = 8001
MAX_FILE_SIZE = 25 * 1024 * 1024

# Load Whisper once
model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)

model_lock = Lock()

LANGUAGES = {
    "en": "English",
    "de": "German",
    "tr": "Turkish",
    "fr": "French",
    "es": "Spanish",
    "ar": "Arabic",
    "zh": "Chinese",
    "ja": "Japanese"
}

def transcribe(audio_path):
    with model_lock:
        segments, info = model.transcribe(
            audio_path,
            task="translate",
            language=None,
            beam_size=5,
            vad_filter=True
        )
        segments = list(segments)

    return {
        "original_language": info.language,
        "language_name": LANGUAGES.get(info.language, info.language),
        "output_language": "en",
        "text": " ".join(s.text.strip() for s in segments),
        "segments": [
            {
                "start": s.start,
                "end": s.end,
                "text": s.text.strip()
            }
            for s in segments
        ]
    }

class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self.respond(200, {
                "status": "ready",
                "model": "whisper-small",
                "device": "cpu"
            })

        self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/transcribe":
            return self.respond(404, {"error": "Not found"})

        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.respond(400, {"error": "Invalid content length"})

        if size <= 0 or size > MAX_FILE_SIZE:
            return self.respond(400, {"error": "Invalid audio size"})

        extension = self.headers.get(
            "X-Audio-Extension", ".wav"
        ).lower()

        allowed = {
            ".wav", ".mp3", ".webm",
            ".ogg", ".m4a", ".mp4", ".flac"
        }

        if extension not in allowed:
            return self.respond(400, {
                "error": "Unsupported audio format"
            })

        audio_path = None

        try:
            with tempfile.NamedTemporaryFile(
                suffix=extension,
                delete=False
            ) as file:
                file.write(self.rfile.read(size))
                audio_path = file.name

            result = transcribe(audio_path)
            self.respond(200, result)

        except Exception as error:
            print("Whisper error:", error, flush=True)

            self.respond(500, {
                "error": "Transcription failed"
            })

        finally:
            if audio_path:
                os.unlink(audio_path)

if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)

    print(f"Whisper ready on http://{HOST}:{PORT}", flush=True)

    server.serve_forever()