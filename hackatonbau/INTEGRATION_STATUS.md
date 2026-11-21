# Feature audit after integration (21 November 2026)

This table reflects implementation in the delivered code, **not** a claim that CUDA inference has been tested here. The two AI servers and browser microphone must still be tested on the Lenovo.

| ID | Feature | Implementation | Remaining limitation |
|---|---|---|---|
| EC-01 | Multi-file upload | Persistent Express evidence API; images, audio, text, PDF, DOCX, email | .msg/.pdf/.docx need optional Python packages; no OCR |
| EC-02 | Voice capture | Real MediaRecorder and Whisper upload | Microphone permission and browser format must be tested |
| EC-03 | Evidence inbox | Persisted per-project metadata and original files; deletion/preview | No multiuser auth; file data local |
| AI-01 | Evidence classification | Transparent rule-based text/filename suggestions and manual multi-select | **Not** Qwen classifier; no calibrated confidence |
| AI-02 | Smart follow-up | Missing-information and verification warnings shown in report workflow | Questions extracted from JSON; no interactive conversational agent |
| DG-01 | Daily report | Express sends evidence to Qwen and maps its output to editor template | GPU and visual accuracy not end-to-end tested here |
| DG-02 | Notice draft | Manual, editable draft from actual issue/delay description | No automatic contract/legal verification |
| DG-03 | Structured templates | Original editable report templates, locked ID/timestamp, preview preserved | German body requires human translation from English AI facts |
| DG-05 | PDF export | Original jsPDF exporter and DOCX exporter; files saved in repository | Export only from saved, unchanged draft; check rendering visually |
| KH-01 | Repository | Persisted PDFs/DOCX with download, delete, project isolation | Local file storage; no authentication |
| KH-02 | Project knowledge search | Source-backed keyword search across uploaded text and report summaries | Not semantic embedding retrieval |
| KH-04 | Recent documents | Real stored/recent reports displayed | No cloud sync |
| CP-01 | Workspace journey | Upload > classify > draft > edit > save > export UI | Workflows require users to review extracted facts |
| CP-02 | AI recommendations | Evidence-triggered action suggestions | Rule-based, not learned probabilities |
| CP-04 | Project Assistant | Connected to real keyword-search endpoint | Does not use generative Q&A |
| PM-01 | Planned vs actual | User-entered or CSV-imported schedule comparison | No ERP connection |
| PM-02 | Progress dashboard | Computed from real schedule rows, not hardcoded demo stats | Empty until a schedule is supplied |
| PM-04 | Delay detection | Variance and completion-date thresholds | Schedule must be accurate and updated |
| PM-05 | Deviation alerts | Computed threshold alerts and notice button | No notifications outside the page |
| Extra | Meeting intelligence | Uploaded/typed meeting notes, Whisper audio transcript, explicit action/decision parsing, edit, client persistence | Rule-based parser; browser-local data, not shared on server |

### Basic use

Launch three services then Vite as in README. Upload a voice note, add a photo, select their report type, open Step 3, click **Generate report draft**, review the extracted fields and missing information, edit, save, then export PDF or Word. The Knowledge Hub should show the exported file. For Performance Monitoring, add schedule rows or import `frontend/public/sample-schedule.csv` as an **explicit demo**. For Meetings, prefix actionable lines with `Action:`, `Decision:`, `Risk:` or `Issue:`.

### Model caveat
The Qwen response is generative and can invent or omit critical facts. Number extraction is simple pattern-based consistency checking, not independent verification. Final reports, notices and safety decisions must be reviewed by a qualified person.
