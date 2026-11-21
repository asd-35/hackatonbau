import {
  ASSIGNMENT_OPTIONS,
  BAUTAGEBUCH_SYSTEM_PROMPT,
  CLASSIFICATION_KEYWORDS,
  DAILY_REPORT,
  DEFAULT_ACTION_ITEMS,
  DEFAULT_DECISION_LOG,
  DEFAULT_MEETING_SUMMARY,
  DOC_TYPE_ICONS,
  EVIDENCE_LABELS,
  HEADER_FIELDS,
  INTERNAL_SECTION_LABELS,
  KB_INTENTS,
  REPORT_SECTIONS,
  REPORT_TYPES,
  REQUIRED_SECTIONS,
  SAMPLE_CLASSIFICATION,
  TEMPLATE_TEXT,
  UNASSIGNED,
} from "../data/mockData";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatTodayDisplay() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")} ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;
}

export function formatNowTimestamp(language = "en") {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  if (language === "de") {
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
  }
  return `${dd} ${MONTHS_SHORT[now.getMonth()]} ${yyyy}, ${hh}:${min}:${ss}`;
}

export function formatIdStamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${min}`;
}

export function formatTimeHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function formatFileSize(numBytes) {
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Map a numeric confidence score (0–1 or 0–100) to a deterministic semantic tier.
 * score >= 0.85 -> High
 * 0.60 <= score < 0.85 -> Medium
 * score < 0.60 -> Low
 */
export function getConfidenceTier(score) {
  const normalized = score > 1 ? score / 100 : Number(score || 0);
  if (normalized >= 0.85) return { label: "High", color: "green" };
  if (normalized >= 0.6) return { label: "Medium", color: "orange" };
  return { label: "Low", color: "red" };
}

export function evidenceAiSummary(fileName, assignedReportTypes) {
  const reports = Array.isArray(assignedReportTypes)
    ? assignedReportTypes
    : assignedReportTypes && assignedReportTypes !== UNASSIGNED
      ? [assignedReportTypes]
      : [];
  const lower = (fileName || "").toLowerCase();
  if (lower.includes("dictation") || lower.includes("voice")) {
    return "Voice note transcribed — supplier delay & site progress notes detected";
  }
  if (lower.includes("supplier")) {
    return "Concrete delivery delay email (3 h) — key hindrance evidence";
  }
  if (lower.includes("delivery")) {
    return "Delivery slips #7731–7734 (36 m³ C30/37) verified for Daily Report";
  }
  if (lower.includes("inspection")) {
    return "Reinforcement check axes A–F — matched to Site Inspection Report";
  }
  if (lower.includes("client")) {
    return "Milestone status update — matched to Construction Progress Report";
  }
  if (lower.includes("instruction")) {
    return "Site Instruction No. 08 — recovery schedule deadline logged";
  }
  if (reports.length === 0) {
    return "Unassigned — select one or more report types to include in documentation";
  }
  if (reports.includes("Incident/Safety Report")) {
    return "Level 3 edge guardrail gap detected — flag for SiGeKo safety report";
  }
  if (reports.includes("Equipment Breakdown Report")) {
    return "Concrete pump 3 h standby logged — matched to Equipment Report";
  }
  if (reports.includes("Site Inspection Report")) {
    return "Reinforcement & cover photo — matched to Site Inspection Report";
  }
  if (reports.includes("Construction Progress Report")) {
    return "Milestone progress evidence — matched to Progress Report";
  }
  return "Site progress & concrete pour evidence — matched to Daily Report";
}

export function evidenceConfidenceScore(fileName, assignedReportTypes) {
  const reports = Array.isArray(assignedReportTypes)
    ? assignedReportTypes
    : assignedReportTypes && assignedReportTypes !== UNASSIGNED
      ? [assignedReportTypes]
      : [];
  if (reports.length === 0) return 0.45;
  if ((fileName || "").toLowerCase().includes("dictation")) return 0.91;
  const maxConf = Math.max(...reports.map((rt) => REPORT_TYPES[rt]?.confidence ?? 80));
  return maxConf / 100;
}

export function serializeDocToEditorText(doc, lockedCreated = null, lockedDocId = null) {
  const lang = doc.language === "de" ? "de" : "en";
  const names = HEADER_FIELDS[lang];
  const text = TEMPLATE_TEXT[lang];
  const fields = { ...(doc.fields || {}) };
  if (lockedCreated) fields.created = lockedCreated;
  if (lockedDocId) fields.doc_id = lockedDocId;

  const headerOrder = ["title", "doc_id", "project", "day", "date", "created", "status", "headline", "summary"];
  const lines = [];
  for (const key of headerOrder) {
    if (fields[key] !== undefined && fields[key] !== "") {
      lines.push(`${names[key]}: ${fields[key]}`);
    }
  }
  for (const [label, body] of doc.sections || []) {
    lines.push("", `## ${label}`, body);
  }
  if (doc.photos?.length) {
    lines.push("", `## ${text.photos}`);
    for (const [id, caption] of doc.photos) {
      lines.push(`${text.photo} ${id}: ${caption}`);
    }
  }
  return lines.join("\n");
}

export function evidenceCategory(fileName) {
  const lower = fileName.toLowerCase();
  const extension = lower.includes(".") ? lower.split(".").pop() : "";
  if (lower.includes("hand") || lower.includes("scan")) return "handwritten";
  if (["jpg", "jpeg", "png"].includes(extension)) return "photo";
  if (["mp3", "wav"].includes(extension)) return "voice";
  if (extension === "msg") return "email";
  if (extension === "docx") return "word";
  return lower.includes("delivery") ? "delivery" : "pdf";
}

export function evidenceFileTypeLabel(fileName) {
  const extension = fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "file";
  const category = evidenceCategory(fileName);
  const typeNames = {
    photo: "Image",
    voice: "Audio",
    email: "Email",
    word: "Word Document",
    delivery: "PDF Document",
    pdf: "PDF Document",
    handwritten: "Handwritten Note",
  };
  return `${typeNames[category] || "File"} (.${extension})`;
}

export function evidenceUploadStats(fileNames) {
  const counts = { total: fileNames.length, photos: 0, documents: 0, audio: 0 };
  for (const name of fileNames) {
    const category = evidenceCategory(name);
    if (category === "photo") counts.photos += 1;
    else if (category === "voice") counts.audio += 1;
    else counts.documents += 1;
  }
  return counts;
}

export function countEvidence(fileNames) {
  const counts = {};
  for (const key of Object.keys(EVIDENCE_LABELS)) counts[key] = 0;
  for (const name of fileNames) {
    const cat = evidenceCategory(name);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).filter(([, c]) => c > 0));
}

export function classifyEvidence(fileName) {
  if (SAMPLE_CLASSIFICATION[fileName]) return SAMPLE_CLASSIFICATION[fileName];
  const lower = fileName.toLowerCase();
  for (const [reportType, keywords] of CLASSIFICATION_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return reportType;
  }
  return DAILY_REPORT;
}

export function normalizeReportType(value) {
  if (!value) return UNASSIGNED;
  if (value === "Incident Safety Report") return "Incident/Safety Report";
  return ASSIGNMENT_OPTIONS.includes(value) ? value : UNASSIGNED;
}

export function evidenceStatus(fileName, record, assignedReportTypes, confirmed, manualSet) {
  const raw = assignedReportTypes[fileName];
  const reports = Array.isArray(raw) ? raw : raw && raw !== UNASSIGNED ? [raw] : [];
  if (reports.length === 0) return "Needs Review";
  if (confirmed || manualSet.has(fileName)) return "Classified";
  if (record?.source === "Uploaded" || fileName === "Site_Instructions_20_Nov.docx") return "Uploaded";
  const maxConfidence = Math.max(...reports.map((rt) => REPORT_TYPES[rt]?.confidence || 0));
  if (maxConfidence < 90) return "Needs Review";
  return "Classified";
}

export function photoRefs(ids, singular, plural) {
  if (!ids.length) return "";
  if (ids.length === 1) return `${singular} ${ids[0]}`;
  const isConsecutive = ids.every((id, i) => id === ids[0] + i);
  if (isConsecutive) return `${plural} ${ids[0]}–${ids[ids.length - 1]}`;
  return `${plural} ${ids.join(", ")}`;
}

export function documentSlug(documentType) {
  return (
    documentType
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("_")
      .replace(/[^A-Za-z0-9_]/g, "_") + "_20_Nov"
  );
}

export function makeNotice(noticeType, issue, attachments = null) {
  const subjects = {
    "Delay Notice": "Notice of potential project delay – concrete delivery disruption",
    "Additional Cost Notice": "Notice of additional cost claim – standby & acceleration resources",
    "Defect Notice": "Formal defect notice – non-conforming work requiring rectification",
    "Notice of Concern": "Formal notice of concern – site safety and schedule risk",
  };
  const impacts = {
    "Delay Notice":
      "The reported event directly affects the current concrete works sequence and places the milestone planned for 22 November 2026 at risk.",
    "Additional Cost Notice":
      "Standby time for the 36 m concrete pump, site crew waiting hours, and out-of-sequence works incur unbudgeted direct costs.",
    "Defect Notice":
      "The identified defect fails to meet approved drawings and DIN/contractual specifications and must be rectified before follow-on trades proceed.",
    "Notice of Concern":
      "Unresolved site conditions expose personnel to avoidable safety hazards and risk cascading schedule disruption across active trades.",
  };
  const actions = {
    "Delay Notice":
      "Please confirm the revised delivery schedule, submit a written recovery proposal, and identify mitigation measures within 24 hours.",
    "Additional Cost Notice":
      "Please acknowledge receipt of this cost notification, verify the attached site standby records, and confirm commercial review within 5 working days.",
    "Defect Notice":
      "Please submit a corrective method statement and complete full rectification works with documented re-inspection before covering or continuing.",
    "Notice of Concern":
      "Please attend site urgently, implement immediate preventive controls, and provide written confirmation of corrective actions within 24 hours.",
  };

  const keys = Object.keys(subjects);
  const selected = subjects[noticeType] ? noticeType : "Delay Notice";
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const reference = `SC-${ymd}-OTM-0${keys.indexOf(selected) + 1}`;
  const attachedList =
    attachments && attachments.length
      ? attachments
      : ["Delivery_Note.pdf", "Supplier_Email.msg", "Facade_Photo_01.jpg"];

  return {
    "Notice Type": selected,
    Subject: subjects[selected],
    Reference: reference,
    Date: formatTodayDisplay(),
    Description: (issue || "").trim() || "Observed site event documented from today's evidence.",
    Impact: impacts[selected],
    "Required Action": actions[selected],
    Attachments: attachedList.join(", "),
  };
}

export function reportJsonSchema(reportType) {
  const allowed = REPORT_TYPES[reportType]?.sections || [];
  return {
    type: "object",
    additionalProperties: false,
    required: ["bautag", "date", "headline", "summary", "sections", "photos"],
    properties: {
      bautag: { type: "integer", description: "Consecutive site day number" },
      date: { type: "string", description: "Report date, ISO 8601 (YYYY-MM-DD)" },
      headline: { type: "string", description: "Short factual headline for the day, max. 8 words" },
      summary: { type: "string", description: "1-2 factual sentences summarising the day" },
      sections: {
        type: "object",
        additionalProperties: false,
        required: REQUIRED_SECTIONS.filter((k) => allowed.includes(k)),
        properties: Object.fromEntries(allowed.map((k) => [k, { type: "string" }])),
      },
      photos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "caption"],
          properties: {
            id: { type: "integer", description: "Photo number from the evidence, starting at 101" },
            caption: { type: "string", description: "What the photo shows, with location/axis" },
          },
        },
      },
    },
  };
}

export function reportSystemPrompt(language, reportType) {
  return BAUTAGEBUCH_SYSTEM_PROMPT.replace("{language}", language === "de" ? "German" : "English")
    .replace("{report_type}", reportType)
    .replace("{sections}", (REPORT_TYPES[reportType]?.sections || []).join(", "));
}

export function simulateLlmReport(language, reportType, clarification, photos, created, getUploadTime) {
  const { hours, supplier, impact } = clarification;
  const arrival = `${String(Math.min(8 + hours, 23)).padStart(2, "0")}:00`;
  const ids = photos.map(([id]) => id);
  const [singular, plural] = language === "en" ? ["photo", "photos"] : ["Foto", "Fotos"];
  const inspectionPhotos = ids.length ? `; ${photoRefs(ids.slice(0, 4), singular, plural)}` : "";
  const incidentPhoto = ids.length ? `, ${photoRefs(ids.slice(-1), singular, plural)}` : "";
  const allPhotos = ids.length ? `${photoRefs(ids, singular, plural)}; ` : "";

  const report =
    language === "en"
      ? {
          bautag: 142,
          date: "2026-11-20",
          headline: "Concrete pour with delayed delivery",
          summary: `Foundation slab axes A–C was poured after the ready-mix concrete arrived ${hours} h late. Reinforcement axes A–F was inspected and released; one fall-protection gap was secured.`,
          sections: {
            Witterung:
              "morning 6 °C, midday 11 °C, partly cloudy, dry, light wind (source: weather service, station Munich-City)",
            Besetzung:
              "Shell contractor A: 8 people (1 foreman, 7 skilled workers), foundation slab axes A–F; electrical contractor B: 2 people, earthing strip foundation",
            Begehung: `10:30 reinforcement inspection foundation slab axes A–F with foreman shell contractor A: position, diameter, spacers and concrete cover checked, released${inspectionPhotos}`,
            Behinderung:
              `08:00–${arrival}: concrete pour foundation slab axes A–C could not start; ready-mix concrete (${supplier}) arrived ${hours} h after the agreed slot of 08:00. ` +
              (String(impact).startsWith("Yes")
                ? `Schedule impact observed (${impact}).`
                : "No impact on the construction schedule observed."),
            Anordnung: `No. 08 to ${supplier}, 13:30: confirm replacement slot and measures to secure delivery times in writing; deadline 21.11.2026 12:00`,
            Tagesleistungen: `Shell contractor A: reinforcement foundation slab axes A–F completed; concrete pour foundation slab axes A–C, 36 m³ C30/37, ${arrival}–15:40; test cubes no. 21–23 taken`,
            Vorkommnis: `09:15 fall protection at slab edge level 3 (axis 5/C) found incomplete, nobody affected; immediate measure: area cordoned off 09:25${incidentPhoto}; reported to SiGeKo 09:40`,
            Lieferungen: `${arrival} ready-mix concrete C30/37, 36 m³ (4 trucks), delivery slips 7731–7734-1120, installed; 07:40 reinforcing steel 2.1 t, delivery slip 4711-1120, accepted`,
            Geräte: "tower crane 1 (07:00–16:30), concrete pump 36 m (11:00–15:45), 3 internal vibrators",
            "Bemerkung (extern)":
              "Concrete pour axes D–F scheduled for 21.11.2026; schedule will be updated",
            "Bemerkung (intern)": `(i) Check additional costs for pump and crew waiting time (${hours} h); responsibility for the delay is open, statement from ${supplier} requested`,
            "Fotos / Freigabe": `${allPhotos}created ${created} site supervision, approval pending`,
          },
          photos: photos.map(([id, name]) => ({
            id,
            caption: `${name} · ${getUploadTime(name)}`,
          })),
        }
      : {
          bautag: 142,
          date: "2026-11-20",
          headline: "Betonage mit Lieferverzug",
          summary: `Fundamentplatte Achse A–C betoniert, nachdem der Transportbeton ${hours} h verspätet eintraf. Bewehrung Achse A–F abgenommen und freigegeben; eine fehlende Absturzsicherung wurde gesichert.`,
          sections: {
            Witterung:
              "früh 6 °C, mittags 11 °C, teilweise bewölkt, trocken, Wind schwach (Quelle: Wetterdienst, Station München-Stadt)",
            Besetzung:
              "Rohbau-Unternehmen A: 8 Personen (1 Polier, 7 Facharbeiter), Fundamentplatte Achse A–F; Elektro-Fachbetrieb B: 2 Personen, Fundamenterder",
            Begehung: `10:30 Bewehrungsabnahme Fundamentplatte Achse A–F mit Polier Rohbau A: Lage, Durchmesser, Abstandhalter und Betondeckung geprüft, freigegeben${inspectionPhotos}`,
            Behinderung:
              `08:00–${arrival}: Betonage Fundamentplatte Achse A–C nicht begonnen; Transportbeton (${supplier}) ${hours} h nach vereinbartem Liefertermin 08:00 eingetroffen. ` +
              (String(impact).startsWith("Yes")
                ? `Auswirkung auf den Bauablauf festgestellt (${impact}).`
                : "Keine Auswirkung auf den Bauablauf festgestellt."),
            Anordnung: `Nr. 08 an ${supplier}, 13:30: Ersatztermin und Maßnahmen zur Einhaltung der Liefertermine schriftlich mitteilen; Frist 21.11.2026 12:00`,
            Tagesleistungen: `Rohbau A: Bewehrung Fundamentplatte Achse A–F fertig; Betonage Fundamentplatte Achse A–C, 36 m³ C30/37, ${arrival}–15:40; Würfelproben Nr. 21–23 entnommen`,
            Vorkommnis: `09:15 Absturzsicherung am Deckenrand Ebene 3 (Achse 5/C) unvollständig festgestellt, keine Personen betroffen; Sofortmaßnahme Bereich abgesperrt 09:25${incidentPhoto}; Meldung an SiGeKo 09:40`,
            Lieferungen: `${arrival} Transportbeton C30/37, 36 m³ (4 Fahrzeuge), Lieferscheine 7731–7734-1120, eingebaut; 07:40 Betonstahl 2,1 t, Lieferschein 4711-1120, angenommen`,
            Geräte: "Turmdrehkran 1 (07:00–16:30), Betonpumpe 36 m (11:00–15:45), Innenrüttler 3",
            "Bemerkung (extern)":
              "Betonage Achse D–F für 21.11.2026 vorgesehen; Bauzeitenplan wird fortgeschrieben",
            "Bemerkung (intern)": `(i) Mehrkosten durch Wartezeit Pumpe und Kolonne (${hours} h) prüfen; Verantwortung für den Lieferverzug offen, Stellungnahme ${supplier} angefordert`,
            "Fotos / Freigabe": `${allPhotos}erstellt ${created} Objektüberwachung, Freigabe ausstehend`,
          },
          photos: photos.map(([id, name]) => ({
            id,
            caption: `${name} · ${getUploadTime(name)} Uhr`,
          })),
        };

  const allowed = REPORT_TYPES[reportType]?.sections || [];
  report.sections = Object.fromEntries(
    Object.entries(report.sections).filter(([k]) => allowed.includes(k))
  );
  return JSON.stringify(report, null, 2);
}

export function parseLlmReport(raw) {
  const data = JSON.parse(raw);
  const sections = data.sections || {};
  const orderedSections = {};
  for (const [key] of REPORT_SECTIONS) {
    const val = String(sections[key] || "").trim();
    if (val) orderedSections[key] = val;
  }
  data.sections = orderedSections;
  data.photos = (data.photos || []).filter((p) => Number.isInteger(p?.id));
  return data;
}

export function formatReportDate(isoDate, language) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (language === "de") {
    return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  }
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function reportToEditorText(
  report,
  project,
  language,
  created,
  title = null,
  docId = null,
  status = "Draft for Review"
) {
  const names = HEADER_FIELDS[language];
  const text = TEMPLATE_TEXT[language];
  const labels = Object.fromEntries(
    REPORT_SECTIONS.map(([key, eng]) => [key, language === "de" ? key : eng])
  );
  const lines = [
    `${names.title}: ${title || text.report_title}`,
    `${names.doc_id}: ${docId || "BD-20261120-01"}`,
    `${names.project}: ${project}`,
    `${names.day}: ${report.bautag}`,
    `${names.date}: ${formatReportDate(report.date, language)}`,
    `${names.created}: ${created}`,
    `${names.status}: ${status}`,
    `${names.headline}: ${report.headline}`,
    `${names.summary}: ${report.summary}`,
  ];
  for (const [key, body] of Object.entries(report.sections)) {
    lines.push("", `## ${labels[key] || key}`, body);
  }
  if (report.photos?.length) {
    lines.push("", `## ${text.photos}`);
    for (const photo of report.photos) {
      lines.push(`${text.photo} ${photo.id}: ${photo.caption}`);
    }
  }
  return lines.join("\n");
}

export function noticeToEditorText(
  project,
  clarification,
  created,
  noticeType = "Delay Notice",
  customDescription = "",
  attachments = null,
  docId = null
) {
  const hours = clarification ? clarification.hours : 3;
  const supplier = clarification ? clarification.supplier : "ABC Concrete";
  const impactVal = clarification ? clarification.impact : "Yes — Critical Path";
  const defaultIssue = `${supplier} delivered ready-mix concrete ${hours} hours later than the agreed delivery slot (08:00) on 20 Nov 2026.`;
  const issueText = customDescription.trim() || defaultIssue;
  const notice = makeNotice(noticeType, issueText, attachments);
  const impactText =
    String(impactVal).startsWith("Yes") || noticeType !== "Delay Notice"
      ? notice.Impact
      : "No schedule impact has been observed so far. The event is recorded for contractual purposes.";
  const names = HEADER_FIELDS.en;
  return [
    `${names.title}: ${notice["Notice Type"]}`,
    `${names.doc_id}: ${docId || notice.Reference}`,
    `${names.project}: ${project}`,
    `${names.date}: ${notice.Date}`,
    `${names.created}: ${created}`,
    `${names.status}: Draft for Review`,
    `${names.headline}: ${notice.Subject}`,
    `${names.summary}: Formal ${notice["Notice Type"].toLowerCase()} issued for ${project} (${notice.Date}).`,
    "",
    "## Reference Number",
    notice.Reference,
    "",
    "## Addressee",
    supplier,
    "",
    "## Description",
    notice.Description,
    "",
    "## Impact",
    impactText,
    "",
    "## Requested Action",
    notice["Required Action"],
    "",
    "## Attachments",
    notice.Attachments,
    "",
    "## Remark (internal)",
    `(i) Review commercial and schedule exposure (${hours} h standby); contractual responsibility open.`,
  ].join("\n");
}

const PHOTO_LINE_RE = /^(?:Foto|Photo)\s*(\d+)\s*[:\-–]\s*(.*)$/i;

export function parseEditorText(text, lockedCreated = null, lockedDocId = null) {
  const fieldNames = {};
  for (const [language, names] of Object.entries(HEADER_FIELDS)) {
    for (const [field, name] of Object.entries(names)) {
      fieldNames[name.toLowerCase()] = [language, field];
    }
  }
  const photoHeadings = new Set(
    Object.values(TEMPLATE_TEXT).map((t) => t.photos.toLowerCase())
  );
  const doc = { language: "en", fields: {}, sections: [], photos: [] };
  let heading = null;
  let body = [];

  const flush = () => {
    const content = body.join("\n").trim();
    if (heading === null) return;
    if (photoHeadings.has(heading.toLowerCase())) {
      for (const line of content.split(/\r?\n/)) {
        const match = line.trim().match(PHOTO_LINE_RE);
        if (match) {
          doc.photos.push([Number(match[1]), match[2].trim()]);
        }
      }
    } else if (content) {
      doc.sections.push([heading, content]);
    }
  };

  for (const line of (text || "").split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
      body = [];
    } else if (heading === null) {
      const idx = line.indexOf(":");
      if (idx !== -1) {
        const name = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        if (fieldNames[name]) {
          const [lang, field] = fieldNames[name];
          doc.language = lang;
          doc.fields[field] = value;
        }
      }
    } else {
      body.push(line);
    }
  }
  flush();

  if (lockedCreated) doc.fields.created = lockedCreated;
  if (lockedDocId) doc.fields.doc_id = lockedDocId;
  return doc;
}

export function visibleSections(doc, includeInternal) {
  return doc.sections.filter(
    ([label]) => includeInternal || !INTERNAL_SECTION_LABELS.has(label.toLowerCase())
  );
}

export function reportPhotos(doc, photoDataUrls) {
  const label = TEMPLATE_TEXT[doc.language]?.photo || "Photo";
  return doc.photos.map(([num, caption]) => ({
    photoId: `${label} ${num}`,
    caption,
    dataUrl: photoDataUrls[num] || null,
  }));
}

export function reportHeading(doc) {
  const text = TEMPLATE_TEXT[doc.language] || TEMPLATE_TEXT.en;
  const fields = doc.fields || {};
  let when = fields.date || "";

  const tryDate = (d) => {
    if (!Number.isNaN(d.getTime())) {
      const weekdayIndex = (d.getDay() + 6) % 7; // Monday = 0
      when = `${text.weekdays[weekdayIndex]}, ${when}`;
      return true;
    }
    return false;
  };

  const deMatch = when.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const isoMatch = when.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (deMatch) {
    tryDate(new Date(Number(deMatch[3]), Number(deMatch[2]) - 1, Number(deMatch[1])));
  } else if (isoMatch) {
    tryDate(new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
  } else if (when) {
    tryDate(new Date(when));
  }

  const parts = [];
  if (fields.day) parts.push(`${text.day} ${fields.day}`);
  if (when) parts.push(when);
  const prefix = parts.join(" — ");
  const headline = fields.headline || "";
  if (prefix && headline) return `${prefix}: ${headline}`;
  return prefix || headline;
}

export function reportMetaLine(doc) {
  const names = HEADER_FIELDS[doc.language] || HEADER_FIELDS.en;
  const fields = doc.fields || {};
  return ["project", "doc_id", "created", "status"]
    .filter((k) => fields[k])
    .map((k) => `${names[k]}: ${fields[k]}`)
    .join(" · ");
}

export function reportFooterLeft(doc) {
  const text = TEMPLATE_TEXT[doc.language] || TEMPLATE_TEXT.en;
  const created = doc.fields?.created;
  return created ? `${text.created} ${created} · BauDackel` : "BauDackel";
}

// Knowledge Hub helpers
export function docIconFor(docName, docType) {
  const lowerType = (docType || "").toLowerCase();
  const lowerName = (docName || "").toLowerCase();
  if (lowerType.includes("safety") || lowerName.includes("safety") || lowerType.includes("incident")) return "🦺";
  if (lowerType.includes("notice") || lowerName.includes("notice")) return "⚖️";
  if (lowerType.includes("meeting") || lowerName.includes("meeting")) return "🤝";
  if (lowerName.endsWith(".pdf")) return "📄";
  return DOC_TYPE_ICONS[docType] || "📋";
}

export function answerQuestion(question, clarification, savedDocument) {
  const words = new Set((question.toLowerCase().match(/[a-z]+/g) || []));
  let bestIntent = KB_INTENTS[0];
  let bestOverlap = 0;

  for (const intent of KB_INTENTS) {
    let overlap = 0;
    for (const w of words) {
      if (intent.keywords.has(w)) overlap += 1;
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestIntent = intent;
    }
  }

  if (bestOverlap === 0) {
    return {
      role: "assistant",
      answer:
        "I couldn't find a confident match in the project documents. Try asking about delays, safety, concrete works, open issues or progress.",
      documents: [],
      confidence: 42,
    };
  }

  const hours = clarification ? clarification.hours : 3;
  const supplier = clarification ? clarification.supplier : "ABC Concrete";
  const fmt = (str) =>
    str.replaceAll("{hours}", String(hours)).replaceAll("{supplier}", supplier);

  const documents = bestIntent.documents.map(([icon, title, meta]) => [
    icon,
    fmt(title),
    fmt(meta),
  ]);
  if (savedDocument && bestIntent.includeDraft) {
    documents.unshift(["📝", `${savedDocument} – 20 Nov 2026`, "Your saved draft"]);
  }

  return {
    role: "assistant",
    answer: fmt(bestIntent.answer),
    documents,
    confidence: bestIntent.confidence,
  };
}

export function documentDownloadBlob(doc) {
  if (doc.blob) {
    return { blob: doc.blob, mime: doc.mime || "application/octet-stream" };
  }
  const fallbackText = [
    `Document: ${doc.name}`,
    `ID: ${doc.id}`,
    `Type: ${doc.type}`,
    `Date: ${doc.date_label}`,
    `Status: ${doc.status}`,
    `Source Evidence Count: ${doc.evidence_count}`,
    "",
    "Summary:",
    doc.summary,
    "",
  ].join("\n");
  return {
    blob: new Blob([fallbackText], { type: "text/plain;charset=utf-8" }),
    mime: "text/plain",
  };
}

// Performance Monitoring helpers
export function varianceIndicator(variance) {
  if (variance <= -10) return { label: "🔴 Critical", color: "red" };
  if (variance < 0) return { label: "🟡 At Risk", color: "orange" };
  return { label: "🟢 On Track", color: "green" };
}

export function computePerformanceSummary(activities) {
  const n = activities.length;
  const plannedAvg = Math.round(activities.reduce((s, a) => s + a["Planned Progress"], 0) / n);
  const actualAvg = Math.round(activities.reduce((s, a) => s + a["Actual Progress"], 0) / n);
  const varianceAvg = actualAvg - plannedAvg;
  const onTrack = activities.filter(
    (a) => a["Delay Days"] === 0 && a["Actual Progress"] - a["Planned Progress"] >= 0
  ).length;
  const delayed = activities.filter(
    (a) => a["Delay Days"] > 0 || a["Actual Progress"] - a["Planned Progress"] < 0
  ).length;
  const avgProductivity = Math.round(activities.reduce((s, a) => s + a.Productivity, 0) / n);
  const healthScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, -varianceAvg) * 2 - delayed * 4 - Math.max(0, 95 - avgProductivity))
  );

  let healthLabel = "Critical";
  let healthColor = "red";
  if (healthScore >= 80) {
    healthLabel = "Healthy";
    healthColor = "green";
  } else if (healthScore >= 65) {
    healthLabel = "Watch";
    healthColor = "orange";
  }

  return {
    completion_pct: actualAvg,
    planned_pct: plannedAvg,
    actual_pct: actualAvg,
    variance_pct: varianceAvg,
    on_track: onTrack,
    delayed,
    avg_productivity: avgProductivity,
    health_score: healthScore,
    health_label: healthLabel,
    health_color: healthColor,
  };
}

export function detectDelays(activities) {
  return activities
    .filter((item) => item["Delay Days"] > 0)
    .map((item) => {
      const days = item["Delay Days"];
      const isHigh = days >= 5;
      return {
        activity: item.Activity,
        trade: item.Trade,
        planned_completion: item["Planned Completion"],
        actual_completion: item["Actual Completion"],
        delay_days: days,
        severity: isHigh ? "High" : "Medium",
        color: isHigh ? "red" : "orange",
        impact: isHigh
          ? `Critical-path milestone at risk (+${days} days slip). Downstream formwork and curing sequence will shift unless recovery measures are enforced.`
          : `Moderate float erosion (+${days} days). Monitor closely to avoid cascading trade clashes.`,
        recommended_action: isHigh
          ? "Issue formal Delay Notice immediately and request a 24-hour recovery schedule."
          : "Follow up on open RFI/blocker and confirm revised handover date in site meeting.",
        root_cause: item["Root Cause"],
        related_document: item["Related Document"],
      };
    })
    .sort((a, b) => b.delay_days - a.delay_days);
}

export function generateDeviationAlerts(activities) {
  const alerts = [];
  for (const item of activities) {
    const progressVar = item["Actual Progress"] - item["Planned Progress"];
    const scheduleVar = item["Delay Days"];
    const prodGap = item["Target Productivity"] - item.Productivity;

    const triggered = [];
    if (progressVar < -10) triggered.push(`Progress variance ${progressVar}% (>10% threshold)`);
    if (scheduleVar > 5) triggered.push(`Schedule delay +${scheduleVar} days (>5 days threshold)`);
    if (prodGap >= 10) triggered.push(`Productivity ${item.Productivity}% vs target ${item["Target Productivity"]}%`);

    if (!triggered.length) continue;

    const isCritical = progressVar < -10 || scheduleVar > 5;
    alerts.push({
      id: `DEV-${String(alerts.length + 1).padStart(2, "0")}`,
      activity: item.Activity,
      trade: item.Trade,
      level: isCritical ? "Critical" : "Warning",
      color: isCritical ? "red" : "orange",
      triggers: triggered,
      root_cause: item["Root Cause"],
      suggested_action: isCritical
        ? "Issue contractual Delay Notice, log hindrance in Daily Report, and review site evidence."
        : "Review crew allocation and verify open design clarifications.",
      related_documents: [item["Related Document"], "Daily_Report_15_Nov.pdf"],
      delay_days: scheduleVar,
    });
  }
  return alerts;
}

// Meeting Intelligence extractor
export function extractMeetingIntelligence(rawText) {
  const lines = (rawText || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-•\t]+|[\s\-•\t]+$/g, ""))
    .filter(Boolean);

  const decisionsFound = lines
    .filter((l) => l.toLowerCase().startsWith("decision:"))
    .map((l) => l.slice(l.indexOf(":") + 1).trim());

  const actionsFound = lines
    .filter((l) => l.toLowerCase().startsWith("action:"))
    .map((l) => l.slice(l.indexOf(":") + 1).trim());

  const summary = { ...DEFAULT_MEETING_SUMMARY };
  if (lines.length) summary.title = lines[0].slice(0, 80);
  if (decisionsFound.length) {
    summary.key_decisions = decisionsFound;
    summary.critical_outcomes = decisionsFound.slice(0, 3);
  }

  let extractedActions = actionsFound.map((rawAction) => {
    let owner = "Unassigned";
    let task = rawAction;
    let due = "22 Nov 2026";
    if (rawAction.includes(" to ")) {
      const idx = rawAction.indexOf(" to ");
      const possibleOwner = rawAction.slice(0, idx).trim();
      if (possibleOwner.split(/\s+/).length <= 4) {
        owner = possibleOwner;
        task = rawAction.slice(idx + 4).trim();
      }
    }
    const lowerTask = task.toLowerCase();
    const byIdx = lowerTask.lastIndexOf(" by ");
    if (byIdx !== -1) {
      due = task.slice(byIdx + 4).trim().replace(/\.$/, "");
      task = task.slice(0, byIdx).trim();
    }
    return {
      Owner: owner,
      "Action Item": task ? task.charAt(0).toUpperCase() + task.slice(1) : rawAction,
      "Due Date": due,
      Status: "Open",
    };
  });

  if (!extractedActions.length) {
    extractedActions = DEFAULT_ACTION_ITEMS.map((r) => ({ ...r }));
  }

  const newDecisions = DEFAULT_DECISION_LOG.map((r) => ({ ...r }));
  const existingTexts = new Set(newDecisions.map((d) => d.Decision.toLowerCase()));
  for (const dec of decisionsFound) {
    if (!existingTexts.has(dec.toLowerCase())) {
      newDecisions.unshift({
        Date: formatTodayDisplay(),
        Topic: "Extracted from Meeting Minutes",
        Decision: dec,
        "Decision Owner": "John Smith (Site Manager)",
        "Supporting Documentation": "Meeting_Minutes.docx",
      });
    }
  }

  return { summary, actions: extractedActions, decisions: newDecisions };
}
