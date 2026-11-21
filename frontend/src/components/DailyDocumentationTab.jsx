import React, { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Lock,
  Mic,
  RotateCcw,
  Save,
  Scale,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  DAILY_REPORT,
  EVIDENCE_CARD_ICONS,
  EVIDENCE_FILE_TYPES,
  REPORT_LANGUAGES,
  REPORT_TYPES,
  STEP_STATES,
  UNASSIGNED,
  WORKFLOW_STAGES,
} from "../data/mockData";
import {
  documentSlug,
  evidenceAiSummary,
  evidenceConfidenceScore,
  evidenceStatus,
  getConfidenceTier,
  parseEditorText,
  reportPhotos,
  serializeDocToEditorText,
} from "../utils/documentUtils";
import {
  generateReportDocxBlob,
  generateReportPdfBlob,
  triggerDownload,
} from "../utils/exporters";
import DocumentPreview from "./DocumentPreview";

function StepHeader({ number, title, caption, state }) {
  const meta = STEP_STATES[state] || STEP_STATES.waiting;
  return (
    <div className="step-header">
      <div className="step-header-row">
        <h2>
          {number}. {title}
        </h2>
        <span className={`badge badge-${meta.color}`}>{meta.label}</span>
      </div>
      {caption && <p className="caption">{caption}</p>}
    </div>
  );
}

const REPORT_SHORT_LABELS = {
  [DAILY_REPORT]: "Daily Report",
  "Site Inspection Report": "Site Inspection",
  "Incident/Safety Report": "Incident / Safety",
  "Construction Progress Report": "Progress Report",
  "Equipment Breakdown Report": "Equipment",
};

export default function DailyDocumentationTab({
  project,
  evidenceRecords,
  evidenceNames,
  uploadedFileMap,
  removedNames,
  sampleLoaded,
  assignedReportTypes,
  manuallyAssigned,
  reviewType,
  classificationConfirmed,
  reportType,
  reportLanguage,
  generatedDocument,
  documentDraft,
  savedDraft,
  lockedTimestamp,
  lockedDocId,
  exported,
  exportSuccessMsg,
  photoDataUrls,
  onFilesUpload,
  onLoadSample,
  onQuickDictate,
  onRestoreRemoved,
  onRemoveEvidence,
  onPreviewEvidence,
  onToggleReportType,
  onRerunClassification,
  onOpenReview,
  onSetReportType,
  onSetReportLanguage,
  onGenerateDraft,
  onDraftChange,
  onSaveDraft,
  onMarkExported,
  onQuickGenerateDailyReport,
  onQuickCreateDelayNotice,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [recsExpanded, setRecsExpanded] = useState(false);
  const [selectedCategoryChip, setSelectedCategoryChip] = useState("All");

  const hasEvidence = evidenceNames.length > 0;
  const draftIsSaved = savedDraft !== null && savedDraft.text === documentDraft;
  const isExported = exported && draftIsSaved;
  const includeInternal = true;

  // 5-step workflow without AI Clarification:
  // 1. Upload Evidence -> 2. Classify & Review -> 3. Generate Draft -> 4. Edit Document -> 5. Export
  const stagesDone = [
    hasEvidence,
    hasEvidence,
    Boolean(generatedDocument),
    draftIsSaved,
    isExported,
  ];
  const activeStageIndex = stagesDone.findIndex((done) => !done);

  // A file can belong to multiple report types; include it in every assigned category's list
  const assignedFiles = useMemo(() => {
    const map = {};
    for (const rt of Object.keys(REPORT_TYPES)) {
      map[rt] = evidenceNames.filter((name) => (assignedReportTypes[name] || []).includes(rt));
    }
    return map;
  }, [evidenceNames, assignedReportTypes]);

  const unassignedCount = useMemo(
    () => evidenceNames.filter((name) => (assignedReportTypes[name] || []).length === 0).length,
    [evidenceNames, assignedReportTypes]
  );

  const sortedEvidenceNewestFirst = useMemo(
    () =>
      [...evidenceNames].sort((a, b) =>
        (evidenceRecords[b]?.uploaded_at || "").localeCompare(
          evidenceRecords[a]?.uploaded_at || ""
        )
      ),
    [evidenceNames, evidenceRecords]
  );

  const activeCategoryChip =
    reviewType && selectedCategoryChip === "All" ? reviewType : selectedCategoryChip;

  const filteredMatrixNames = useMemo(() => {
    if (activeCategoryChip === "All") return sortedEvidenceNewestFirst;
    if (activeCategoryChip === UNASSIGNED) {
      return sortedEvidenceNewestFirst.filter(
        (name) => (assignedReportTypes[name] || []).length === 0
      );
    }
    return sortedEvidenceNewestFirst.filter((name) =>
      (assignedReportTypes[name] || []).includes(activeCategoryChip)
    );
  }, [sortedEvidenceNewestFirst, activeCategoryChip, assignedReportTypes]);

  const reportOptions = Object.keys(REPORT_TYPES);

  const previewDoc = useMemo(
    () => parseEditorText(documentDraft, lockedTimestamp, lockedDocId),
    [documentDraft, lockedTimestamp, lockedDocId]
  );
  const previewPhotos = useMemo(
    () => reportPhotos(previewDoc, photoDataUrls),
    [previewDoc, photoDataUrls]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      onFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Structured section & photo editor helpers (Step 4: Edit Document)
  const updateField = (fieldKey, newValue) => {
    const updatedDoc = {
      ...previewDoc,
      fields: { ...previewDoc.fields, [fieldKey]: newValue },
    };
    onDraftChange(serializeDocToEditorText(updatedDoc, lockedTimestamp, lockedDocId));
  };

  const updateSectionBody = (sectionIndex, newBody) => {
    const nextSections = previewDoc.sections.map((sec, idx) =>
      idx === sectionIndex ? [sec[0], newBody] : sec
    );
    const updatedDoc = { ...previewDoc, sections: nextSections };
    onDraftChange(serializeDocToEditorText(updatedDoc, lockedTimestamp, lockedDocId));
  };

  const removeSection = (sectionIndex) => {
    const nextSections = previewDoc.sections.filter((_, idx) => idx !== sectionIndex);
    const updatedDoc = { ...previewDoc, sections: nextSections };
    onDraftChange(serializeDocToEditorText(updatedDoc, lockedTimestamp, lockedDocId));
  };

  const removeAttachedPhoto = (photoIndex) => {
    const nextPhotos = (previewDoc.photos || []).filter((_, idx) => idx !== photoIndex);
    const updatedDoc = { ...previewDoc, photos: nextPhotos };
    onDraftChange(serializeDocToEditorText(updatedDoc, lockedTimestamp, lockedDocId));
  };

  const handleExportPdf = () => {
    const fileStem = documentSlug(generatedDocument);
    const exportDoc = parseEditorText(savedDraft.text, lockedTimestamp, lockedDocId);
    exportDoc.fields.status = "Exported";
    const photos = reportPhotos(exportDoc, photoDataUrls);
    const blob = generateReportPdfBlob(exportDoc, photos, includeInternal);
    const fileName = `${fileStem}.pdf`;
    triggerDownload(blob, fileName);
    onMarkExported({
      fileName,
      docType: generatedDocument,
      evidenceCount: evidenceNames.length,
      summary: exportDoc.fields.summary || `Exported ${generatedDocument} for ${project}.`,
      blob,
      mime: "application/pdf",
      docId: lockedDocId,
    });
  };

  const handleExportDocx = async () => {
    const fileStem = documentSlug(generatedDocument);
    const exportDoc = parseEditorText(savedDraft.text, lockedTimestamp, lockedDocId);
    exportDoc.fields.status = "Exported";
    const photos = reportPhotos(exportDoc, photoDataUrls);
    const blob = await generateReportDocxBlob(exportDoc, photos, includeInternal);
    const fileName = `${fileStem}.docx`;
    triggerDownload(blob, fileName);
    onMarkExported({
      fileName,
      docType: generatedDocument,
      evidenceCount: evidenceNames.length,
      summary: exportDoc.fields.summary || `Exported ${generatedDocument} for ${project}.`,
      blob,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docId: lockedDocId,
    });
  };

  const recommendations = [
    {
      title: "Generate Daily Report",
      severity: "Medium",
      sevColor: "blue",
      tier: getConfidenceTier(0.94),
      reason: `${assignedFiles[DAILY_REPORT].length} site files (photos, voice note, delivery slips) are ready to compile today's report.`,
      buttonLabel: "Generate Daily Report",
      icon: <FileText size={14} />,
      primary: false,
      onClick: onQuickGenerateDailyReport,
    },
    {
      title: "Create Delay Notice",
      severity: "High",
      sevColor: "red",
      tier: getConfidenceTier(0.96),
      reason:
        "Supplier email and voice note confirm a 3-hour ready-mix concrete delay impacting foundation slab axes A–C.",
      buttonLabel: "Create Delay Notice",
      icon: <Scale size={14} />,
      primary: true,
      onClick: () =>
        onQuickCreateDelayNotice(
          "Foundation Slab Axes A–C",
          "Ready-mix concrete delivery from ABC Concrete arrived 3 hours after the 08:00 slot.",
          5
        ),
    },
    {
      title: "Review Safety Observation",
      severity: "High",
      sevColor: "red",
      tier: getConfidenceTier(0.95),
      reason:
        "Site photo flags an incomplete edge guardrail on Level 3 (axis 5/C) requiring immediate SiGeKo documentation.",
      buttonLabel: "Filter Safety Evidence",
      icon: <ShieldAlert size={14} />,
      primary: true,
      onClick: () => {
        setSelectedCategoryChip("Incident/Safety Report");
        onOpenReview("Incident/Safety Report");
      },
    },
  ];

  return (
    <div className="stack">
      {/* 5-Step Horizontal Stepper (AI Clarification removed) */}
      <div className="journey-stepper">
        {WORKFLOW_STAGES.map((label, idx) => {
          const done = stagesDone[idx];
          const isActive = !done && idx === activeStageIndex;
          const cls = done ? "done" : isActive ? "active" : "pending";
          return (
            <div key={label} className={`journey-step ${cls}`}>
              <span className="journey-dot">{done ? "✓" : idx + 1}</span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload Evidence + Quick Dictate + Collapsible AI Recommendations */}
      <StepHeader
        number={1}
        title="Upload evidence"
        caption="Drop site photos, PDFs, emails, Word documents or dictate a voice note."
        state={hasEvidence ? "done" : "active"}
      />
      <div className="card stack">
        <div
          className={`dropzone ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload size={22} style={{ color: "#f97316", marginBottom: 6 }} />
          <div style={{ fontWeight: 600 }}>
            Drag and drop or browse construction evidence
          </div>
          <div className="caption">
            Images (.jpg, .png) · PDFs (.pdf) · Emails (.msg) · Word (.docx) · Audio (.mp3, .wav)
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={EVIDENCE_FILE_TYPES.map((ext) => `.${ext}`).join(",")}
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) {
                onFilesUpload(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />
        </div>

        <div className="flex-row">
          <button type="button" className="btn btn-primary" onClick={onQuickDictate}>
            <Mic size={15} /> Quick Dictate
          </button>
          <button type="button" className="btn" disabled={sampleLoaded} onClick={onLoadSample}>
            🧪 Load sample evidence
          </button>
          {removedNames.size > 0 && (
            <button type="button" className="btn btn-ghost" onClick={onRestoreRemoved}>
              <RotateCcw size={14} /> Restore removed ({removedNames.size})
            </button>
          )}
        </div>

        {hasEvidence && (
          <div className="accordion-box">
            <button
              type="button"
              className="accordion-trigger"
              onClick={() => setRecsExpanded((v) => !v)}
              aria-expanded={recsExpanded}
            >
              <span className="flex-row">
                {recsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <strong>✨ AI Recommendations</strong>
                <span className="badge badge-orange">{recommendations.length}</span>
              </span>
              <span className="caption" style={{ margin: 0 }}>
                {recsExpanded ? "Hide suggestions" : "Show suggested actions"}
              </span>
            </button>

            {recsExpanded && (
              <div className="grid-3" style={{ marginTop: 12 }}>
                {recommendations.map((rec) => (
                  <div key={rec.title} className="card-compact stack-sm">
                    <strong>{rec.title}</strong>
                    <div className="flex-row">
                      <span className={`badge badge-${rec.sevColor}`}>
                        Severity: {rec.severity}
                      </span>
                      <span className={`badge badge-${rec.tier.color}`}>
                        Confidence: {rec.tier.label}
                      </span>
                    </div>
                    <p className="caption" style={{ margin: 0, flex: 1 }}>
                      {rec.reason}
                    </p>
                    <button
                      type="button"
                      className={`btn btn-block ${rec.primary ? "btn-primary" : ""}`}
                      onClick={rec.onClick}
                    >
                      {rec.icon} {rec.buttonLabel}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: Unified Evidence & Classification Matrix (Multi-Report Assignment) */}
      <StepHeader
        number={2}
        title="Classify & review"
        caption="Toggle one or more report types per file. Files assigned to multiple reports appear in every selected draft."
        state={hasEvidence ? "done" : "waiting"}
      />
      {!hasEvidence ? (
        <p className="caption">Upload evidence in step 1 to classify and assign files to reports.</p>
      ) : (
        <div className="card stack-sm">
          <div className="flex-between">
            <div className="flex-row">
              <strong style={{ fontSize: "0.95rem" }}>Evidence &amp; Classification Matrix</strong>
              <span className="badge badge-gray">{evidenceNames.length} files</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRerunClassification}
            >
              <Sparkles size={14} /> Re-run AI classification
            </button>
          </div>

          {/* Summary Filter Chips */}
          <div className="flex-row">
            <button
              type="button"
              className={`filter-chip ${activeCategoryChip === "All" ? "active" : ""}`}
              onClick={() => setSelectedCategoryChip("All")}
            >
              All ({evidenceNames.length})
            </button>
            {Object.entries(REPORT_TYPES).map(([rt, meta]) => (
              <button
                key={rt}
                type="button"
                className={`filter-chip ${activeCategoryChip === rt ? "active" : ""}`}
                onClick={() => setSelectedCategoryChip(rt)}
              >
                {meta.icon} {rt} ({assignedFiles[rt].length})
              </button>
            ))}
            {unassignedCount > 0 && (
              <button
                type="button"
                className={`filter-chip ${activeCategoryChip === UNASSIGNED ? "active" : ""}`}
                onClick={() => setSelectedCategoryChip(UNASSIGNED)}
              >
                Unassigned ({unassignedCount})
              </button>
            )}
          </div>

          {filteredMatrixNames.length === 0 ? (
            <div className="alert alert-info">
              No evidence items assigned to <strong>{activeCategoryChip}</strong>.
            </div>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 440, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Evidence Item</th>
                    <th>AI Summary / Recommendation</th>
                    <th>Confidence</th>
                    <th>Assigned Report Types (Multi-Select)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrixNames.map((name) => {
                    const rec = evidenceRecords[name];
                    const currentReports = assignedReportTypes[name] || [];
                    const score = evidenceConfidenceScore(name, currentReports);
                    const tier = getConfidenceTier(score);
                    const stLabel = evidenceStatus(
                      name,
                      rec,
                      assignedReportTypes,
                      classificationConfirmed,
                      manuallyAssigned
                    );
                    return (
                      <tr key={name}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {EVIDENCE_CARD_ICONS[rec.category]} {name}
                          </div>
                          <div className="caption" style={{ margin: 0 }}>
                            {rec.file_type} · {rec.uploaded_at} · {rec.size_label}
                          </div>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <span style={{ fontSize: "0.82rem", color: "#334155" }}>
                            {evidenceAiSummary(name, currentReports)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${tier.color}`}>{tier.label}</span>
                        </td>
                        <td style={{ minWidth: 280 }}>
                          <div className="report-tag-group" role="group" aria-label={`Report types for ${name}`}>
                            {reportOptions.map((rt) => {
                              const isSelected = currentReports.includes(rt);
                              return (
                                <button
                                  key={rt}
                                  type="button"
                                  className={`report-tag ${isSelected ? "selected" : ""}`}
                                  aria-pressed={isSelected}
                                  onClick={() => onToggleReportType(name, rt)}
                                  title={rt}
                                >
                                  {REPORT_TYPES[rt].icon} {REPORT_SHORT_LABELS[rt] || rt}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td>
                          <div className="flex-row" style={{ flexWrap: "nowrap" }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() =>
                                onPreviewEvidence({
                                  name,
                                  record: rec,
                                  assignedReport: currentReports,
                                  status: stLabel,
                                  fileData: uploadedFileMap[name] || null,
                                })
                              }
                            >
                              <Eye size={13} /> Preview
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              onClick={() => onRemoveEvidence(name)}
                              aria-label={`Remove ${name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Generate Draft (Full-width Structured Report Templates only — AI Notice Draft Generator removed) */}
      <StepHeader
        number={3}
        title="Generate draft"
        caption="Select a structured report template and language to generate an editable draft with a locked timestamp."
        state={generatedDocument ? "done" : hasEvidence ? "active" : "waiting"}
      />
      <div className="card stack">
        <div className="stack-sm">
          <h4 style={{ margin: 0 }}>📋 Structured Report Templates</h4>
          <div>
            <label className="field-label">Report template</label>
            <div className="segmented">
              {reportOptions.map((rt) => (
                <button
                  key={rt}
                  type="button"
                  className={`seg-btn ${reportType === rt ? "active" : ""}`}
                  onClick={() => onSetReportType(rt)}
                >
                  {REPORT_TYPES[rt].icon} {rt} ({assignedFiles[rt].length})
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Report language</label>
            <div className="segmented">
              {Object.keys(REPORT_LANGUAGES).map((langLabel) => (
                <button
                  key={langLabel}
                  type="button"
                  className={`seg-btn ${reportLanguage === langLabel ? "active" : ""}`}
                  onClick={() => onSetReportLanguage(langLabel)}
                >
                  {langLabel}
                </button>
              ))}
            </div>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onGenerateDraft({ kind: "Report" })}
            >
              <FileText size={15} /> Generate report draft
            </button>
          </div>
        </div>

        {generatedDocument && (
          <div className="caption">
            ✅ <strong>{generatedDocument}</strong> draft created (ID: <code>{lockedDocId}</code>).
            Review and edit it in Step 4 below.
          </div>
        )}
      </div>

      {/* STEP 4: Edit Document (No Client-facing checkbox + Manual Photo Removal) */}
      <StepHeader
        number={4}
        title="Edit document"
        caption="Edit sections or remove attached photos below. Document ID and timestamp remain locked automatically."
        state={draftIsSaved ? "done" : generatedDocument ? "active" : "waiting"}
      />
      {!generatedDocument ? (
        <p className="caption">
          Generate a report draft in step 3 to open the document editor.
        </p>
      ) : (
        <div className="card stack">
          <div className="flex-row">
            <span className="badge badge-orange">{generatedDocument} · Draft</span>
            {lockedDocId && (
              <span className="badge badge-blue">
                <Lock size={11} /> ID: {lockedDocId}
              </span>
            )}
            {lockedTimestamp && (
              <span className="badge badge-gray">
                <Lock size={11} /> {lockedTimestamp}
              </span>
            )}
            <span className="caption" style={{ margin: 0 }}>
              {!savedDraft
                ? "Not saved yet"
                : draftIsSaved
                  ? `Saved at ${savedDraft.time}`
                  : `Saved at ${savedDraft.time} · unsaved changes`}
            </span>
          </div>

          <div className="grid-2">
            {/* Structured Section & Photo Editor */}
            <div className="stack-sm">
              <div className="caption" style={{ margin: 0 }}>
                Structured section editor · changes sync live to preview and exports
              </div>
              <div className="section-editor-scroll">
                <div className="section-editor-card">
                  <label className="field-label">Headline</label>
                  <input
                    className="input"
                    value={previewDoc.fields?.headline || ""}
                    onChange={(e) => updateField("headline", e.target.value)}
                  />
                </div>
                <div className="section-editor-card">
                  <label className="field-label">Executive Summary</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={previewDoc.fields?.summary || ""}
                    onChange={(e) => updateField("summary", e.target.value)}
                  />
                </div>
                {previewDoc.sections.map(([label, body], idx) => (
                  <div key={`${label}-${idx}`} className="section-editor-card">
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <label className="field-label" style={{ margin: 0 }}>
                        {label}
                      </label>
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        style={{ padding: "2px 6px" }}
                        onClick={() => removeSection(idx)}
                        title={`Remove ${label}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <textarea
                      className="textarea"
                      rows={Math.min(Math.max(Math.ceil(body.length / 75), 2), 6)}
                      value={body}
                      onChange={(e) => updateSectionBody(idx, e.target.value)}
                    />
                  </div>
                ))}

                {/* Attached Photos with Manual Remove Button */}
                {previewPhotos.length > 0 && (
                  <div className="section-editor-card stack-sm">
                    <div className="flex-between">
                      <label className="field-label" style={{ margin: 0 }}>
                        Attached Photos ({previewPhotos.length})
                      </label>
                      <span className="caption" style={{ margin: 0 }}>
                        Removed photos are excluded from preview, PDF &amp; Word
                      </span>
                    </div>
                    <div className="editor-photo-grid">
                      {previewPhotos.map((photo, idx) => (
                        <div key={`${photo.photoId}-${idx}`} className="editor-photo-card">
                          <div className="editor-photo-thumb">
                            {photo.dataUrl ? (
                              <img src={photo.dataUrl} alt={photo.photoId} />
                            ) : (
                              <span>{photo.photoId}</span>
                            )}
                          </div>
                          <div className="editor-photo-meta">
                            <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>
                              {photo.photoId}
                            </div>
                            <div className="caption" style={{ margin: 0, fontSize: "0.72rem" }}>
                              {photo.caption}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger-ghost btn-sm editor-photo-remove"
                            onClick={() => removeAttachedPhoto(idx)}
                            title={`Remove ${photo.photoId}`}
                          >
                            <X size={13} /> Remove photo
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clean Official Live Preview */}
            <div className="stack-sm">
              <div className="caption" style={{ margin: 0 }}>
                Live preview · identical structure to PDF and Word export
              </div>
              <DocumentPreview
                doc={previewDoc}
                photos={previewPhotos}
                includeInternal={includeInternal}
              />
            </div>
          </div>

          <div>
            <button type="button" className="btn btn-primary" onClick={onSaveDraft}>
              <Save size={15} /> Save draft
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Export */}
      <StepHeader
        number={5}
        title="Export"
        caption="Download the saved draft as PDF or Word and archive it in the Document Repository."
        state={isExported ? "done" : savedDraft ? "active" : "waiting"}
      />
      {!(generatedDocument && savedDraft) ? (
        <p className="caption">Save a draft in step 4 to export it.</p>
      ) : (
        <div className="card stack-sm">
          <div className="flex-row">
            <button type="button" className="btn btn-primary" onClick={handleExportPdf}>
              <Download size={15} /> Export PDF
            </button>
            <button type="button" className="btn" onClick={handleExportDocx}>
              <Download size={15} /> Export Word
            </button>
            <span className="caption" style={{ margin: 0 }}>
              ID <code>{lockedDocId}</code> · Saved at {savedDraft.time}
              {!draftIsSaved && " · editor has unsaved changes"}
            </span>
          </div>
          {exportSuccessMsg && (
            <div className="alert alert-success">
              <CheckCircle2 size={16} />
              <span>{exportSuccessMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
