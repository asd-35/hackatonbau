# BauDackel | Construction documentation hackathon integration

This repository contains the updated React workspace, Express API and persistent local AI servers. Run **from the repository root**, on the same Ubuntu machine where your Qwen weights are cached. The application is a local hackathon prototype and is **not** an authenticated production service.

## Requirements
- Ubuntu, Node 20+ (Node 22 recommended), npm, Python 3.12
- The existing `hackaton/` Python venv with `faster-whisper`, CUDA-enabled PyTorch, `transformers`, `bitsandbytes`, `qwen-vl-utils`, `lm-format-enforcer`, `word2number` and their GPU dependencies installed.
- RTX 4060 8GB recommended for Qwen2.5-VL-3B (4-bit). Whisper runs on CPU INT8 to save GPU VRAM.
- Optionally, to read PDFs, Word and Outlook `.msg` files: `pip install -r ai/requirements-documents.txt` inside the venv. Scanned PDFs need OCR, which is **not** included.

## Install (once)
```
cd ~/hackatonbau
source hackaton/bin/activate
pip install -r ai/requirements-documents.txt
cd backend && npm ci
cd ../frontend && npm ci
```

## Start (three terminals)
```
# Terminal 1 – persistent Whisper model
cd ~/hackatonbau && source hackaton/bin/activate && python ai/v2t.py

# Terminal 2 – persistent Qwen model
cd ~/hackatonbau && source hackaton/bin/activate && python ai/qwen.py --serve

# Terminal 3 – Express + React
cd ~/hackatonbau/backend && npm run dev
```
In a fourth terminal `cd ~/hackatonbau/frontend && npm run dev`, then open http://localhost:5173.

The three services should be running: Express `127.0.0.1:3000`, Whisper `127.0.0.1:8001`, Qwen `127.0.0.1:8002`. Vite proxies `/api` requests to Express. Change `VITE_API_URL` if hosting separately.

## What is now wired up
1. **Evidence**: upload photos, audio, plaintext, PDF, DOCX and emails; persistent evidence inbox in `backend/data`; extracted readable text in preview. Audio is translated into English by persistent Whisper. `Quick Dictate` records using the browser microphone (requires `localhost` or HTTPS), then uploads the recording.
2. **Classification**: provisional report-type suggestions are **rule based** on filenames/text, can be manually changed. They are not hallucinated AI confidences.
3. **Reports**: the selected real evidence and optional typed site notes go to Express → Qwen (text); up to 3 photos also go to Qwen's vision input. Generated facts are mapped into the **existing editable templates**; an AI evidence/verification panel flags missing information and asks for follow-up clarification. No fake default project metrics are injected.
4. **Editing/export**: report editor, preview, timestamp/ID lock, PDF and DOCX export preserved. Exports are saved to a **persistent local repository** that survives browser refresh. Store/download/delete work through Express.
5. **Knowledge Hub & Assistant**: searches actual uploaded text and exported document summaries. This is source-backed **keyword retrieval**, not semantic vector search; answers quote matching fragments.
6. **Performance Monitoring**: import a project schedule CSV or add/edit rows; save per project; compare planned/actual progress, compute simple threshold alerts, draft a notice based on chosen row. Sample format in `frontend/public/sample-schedule.csv`. No fabricated "live" KPIs.
7. **Meeting Intelligence**: accepts typed TXT/MD/PDF/DOCX notes or recorded audio, extracts explicitly labelled `Action:`, `Decision:`, `Risk:` and `Issue:` lines, and lets users edit actions and decisions. Changes are kept in browser `localStorage` per project; not a shared server database.

## Smoke checks
```
curl http://127.0.0.1:3000/api/health
curl -X POST http://127.0.0.1:3000/api/report/text -H 'Content-Type: application/json' -d '{"text":"Five workers installed twenty doors. Three doors were damaged."}'
curl -X POST http://127.0.0.1:3000/api/report -F 'audio=@ai/german.wav'
```
Audio files and model weights are excluded from Git. Record your own voice file for the audio test. Do not commit secrets or customer site data.

## Limitations / honest status
- The model and real end-to-end GPU inference **must be tested on your Lenovo**, as this build environment has no copy of your downloaded weights, CUDA or configured Python venv.
- Qwen may still hallucinate, misclassify, produce incomplete JSON or omit quantities. Whisper translation may omit numbers. The generated report is **always a review draft**, never an automatic verified site record.
- Vision analysis is attempted on up to three images per draft; failures are reported in warnings. Large photos over 7MB are not sent to the vision endpoint.
- Scanned PDFs need OCR. Complex Outlook messages and unusual PDF tables may not extract perfectly. Extra document dependencies are required.
- The German report option uses German template labels, but Qwen currently outputs English facts; translate/review the content manually before exporting.
- Schedule data is user-entered/imported, not a live construction ERP connection. Meeting extractor uses explicit markers, not an LLM. Keyword search is not a comprehensive semantic assistant.
- Only local, single-user file-backed persistence is implemented; no user login, access control, encryption, multiuser synchronization or cloud backup. Do not expose these services to the internet without authentication and hardening.

### Automated local API smoke test
With Express (and optionally the AI services) running, execute `node tests/smoke.mjs` from the repository root. This checks upload, retrieval, keyword search, schedule persistence and deletion. If Qwen is ready it also exercises a real report draft. Actual microphone and photo rendering should be verified manually in the browser.
