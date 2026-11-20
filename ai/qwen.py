import argparse
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

import torch
from word2number import w2n
from transformers import AutoProcessor, BitsAndBytesConfig, Qwen2_5_VLForConditionalGeneration
from qwen_vl_utils import process_vision_info
from lmformatenforcer import JsonSchemaParser
from lmformatenforcer.characterlevelparser import CharacterLevelParserConfig
from lmformatenforcer.integrations.transformers import build_transformers_prefix_allowed_tokens_fn

MODEL_ID = "Qwen/Qwen2.5-VL-3B-Instruct"
HOST, PORT = "127.0.0.1", 8002
MAX_REQUEST_SIZE = 128 * 1024
model_lock = Lock()

LIST_FIELDS = ("completed_work", "issues", "image_observations", "missing_information")
SCALAR_FIELDS = ("project", "report_date", "location")

nullable_text = {"anyOf": [{"type": "string", "maxLength": 80}, {"type": "null"}]}
short_list = {"type": "array", "items": {"type": "string", "maxLength": 110}, "maxItems": 4}

JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "project": nullable_text,
        "report_date": nullable_text,
        "location": nullable_text,
        "completed_work": short_list,
        "workers_present": {"anyOf": [{"type": "integer", "minimum": 0}, {"type": "null"}]},
        "issues": short_list,
        "image_observations": short_list,
        "missing_information": short_list
    },
    "required": [
        "project", "report_date", "location", "completed_work",
        "workers_present", "issues", "image_observations", "missing_information"
    ],
    "additionalProperties": False
}

SYSTEM_PROMPT = """You extract construction-site facts into a short JSON report in English.
Return ONLY the JSON object with exactly the requested fields.
Each list item is ONE SHORT factual phrase, max 12 words. Never write paragraphs.
Use null for information not supplied; use [] for absent lists.
Do not guess dates, project names, locations, worker counts or quantities.
'Installed windows' belongs in completed_work; '2 windows broken' belongs in issues.
Numbers describe only the items they are attached to; never copy worker counts to installed items.
Never invent a number when the transcription does not contain one.
For image_observations, only describe things visible in an image; [] if no image was provided.
List missing project name, report date, or location if they are not given.
"""

NUMBER_WORDS = (
    "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|"
    "thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|"
    "thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand"
)

NUMBER_PATTERN = re.compile(
    rf"\b(?:{NUMBER_WORDS})(?:[\s-]+(?:{NUMBER_WORDS}))*\b", re.I
)

def normalize_numbers(text):
    def convert(match):
        try:
            return str(w2n.word_to_num(match.group()))
        except ValueError:
            return match.group()
    return NUMBER_PATTERN.sub(convert, text.lower())

def source_facts(text):
    src = normalize_numbers(text)

    workers = set(
        int(n) for n in re.findall(
            r"\b(\d+)\s+(?:workers?|employees?|laborers?)\b", src
        )
    )

    installed = [
        (int(n), noun) for n, noun in re.findall(
            r"\b(?:installed|fitted|mounted)\s+(\d+)\s+([a-z-]+)\b", src
        )
    ]

    damaged = [
        (int(n), noun) for n, noun in re.findall(
            r"\b(\d+)\s+([a-z-]+)\s+(?:(?:are|is|were|was)\s+)?(?:damaged|broken)\b",
            src
        )
    ]

    damaged += [
        (int(n), noun) for n, noun in re.findall(
            r"\b(?:damaged|broke)\s+(\d+)\s+([a-z-]+)\b", src
        )
    ]

    uncounted = re.findall(
        r"\b(?:installed|fitted|mounted)\s+(?:a|an|the)\s+([a-z-]+)\b",
        src
    )

    return (
        workers,
        list(dict.fromkeys(installed)),
        list(dict.fromkeys(damaged)),
        list(dict.fromkeys(uncounted))
    )

def empty_report():
    return {
        "project": None,
        "report_date": None,
        "location": None,
        "completed_work": [],
        "workers_present": None,
        "issues": [],
        "image_observations": [],
        "missing_information": []
    }

def clean_report(raw):
    if not isinstance(raw, dict):
        raise ValueError("Generated JSON is not an object")

    report = empty_report()
    warnings = []

    for key in SCALAR_FIELDS:
        value = raw.get(key)

        if isinstance(value, str):
            value = value.strip() or None

        if value is not None and not isinstance(value, str):
            warnings.append(f"Invalid {key} value removed")
            value = None

        report[key] = value

    workers = raw.get("workers_present")

    if type(workers) is int and workers >= 0:
        report["workers_present"] = workers
    elif workers is not None:
        warnings.append("Unusable worker count removed")

    for key in LIST_FIELDS:
        values = raw.get(key, [])

        if not isinstance(values, list):
            warnings.append(f"Invalid {key} discarded")
            continue

        clean = []

        for item in values:
            if not isinstance(item, str):
                warnings.append(f"Non-text value removed from {key}")
                continue

            item = item.strip()

            if (
                item
                and item.lower() not in {
                    "none", "null", "completed_work", "issues", "number_of_doors"
                }
                and item not in clean
            ):
                clean.append(item[:110])

        report[key] = clean[:4]

    return report, warnings

def reconcile_with_text(text, report, warnings):
    workers, installed, damaged, uncounted = source_facts(text)

    if len(workers) == 1:
        expected = next(iter(workers))

        if report["workers_present"] != expected:
            warnings.append(
                f"Worker count corrected from transcript to {expected}"
            )

        report["workers_present"] = expected

    elif len(workers) > 1:
        warnings.append("Multiple worker counts mentioned; manual review needed")
        report["workers_present"] = None

    elif report["workers_present"] is not None:
        warnings.append(
            "Worker count not found in transcript; removed unverified estimate"
        )
        report["workers_present"] = None

    # Correct installation quantities when explicitly stated
    for quantity, noun in installed:
        report["completed_work"] = [
            entry for entry in report["completed_work"]
            if not (
                re.search(r"\b(?:installed|fitted|mounted)\b", entry, re.I)
                and re.search(rf"\b{re.escape(noun)}\b", entry, re.I)
            )
        ]

        report["completed_work"].append(f"Installed {quantity} {noun}")

        report["issues"] = [
            entry for entry in report["issues"]
            if not (
                re.search(r"\binstalled\b", entry, re.I)
                and re.search(rf"\b{re.escape(noun)}\b", entry, re.I)
            )
        ]

    # Installation mentioned but quantity missing
    for noun in uncounted:
        if any(found_noun == noun for _, found_noun in installed):
            continue

        report["completed_work"] = [
            entry for entry in report["completed_work"]
            if not (
                re.search(r"\b(?:installed|fitted|mounted)\b", entry, re.I)
                and re.search(rf"\b{re.escape(noun)}\b", entry, re.I)
            )
        ]

        report["completed_work"].append(
            f"Installed {noun} (quantity not stated)"
        )

        warnings.append(
            f"Installation quantity missing from transcription for {noun}; review audio"
        )

    # Correct damage quantities when explicitly stated
    for quantity, noun in damaged:
        report["issues"] = [
            entry for entry in report["issues"]
            if not (
                re.search(rf"\b{re.escape(noun)}\b", entry, re.I)
                and re.search(r"\b(?:broken|damaged)\b", entry, re.I)
            )
        ]

        report["issues"].append(f"{quantity} {noun} damaged")

        report["completed_work"] = [
            entry for entry in report["completed_work"]
            if not (
                re.search(rf"\b{re.escape(noun)}\b", entry, re.I)
                and re.search(r"\b(?:broken|damaged)\b", entry, re.I)
            )
        ]

    missing = []

    for key, label in (
        ("project", "Project name"),
        ("report_date", "Report date"),
        ("location", "Location")
    ):
        if report[key] is None:
            missing.append(label)

    report["missing_information"] = list(
        dict.fromkeys(missing + report["missing_information"])
    )[:6]

    report["verification_warnings"] = list(dict.fromkeys(warnings))

    return report

# Load Qwen once
print("Loading Qwen model...", file=sys.stderr, flush=True)

quantization = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)

model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    quantization_config=quantization,
    dtype=torch.float16,
    device_map="auto"
)

processor = AutoProcessor.from_pretrained(
    MODEL_ID,
    min_pixels=256 * 28 * 28,
    max_pixels=512 * 28 * 28,
    use_fast=False
)

parser_config = CharacterLevelParserConfig(
    force_json_field_order=True,
    max_consecutive_whitespaces=2,
    max_json_array_length=4
)

def generate_report(text="", image_path=None):
    if not text.strip() and not image_path:
        raise ValueError("Provide text or an image")

    content = []

    if image_path:
        image = Path(image_path).resolve()

        if not image.is_file():
            raise FileNotFoundError(image)

        content.append({
            "type": "image",
            "image": image.as_uri()
        })

    content.append({
        "type": "text",
        "text": (
            f"Construction notes:\n{text}\n"
            "Return the short JSON report now."
        )
    })

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content}
    ]

    prompt = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    image_inputs, video_inputs = process_vision_info(messages)

    inputs = processor(
        text=[prompt],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt"
    ).to(model.device)

    parser = JsonSchemaParser(
        JSON_SCHEMA,
        config=parser_config
    )

    allowed_fn = build_transformers_prefix_allowed_tokens_fn(
        processor.tokenizer,
        parser
    )

    with model_lock, torch.inference_mode():
        generated = model.generate(
            **inputs,
            max_new_tokens=650,
            do_sample=False,
            prefix_allowed_tokens_fn=allowed_fn,
            pad_token_id=processor.tokenizer.pad_token_id
        )

    generated = generated[:, inputs.input_ids.shape[1]:]

    output = processor.batch_decode(
        generated,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False
    )[0]

    try:
        report, warnings = clean_report(json.loads(output.strip()))

    except (ValueError, json.JSONDecodeError) as error:
        print(
            f"Qwen JSON problem: {error}. "
            f"First 300 chars: {output[:300]!r}",
            file=sys.stderr,
            flush=True
        )

        if image_path and not text.strip():
            raise ValueError(
                "Image analysis failed; report needs manual review"
            ) from error

        report = empty_report()

        warnings = [
            "Qwen JSON failed; using limited transcript-based extraction. "
            "Manual review required"
        ]

    if not image_path and report["image_observations"]:
        warnings.append(
            "Removed image observations because no photograph was supplied"
        )
        report["image_observations"] = []

    return reconcile_with_text(text, report, warnings)

class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        body = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self.respond(200, {
                "status": "ready",
                "model": MODEL_ID
            })

        return self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/generate":
            return self.respond(404, {"error": "Not found"})

        try:
            size = int(self.headers.get("Content-Length", "0"))

            if not 0 < size <= MAX_REQUEST_SIZE:
                return self.respond(400, {
                    "error": "Invalid request size"
                })

            payload = json.loads(self.rfile.read(size))

            if (
                not isinstance(payload, dict)
                or not isinstance(payload.get("text"), str)
                or not payload["text"].strip()
            ):
                return self.respond(400, {
                    "error": "Text is required"
                })

            report = generate_report(text=payload["text"])

            return self.respond(200, {
                "success": True,
                "report": report
            })

        except (json.JSONDecodeError, ValueError) as error:
            return self.respond(400, {"error": str(error)})

        except Exception as error:
            print(
                f"Qwen server error: {error}",
                file=sys.stderr,
                flush=True
            )

            return self.respond(500, {"error": "Qwen failed"})

if __name__ == "__main__":
    cli = argparse.ArgumentParser()

    cli.add_argument("--serve", action="store_true")

    cli.add_argument(
        "--text",
        default="Five workers installed twenty doors. Three doors were damaged."
    )

    cli.add_argument("--image")

    args = cli.parse_args()

    if args.serve:
        print(
            f"Qwen ready on http://{HOST}:{PORT}",
            flush=True
        )

        ThreadingHTTPServer(
            (HOST, PORT),
            Handler
        ).serve_forever()

    else:
        print(json.dumps(
            generate_report(args.text, args.image),
            indent=2,
            ensure_ascii=False
        ))