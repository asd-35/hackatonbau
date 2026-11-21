import React, { useMemo, useState } from "react";
import { Download, Eye, Search, Trash2 } from "lucide-react";
import { docIconFor, documentDownloadBlob, getConfidenceTier } from "../utils/documentUtils";
import { triggerDownload } from "../utils/exporters";

const EXAMPLE_QUERIES = [
  "When was the last supplier delay?",
  "Show all safety incidents.",
  "Find reports related to excavation.",
  "Summarize project progress.",
];

function RichText({ text }) {
  return (
    <div style={{ whiteSpace: "pre-line" }}>
      {text.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={idx}>{part.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </div>
  );
}

export default function KnowledgeHubTab({
  project,
  repositoryDocs,
  answerQuestionFn,
  onRecordSearch,
  onOpenDocument,
  onDeleteDocument,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All types");

  const [isSearching, setIsSearching] = useState(false);
  const runSearch = async (rawQuery) => {
    const clean = rawQuery.trim();
    if (!clean) return;
    setSearchQuery(clean);
    onRecordSearch(clean);
    setIsSearching(true);
    try { const result = await answerQuestionFn(clean); setLastResult({query:clean,result}); }
    catch(error) { setLastResult({query:clean,result:{answer:`Search failed: ${error.message}`,documents:[],confidence:0}}); }
    finally { setIsSearching(false); }
  };

  const docTypes = useMemo(
    () => Array.from(new Set(repositoryDocs.map((d) => d.type))).sort(),
    [repositoryDocs]
  );

  const filteredDocs = useMemo(() => {
    const q = repoSearch.trim().toLowerCase();
    return repositoryDocs.filter((d) => {
      if (selectedType !== "All types" && d.type !== selectedType) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q)
      );
    });
  }, [repositoryDocs, repoSearch, selectedType]);

  const handleDownload = (doc) => {
    if (doc.url) { window.open(doc.url,"_blank","noopener,noreferrer"); return; }
    const { blob } = documentDownloadBlob(doc);
    triggerDownload(blob, doc.name);
  };

  return (
    <div className="stack">
      {/* KH-02: Project Knowledge Search */}
      <div>
        <h2 className="section-title">Project Knowledge Search</h2>
        <p className="caption">
          Search source-backed text from uploaded project evidence and saved reports for <strong>{project}</strong>. Results quote matching source snippets; they are not invented answers.
        </p>
      </div>

      <div className="card stack">
        <div className="flex-row">
          {EXAMPLE_QUERIES.map((q) => (
            <button key={q} className="pill-btn" onClick={() => runSearch(q)}>
              {q}
            </button>
          ))}
        </div>

        <form
          className="flex-row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(searchQuery);
          }}
        >
          <input
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. When was the last supplier delay? Show all safety incidents. Find reports related to excavation."
          />
          <button className="btn btn-primary" type="submit" disabled={isSearching}>
            <Search size={15} /> {isSearching ? "Searching…" : "Search"}
          </button>
        </form>

        {lastResult && (
          <>
            <hr className="divider" />
            <div className="flex-row">
              <strong>Answer Summary</strong>
              <span className="caption" style={{ margin: 0 }}>
                · “{lastResult.query}”
              </span>
              {(() => {
                const tier = getConfidenceTier(lastResult.result.confidence);
                return (
                  <span className={`badge badge-${tier.color}`}>
                    Match: {tier.label}
                  </span>
                );
              })()}
            </div>
            <RichText text={lastResult.result.answer} />
            {lastResult.result.documents.length > 0 && (
              <div className="stack-sm">
                <strong>Relevant Documents &amp; Source References</strong>
                <div className="grid-3">
                  {lastResult.result.documents.slice(0, 3).map(([icon, title, meta], idx) => (
                    <div key={idx} className="card-compact">
                      <div>
                        {icon} <strong>{title}</strong>
                      </div>
                      <div className="caption">Source reference · {meta}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* KH-01 & KH-04: Document Repository & Recent Documents */}
      <div className="grid-repo">
        <div className="stack">
          <div>
            <h2 className="section-title">Document Repository</h2>
            <p className="caption">
              All generated and exported reports and notices, sorted by most recent first.
            </p>
          </div>
          <div className="card stack">
            <div className="grid-2">
              <input
                className="input"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search by document name, type, or status…"
              />
              <select
                className="select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="All types">All types</option>
                {docTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="alert alert-info">No documents match your filter.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Document Type</th>
                      <th>Creation Date</th>
                      <th>Status</th>
                      <th>Source Evidence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => {
                      const statusColor =
                        doc.status === "Exported" || doc.status === "Final"
                          ? "green"
                          : doc.status === "Reviewed"
                            ? "blue"
                            : "orange";
                      return (
                        <tr key={doc.id}>
                          <td>
                            <strong>
                              {docIconFor(doc.name, doc.type)} {doc.name}
                            </strong>
                          </td>
                          <td>{doc.type}</td>
                          <td>{doc.date_label}</td>
                          <td>
                            <span className={`badge badge-${statusColor}`}>{doc.status}</span>
                          </td>
                          <td>{doc.evidence_count} files</td>
                          <td>
                            <div className="flex-row" style={{ flexWrap: "nowrap" }}>
                              <button
                                className="btn btn-sm"
                                onClick={() => onOpenDocument(doc)}
                                title="Open preview"
                              >
                                <Eye size={14} /> Open
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleDownload(doc)}
                                title="Download"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                className="btn btn-danger-ghost btn-sm"
                                onClick={() => onDeleteDocument(doc.id, doc.name)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
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
        </div>

        {/* KH-04: Recent Documents */}
        <div className="stack">
          <div>
            <h2 className="section-title">Recent Documents</h2>
            <p className="caption">Latest generated and exported documents with quick actions.</p>
          </div>
          <div className="stack-sm">
            {repositoryDocs.slice(0, 5).map((doc) => {
              const statusColor =
                doc.status === "Exported" || doc.status === "Final"
                  ? "green"
                  : doc.status === "Reviewed"
                    ? "blue"
                    : "orange";
              return (
                <div key={doc.id} className="card-compact stack-sm">
                  <div className="flex-between">
                    <strong style={{ fontSize: "0.86rem" }}>
                      {docIconFor(doc.name, doc.type)} {doc.name}
                    </strong>
                    <span className={`badge badge-${statusColor}`}>{doc.status}</span>
                  </div>
                  <div className="caption" style={{ margin: 0 }}>
                    {doc.type} · {doc.date_label} · {doc.evidence_count} source files
                  </div>
                  <div className="flex-row">
                    <button className="btn btn-sm" onClick={() => onOpenDocument(doc)}>
                      <Eye size={14} /> Open
                    </button>
                    <button className="btn btn-sm" onClick={() => handleDownload(doc)}>
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
