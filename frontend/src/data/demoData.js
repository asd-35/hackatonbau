export const PROJECTS = [
  "Office Tower Munich",
  "Industrial Plant Stuttgart",
  "Logistics Center Hamburg",
];

export const DAILY_REPORT = "Daily Construction Report";
export const UNASSIGNED = "Unassigned";

export const WORKFLOW_STAGES = [
  "Upload Evidence",
  "AI Classification",
  "User Review",
  "AI Clarification",
  "Generate Draft",
  "Edit Document",
  "Export",
];

export const EVIDENCE_ACCEPT = ".jpg,.jpeg,.png,.pdf,.msg,.docx,.mp3,.wav";

export const EVIDENCE_CARD_ICONS = {
  photo: "📷",
  voice: "🎤",
  email: "📧",
  word: "📝",
  delivery: "📄",
  pdf: "📄",
  handwritten: "✍️",
};

export const EVIDENCE_STATUS_COLORS = {
  Uploaded: "blue",
  Classified: "green",
  "Needs Review": "orange",
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

export const REPORT_TYPES = {
  [DAILY_REPORT]: {
    icon: "📋",
    confidence: 92,
    reason: "Site photos, voice note, delivery slip & daily correspondence",
    titles: { de: "Bautagebuch – Tagesbericht", en: "Daily Construction Report" },
    sections: REPORT_SECTIONS.map(([k]) => k),
  },
  "Site Inspection Report": {
    icon: "🔍",
    confidence: 87,
    reason: "Inspection request email & reinforcement check photos",
    titles: { de: "Begehungsprotokoll", en: "Site Inspection Report" },
    sections: ["Witterung", "Begehung", "Anordnung", "Bemerkung (extern)", "Bemerkung (intern)", "Fotos / Freigabe"],
  },
  "Incident/Safety Report": {
    icon: "🦺",
    confidence: 95,
    reason: "Edge protection safety observation photo on Level 3",
    titles: { de: "Unfall- und Sicherheitsbericht", en: "Incident / Safety Report" },
    sections: ["Witterung", "Besetzung", "Vorkommnis", "Anordnung", "Bemerkung (intern)", "Fotos / Freigabe"],
  },
  "Construction Progress Report": {
    icon: "📈",
    confidence: 81,
    reason: "Client milestone update & slab progress records",
    titles: { de: "Baufortschrittsbericht", en: "Construction Progress Report" },
    sections: ["Witterung", "Tagesleistungen", "Lieferungen", "Behinderung", "Bemerkung (extern)", "Fotos / Freigabe"],
  },
  "Equipment Breakdown Report": {
    icon: "🛠️",
    confidence: 88,
    reason: "Concrete pump / crane waiting & equipment logs",
    titles: { de: "Geräteausfallbericht", en: "Equipment Breakdown Report" },
    sections: ["Geräte", "Behinderung", "Bemerkung (intern)", "Fotos / Freigabe"],
  },
};

export const ASSIGNMENT_OPTIONS = [...Object.keys(REPORT_TYPES), UNASSIGNED];

export const NOTICE_TYPES = [
  "Delay Notice",
  "Additional Cost Notice",
  "Defect Notice",
  "Notice of Concern",
];

const CLASSIFICATION_KEYWORDS = [
  ["Incident/Safety Report", ["incident", "safety", "accident", "injury", "unfall", "sicherheit"]],
  ["Equipment Breakdown Report", ["crane", "pump", "equipment", "breakdown", "defect", "kran", "geraet", "gerät"]],
  ["Site Inspection Report", ["inspection", "abnahme", "begehung", "audit"]],
  ["Construction Progress Report", ["progress", "client", "milestone", "fortschritt"]],
];

const SAMPLE_CLASSIFICATION = {
  "Facade_Photo_10.jpg": "Site Inspection Report",
  "Facade_Photo_11.jpg": "Equipment Breakdown Report",
  "Facade_Photo_12.jpg": "Incident/Safety Report",
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

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function evidenceCategory(fileName) {
  const lower = fileName.toLowerCase();
  const ext = lower.split(".").pop();
  if (lower.includes("hand") || lower.includes("scan")) return "handwritten";
  if (["jpg", "jpeg", "png"].includes(ext)) return "photo";
  if (["mp3", "wav"].includes(ext)) return "voice";
  if (ext === "msg") return "email";
  if (ext === "docx") return "word";
  return lower.includes("delivery") ? "delivery" : "pdf";
}

export function evidenceFileTypeLabel(fileName) {
  const ext = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "file";
  const cat = evidenceCategory(fileName);
  const map = {
    photo: "Image",
    voice: "Audio",
    email: "Email",
    word: "Word Document",
    delivery: "PDF Document",
    pdf: "PDF Document",
    handwritten: "Handwritten Note",
  };
  return `${map[cat] || "File"} (.${ext})`;
}

export function classifyEvidence(fileName) {
  if (SAMPLE_CLASSIFICATION[fileName]) return SAMPLE_CLASSIFICATION[fileName];
  const lower = fileName.toLowerCase();
  for (const [reportType, keywords] of CLASSIFICATION_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return reportType;
  }
  return DAILY_REPORT;
}

export function buildSampleEvidence() {
  const items = [];
  for (let i = 1; i <= 12; i += 1) {
    const pad = String(i).padStart(2, "0");
    const name = `Facade_Photo_${pad}.jpg`;
    const hh = String(7 + Math.floor(i / 3)).padStart(2, "0");
    const mm = String((i * 17) % 60).padStart(2, "0");
    const sizeBytes = 1650000 + i * 115000;
    items.push({
      name,
      category: evidenceCategory(name),
      fileType: evidenceFileTypeLabel(name),
      uploadedAt: `${hh}:${mm}`,
      sizeBytes,
      sizeLabel: formatFileSize(sizeBytes),
      source: "Sample",
      objectUrl: null,
    });
  }
  const extras = [
    ["Voice_Note_2026_11_20.mp3", "11:05", 3420000],
    ["Supplier_Email.msg", "10:12", 64500],
    ["Client_Update.msg", "13:40", 51200],
    ["Inspection_Request.msg", "15:22", 78900],
    ["Delivery_Note.pdf", "11:18", 684000],
    ["Site_Instructions_20_Nov.docx", "14:05", 148400],
  ];
  for (const [name, uploadedAt, sizeBytes] of extras) {
    items.push({
      name,
      category: evidenceCategory(name),
      fileType: evidenceFileTypeLabel(name),
      uploadedAt,
      sizeBytes,
      sizeLabel: formatFileSize(sizeBytes),
      source: "Sample",
      objectUrl: null,
    });
  }
  return items;
}

export function computeEvidenceStatus(record, assignedReport, confirmed, manualSet) {
  if (!assignedReport || assignedReport === UNASSIGNED) return "Needs Review";
  if (confirmed || manualSet.has(record.name)) return "Classified";
  if (record.source === "Uploaded" || record.name === "Site_Instructions_20_Nov.docx") return "Uploaded";
  const conf = REPORT_TYPES[assignedReport]?.confidence ?? 0;
  return conf < 90 ? "Needs Review" : "Classified";
}

export function computeUploadStats(records) {
  const stats = { total: records.length, photos: 0, documents: 0, audio: 0 };
  for (const r of records) {
    if (r.category === "photo") stats.photos += 1;
    else if (r.category === "voice") stats.audio += 1;
    else stats.documents += 1;
  }
  return stats;
}

// --- Report & Notice Generators (DG-01, DG-02, DG-03) ---
export function generateReportDraftText({ project, reportType, language, clarification, docId, timestamp }) {
  const hours = clarification?.hours ?? 3;
  const supplier = clarification?.supplier || "ABC Concrete";
  const impact = clarification?.impact || "Yes — Critical Path";
  const arrival = `${String(Math.min(8 + Number(hours), 23)).padStart(2, "0")}:00`;
  const isEn = language === "en";
  const title = REPORT_TYPES[reportType]?.titles?.[language] || reportType;
  const allowed = REPORT_TYPES[reportType]?.sections || REPORT_SECTIONS.map(([k]) => k);

  const enSections = {
    Witterung: "Morning 6 °C, midday 11 °C, partly cloudy, dry, light wind (Source: Munich-City weather station).",
    Besetzung: "Shell Contractor A: 8 personnel (1 foreman, 7 skilled workers), foundation slab axes A–F; Electrical Contractor B: 2 personnel, earthing strip.",
    Begehung: "10:30 reinforcement inspection on foundation slab axes A–F with Shell Contractor A foreman: bar diameter, spacing, spacers and concrete cover verified and released.",
    Behinderung: `08:00–${arrival}: Concrete pour on foundation slab axes A–C delayed; ready-mix concrete (${supplier}) arrived ${hours} h late. Schedule impact: ${impact}.`,
    Anordnung: `Instruction No. 08 issued to ${supplier} at 13:30: confirm replacement delivery slot and written recovery schedule by 21 Nov 2026, 12:00.`,
    Tagesleistungen: `Shell Contractor A completed reinforcement axes A–F (100%) and poured foundation slab axes A–C (36 m³ C30/37, ${arrival}–15:40; test cubes #21–23 taken). Overall slab progress reached 65%.`,
    Vorkommnis: "09:15 incomplete edge fall protection observed on Level 3 (axis 5/C), no injuries; area immediately cordoned off at 09:25 and reported to SiGeKo at 09:40.",
    Lieferungen: `${arrival} Ready-mix concrete C30/37, 36 m³ (4 trucks, slips #7731–7734-1120), accepted & poured; 07:40 Reinforcing steel 2.1 t (slip #4711-1120), accepted.`,
    Geräte: "Tower Crane 1 (07:00–16:30), 36 m Concrete Pump (11:00–15:45, 3 h standby), 3 internal vibrators.",
    "Bemerkung (extern)": "Risk: Potential shift of axes D–F pour if supplier batching delays persist. Next pour scheduled for 21 Nov 2026.",
    "Bemerkung (intern)": `(i) Evaluate standby cost claim for concrete pump and crew (${hours} h waiting time); supplier responsibility statement requested from ${supplier}.`,
    "Fotos / Freigabe": `Site photos 101–112 attached; created ${timestamp} by Site Supervision, approval pending.`,
  };

  const deSections = {
    Witterung: "Früh 6 °C, mittags 11 °C, teilweise bewölkt, trocken, schwacher Wind (Quelle: Wetterdienst München-Stadt).",
    Besetzung: "Rohbau-Unternehmen A: 8 Personen (1 Polier, 7 Facharbeiter), Fundamentplatte Achse A–F; Elektro-Fachbetrieb B: 2 Personen, Fundamenterder.",
    Begehung: "10:30 Bewehrungsabnahme Fundamentplatte Achse A–F mit Polier Rohbau A: Lage, Durchmesser, Abstandhalter und Betondeckung geprüft und freigegeben.",
    Behinderung: `08:00–${arrival}: Betonage Fundamentplatte Achse A–C verspätet; Transportbeton (${supplier}) traf ${hours} h zu spät ein. Auswirkung: ${impact}.`,
    Anordnung: `Nr. 08 an ${supplier}, 13:30: Ersatztermin und Maßnahmen zur Terminsicherung schriftlich bis 21.11.2026 12:00 mitteilen.`,
    Tagesleistungen: `Rohbau A: Bewehrung Achse A–F abgeschlossen; Betonage Fundamentplatte Achse A–C, 36 m³ C30/37 (${arrival}–15:40), Würfelproben Nr. 21–23 entnommen.`,
    Vorkommnis: "09:15 Absturzsicherung Deckenrand Ebene 3 (Achse 5/C) unvollständig, keine Verletzten; Bereich um 09:25 abgesperrt, Meldung an SiGeKo 09:40.",
    Lieferungen: `${arrival} Transportbeton C30/37, 36 m³ (4 Fahrzeuge, LS 7731–7734-1120), eingebaut; 07:40 Betonstahl 2,1 t (LS 4711-1120), angenommen.`,
    Geräte: "Turmdrehkran 1 (07:00–16:30), Betonpumpe 36 m (11:00–15:45), 3 Innenrüttler.",
    "Bemerkung (extern)": "Betonage Achse D–F für 21.11.2026 vorgesehen; Bauzeitenplan wird fortgeschrieben.",
    "Bemerkung (intern)": `(i) Mehrkosten durch Wartezeit Pumpe und Kolonne (${hours} h) prüfen; Stellungnahme ${supplier} angefordert.`,
    "Fotos / Freigabe": `Fotos 101–112 beigefügt; erstellt ${timestamp} Objektüberwachung, Freigabe ausstehend.`,
  };

  const sectionData = isEn ? enSections : deSections;
  const labelMap = Object.fromEntries(REPORT_SECTIONS.map(([de, en]) => [de, isEn ? en : de]));
  const lines = isEn
    ? [
        `Document: ${title}`,
        `Document ID: ${docId}`,
        `Project: ${project}`,
        `Site day: 142`,
        `Date: 20 Nov 2026`,
        `Created: ${timestamp}`,
        `Status: Draft for Review`,
        `Headline: Concrete pour completed after ${hours} h supplier delay`,
        `Summary: Foundation slab axes A–C was poured after ready-mix concrete arrived ${hours} h late. Reinforcement axes A–F was released and Level 3 edge protection was secured.`,
      ]
    : [
        `Dokument: ${title}`,
        `Dokument-ID: ${docId}`,
        `Projekt: ${project}`,
        `Bautag: 142`,
        `Datum: 20.11.2026`,
        `Erstellt: ${timestamp}`,
        `Status: Entwurf zur Prüfung`,
        `Überschrift: Betonage mit ${hours} h Lieferverzug`,
        `Zusammenfassung: Fundamentplatte Achse A–C betoniert, nachdem Transportbeton ${hours} h verspätet eintraf. Bewehrung Achse A–F freigegeben; Absturzsicherung Ebene 3 gesichert.`,
      ];

  for (const key of allowed) {
    if (sectionData[key]) {
      lines.push("", `## ${labelMap[key]}`, sectionData[key]);
    }
  }
  return lines.join("\n");
}

export function generateNoticeDraftText({ project, noticeType, summaryInput, clarification, attachments, docId, timestamp }) {
  const hours = clarification?.hours ?? 3;
  const supplier = clarification?.supplier || "ABC Concrete";
  const subjects = {
    "Delay Notice": "Notice of potential project delay – concrete delivery disruption",
    "Additional Cost Notice": "Notice of additional cost claim – standby & acceleration resources",
    "Defect Notice": "Formal defect notice – non-conforming work requiring rectification",
    "Notice of Concern": "Formal notice of concern – site safety and schedule risk",
  };
  const impacts = {
    "Delay Notice": "The reported event directly affects the concrete works sequence and places the 22 November 2026 milestone at risk.",
    "Additional Cost Notice": `Standby time for the 36 m concrete pump and 8-person crew (${hours} h) incurs unbudgeted direct site costs.`,
    "Defect Notice": "The identified defect does not comply with approved drawings and specifications and blocks follow-on trades.",
    "Notice of Concern": "Unresolved site conditions expose personnel to avoidable safety risks and threaten critical-path progress.",
  };
  const actions = {
    "Delay Notice": "Confirm revised delivery slots, submit a written recovery plan, and propose mitigation measures within 24 hours.",
    "Additional Cost Notice": "Acknowledge receipt of this cost notification and confirm commercial verification of standby logs within 5 working days.",
    "Defect Notice": "Submit a corrective method statement and complete rectification with documented re-inspection prior to covering.",
    "Notice of Concern": "Attend site urgently, implement preventive controls, and confirm corrective measures in writing within 24 hours.",
  };

  const description =
    summaryInput?.trim() ||
    `${supplier} delivered ready-mix concrete ${hours} hours later than the agreed 08:00 delivery slot on 20 Nov 2026, delaying foundation slab axes A–C.`;
  const attachedText = (attachments?.length ? attachments : ["Delivery_Note.pdf", "Supplier_Email.msg", "Facade_Photo_01.jpg"]).join(", ");

  return [
    `Document: ${noticeType}`,
    `Document ID: ${docId}`,
    `Project: ${project}`,
    `Date: 20 Nov 2026`,
    `Created: ${timestamp}`,
    `Status: Draft for Review`,
    `Headline: ${subjects[noticeType] || subjects["Delay Notice"]}`,
    `Summary: Formal ${noticeType.toLowerCase()} issued for ${project} on 20 Nov 2026.`,
    "",
    "## Reference Number",
    docId,
    "",
    "## Addressee",
    supplier,
    "",
    "## Description",
    description,
    "",
    "## Impact",
    impacts[noticeType] || impacts["Delay Notice"],
    "",
    "## Requested Action",
    actions[noticeType] || actions["Delay Notice"],
    "",
    "## Attachments",
    attachedText,
    "",
    "## Remark (internal)",
    `(i) Commercial and schedule exposure under review (${hours} h standby); contractual responsibility remains open.`,
  ].join("\n");
}

export function parseEditorDraft(text, lockedTimestamp, lockedDocId) {
  const keyMap = {
    document: "title",
    dokument: "title",
    "document id": "docId",
    "dokument-id": "docId",
    project: "project",
    projekt: "project",
    "site day": "day",
    bautag: "day",
    date: "date",
    datum: "date",
    created: "created",
    erstellt: "created",
    status: "status",
    headline: "headline",
    überschrift: "headline",
    summary: "summary",
    zusammenfassung: "summary",
  };
  const fields = {};
  const sections = [];
  let currentHeading = null;
  let buffer = [];

  const flush = () => {
    if (currentHeading !== null) {
      const content = buffer.join("\n").trim();
      if (content) sections.push([currentHeading, content]);
    }
  };

  for (const line of (text || "").split("\n")) {
    if (line.startsWith("## ")) {
      flush();
      currentHeading = line.slice(3).trim();
      buffer = [];
    } else if (currentHeading === null) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const rawKey = line.slice(0, idx).trim().toLowerCase();
        if (keyMap[rawKey]) fields[keyMap[rawKey]] = line.slice(idx + 1).trim();
      }
    } else {
      buffer.push(line);
    }
  }
  flush();

  // DG-03: Enforce non-editable auto-generated timestamp & Document ID
  if (lockedTimestamp) fields.created = lockedTimestamp;
  if (lockedDocId) fields.docId = lockedDocId;

  return { fields, sections };
}

export function buildPrintableHtml(parsed, includeInternal) {
  const { fields, sections } = parsed;
  const visible = sections.filter(
    ([label]) => includeInternal || !["remark (internal)", "bemerkung (intern)"].includes(label.toLowerCase())
  );
  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const rows = visible
    .map(([l, b]) => `<tr><td class="lbl">${esc(l)}</td><td>${esc(b).replaceAll("\n", "<br/>")}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(fields.title || "BauDackel Report")} - ${esc(fields.docId || "")}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1d1d1f; margin: 32px; }
  h1 { margin: 0; font-size: 20px; }
  .meta { color: #555; font-size: 11px; margin: 6px 0 16px; }
  h2 { font-size: 14px; margin: 0 0 6px; }
  .summary { font-size: 12px; color: #444; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #0f172a; color: #fff; text-align: left; padding: 7px 9px; font-size: 10px; }
  td { border: 1px solid #cbd5e1; padding: 7px 9px; vertical-align: top; }
  .lbl { background: #f1f5f9; font-weight: 700; width: 28%; }
  .footer { margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <h1>${esc(fields.title || "BauDackel Report")}</h1>
  <div class="meta">Project: ${esc(fields.project)} · Document ID: ${esc(fields.docId)} · Timestamp: ${esc(fields.created)} · Status: ${esc(fields.status || "Exported")}</div>
  <h2>${esc(fields.headline)}</h2>
  <p class="summary">${esc(fields.summary)}</p>
  <table>
    <thead><tr><th>SECTION</th><th>ENTRY</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer"><span>Generated by BauDackel · ${esc(fields.created)}</span><span>Document ID: ${esc(fields.docId)}</span></div>
</body>
</html>`;
}

// --- Knowledge Hub Data & Search (KH-01, KH-02, KH-04) ---
export const KB_EXAMPLE_QUESTIONS = [
  "When was the last supplier delay?",
  "Show unresolved issues.",
  "Summarize project progress.",
  "Show all safety incidents.",
  "Find reports related to excavation.",
];

export const DEFAULT_REPOSITORY_DOCS = [
  {
    id: "DOC-2026-019",
    name: "Delay_Notice_Concrete.docx",
    type: "Notice",
    createdAt: "2026-11-19 16:40",
    dateLabel: "19 Nov 2026",
    status: "Exported",
    evidenceCount: 4,
    summary: "Formal delay notice to ABC Concrete regarding concrete delivery disruption.",
    content: null,
  },
  {
    id: "DOC-2026-018",
    name: "Safety_Observation.pdf",
    type: "Safety observation",
    createdAt: "2026-11-18 14:15",
    dateLabel: "18 Nov 2026",
    status: "Reviewed",
    evidenceCount: 3,
    summary: "Safety observation #011 documenting edge protection inspection on Level 3.",
    content: null,
  },
  {
    id: "DOC-2026-017",
    name: "Meeting_Minutes.docx",
    type: "Meeting",
    createdAt: "2026-11-17 17:00",
    dateLabel: "17 Nov 2026",
    status: "Final",
    evidenceCount: 2,
    summary: "Weekly site coordination minutes covering concrete schedule, RFI #027 and safety controls.",
    content: null,
  },
  {
    id: "DOC-2026-016",
    name: "Foundation_Excavation_Report.pdf",
    type: "Report",
    createdAt: "2026-11-16 15:20",
    dateLabel: "16 Nov 2026",
    status: "Exported",
    evidenceCount: 7,
    summary: "Excavation and foundation quality report confirming soil compaction and blinding layer release.",
    content: null,
  },
  {
    id: "DOC-2026-015",
    name: "Daily_Report_15_Nov.pdf",
    type: "Daily report",
    createdAt: "2026-11-15 18:05",
    dateLabel: "15 Nov 2026",
    status: "Exported",
    evidenceCount: 11,
    summary: "Daily construction report covering reinforcement installation and excavation backfilling.",
    content: null,
  },
];

export function docIconFor(name, type) {
  const lt = (type || "").toLowerCase();
  const ln = (name || "").toLowerCase();
  if (lt.includes("safety") || ln.includes("safety") || lt.includes("incident")) return "🦺";
  if (lt.includes("notice") || ln.includes("notice")) return "⚖️";
  if (lt.includes("meeting") || ln.includes("meeting")) return "🤝";
  if (ln.endsWith(".pdf")) return "📄";
  return "📋";
}

export function answerKnowledgeQuery(question, clarification) {
  const words = new Set((question || "").toLowerCase().match(/[a-z]+/g) || []);
  const hours = clarification?.hours ?? 3;
  const supplier = clarification?.supplier || "ABC Concrete";

  const intents = [
    {
      keywords: ["delay", "delays", "delayed", "late", "supplier", "suppliers"],
      answer: `Supplier delay detected on 20 November 2026. ${supplier} arrived ${hours} hours late with the concrete delivery. A written recovery plan has been requested within 24 hours.`,
      documents: [
        { icon: "⚖️", title: "Delay Notice #004", meta: "Notice · 20 Nov 2026" },
        { icon: "📋", title: "Daily Report #018", meta: "Daily report · 20 Nov 2026" },
        { icon: "📧", title: "Supplier Email", meta: `Email from ${supplier} · 20 Nov 2026` },
      ],
      confidence: 96,
    },
    {
      keywords: ["safety", "observation", "observations", "hazard", "ppe", "incident", "incidents"],
      answer:
        "3 safety observations were recorded in November 2026: Edge protection gap on Level 3 (open), missing toe boards on scaffold B (closed), and PPE non-compliance at gate 2 (closed).",
      documents: [
        { icon: "🦺", title: "Safety Observation #011", meta: "Safety · 18 Nov 2026" },
        { icon: "🦺", title: "Safety Observation #009", meta: "Safety · 12 Nov 2026" },
        { icon: "📷", title: "Site Photos – Level 3", meta: "Photos · 20 Nov 2026" },
      ],
      confidence: 91,
    },
    {
      keywords: ["excavation", "excavate", "soil", "trench", "compaction", "earthworks"],
      answer:
        "Found 2 reports related to excavation and earthworks: Foundation_Excavation_Report.pdf (98% Proctor soil compaction verified) and Daily_Report_15_Nov.pdf (north foundation wall backfilling completed).",
      documents: [
        { icon: "📄", title: "Foundation_Excavation_Report.pdf", meta: "Report · 16 Nov 2026" },
        { icon: "📋", title: "Daily_Report_15_Nov.pdf", meta: "Daily report · 15 Nov 2026" },
      ],
      confidence: 94,
    },
    {
      keywords: ["concrete", "pour", "foundation", "slab", "reinforcement"],
      answer:
        "Found 4 documents related to concrete works covering foundation reinforcement release, C30/37 deliveries, and the upcoming pour on 22 November 2026.",
      documents: [
        { icon: "📄", title: "Foundation_Excavation_Report.pdf", meta: "Quality · 16 Nov 2026" },
        { icon: "📄", title: "Delivery Note – Concrete", meta: "Delivery note · 20 Nov 2026" },
        { icon: "📋", title: "Daily Report #018", meta: "Daily report · 20 Nov 2026" },
      ],
      confidence: 89,
    },
    {
      keywords: ["unresolved", "open", "issue", "issues", "outstanding", "pending"],
      answer: `3 unresolved issues require attention: (1) Recovery plan from ${supplier} pending (due 21 Nov), (2) Edge protection closure on Level 3, (3) RFI #027 slab opening clarification awaiting structural designer.`,
      documents: [
        { icon: "⚖️", title: "Delay Notice #004", meta: "Notice · 20 Nov 2026" },
        { icon: "🦺", title: "Safety Observation #011", meta: "Safety · 18 Nov 2026" },
        { icon: "📄", title: "RFI #027", meta: "RFI · 16 Nov 2026" },
      ],
      confidence: 88,
    },
    {
      keywords: ["progress", "summary", "summarize", "status", "overview"],
      answer:
        "The project is 62% complete overall (vs 75% planned). Foundations are at 65%, structural steel is at 72% (ahead of plan), and facade installation has reached 38%. Primary risk is concrete supplier reliability.",
      documents: [
        { icon: "📈", title: "Weekly Progress Report #046", meta: "Progress · 17 Nov 2026" },
        { icon: "📋", title: "Daily Report #018", meta: "Daily report · 20 Nov 2026" },
        { icon: "🤝", title: "Meeting Minutes", meta: "Meeting · 17 Nov 2026" },
      ],
      confidence: 93,
    },
  ];

  let best = null;
  let bestScore = 0;
  for (const intent of intents) {
    const score = intent.keywords.filter((k) => words.has(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  if (!best) {
    return {
      answer:
        "No high-confidence match found. Try asking about supplier delays, safety incidents, excavation reports, unresolved issues, or project progress.",
      documents: [],
      confidence: 42,
    };
  }
  return best;
}

// --- Performance Monitoring Data & Engines (PM-01, PM-02, PM-04, PM-05) ---
export const SCHEDULE_ACTIVITIES = [
  {
    activity: "Foundation Works",
    trade: "Shell Contractor A",
    planned: 80,
    actual: 65,
    plannedCompletion: "15 Nov 2026",
    actualCompletion: "20 Nov 2026",
    delayDays: 5,
    productivity: 84,
    targetProductivity: 95,
    rootCause: "3-hour ready-mix concrete delivery delay (ABC Concrete) and rebar rework on axes A–C.",
    relatedDocument: "Delay_Notice_Concrete.docx",
  },
  {
    activity: "Concrete Works – Slab Axes A–F",
    trade: "Shell Contractor A",
    planned: 75,
    actual: 60,
    plannedCompletion: "15 Nov 2026",
    actualCompletion: "21 Nov 2026",
    delayDays: 6,
    productivity: 81,
    targetProductivity: 95,
    rootCause: "Batching plant outage delayed 4 mixer trucks; concrete pump stood idle for 3 hours.",
    relatedDocument: "Daily_Report_15_Nov.pdf",
  },
  {
    activity: "Structural Steel & Core Walls",
    trade: "Steelworks GmbH",
    planned: 70,
    actual: 72,
    plannedCompletion: "28 Nov 2026",
    actualCompletion: "27 Nov 2026",
    delayDays: 0,
    productivity: 103,
    targetProductivity: 95,
    rootCause: "Ahead of baseline thanks to dual crane shift.",
    relatedDocument: "Foundation_Excavation_Report.pdf",
  },
  {
    activity: "MEP Rough-In (Level 1–2)",
    trade: "Electrical Contractor B",
    planned: 55,
    actual: 48,
    plannedCompletion: "02 Dec 2026",
    actualCompletion: "05 Dec 2026",
    delayDays: 3,
    productivity: 89,
    targetProductivity: 95,
    rootCause: "Awaiting RFI #027 slab opening clarification from structural designer.",
    relatedDocument: "Meeting_Minutes.docx",
  },
  {
    activity: "Facade Installation (East Elevation)",
    trade: "Facade Systems AG",
    planned: 40,
    actual: 38,
    plannedCompletion: "12 Dec 2026",
    actualCompletion: "12 Dec 2026",
    delayDays: 0,
    productivity: 96,
    targetProductivity: 95,
    rootCause: "Proceeding on schedule.",
    relatedDocument: "Safety_Observation.pdf",
  },
  {
    activity: "Waterproofing & Drainage",
    trade: "Civil Works Partner C",
    planned: 90,
    actual: 92,
    plannedCompletion: "18 Nov 2026",
    actualCompletion: "18 Nov 2026",
    delayDays: 0,
    productivity: 101,
    targetProductivity: 95,
    rootCause: "Completed on baseline target.",
    relatedDocument: "Foundation_Excavation_Report.pdf",
  },
];

export const PROGRESS_TREND = [
  { week: "W42", planned: 28, actual: 27 },
  { week: "W43", planned: 38, actual: 36 },
  { week: "W44", planned: 49, actual: 45 },
  { week: "W45", planned: 59, actual: 53 },
  { week: "W46", planned: 68, actual: 60 },
  { week: "W47", planned: 75, actual: 62 },
];

export function computePerformanceSummary(activities) {
  const plannedPct = Math.round(activities.reduce((s, a) => s + a.planned, 0) / activities.length);
  const actualPct = Math.round(activities.reduce((s, a) => s + a.actual, 0) / activities.length);
  const variancePct = actualPct - plannedPct;
  const onTrack = activities.filter((a) => a.delayDays === 0 && a.actual >= a.planned).length;
  const delayed = activities.filter((a) => a.delayDays > 0 || a.actual < a.planned).length;
  const avgProductivity = Math.round(activities.reduce((s, a) => s + a.productivity, 0) / activities.length);
  const healthScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, -variancePct) * 2 - delayed * 4 - Math.max(0, 95 - avgProductivity))
  );
  const healthLabel = healthScore >= 80 ? "Healthy" : healthScore >= 65 ? "Watch" : "Critical";
  const healthColor = healthScore >= 80 ? "green" : healthScore >= 65 ? "orange" : "red";
  return {
    completionPct: actualPct,
    plannedPct,
    actualPct,
    variancePct,
    onTrack,
    delayed,
    avgProductivity,
    healthScore,
    healthLabel,
    healthColor,
  };
}

export function detectDelays(activities) {
  return activities
    .filter((a) => a.delayDays > 0)
    .map((a) => {
      const high = a.delayDays >= 5;
      return {
        ...a,
        severity: high ? "High" : "Medium",
        color: high ? "red" : "orange",
        impact: high
          ? `Critical-path milestone at risk (+${a.delayDays} days). Downstream formwork and curing sequence will shift without recovery.`
          : `Moderate float erosion (+${a.delayDays} days). Monitor closely to avoid cascading trade clashes.`,
        recommendedAction: high
          ? "Issue formal Delay Notice immediately and request a 24-hour recovery schedule."
          : "Follow up on open RFI/blocker and confirm revised handover date in site meeting.",
      };
    })
    .sort((a, b) => b.delayDays - a.delayDays);
}

export function generateDeviationAlerts(activities) {
  const alerts = [];
  for (const item of activities) {
    const progressVar = item.actual - item.planned;
    const triggers = [];
    if (progressVar < -10) triggers.push(`Progress variance ${progressVar}% (>10% threshold)`);
    if (item.delayDays > 5) triggers.push(`Schedule delay +${item.delayDays} days (>5 days threshold)`);
    if (item.targetProductivity - item.productivity >= 10) {
      triggers.push(`Productivity ${item.productivity}% vs target ${item.targetProductivity}%`);
    }
    if (!triggers.length) continue;
    const isCritical = progressVar < -10 || item.delayDays > 5;
    alerts.push({
      id: `DEV-${String(alerts.length + 1).padStart(2, "0")}`,
      activity: item.activity,
      trade: item.trade,
      level: isCritical ? "Critical" : "Warning",
      color: isCritical ? "red" : "orange",
      triggers,
      rootCause: item.rootCause,
      suggestedAction: isCritical
        ? "Issue contractual Delay Notice, log hindrance in Daily Report, and review site evidence."
        : "Review crew allocation and verify open design clarifications.",
      relatedDocuments: [item.relatedDocument, "Daily_Report_15_Nov.pdf"],
      delayDays: item.delayDays,
    });
  }
  return alerts;
}

// --- Meeting Intelligence Data & Extractor (MI-01, MI-02, MI-03, MI-07) ---
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
  criticalOutcomes: [
    "Formal Delay Notice #004 authorized against ABC Concrete with a 24-hour recovery deadline.",
    "Work halt enforced on Level 3 axis 5/C until SiGeKo signs off reinstalled guardrails.",
    "Structural engineer committed to closing RFI #027 by 22 Nov 2026 to unblock MEP works.",
  ],
  keyDecisions: [
    "Issue formal Delay Notice #004 to ABC Concrete and request written recovery schedule.",
    "Keep Level 3 slab edge (axis 5/C) restricted until SiGeKo signs off guardrail reinstatement.",
    "Shift foundation slab pour axes D–F to 21 Nov 2026 pending confirmed batching plant slots.",
  ],
  risks: [
    "High — Potential 5-day critical-path slip if ABC Concrete misses the 21 Nov replacement slot.",
    "Medium — MEP rough-in delay on Level 2 if RFI #027 approval slips past 22 Nov.",
  ],
  openIssues: [
    "Recovery plan from ABC Concrete pending (due 21 Nov 2026).",
    "Safety Observation #011 guardrail closure awaiting final inspection.",
    "RFI #027 slab opening dimensions awaiting structural sign-off.",
  ],
};

export const DEFAULT_ACTION_ITEMS = [
  {
    id: "act-1",
    owner: "John Smith (Site Manager)",
    actionItem: "Issue Delay Notice #004 to ABC Concrete and circulate Daily Report #018",
    dueDate: "20 Nov 2026",
    status: "In Progress",
  },
  {
    id: "act-2",
    owner: "M. Weber (Shell Contractor A)",
    actionItem: "Submit revised concrete pour sequence for axes D–F",
    dueDate: "21 Nov 2026",
    status: "Open",
  },
  {
    id: "act-3",
    owner: "T. Klein (SiGeKo)",
    actionItem: "Inspect reinstated Level 3 guardrails and close Safety Observation #011",
    dueDate: "21 Nov 2026",
    status: "Open",
  },
  {
    id: "act-4",
    owner: "Dr. K. Hoffman (Structural Eng.)",
    actionItem: "Approve RFI #027 slab opening dimensions for Level 2 MEP rough-in",
    dueDate: "22 Nov 2026",
    status: "In Progress",
  },
  {
    id: "act-5",
    owner: "L. Bauer (Electrical Contractor B)",
    actionItem: "Confirm cable tray mobilization once RFI #027 is released",
    dueDate: "24 Nov 2026",
    status: "Open",
  },
];

export const DEFAULT_DECISIONS = [
  {
    id: "dec-1",
    date: "20 Nov 2026",
    topic: "Concrete Delivery Delay — Formal Contractual Notice",
    decision: "Issue Delay Notice #004 to ABC Concrete with 24-hour recovery plan requirement.",
    owner: "John Smith (Site Manager)",
    docs: "Delay_Notice_Concrete.docx · Supplier_Email.msg",
  },
  {
    id: "dec-2",
    date: "20 Nov 2026",
    topic: "Level 3 Edge Protection — Area Restriction",
    decision: "Maintain cordon at axis 5/C until SiGeKo completes physical guardrail sign-off.",
    owner: "T. Klein (SiGeKo)",
    docs: "Safety_Observation.pdf · Facade_Photo_12.jpg",
  },
  {
    id: "dec-3",
    date: "17 Nov 2026",
    topic: "Foundation Slab Pour Sequence (Axes A–F)",
    decision: "Split concrete pour into two bays (A–C first, D–F next) to protect curing quality.",
    owner: "Dr. K. Hoffman (Structural Eng.)",
    docs: "Meeting_Minutes.docx · Foundation_Excavation_Report.pdf",
  },
];

export function extractMeetingIntelligence(rawText) {
  const lines = (rawText || "")
    .split("\n")
    .map((l) => l.replace(/^[\s\-•]+/, "").trim())
    .filter(Boolean);

  const decisionsFound = lines
    .filter((l) => l.toLowerCase().startsWith("decision:"))
    .map((l) => l.slice(l.indexOf(":") + 1).trim());

  const actionsFound = lines
    .filter((l) => l.toLowerCase().startsWith("action:"))
    .map((l) => l.slice(l.indexOf(":") + 1).trim());

  const summary = {
    ...DEFAULT_MEETING_SUMMARY,
    title: lines[0] ? lines[0].slice(0, 80) : DEFAULT_MEETING_SUMMARY.title,
    keyDecisions: decisionsFound.length ? decisionsFound : DEFAULT_MEETING_SUMMARY.keyDecisions,
    criticalOutcomes: decisionsFound.length ? decisionsFound.slice(0, 3) : DEFAULT_MEETING_SUMMARY.criticalOutcomes,
  };

  const actions = actionsFound.length
    ? actionsFound.map((raw, idx) => {
        let owner = "Unassigned";
        let task = raw;
        let dueDate = "22 Nov 2026";
        if (raw.includes(" to ")) {
          const [maybeOwner, rest] = raw.split(" to ");
          if (maybeOwner.split(" ").length <= 4) {
            owner = maybeOwner.trim();
            task = rest.trim();
          }
        }
        const byIdx = task.toLowerCase().lastIndexOf(" by ");
        if (byIdx > 0) {
          dueDate = task.slice(byIdx + 4).replace(/\.$/, "").trim();
          task = task.slice(0, byIdx).trim();
        }
        return {
          id: `ext-${Date.now()}-${idx}`,
          owner,
          actionItem: task.charAt(0).toUpperCase() + task.slice(1),
          dueDate,
          status: "Open",
        };
      })
    : DEFAULT_ACTION_ITEMS;

  const decisions = [...DEFAULT_DECISIONS];
  decisionsFound.forEach((d, idx) => {
    if (!decisions.some((existing) => existing.decision.toLowerCase() === d.toLowerCase())) {
      decisions.unshift({
        id: `dec-ext-${Date.now()}-${idx}`,
        date: "20 Nov 2026",
        topic: "Extracted from Meeting Minutes",
        decision: d,
        owner: "John Smith (Site Manager)",
        docs: "Meeting_Minutes.docx",
      });
    }
  });

  return { summary, actions, decisions };
}
