export const PROJECTS = [
  "Office Tower Munich",
  "Industrial Plant Stuttgart",
  "Logistics Center Hamburg",
];

export const WORKFLOW_STAGES = [
  "Upload Evidence",
  "Classify & Review",
  "Generate Draft",
  "Edit Document",
  "Export",
];

export const STEP_STATES = {
  done: { label: "Done", color: "green" },
  active: { label: "Up next", color: "orange" },
  waiting: { label: "Waiting", color: "gray" },
  open: { label: "Anytime", color: "blue" },
};

export const NOTICE_TYPES = [
  "Delay Notice",
  "Additional Cost Notice",
  "Defect Notice",
  "Notice of Concern",
];

export const EVIDENCE_FILE_TYPES = ["jpg", "jpeg", "png", "pdf", "msg", "docx", "mp3", "wav"];

export const EVIDENCE_LABELS = {
  photo: { singular: "Photo", plural: "Photos", emoji: "📷" },
  voice: { singular: "Voice Note", plural: "Voice Notes", emoji: "🎤" },
  email: { singular: "Email", plural: "Emails", emoji: "📧" },
  word: { singular: "Word Document", plural: "Word Documents", emoji: "📝" },
  delivery: { singular: "Delivery Note PDF", plural: "Delivery Note PDFs", emoji: "🚚" },
  pdf: { singular: "PDF Document", plural: "PDF Documents", emoji: "📄" },
  handwritten: { singular: "Handwritten Note", plural: "Handwritten Notes", emoji: "✍️" },
};

export const EVIDENCE_CARD_ICONS = {
  photo: "📷",
  voice: "🎤",
  email: "📧",
  word: "📝",
  delivery: "📄",
  pdf: "📄",
  handwritten: "✍️",
};

const samplePhotos = {};
const samplePhotoSizes = {};
for (let i = 1; i <= 12; i += 1) {
  const name = `Facade_Photo_${String(i).padStart(2, "0")}.jpg`;
  const hh = String(7 + Math.floor(i / 3)).padStart(2, "0");
  const mm = String((i * 17) % 60).padStart(2, "0");
  samplePhotos[name] = `${hh}:${mm}`;
  samplePhotoSizes[name] = 1_650_000 + i * 115_000;
}

export const SAMPLE_EVIDENCE = {
  ...samplePhotos,
  "Voice_Note_2026_11_20.mp3": "11:05",
  "Supplier_Email.msg": "10:12",
  "Client_Update.msg": "13:40",
  "Inspection_Request.msg": "15:22",
  "Delivery_Note.pdf": "11:18",
  "Site_Instructions_20_Nov.docx": "14:05",
};

export const SAMPLE_EVIDENCE_SIZES = {
  ...samplePhotoSizes,
  "Voice_Note_2026_11_20.mp3": 3_420_000,
  "Supplier_Email.msg": 64_500,
  "Client_Update.msg": 51_200,
  "Inspection_Request.msg": 78_900,
  "Delivery_Note.pdf": 684_000,
  "Site_Instructions_20_Nov.docx": 148_400,
};

export const AI_DETECTED_FINDINGS = [
  ["✅", "Concrete delivery", "Delivery note"],
  ["✅", "Foundation work completed", "Site photos · voice note"],
  ["⚠️", "Supplier delay", "Supplier email · voice note"],
  ["⚠️", "Safety observation", "Site photos"],
];

export const EVIDENCE_STATUS_META = {
  Uploaded: { color: "blue" },
  Classified: { color: "green" },
  "Needs Review": { color: "orange" },
};

export const EVIDENCE_FILTER_TYPES = {
  "All file types": null,
  "Photos (.jpg, .png)": ["photo"],
  "PDF Documents (.pdf)": ["pdf", "delivery"],
  "Word Documents (.docx)": ["word"],
  "Emails (.msg)": ["email"],
  "Audio Recordings (.mp3, .wav)": ["voice"],
  "Handwritten Notes": ["handwritten"],
};

export const SAMPLE_PREVIEW_NOTES = {
  "Voice_Note_2026_11_20.mp3":
    "Simulated voice note transcript (01:42): 'Concrete trucks from ABC Concrete arrived 3 hours late at 11:00. Reinforcement on axes A–F was already released at 10:30. Also noticed an incomplete guardrail on level 3, axis 5/C — area cordoned off.'",
  "Supplier_Email.msg":
    "From: dispatch@abcconcrete.example · Subject: Delivery delay C30/37 (Order #4419)\n\n'Due to batching plant maintenance, the 08:00 delivery slot for Office Tower Munich is delayed by approx. 3 hours. Four mixer trucks (36 m³ C30/37) are now scheduled to arrive at 11:00.'",
  "Client_Update.msg":
    "From: pm@client-group.example · Subject: Weekly progress & milestone check\n\n'Please include the updated foundation slab pour status and schedule impact in today's daily report.'",
  "Inspection_Request.msg":
    "From: qa@structural-eng.example · Subject: Reinforcement inspection — Axes A–F\n\n'Confirmed on-site walkthrough at 10:30 with shell contractor foreman to verify bar spacing and concrete cover.'",
  "Delivery_Note.pdf":
    "Delivery Slips #7731–7734-1120 · Material: Ready-Mix Concrete C30/37 · Volume: 36 m³ (4 trucks) · Arrival: 11:00 · Status: Accepted & installed (test cubes #21–23 taken).",
  "Site_Instructions_20_Nov.docx":
    "Site Instruction No. 08 · Addressee: ABC Concrete · Issued: 20 Nov 2026, 13:30\n\n'Provide written confirmation of revised delivery slots and recovery measures by 21 Nov 2026, 12:00.'",
};

export const REPORT_SECTIONS = [
  ["Witterung", "Weather"],
  ["Besetzung", "Project Details & Staffing"],
  ["Begehung", "Inspection"],
  ["Behinderung", "Issues & Delays"],
  ["Anordnung", "Required Actions"],
  ["Tagesleistungen", "Completed Activities & Progress Achieved"],
  ["Vorkommnis", "Safety Observations"],
  ["Lieferungen", "Materials Received"],
  ["Geräte", "Equipment"],
  ["Bemerkung (extern)", "Risks & External Remarks"],
  ["Bemerkung (intern)", "Remark (internal)"],
  ["Fotos / Freigabe", "Photos / Approval"],
];

export const REQUIRED_SECTIONS = [
  "Witterung",
  "Besetzung",
  "Tagesleistungen",
  "Fotos / Freigabe",
];

export const INTERNAL_SECTION_LABELS = new Set([
  "bemerkung (intern)",
  "remark (internal)",
]);

export const DAILY_REPORT = "Daily Construction Report";
export const UNASSIGNED = "Unassigned";

export const REPORT_TYPES = {
  [DAILY_REPORT]: {
    icon: "📋",
    confidence: 92,
    reason: "Site photos, voice note, delivery slip & daily correspondence",
    titles: { de: "Bautagebuch – Tagesbericht", en: "Daily construction report" },
    sections: REPORT_SECTIONS.map(([key]) => key),
  },
  "Site Inspection Report": {
    icon: "🔍",
    confidence: 87,
    reason: "Inspection request email & reinforcement check photos",
    titles: { de: "Begehungsprotokoll", en: "Site inspection report" },
    sections: [
      "Witterung",
      "Begehung",
      "Anordnung",
      "Bemerkung (extern)",
      "Bemerkung (intern)",
      "Fotos / Freigabe",
    ],
  },
  "Incident/Safety Report": {
    icon: "🦺",
    confidence: 95,
    reason: "Edge protection safety observation photo on Level 3",
    titles: {
      de: "Unfall- und Sicherheitsbericht",
      en: "Incident and safety report",
    },
    sections: [
      "Witterung",
      "Besetzung",
      "Vorkommnis",
      "Anordnung",
      "Bemerkung (intern)",
      "Fotos / Freigabe",
    ],
  },
  "Construction Progress Report": {
    icon: "📈",
    confidence: 81,
    reason: "Client milestone update & slab progress records",
    titles: { de: "Baufortschrittsbericht", en: "Construction progress report" },
    sections: [
      "Witterung",
      "Tagesleistungen",
      "Lieferungen",
      "Behinderung",
      "Bemerkung (extern)",
      "Fotos / Freigabe",
    ],
  },
  "Equipment Breakdown Report": {
    icon: "🛠️",
    confidence: 88,
    reason: "Concrete pump / crane waiting & equipment logs",
    titles: { de: "Geräteausfallbericht", en: "Equipment breakdown report" },
    sections: ["Geräte", "Behinderung", "Bemerkung (intern)", "Fotos / Freigabe"],
  },
};

export const ASSIGNMENT_OPTIONS = [...Object.keys(REPORT_TYPES), UNASSIGNED];

export const CLASSIFICATION_KEYWORDS = [
  ["Incident/Safety Report", ["incident", "safety", "accident", "injury", "unfall", "sicherheit"]],
  ["Equipment Breakdown Report", ["crane", "pump", "equipment", "breakdown", "defect", "kran", "geraet", "gerät"]],
  ["Site Inspection Report", ["inspection", "abnahme", "begehung", "audit"]],
  ["Construction Progress Report", ["progress", "client", "milestone", "fortschritt"]],
];

export const SAMPLE_CLASSIFICATION = {
  "Facade_Photo_10.jpg": "Site Inspection Report",
  "Facade_Photo_11.jpg": "Equipment Breakdown Report",
  "Facade_Photo_12.jpg": "Incident/Safety Report",
};

export const REPORT_LANGUAGES = {
  Deutsch: "de",
  English: "en",
};

export const HEADER_FIELDS = {
  de: {
    title: "Dokument",
    doc_id: "Dokument-ID",
    project: "Projekt",
    day: "Bautag",
    date: "Datum",
    created: "Erstellt",
    status: "Status",
    headline: "Überschrift",
    summary: "Zusammenfassung",
  },
  en: {
    title: "Document",
    doc_id: "Document ID",
    project: "Project",
    day: "Site day",
    date: "Date",
    created: "Created",
    status: "Status",
    headline: "Headline",
    summary: "Summary",
  },
};

export const TEMPLATE_TEXT = {
  de: {
    report_title: "Bautagebuch – Tagesbericht",
    col_left: "ABSCHNITT",
    col_right: "EINTRAG IM BERICHT",
    photos: "Fotoanhang",
    photo: "Foto",
    day: "Bautag",
    created: "Erstellt",
    page: "Seite {page} von {pages}",
    preview: "Vorschau",
    weekdays: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
  },
  en: {
    report_title: "Daily site report",
    col_left: "SECTION",
    col_right: "REPORT ENTRY",
    photos: "Photo appendix",
    photo: "Photo",
    day: "Site day",
    created: "Created",
    page: "Page {page} of {pages}",
    preview: "Preview",
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  },
};

export const BAUTAGEBUCH_SYSTEM_PROMPT = `You are BauDackel and write the daily construction site report (Bautagebuch / Tagesbericht) for a project in Germany.
Courts and experts may use this report years later as evidence, so it must be accurate, contemporaneous and neutral.

Return ONLY one JSON object that matches the provided JSON schema. No markdown, no commentary.
Report type: {report_type}. Fill only these sections and omit all others: {sections}.

Rules for every field:
1. Strictly factual: record what happened, when and where. Never evaluate, speculate, or assign responsibility, fault or costs.
2. Legally neutral wording. Hindrance notices (Behinderungsanzeige) and instructions (Anordnung) are documented with time and reference, never interpreted.
3. Vorkommnis (incidents): time, sequence of events, immediate measure and to whom it was reported. Never name individual workers and never assign blame; refer to roles and companies only (e.g. "Facharbeiter Rohbau A").
4. Preserve exact details from the evidence verbatim: timestamps (HH:MM) and time ranges, locations and axes (e.g. "Decke über EG, Achse 1–3"), quantities with units, delivery slip numbers (Lieferschein), test sample numbers, instruction numbers, plan references with index, attachment numbers and photo IDs. Never round, merge or invent them.
5. Witterung: morning and midday temperature, precipitation with start and end time, wind, and the data source.
6. Besetzung: headcount per company with roles and place of work; changes during the day with the time.
7. Begehung: time, participants by role/company, what was checked, the result and photo IDs.
8. Behinderung: from–to, affected work and location, observable consequences (e.g. rejected deliveries with slip numbers) and any hindrance notice with its time. Do not state who bears the consequences.
9. Anordnung: number, addressee, time, content, deadline and photo ID.
10. Tagesleistungen: per company, the work performed with location and quantity, including work done despite hindrances.
11. Lieferungen: time, material, quantity, delivery slip number and status (accepted, installed, or rejected with reason).
12. Geräte: equipment with operating times.
13. Bemerkung (extern): facts the client needs, nothing else. Bemerkung (intern): own open queries, risk and cost assessments, each entry prefixed with "(i)". Internal remarks are removed from the client version, so never put internal assessments in any other field.
14. Fotos / Freigabe: photo ID range, creation timestamp (same day) and approval status with timestamp.
15. Omit every optional section the evidence says nothing about. Never pad with "none", "n/a" or placeholders. If a detail is missing, leave it out instead of guessing.
16. Write all values in {language}. Keep the section keys exactly as defined in the schema (German).`;

export const KB_EXAMPLE_QUESTIONS = [
  "When was the last supplier delay?",
  "Show unresolved issues.",
  "Summarize project progress.",
  "Show all safety incidents.",
  "Find reports related to excavation.",
];

export const KB_INTENTS = [
  {
    keywords: new Set(["delay", "delays", "delayed", "late", "supplier", "suppliers"]),
    answer:
      "Supplier delay detected on **20 November 2026**.\n\n{supplier} arrived {hours} hours late with the concrete delivery. A recovery plan has been requested within 24 hours.",
    documents: [
      ["📄", "Delay Notice #004", "Notice · 20 Nov 2026"],
      ["📄", "Daily Report #018", "Daily report · 20 Nov 2026"],
      ["📧", "Supplier Email", "Email from {supplier} · 20 Nov 2026"],
    ],
    confidence: 96,
    includeDraft: true,
  },
  {
    keywords: new Set(["safety", "observation", "observations", "hazard", "hazards", "ppe", "incident", "incidents"]),
    answer:
      "**3 safety observations** were recorded in November 2026:\n\n- Edge protection gap on Level 3 · open\n- Missing toe boards on scaffold B · closed\n- PPE non-compliance at gate 2 · closed",
    documents: [
      ["📄", "Safety Observation #011", "Safety · 18 Nov 2026"],
      ["📄", "Safety Observation #009", "Safety · 12 Nov 2026"],
      ["📷", "Site Photos – Level 3", "Photos · 20 Nov 2026"],
    ],
    confidence: 91,
    includeDraft: false,
  },
  {
    keywords: new Set(["concrete", "pour", "pours", "foundation", "foundations", "slab", "reinforcement"]),
    answer:
      "Found **5 documents** related to concrete works, covering foundation reinforcement, deliveries and the upcoming pour on 22 November 2026.",
    documents: [
      ["📄", "Foundation Report", "Quality · 16 Nov 2026"],
      ["📄", "Delivery Note – Concrete", "Delivery note · 20 Nov 2026"],
      ["📄", "Daily Report #018", "Daily report · 20 Nov 2026"],
      ["📄", "Delay Notice #004", "Notice · 20 Nov 2026"],
      ["📄", "Concrete Pour Checklist", "Checklist · 21 Nov 2026"],
    ],
    confidence: 89,
    includeDraft: true,
  },
  {
    keywords: new Set(["unresolved", "open", "issue", "issues", "outstanding", "pending"]),
    answer:
      "**3 unresolved issues** need attention:\n\n1. Recovery plan from {supplier} pending (due 21 Nov)\n2. Edge protection corrective action on Level 3\n3. RFI #027 – slab opening clarification awaiting the designer",
    documents: [
      ["📄", "Delay Notice #004", "Notice · 20 Nov 2026"],
      ["📄", "Safety Observation #011", "Safety · 18 Nov 2026"],
      ["📄", "RFI #027", "RFI · 16 Nov 2026"],
    ],
    confidence: 88,
    includeDraft: false,
  },
  {
    keywords: new Set(["excavation", "excavate", "soil", "trench", "compaction", "earthworks"]),
    answer:
      "Found **2 reports** related to excavation and earthworks:\n\n- **Foundation_Excavation_Report.pdf** (16 Nov 2026): Soil compaction verified at 98% Proctor density; blinding layer released.\n- **Daily_Report_15_Nov.pdf** (15 Nov 2026): Backfilling along north foundation wall completed without groundwater ingress.",
    documents: [
      ["📄", "Foundation_Excavation_Report.pdf", "Report · 16 Nov 2026"],
      ["📋", "Daily_Report_15_Nov.pdf", "Daily report · 15 Nov 2026"],
    ],
    confidence: 94,
    includeDraft: false,
  },
  {
    keywords: new Set(["progress", "summary", "summarize", "summarise", "status", "overview"]),
    answer:
      "The project is **62% complete**. Foundations are finished, the structure is at 78% and facade installation has started (34%). The main risk is supplier reliability ahead of the 22 November concrete pour.",
    documents: [
      ["📄", "Weekly Progress Report #046", "Progress · 17 Nov 2026"],
      ["📄", "Daily Report #018", "Daily report · 20 Nov 2026"],
      ["📄", "Meeting Minutes", "Meeting · 17 Nov 2026"],
    ],
    confidence: 93,
    includeDraft: true,
  },
];

export const KB_DOCUMENT_COUNT = 24;

// Knowledge Hub repository defaults
export const DOC_TYPE_ICONS = {
  "Daily report": "📋",
  Report: "📋",
  Notice: "⚖️",
  "Delay notice": "⚖️",
  Safety: "🦺",
  "Safety observation": "🦺",
  PDF: "📄",
  Meeting: "🤝",
  Quality: "✅",
  Email: "📧",
};

export const DEFAULT_REPOSITORY_DOCS = [
  {
    id: "DOC-2026-019",
    name: "Delay_Notice_Concrete.docx",
    type: "Notice",
    created_at: "2026-11-19 16:40",
    date_label: "19 Nov 2026",
    status: "Exported",
    evidence_count: 4,
    summary: "Formal delay notice to ABC Concrete regarding concrete delivery disruption.",
    mime: "text/plain",
    blob: null,
  },
  {
    id: "DOC-2026-018",
    name: "Safety_Observation.pdf",
    type: "Safety observation",
    created_at: "2026-11-18 14:15",
    date_label: "18 Nov 2026",
    status: "Reviewed",
    evidence_count: 3,
    summary: "Safety observation #011 documenting edge protection inspection on Level 3.",
    mime: "text/plain",
    blob: null,
  },
  {
    id: "DOC-2026-017",
    name: "Meeting_Minutes.docx",
    type: "Meeting",
    created_at: "2026-11-17 17:00",
    date_label: "17 Nov 2026",
    status: "Final",
    evidence_count: 2,
    summary: "Weekly site coordination minutes covering concrete schedule, RFI #027 and safety controls.",
    mime: "text/plain",
    blob: null,
  },
  {
    id: "DOC-2026-016",
    name: "Foundation_Excavation_Report.pdf",
    type: "Report",
    created_at: "2026-11-16 15:20",
    date_label: "16 Nov 2026",
    status: "Exported",
    evidence_count: 7,
    summary: "Excavation and foundation quality report confirming soil compaction and blinding layer release.",
    mime: "text/plain",
    blob: null,
  },
  {
    id: "DOC-2026-015",
    name: "Daily_Report_15_Nov.pdf",
    type: "Daily report",
    created_at: "2026-11-15 18:05",
    date_label: "15 Nov 2026",
    status: "Exported",
    evidence_count: 11,
    summary: "Daily construction report covering reinforcement installation and excavation backfilling.",
    mime: "text/plain",
    blob: null,
  },
];

// Performance Monitoring data
export const SCHEDULE_ACTIVITIES = [
  {
    Activity: "Foundation Works",
    Trade: "Shell Contractor A",
    "Planned Progress": 80,
    "Actual Progress": 65,
    "Planned Completion": "15 Nov 2026",
    "Actual Completion": "20 Nov 2026",
    "Delay Days": 5,
    Productivity: 84,
    "Target Productivity": 95,
    "Root Cause": "3-hour ready-mix concrete delivery delay (ABC Concrete) and rebar rework on axes A–C.",
    "Related Document": "Delay_Notice_Concrete.docx",
  },
  {
    Activity: "Concrete Works – Slab Axes A–F",
    Trade: "Shell Contractor A",
    "Planned Progress": 75,
    "Actual Progress": 60,
    "Planned Completion": "15 Nov 2026",
    "Actual Completion": "21 Nov 2026",
    "Delay Days": 6,
    Productivity: 81,
    "Target Productivity": 95,
    "Root Cause": "Batching plant outage delayed 4 mixer trucks; concrete pump stood idle for 3 hours.",
    "Related Document": "Daily_Report_15_Nov.pdf",
  },
  {
    Activity: "Structural Steel & Core Walls",
    Trade: "Steelworks GmbH",
    "Planned Progress": 70,
    "Actual Progress": 72,
    "Planned Completion": "28 Nov 2026",
    "Actual Completion": "27 Nov 2026",
    "Delay Days": 0,
    Productivity: 103,
    "Target Productivity": 95,
    "Root Cause": "Ahead of baseline thanks to dual crane shift.",
    "Related Document": "Foundation_Report.pdf",
  },
  {
    Activity: "MEP Rough-In (Level 1–2)",
    Trade: "Electrical Contractor B",
    "Planned Progress": 55,
    "Actual Progress": 48,
    "Planned Completion": "02 Dec 2026",
    "Actual Completion": "05 Dec 2026",
    "Delay Days": 3,
    Productivity: 89,
    "Target Productivity": 95,
    "Root Cause": "Awaiting RFI #027 slab opening clarification from structural designer.",
    "Related Document": "Meeting_Minutes.docx",
  },
  {
    Activity: "Facade Installation (East Elevation)",
    Trade: "Facade Systems AG",
    "Planned Progress": 40,
    "Actual Progress": 38,
    "Planned Completion": "12 Dec 2026",
    "Actual Completion": "12 Dec 2026",
    "Delay Days": 0,
    Productivity: 96,
    "Target Productivity": 95,
    "Root Cause": "Proceeding on schedule.",
    "Related Document": "Safety_Observation.pdf",
  },
  {
    Activity: "Waterproofing & Drainage",
    Trade: "Civil Works Partner C",
    "Planned Progress": 90,
    "Actual Progress": 92,
    "Planned Completion": "18 Nov 2026",
    "Actual Completion": "18 Nov 2026",
    "Delay Days": 0,
    Productivity: 101,
    "Target Productivity": 95,
    "Root Cause": "Completed on baseline target.",
    "Related Document": "Foundation_Report.pdf",
  },
];

export const PROGRESS_TREND_DATA = [
  { Week: "W42", Planned: 28, Actual: 27 },
  { Week: "W43", Planned: 38, Actual: 36 },
  { Week: "W44", Planned: 49, Actual: 45 },
  { Week: "W45", Planned: 59, Actual: 53 },
  { Week: "W46", Planned: 68, Actual: 60 },
  { Week: "W47", Planned: 75, Actual: 62 },
];

// Meeting Intelligence data
export const SAMPLE_MEETING_TRANSCRIPT = `Weekly Site Coordination Meeting #18 — Office Tower Munich
Date: 20 Nov 2026 | Attendees: John Smith (Site Manager), M. Weber (Shell Contractor A),
L. Bauer (Electrical Contractor B), Dr. K. Hoffman (Structural Engineer), T. Klein (SiGeKo)

1. Concrete Works & Supplier Delay:
   - ABC Concrete arrived 3 hours late today (11:00 instead of 08:00), delaying slab pour axes A–C.
   - Decision: Site Manager to issue formal Delay Notice #004 to ABC Concrete and require a written recovery schedule by 21 Nov 2026 12:00.
   - Action: M. Weber to submit revised pour sequence for axes D–F by 21 Nov 2026.

2. Safety & Edge Protection:
   - SiGeKo noted incomplete fall protection on Level 3, axis 5/C at 09:15; area was cordoned off immediately.
   - Decision: No work permitted near Level 3 slab edge until full guardrail sign-off by SiGeKo.
   - Action: T. Klein to verify guardrail reinstatement and close Safety Observation #011 by 21 Nov 2026.

3. MEP & Design Clarifications:
   - L. Bauer flagged open RFI #027 regarding slab openings on Level 2, blocking cable tray installation.
   - Action: Dr. K. Hoffman to issue structural approval for RFI #027 slab openings by 22 Nov 2026.
   - Action: John Smith to update the client milestone forecast and circulate Daily Report #018 by 20 Nov 2026.`;

export const DEFAULT_MEETING_SUMMARY = {
  title: "Weekly Site Coordination Meeting #18",
  date: "20 Nov 2026",
  summary:
    "Site coordination covered the 3-hour ready-mix concrete delay on foundation slab axes A–C, immediate corrective controls for the Level 3 edge protection observation, and open structural clarification RFI #027 impacting MEP rough-in.",
  critical_outcomes: [
    "Formal Delay Notice #004 authorized against ABC Concrete with a 24-hour recovery deadline.",
    "Work halt enforced on Level 3 axis 5/C until SiGeKo signs off reinstalled guardrails.",
    "Structural engineer committed to closing RFI #027 by 22 Nov 2026 to unblock MEP works.",
  ],
  key_decisions: [
    "Issue formal Delay Notice #004 to ABC Concrete and request written recovery schedule.",
    "Keep Level 3 slab edge (axis 5/C) restricted until SiGeKo signs off guardrail reinstatement.",
    "Shift foundation slab pour axes D–F to 21 Nov 2026 pending confirmed batching plant slots.",
  ],
  risks: [
    "High — Potential 5-day critical-path slip if ABC Concrete misses the 21 Nov replacement slot.",
    "Medium — MEP rough-in delay on Level 2 if RFI #027 approval slips past 22 Nov.",
  ],
  open_issues: [
    "Recovery plan from ABC Concrete pending (due 21 Nov 2026).",
    "Safety Observation #011 guardrail closure awaiting final inspection.",
    "RFI #027 slab opening dimensions awaiting structural sign-off.",
  ],
};

export const DEFAULT_ACTION_ITEMS = [
  {
    Owner: "John Smith (Site Manager)",
    "Action Item": "Issue Delay Notice #004 to ABC Concrete and circulate Daily Report #018",
    "Due Date": "20 Nov 2026",
    Status: "In Progress",
  },
  {
    Owner: "M. Weber (Shell Contractor A)",
    "Action Item": "Submit revised concrete pour sequence for axes D–F",
    "Due Date": "21 Nov 2026",
    Status: "Open",
  },
  {
    Owner: "T. Klein (SiGeKo)",
    "Action Item": "Inspect reinstated Level 3 guardrails and close Safety Observation #011",
    "Due Date": "21 Nov 2026",
    Status: "Open",
  },
  {
    Owner: "Dr. K. Hoffman (Structural Eng.)",
    "Action Item": "Approve RFI #027 slab opening dimensions for Level 2 MEP rough-in",
    "Due Date": "22 Nov 2026",
    Status: "In Progress",
  },
  {
    Owner: "L. Bauer (Electrical Contractor B)",
    "Action Item": "Confirm cable tray mobilization once RFI #027 is released",
    "Due Date": "24 Nov 2026",
    Status: "Open",
  },
];

export const DEFAULT_DECISION_LOG = [
  {
    Date: "20 Nov 2026",
    Topic: "Concrete Delivery Delay — Formal Contractual Notice",
    Decision: "Issue Delay Notice #004 to ABC Concrete with 24-hour recovery plan requirement.",
    "Decision Owner": "John Smith (Site Manager)",
    "Supporting Documentation": "Delay_Notice_Concrete.docx · Supplier_Email.msg",
  },
  {
    Date: "20 Nov 2026",
    Topic: "Level 3 Edge Protection — Area Restriction",
    Decision: "Maintain cordon at axis 5/C until SiGeKo completes physical guardrail sign-off.",
    "Decision Owner": "T. Klein (SiGeKo)",
    "Supporting Documentation": "Safety_Observation.pdf · Facade_Photo_12.jpg",
  },
  {
    Date: "17 Nov 2026",
    Topic: "Foundation Slab Pour Sequence (Axes A–F)",
    Decision: "Split concrete pour into two bays (A–C first, D–F next) to protect curing quality.",
    "Decision Owner": "Dr. K. Hoffman (Structural Eng.)",
    "Supporting Documentation": "Meeting_Minutes.docx · Foundation_Report.pdf",
  },
];

export const ACTION_STATUS_OPTIONS = ["Open", "In Progress", "Blocked", "Done"];
