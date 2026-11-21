import React from "react";
import { Download, X } from "lucide-react";
import {
  EVIDENCE_CARD_ICONS,
  EVIDENCE_STATUS_META,
  SAMPLE_PREVIEW_NOTES,
} from "../data/mockData";
import { docIconFor, documentDownloadBlob } from "../utils/documentUtils";
import { triggerDownload } from "../utils/exporters";

export function EvidencePreviewModal({ item, onClose }) {
  if (!item) return null;
  const { name, record, assignedReport, status, fileData } = item;
  const statusColor = EVIDENCE_STATUS_META[status]?.color || "gray";
  const category = record.category;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card stack" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between">
          <div className="flex-row">
            <h3 style={{ margin: 0 }}>
              {EVIDENCE_CARD_ICONS[category]} {name}
            </h3>
            <span className={`badge badge-${statusColor}`}>{status}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="grid-3">
          <div className="caption">
            <strong>Type:</strong> {record.file_type}
          </div>
          <div className="caption">
            <strong>Size:</strong> {record.size_label}
          </div>
          <div className="caption">
            <strong>Uploaded:</strong> 20 Nov 2026, {record.uploaded_at}
          </div>
        </div>
        <div className="caption">
          <strong>Assigned report{Array.isArray(assignedReport) && assignedReport.length > 1 ? "s" : ""}:</strong>{" "}
          {Array.isArray(assignedReport)
            ? assignedReport.length > 0
              ? assignedReport.join(", ")
              : "Unassigned"
            : assignedReport || "Unassigned"}
        </div>
        <hr className="divider" />

        {fileData ? (
          category === "photo" && fileData.dataUrl ? (
            <img
              src={fileData.dataUrl}
              alt={name}
              style={{ width: "100%", maxHeight: 380, objectFit: "contain", borderRadius: 8 }}
            />
          ) : category === "voice" && fileData.objectUrl ? (
            <audio controls src={fileData.objectUrl} style={{ width: "100%" }} />
          ) : (
            <div className="alert alert-info">
              Uploaded file <strong>{name}</strong> is stored in browser session memory and ready for classification.
            </div>
          )
        ) : category === "photo" ? (
          <div className="alert alert-info">
            <div>
              <strong>📷 Simulated site photo preview — {name}</strong>
              <div style={{ marginTop: 6 }}>
                Captured on 20 Nov 2026 at {record.uploaded_at} ({record.size_label}). Upload a real{" "}
                <code>.jpg</code> or <code>.png</code> file to inspect the actual image here.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ whiteSpace: "pre-line", fontSize: "0.9rem" }}>
            {SAMPLE_PREVIEW_NOTES[name] ||
              `Sample evidence file ${name} (${record.file_type}, ${record.size_label}).`}
          </div>
        )}
      </div>
    </div>
  );
}

export function RepositoryDocumentModal({ doc, onClose }) {
  if (!doc) return null;
  const icon = docIconFor(doc.name, doc.type);
  const badgeColor =
    doc.status === "Exported" || doc.status === "Final"
      ? "green"
      : doc.status === "Reviewed"
        ? "blue"
        : "orange";

  const handleDownload = () => {
    const { blob } = documentDownloadBlob(doc);
    triggerDownload(blob, doc.name);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card stack" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between">
          <div className="flex-row">
            <h3 style={{ margin: 0 }}>
              {icon} {doc.name}
            </h3>
            <span className={`badge badge-${badgeColor}`}>{doc.status}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="grid-3">
          <div className="caption">
            <strong>Document ID:</strong> <code>{doc.id}</code>
          </div>
          <div className="caption">
            <strong>Type:</strong> {doc.type}
          </div>
          <div className="caption">
            <strong>Created:</strong> {doc.date_label}
          </div>
        </div>
        <div className="caption">
          <strong>Source evidence count:</strong> {doc.evidence_count} files
        </div>
        <hr className="divider" />
        <p style={{ margin: 0 }}>{doc.summary}</p>
        <div>
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={15} /> Download document
          </button>
        </div>
      </div>
    </div>
  );
}
