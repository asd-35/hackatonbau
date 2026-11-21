import json
import os
import subprocess
import tempfile
from threading import Lock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import imageio_ffmpeg
import numpy as np

HOST = "127.0.0.1"
PORT = 8001
MAX_FILE_SIZE = 25 * 1024 * 1024

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

BACKEND = "faster-whisper"
model = None
hf_pipe = None

try:
    from faster_whisper import WhisperModel

    # Load Whisper once
    model = WhisperModel(
        "small",
        device="cpu",
        compute_type="int8"
    )
except Exception as fw_error:
    print(f"faster-whisper unavailable ({fw_error}); falling back to transformers Whisper on CPU.", flush=True)
    BACKEND = "transformers"
    import torch
    from transformers import pipeline

    hf_pipe = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-small",
        device=-1,
        dtype=torch.float32,
        chunk_length_s=30,
    )

def decode_audio_16k(audio_path):
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    proc = subprocess.run(
        [
            ffmpeg_exe,
            "-nostdin",
            "-threads", "0",
            "-i", audio_path,
            "-f", "f32le",
            "-ac", "1",
            "-ar", "16000",
            "-"
        ],
        capture_output=True,
        check=True
    )
    return np.frombuffer(proc.stdout, np.float32).copy()

def transcribe(audio_path):
    audio = decode_audio_16k(audio_path)
    if audio.size == 0:
        return {
            "original_language": "unknown",
            "language_name": "Unknown",
            "output_language": "en",
            "text": "",
            "segments": []
        }

    if BACKEND == "faster-whisper":
        with model_lock:
            segments, info = model.transcribe(
                audio,
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

    with model_lock:
        out = hf_pipe(
            {"raw": audio, "sampling_rate": 16000},
            return_timestamps=True,
            generate_kwargs={"task": "translate"}
        )

    chunks = out.get("chunks") or []
    segments = []
    for chunk in chunks:
        ts = chunk.get("timestamp") or (0.0, 0.0)
        start = float(ts[0]) if ts[0] is not None else 0.0
        end = float(ts[1]) if len(ts) > 1 and ts[1] is not None else start
        text = str(chunk.get("text") or "").strip()
        if text:
            segments.append({"start": start, "end": end, "text": text})

    full_text = str(out.get("text") or "").strip() or " ".join(s["text"] for s in segments)
    return {
        "original_language": "auto",
        "language_name": "Auto-detected",
        "output_language": "en",
        "text": full_text,
        "segments": segments
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