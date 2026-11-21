import React, { useEffect, useMemo, useState } from "react";
import { api, formRequest } from "../api/client";
import { Plus, Sparkles, Trash2, Upload } from "lucide-react";
import {
  ACTION_STATUS_OPTIONS,
  DEFAULT_ACTION_ITEMS,
  DEFAULT_DECISION_LOG,
  DEFAULT_MEETING_SUMMARY,
  SAMPLE_MEETING_TRANSCRIPT,
} from "../data/mockData";
import { extractMeetingIntelligence, formatTodayDisplay } from "../utils/documentUtils";

export default function MeetingIntelligenceTab({ project, onToast }) {
  const [notesInput, setNotesInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadedProject, setLoadedProject] = useState(null);
  const [summary, setSummary] = useState({title:"No meeting analyzed yet",date:"",summary:"Paste notes or upload a transcript to begin",critical_outcomes:[],key_decisions:[],risks:[],open_issues:[]});
  const [actions, setActions] = useState([]);
  const [decisions, setDecisions] = useState([]);

  const [selectedOwner, setSelectedOwner] = useState("All owners");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [decisionSearch, setDecisionSearch] = useState("");

  const [newDecision, setNewDecision] = useState({
    topic: "",
    owner: "Not specified",
    decision: "",
    docs: "",
  });

  useEffect(()=>{
    setLoadedProject(null);
    try {
      const saved=JSON.parse(localStorage.getItem(`baudackel-meetings:${project}`)||"null");
      if(saved) {setNotesInput(saved.notes||"");setSummary(saved.summary);setActions(saved.actions||[]);setDecisions(saved.decisions||[])}
      else {setNotesInput("");setSummary({title:"No meeting analyzed yet",date:"",summary:"Paste notes or upload a transcript to begin",critical_outcomes:[],key_decisions:[],risks:[],open_issues:[]});setActions([]);setDecisions([])}
    } catch { /* invalid old local state */ }
    setLoadedProject(project);
  },[project]);
  useEffect(()=>{
    if(loadedProject !== project)return;
    localStorage.setItem(`baudackel-meetings:${project}`,JSON.stringify({notes:notesInput,summary,actions,decisions}));
  },[loadedProject,project,notesInput,summary,actions,decisions]);

  const handleFileUpload = async e => {
    const file=e.target.files?.[0];
    if(!file)return;
    setIsProcessing(true);
    try {
      if(/\.(txt|md)$/i.test(file.name))setNotesInput(await file.text());
      else if(/\.(wav|mp3|m4a|webm|ogg)$/i.test(file.name)) {
        const result=await formRequest("/api/transcribe",{},file,"audio");
        setNotesInput(result.transcription.text || "");
      } else {
        const result=await formRequest("/api/evidence",{project},file);
        if(!result.item.extracted_text?.trim())throw new Error(result.item.warnings?.join("; ") || "No readable text extracted");
        setNotesInput(result.item.extracted_text);
      }
      onToast(`Imported meeting notes from ${file.name}`, "✅");
    } catch(error) {onToast(`Meeting import failed: ${error.message}`,"⚠️");}
    finally {setIsProcessing(false);e.target.value=""}
  };

  const handleGenerate = () => {
    if (!notesInput.trim()) {onToast("Enter meeting notes before extracting","⚠️");return}
    const extracted = extractMeetingIntelligence(notesInput);
    setSummary(extracted.summary);
    setActions(extracted.actions);
    setDecisions(extracted.decisions);
    onToast("Extracted explicitly marked decisions, actions, risks and issues from the supplied notes", "✅");
  };

  const updateAction = (idx, field, value) => {
    setActions((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addActionRow = () => {
    setActions((prev) => [
      ...prev,
      { Owner: "Unassigned", "Action Item": "", "Due Date": "Not specified", Status: "Open" },
    ]);
  };

  const removeActionRow = (idx) => {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  };

  const owners = useMemo(
    () => Array.from(new Set(actions.map((a) => a.Owner).filter(Boolean))).sort(),
    [actions]
  );

  const filteredMatrix = useMemo(
    () =>
      actions.filter(
        (row) =>
          row["Action Item"].trim() &&
          (selectedOwner === "All owners" || row.Owner === selectedOwner) &&
          (selectedStatus === "All statuses" || row.Status === selectedStatus)
      ),
    [actions, selectedOwner, selectedStatus]
  );

  const filteredDecisions = useMemo(() => {
    const q = decisionSearch.trim().toLowerCase();
    if (!q) return decisions;
    return decisions.filter((d) =>
      Object.values(d).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [decisions, decisionSearch]);

  const handleAddDecision = (e) => {
    e.preventDefault();
    if (!newDecision.topic.trim() || !newDecision.decision.trim()) {
      onToast("Please enter both Topic and Decision.", "⚠️");
      return;
    }
    setDecisions((prev) => [
      {
        Date: formatTodayDisplay(),
        Topic: newDecision.topic.trim(),
        Decision: newDecision.decision.trim(),
        "Decision Owner": newDecision.owner.trim() || "Not specified",
        "Supporting Documentation": newDecision.docs.trim() || "Meeting record",
      },
      ...prev,
    ]);
    setNewDecision({ topic: "", owner: "Not specified", decision: "", docs: "" });
    onToast("Decision recorded in log", "✅");
  };

  return (
    <div className="stack">
      {/* MI-01: Meeting Summary Generation */}
      <div>
        <h2 className="section-title">Meeting Summary Generation</h2>
        <p className="caption">
          Paste meeting notes, transcripts, or upload minutes for <strong>{project}</strong> to
          extract a structured meeting record. Use lines beginning with Action:, Decision:, Risk:, or Issue: for reliable extraction.
        </p>
      </div>

      <div className="card stack">
        <div className="grid-repo">
          <div>
            <label className="field-label">Meeting notes / transcript</label>
            <textarea
              className="textarea"
              rows={9}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Paste meeting notes or transcript here…"
            />
          </div>
          <div className="stack">
            <div>
              <label className="field-label">Upload meeting minutes or audio (.txt, .md, .pdf, .docx, .wav, .mp3)</label>
              <label className="btn btn-block" style={{ cursor: "pointer" }}>
                <Upload size={15} /> {isProcessing ? "Processing…" : "Choose evidence file"}
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.docx,.wav,.mp3,.webm,.m4a,.ogg"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <button
              className="btn btn-block"
              onClick={() => {
                setNotesInput(SAMPLE_MEETING_TRANSCRIPT);
                onToast("Sample transcript loaded", "🧪");
              }}
            >
              🧪 Load sample transcript
            </button>
          </div>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleGenerate}>
            <Sparkles size={15} /> Extract Meeting Summary &amp; Items
          </button>
        </div>
      </div>

      {/* Structured summary card */}
      <div className="card stack">
        <div className="flex-row">
          <h3 style={{ margin: 0 }}>📋 {summary.title}</h3>
          <span className="badge badge-blue">{summary.date}</span>
          <span className="badge badge-green">Structured Record</span>
        </div>
        <p style={{ margin: 0 }}>
          <strong>Summary:</strong> {summary.summary}
        </p>
        <div className="alert alert-info">
          <div>
            <strong>Critical Outcomes:</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {summary.critical_outcomes.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid-3">
          <div>
            <strong>Key Decisions</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {summary.key_decisions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Risks</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {summary.risks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Open Issues</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {summary.open_issues.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* MI-02: Action Item Extraction */}
      <div style={{ marginTop: 8 }}>
        <div className="flex-between">
          <div>
            <h2 className="section-title">Action Item Extraction</h2>
            <p className="caption">
              Action items extracted from explicit Action: lines in meeting notes. Edit responsible party, description, due date, or
              status directly — changes sync to the Responsibility Matrix below.
            </p>
          </div>
          <button className="btn btn-sm" onClick={addActionRow}>
            <Plus size={14} /> Add action item
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Responsible Party</th>
              <th style={{ width: "44%" }}>Task Description</th>
              <th style={{ width: "14%" }}>Due Date</th>
              <th style={{ width: "14%" }}>Status</th>
              <th style={{ width: "6%" }} />
            </tr>
          </thead>
          <tbody>
            {actions.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    className="input"
                    value={row.Owner}
                    onChange={(e) => updateAction(idx, "Owner", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={row["Action Item"]}
                    onChange={(e) => updateAction(idx, "Action Item", e.target.value)}
                    placeholder="Enter task description…"
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={row["Due Date"]}
                    onChange={(e) => updateAction(idx, "Due Date", e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="select"
                    value={row.Status}
                    onChange={(e) => updateAction(idx, "Status", e.target.value)}
                  >
                    {ACTION_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-danger-ghost btn-sm"
                    onClick={() => removeActionRow(idx)}
                    title="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MI-07: Responsibility Matrix */}
      <div style={{ marginTop: 8 }}>
        <div className="flex-row">
          <h2 className="section-title">Responsibility Matrix</h2>
          <span className="badge badge-blue">
            {actions.filter((a) => a["Action Item"].trim()).length} tracked actions
          </span>
        </div>
        <p className="caption">
          Synced with extracted and manually entered meeting actions. Filter by owner or status.
        </p>
      </div>

      <div className="card stack">
        <div className="grid-2">
          <div>
            <label className="field-label">Filter by owner</label>
            <select
              className="select"
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
            >
              <option value="All owners">All owners</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Filter by status</label>
            <select
              className="select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All statuses">All statuses</option>
              {ACTION_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredMatrix.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Action Item</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{row.Owner}</strong>
                    </td>
                    <td>{row["Action Item"]}</td>
                    <td>{row["Due Date"]}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          row.Status === "Done"
                            ? "green"
                            : row.Status === "Blocked"
                              ? "red"
                              : row.Status === "In Progress"
                                ? "blue"
                                : "orange"
                        }`}
                      >
                        {row.Status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">
            No action items match the selected owner/status filter.
          </div>
        )}
      </div>

      {/* MI-03: Decision Tracking */}
      <div style={{ marginTop: 8 }}>
        <h2 className="section-title">Decision Tracking</h2>
        <p className="caption">
          Searchable project decision log capturing date, topic, owner, and supporting documentation.
        </p>
      </div>

      <div className="card stack">
        <input
          className="input"
          value={decisionSearch}
          onChange={(e) => setDecisionSearch(e.target.value)}
          placeholder="Search by topic, decision, owner or supporting document…"
        />

        {filteredDecisions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Decision Date</th>
                  <th>Topic</th>
                  <th>Decision</th>
                  <th>Decision Owner</th>
                  <th>Supporting Documentation</th>
                </tr>
              </thead>
              <tbody>
                {filteredDecisions.map((d, idx) => (
                  <tr key={idx}>
                    <td style={{ whiteSpace: "nowrap" }}>{d.Date}</td>
                    <td>
                      <strong>{d.Topic}</strong>
                    </td>
                    <td>{d.Decision}</td>
                    <td>{d["Decision Owner"]}</td>
                    <td>{d["Supporting Documentation"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">No decisions match your search query.</div>
        )}

        <details className="expander">
          <summary>➕ Log a new project decision</summary>
          <form className="stack-sm" style={{ marginTop: 12 }} onSubmit={handleAddDecision}>
            <div className="grid-2">
              <div>
                <label className="field-label">Topic</label>
                <input
                  className="input"
                  value={newDecision.topic}
                  onChange={(e) => setNewDecision((p) => ({ ...p, topic: e.target.value }))}
                  placeholder="e.g. Crane shift adjustment"
                />
              </div>
              <div>
                <label className="field-label">Decision owner</label>
                <input
                  className="input"
                  value={newDecision.owner}
                  onChange={(e) => setNewDecision((p) => ({ ...p, owner: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Decision</label>
              <input
                className="input"
                value={newDecision.decision}
                onChange={(e) => setNewDecision((p) => ({ ...p, decision: e.target.value }))}
                placeholder="Record the agreed decision…"
              />
            </div>
            <div>
              <label className="field-label">Supporting documentation</label>
              <input
                className="input"
                value={newDecision.docs}
                onChange={(e) => setNewDecision((p) => ({ ...p, docs: e.target.value }))}
                placeholder="e.g. Meeting_Minutes.docx"
              />
            </div>
            <div>
              <button className="btn btn-primary btn-sm" type="submit">
                Add to decision log
              </button>
            </div>
          </form>
        </details>
      </div>
    </div>
  );
}
