import argparse
import base64
import json
import os
import re
import sys
import tempfile
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from io import BytesIO

import torch
from PIL import Image, ImageOps
from transformers import AutoProcessor, BitsAndBytesConfig, Qwen3VLForConditionalGeneration

MODEL_ID = "Qwen/Qwen3-VL-4B-Instruct"
HOST, PORT = "127.0.0.1", 8002
MAX_REQUEST = 12 * 1024 * 1024
MAX_IMAGE = 7 * 1024 * 1024
MODEL_LOCK = Lock()

SECTIONS = (
    "weather", "staffing", "inspections", "delays", "instructions",
    "completed_work", "deliveries", "equipment", "safety", "issues"
)

REPORT_TYPES = (
    "Daily Construction Report",
    "Site Inspection Report",
    "Incident/Safety Report",
    "Construction Progress Report",
    "Equipment Breakdown Report"
)

EVENT_PROMPT = """You classify numbered construction-site statements into report sections.

Return ONLY a JSON object with an events array.
Each event needs an integer id and an array of section names.

Include every sentence ID exactly once. Use [] for irrelevant statements.
One sentence may belong to multiple sections.

Allowed sections:
weather, staffing, inspections, delays, instructions,
completed_work, deliveries, equipment, safety, issues.

Definitions:
weather: Rain, clouds, wind, temperature and atmospheric conditions.
staffing: Worker counts, attendance and crews.
inspections: Inspections, checks, tests and findings.
delays: Lost time, interruptions, planned versus actual differences.
instructions: Requested actions, orders, repairs and restrictions.
completed_work: Work affirmatively performed or completed.
deliveries: Materials delivered, received, accepted or rejected.
equipment: Machinery operation, breakdown, maintenance or downtime.
safety: Injuries, falls, near misses, hazards and protective measures.
issues: Defects, damaged materials, accidents and malfunctions.

IMPORTANT:
Never classify future or planned work as completed.
Never classify work explicitly not installed as completed.
Never invent sentence IDs.
Do not omit a sentence from the events array.

Example:
{"events":[{"id":0,"sections":["staffing"]},{"id":1,"sections":["safety","issues"]}]}"""

META_PROMPT = """Extract construction project metadata.

Return ONLY:
{"project":null,"location":null,"report_date":null}

Use only specific names, locations and dates actually present in the input.
Dates must use YYYY-MM-DD.
Unknown values must be null.
Never use the current date unless explicitly supplied as the activity date.
If multiple projects are mentioned ambiguously, use null."""

CLASSIFY_PROMPT = """Classify construction evidence into all relevant report types.

Allowed:
Daily Construction Report
Site Inspection Report
Incident/Safety Report
Construction Progress Report
Equipment Breakdown Report

Daily: General construction-day activities or events.
Inspection: Actual checks, examinations or quality testing.
Incident/Safety: Injuries, falls, near misses, hazards or safety measures.
Progress: Completed construction activities, quantities or schedule progress.
Equipment: Breakdown, malfunction or downtime of construction machinery.

Broken bones are NOT equipment breakdowns.
Damaged windows alone are NOT machinery breakdowns.
Accidents alone are NOT construction progress.

Multiple classifications are allowed.
Do not invent confidence scores.

Return ONLY:
{"report_types":["Daily Construction Report"],"evidence":["Short factual reason"]}"""

VISION_PROMPT = """Inspect the construction photograph.

Return ONLY:
{"image_observations":["Short factual observation"]}

Maximum four observations.
Only describe directly visible facts.
Do not guess causes, project names, dates or worker identities.
An empty list is acceptable."""

SAFETY_BACKUP = re.compile(
    r"\b(?:injured?|injury|slipp?(?:ed|ing)|fell|fallen|ambulance|"
    r"first aid|hospital|near miss|safety barrier|guardrail|unsecured|"
    r"accident|hazard)\b",
    re.I
)

NOT_COMPLETED = re.compile(
    r"\b(?:not\s+(?:installed|completed|finished)|"
    r"were\s+not\s+installed|was\s+not\s+installed|"
    r"never\s+installed|tomorrow|planned?\s+to|"
    r"plan\s+to|will\s+(?:install|repair|complete)|"
    r"needs?\s+to\s+be\s+replaced)\b",
    re.I
)

WORK_VERB = re.compile(
    r"\b(?:installed|completed|finished|constructed|poured|laid|"
    r"assembled|excavated|built|backfilled|mounted|achieved)\b",
    re.I
)

MONTHS = (
    "January|February|March|April|May|June|July|August|"
    "September|October|November|December"
)

def extract_json(raw):
    raw = raw.strip()

    if raw.startswith("```"):
        raw = re.sub(
            r"^```(?:json)?\s*|\s*```$",
            "",
            raw,
            flags=re.I
        ).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        position = raw.find("{")

        if position < 0:
            raise ValueError(f"Model did not return JSON: {raw[:200]}")

        result, _ = decoder.raw_decode(raw[position:])
        return result

def split_evidence(text):
    results = []
    source = "site notes"

    for line in str(text).splitlines():
        line = line.strip()

        if not line:
            continue

        if re.fullmatch(r"\[[^\]]{1,160}\]", line):
            source = line[1:-1]
            continue

        for sentence in re.split(
            r"(?<=[.!?])\s+(?=[\"'A-Z0-9])",
            line
        ):
            sentence = sentence.strip()

            if sentence:
                results.append({
                    "source": source,
                    "text": sentence[:600]
                })

    return results

def work_date(text):
    dates = set()

    patterns = [
        (r"\b\d{4}-\d{2}-\d{2}\b", "%Y-%m-%d"),
        (
            rf"\b(?:{MONTHS})\s+\d{{1,2}}"
            rf"(?:st|nd|rd|th)?,?\s+\d{{4}}\b",
            "%B %d %Y"
        ),
        (
            rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+"
            rf"(?:{MONTHS})\s+\d{{4}}\b",
            "%d %B %Y"
        )
    ]

    for pattern, fmt in patterns:
        for match in re.finditer(pattern, text, re.I):
            value = re.sub(
                r"(?<=\d)(st|nd|rd|th)\b",
                "",
                match.group(),
                flags=re.I
            ).replace(",", "")

            try:
                dates.add(
                    datetime.strptime(value, fmt).date().isoformat()
                )
            except ValueError:
                continue

    return next(iter(dates)) if len(dates) == 1 else None

def worker_count(text):
    counts = {
        int(m.group(1))
        for m in re.finditer(
            r"\b(\d+)\s+(?:workers?|employees?|laborers?)\s+"
            r"(?:present|on\s+site|were\s+present|attended)\b",
            text,
            re.I
        )
    }

    words = (
        "one two three four five six seven eight nine ten "
        "eleven twelve thirteen fourteen fifteen sixteen "
        "seventeen eighteen nineteen twenty"
    ).split()

    mapping = {
        word: index
        for index, word in enumerate(words, 1)
    }

    pattern = (
        r"\b(" + "|".join(words) +
        r")\s+workers?\s+(?:were\s+)?"
        r"(?:present|on\s+site)\b"
    )

    for match in re.finditer(pattern, text, re.I):
        counts.add(mapping[match.group(1).lower()])

    if len(counts) == 1:
        return next(iter(counts)), False

    return None, len(counts) > 1

def exact_metadata(value, source):
    if not isinstance(value, str):
        return None

    value = value.strip()

    if not 2 <= len(value) <= 100:
        return None

    if value.lower() in {
        "today", "construction site", "unknown",
        "none", "null", "site", "project"
    }:
        return None

    return value if value.casefold() in source.casefold() else None

def clean_tags(answer, batch_size):
    tags = {i: set() for i in range(batch_size)}

    if not isinstance(answer, dict):
        return tags, False

    events = answer.get("events")

    if not isinstance(events, list):
        return tags, False

    valid_ids = set()

    for item in events:
        if not isinstance(item, dict):
            continue

        index = item.get("id")

        if type(index) is not int or index not in tags:
            continue

        if not isinstance(item.get("sections"), list):
            continue

        valid_ids.add(index)

        tags[index].update(
            section
            for section in item["sections"]
            if isinstance(section, str) and section in SECTIONS
        )

    return tags, len(valid_ids) == batch_size

print("Loading Qwen3-VL-4B in 4-bit...", file=sys.stderr, flush=True)

if not torch.cuda.is_available():
    raise RuntimeError("CUDA unavailable. Check your NVIDIA PyTorch installation.")

quantization = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16
)

model = Qwen3VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    quantization_config=quantization,
    device_map="auto",
    dtype=torch.float16,
    attn_implementation="sdpa"
)

processor = AutoProcessor.from_pretrained(MODEL_ID)
model.eval()

def ask_model(system, text="", image_path=None, max_tokens=420):
    content = []

    if image_path:
        content.append({
            "type": "image",
            "image": Path(image_path).resolve().as_uri()
        })

    content.append({
        "type": "text",
        "text": text or "Analyze the photograph."
    })

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": content}
    ]

    # FIX: First produce a formatted string.
    formatted = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    if not isinstance(formatted, str):
        raise TypeError(
            f"Chat template returned {type(formatted).__name__}, expected str"
        )

    image = None

    if image_path:
        with Image.open(image_path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")

    # FIX: Explicitly tokenize the formatted prompt into model tensors.
    with MODEL_LOCK, torch.inference_mode():
        inputs = processor(
            text=[formatted],
            images=[image] if image is not None else None,
            padding=True,
            return_tensors="pt"
        )

        if not hasattr(inputs, "items") or "input_ids" not in inputs:
            raise TypeError(
                f"Processor returned {type(inputs).__name__}, expected model inputs"
            )

        inputs.pop("token_type_ids", None)
        inputs = inputs.to(model.device)

        generated_ids = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            do_sample=False,
            repetition_penalty=1.05,
            pad_token_id=processor.tokenizer.eos_token_id
        )

        prompt_length = inputs["input_ids"].shape[-1]

        generated = generated_ids[:, prompt_length:]

        raw = processor.batch_decode(
            generated,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False
        )[0]

        del inputs

    return extract_json(raw)

def classify(text="", image_path=None):
    if not text.strip() and not image_path:
        return {
            "types": [],
            "scores": {},
            "reasons": {},
            "method": "qwen3-vl",
            "needs_review": True
        }

    try:
        prompt = (
            f"Construction evidence:\n{text[:11000]}\n"
            "Choose all relevant report types."
        )

        answer = ask_model(
            CLASSIFY_PROMPT,
            prompt,
            image_path,
            max_tokens=380
        )

        selected = answer.get("report_types", [])
        evidence = answer.get("evidence", [])

        types = [
            report_type
            for report_type in REPORT_TYPES
            if isinstance(selected, list) and report_type in selected
        ]

        reasons = {}

        if isinstance(evidence, list):
            reasons = {
                report_type: [
                    str(item)[:180]
                    for item in evidence[:3]
                ]
                for report_type in types
            }

        return {
            "types": types,
            "scores": {},
            "reasons": reasons,
            "method": "qwen3-vl semantic",
            "needs_review": not bool(types)
        }

    except Exception as error:
        print(
            "Classification failed:",
            repr(error),
            file=sys.stderr,
            flush=True
        )

        return {
            "types": [],
            "scores": {},
            "reasons": {},
            "method": "qwen3-vl failed",
            "needs_review": True,
            "warning": str(error)[:180]
        }

def generate_report(text="", image_path=None):
    if not text.strip() and not image_path:
        raise ValueError("Text or image required")

    sentences = split_evidence(text)

    sections = {
        key: []
        for key in SECTIONS
    }

    warnings = []
    uncovered = []

    for offset in range(0, len(sentences), 10):
        batch = sentences[offset:offset + 10]

        numbered = "\n".join(
            f'[{index}] {row["text"]}'
            for index, row in enumerate(batch)
        )

        try:
            response = ask_model(
                EVENT_PROMPT,
                numbered,
                max_tokens=610
            )

            tags, valid = clean_tags(response, len(batch))

        except Exception as error:
            print(
                "Semantic labeling failed:",
                repr(error),
                file=sys.stderr,
                flush=True
            )

            tags = {i: set() for i in range(len(batch))}
            valid = False

        if not valid:
            warnings.append(
                f"Semantic labeling incomplete for sentences "
                f"{offset + 1}-{offset + len(batch)}"
            )

        for index, row in enumerate(batch):
            sentence = row["text"]
            chosen = tags[index]

            if SAFETY_BACKUP.search(sentence) and "safety" not in chosen:
                chosen.add("safety")

                warnings.append(
                    f"Potential safety event restored from sentence "
                    f"{offset + index + 1}; review categorization"
                )

            if "completed_work" in chosen:
                if (
                    NOT_COMPLETED.search(sentence)
                    or not WORK_VERB.search(sentence)
                ):
                    chosen.discard("completed_work")

            if not chosen:
                uncovered.append({
                    "source": row["source"],
                    "text": sentence
                })

            for section in chosen:
                if sentence not in sections[section]:
                    sections[section].append(sentence)

    metadata = {}

    if text.strip():
        try:
            metadata = ask_model(
                META_PROMPT,
                text[:9000],
                max_tokens=180
            )
        except Exception as error:
            print(
                "Metadata extraction failed:",
                repr(error),
                file=sys.stderr,
                flush=True
            )

            warnings.append("Project/location extraction failed")

    if not isinstance(metadata, dict):
        metadata = {}

    workers, ambiguous = worker_count(text)

    if ambiguous:
        warnings.append(
            "Conflicting worker counts in selected evidence"
        )

    sources = {
        row["source"]
        for row in sentences
        if row["source"] != "site notes"
    }

    if len(sources) > 1:
        warnings.append(
            "Multiple source files combined; confirm same site and workday"
        )

    observations = []

    if image_path:
        try:
            vision = ask_model(
                VISION_PROMPT,
                image_path=image_path,
                max_tokens=230
            )

            values = vision.get("image_observations", [])

            if isinstance(values, list):
                observations = [
                    value.strip()[:180]
                    for value in values
                    if isinstance(value, str) and value.strip()
                ][:4]

        except Exception as error:
            print(
                "Vision extraction failed:",
                repr(error),
                file=sys.stderr,
                flush=True
            )

            warnings.append("Image analysis failed; photo needs review")

    report = {
        "project": exact_metadata(
            metadata.get("project"),
            text
        ),
        "report_date": work_date(text),
        "location": exact_metadata(
            metadata.get("location"),
            text
        ),
        "completed_work": sections["completed_work"],
        "workers_present": workers,
        "issues": sections["issues"],
        "image_observations": observations,
        "missing_information": [],
        "section_details": sections,
        "unclassified_evidence": uncovered,
        "verification_warnings": list(dict.fromkeys(warnings))
    }

    for key, label in (
        ("project", "Project name"),
        ("report_date", "Report date"),
        ("location", "Location")
    ):
        if report[key] is None:
            report["missing_information"].append(label)

    return report

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
                "model": MODEL_ID,
                "device": "cuda"
            })

        return self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path not in {"/generate", "/classify"}:
            return self.respond(404, {"error": "Not found"})

        image_path = None

        try:
            size = int(self.headers.get("Content-Length", "0"))

            if not 0 < size <= MAX_REQUEST:
                return self.respond(413, {
                    "error": "Invalid request size"
                })

            payload = json.loads(self.rfile.read(size))

            if not isinstance(payload, dict):
                return self.respond(400, {
                    "error": "Expected JSON object"
                })

            text = payload.get("text", "")

            if not isinstance(text, str) or len(text) > 30000:
                return self.respond(400, {
                    "error": "Invalid text"
                })

            encoded = payload.get("image_base64")

            if encoded:
                mime = payload.get("image_mime", "image/jpeg")

                supported = {
                    "image/jpeg": ".jpg",
                    "image/png": ".png",
                    "image/webp": ".webp"
                }

                if (
                    mime not in supported
                    or not isinstance(encoded, str)
                    or len(encoded) > 10 * 1024 * 1024
                ):
                    return self.respond(400, {
                        "error": "Unsupported image payload"
                    })

                data = base64.b64decode(
                    encoded,
                    validate=True
                )

                if len(data) > MAX_IMAGE:
                    return self.respond(413, {
                        "error": "Image exceeds 7MB"
                    })

                with Image.open(BytesIO(data)) as raw_image:
                    photo = ImageOps.exif_transpose(raw_image).convert("RGB")
                    photo.thumbnail((1024, 1024))

                    with tempfile.NamedTemporaryFile(
                        suffix=".jpg",
                        delete=False
                    ) as file:
                        photo.save(file, format="JPEG", quality=90)
                        image_path = file.name

            if not text.strip() and not image_path:
                return self.respond(400, {
                    "error": "Text or image required"
                })

            if self.path == "/classify":
                classification = classify(text, image_path)

                return self.respond(200, {
                    "success": True,
                    "classification": classification
                })

            report = generate_report(text, image_path)

            return self.respond(200, {
                "success": True,
                "report": report
            })

        except (ValueError, json.JSONDecodeError) as error:
            return self.respond(400, {
                "error": str(error)[:400]
            })

        except Exception as error:
            print(
                "Qwen service error:",
                repr(error),
                file=sys.stderr,
                flush=True
            )

            return self.respond(500, {
                "error": "Qwen request failed; see terminal logs"
            })

        finally:
            if image_path:
                os.unlink(image_path)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")

    parser.add_argument(
        "--text",
        default=(
            "Nine workers were present. "
            "A worker slipped and injured his shoulder. "
            "The tower crane broke down."
        )
    )

    parser.add_argument("--image")

    args = parser.parse_args()

    if args.serve:
        print(
            f"Qwen3 ready on http://{HOST}:{PORT}",
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

if __name__ == "__main__":
    main()