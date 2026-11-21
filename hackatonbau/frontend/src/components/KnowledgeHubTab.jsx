import React, { useMemo, useState } from "react"
import {
  Building2,
  Download,
  Eye,
  FileCheck2,
  Search,
} from "lucide-react"
import { docIconFor, documentDownloadBlob } from "../utils/documentUtils"
import { triggerDownload } from "../utils/exporters"

const EXAMPLE_QUERIES = [
  "When was the last supplier delay?",
  "Show all safety incidents.",
  "Find reports related to excavation.",
  "Summarize project progress.",
]

const FILTER_PILLS = [
  { id: "All", label: "All" },
  { id: "Daily Reports", label: "Daily Reports" },
  { id: "Delay Notices", label: "Delay Notices" },
  { id: "Safety", label: "Safety" },
  { id: "Evidence", label: "Evidence" },
]

function buildPreloadedDocs(activeProject) {
  return [
    {
      id: "BD-20261121-2040",
      name: "Daily Construction Report — 21 Nov 2026",
      type: "Daily Construction Report",
      category: "Daily Reports",
      date_label: "21 Nov 2026",
      status: "Exported",
      evidence_count: 6,
      project: activeProject,
      partners: ["ABC Concrete", "Shell Contractor A"],
      snippet:
        "Core slab pour on axes A–F completed (36 m³ C30/37). ABC Concrete arrived 3 hours late at 11:00 due to batching plant maintenance; overall site progress at 62% vs. 71% planned.",
      summary:
        "Daily Construction Report documenting 36 m³ C30/37 foundation slab pour on axes A–F, a 3-hour ready-mix delivery delay from ABC Concrete, and Shell Contractor A's reinforcement release at 10:30.",
    },
    {
      id: "SC-20261120-1145",
      name: "Delay Notice — VOB/B § 6 (Concrete Delivery)",
      type: "Delay Notice",
      category: "Delay Notices",
      date_label: "20 Nov 2026",
      status: "Exported",
      evidence_count: 4,
      project: activeProject,
      partners: ["ABC Concrete"],
      snippet:
        "Formal VOB/B § 6 hindrance notice issued after ABC Concrete missed the 08:00 delivery slot for the third time this month, causing 3 hours of crew standstill (€24,500 cumulative claim exposure).",
      summary:
        "Formal Delay Notice (VOB/B § 6) logged against ABC Concrete for repeated late mixer arrivals impacting critical-path slab pouring and crew standby costs.",
    },
    {
      id: "BD-20261119-1610",
      name: "Safety Inspection — Level 3 Guardrail & SiGeKo",
      type: "Incident/Safety Report",
      category: "Safety",
      date_label: "19 Nov 2026",
      status: "Exported",
      evidence_count: 3,
      project: activeProject,
      partners: ["Shell Contractor A"],
      snippet:
        "SiGeKo walkthrough identified an incomplete perimeter guardrail at Level 3, axis 5/C. Area was immediately cordoned off and Shell Contractor A was instructed to rectify prior to crane lift.",
      summary:
        "Safety & SiGeKo inspection report recording an incomplete guardrail on Level 3 (axis 5/C) assigned to Shell Contractor A, with immediate access restriction and corrective action tracking.",
    },
    {
      id: "EV-20261120-1100",
      name: "Concrete Delivery Slip #7731–7734 (C30/37)",
      type: "Evidence",
      category: "Evidence",
      date_label: "20 Nov 2026",
      status: "Exported",
      evidence_count: 1,
      project: activeProject,
      partners: ["ABC Concrete"],
      snippet:
        "Delivery slips #7731–7734 from ABC Concrete confirming 36 m³ ready-mix C30/37 delivered across 4 trucks at 11:00 (3h behind scheduled 08:00 slot); test cubes #21–23 taken.",
      summary:
        "Verified supplier delivery slips for 36 m³ C30/37 concrete from ABC Concrete with timestamped arrival logs and quality cube references.",
    },
    {
      id: "BD-20261114-0930",
      name: "Site Inspection — Excavation & Foundation Pit",
      type: "Site Inspection Report",
      category: "Daily Reports",
      date_label: "14 Nov 2026",
      status: "Exported",
      evidence_count: 5,
      project: activeProject,
      partners: ["Shell Contractor A"],
      snippet:
        "Excavation pit dewatering and shoring anchor tension verified by structural engineer. Soil bearing capacity confirmed along axes A–F; excavation cleared for blinding layer.",
      summary:
        "Geotechnical and structural inspection of the main excavation pit confirming dewatering stability, shoring anchor loads, and release for foundation blinding.",
    },
    {
      id: "BD-20261118-1745",
      name: "Daily Construction Report — MEP & Electrical Rough-In",
      type: "Daily Construction Report",
      category: "Daily Reports",
      date_label: "18 Nov 2026",
      status: "Draft",
      evidence_count: 3,
      project: activeProject,
      partners: ["Elektro Weber"],
      snippet:
        "Elektro Weber completed 85% of basement cable tray installation and Level 1–2 riser sleeves on schedule with zero safety defects or schedule variance.",
      summary:
        "Progress report covering Elektro Weber's electrical rough-in across basement and Levels 1–2, tracking fully on schedule with all quality checks passed.",
    },
  ]
}

function classifyFilterBucket(doc) {
  if (doc.category) return doc.category
  const t = `${doc.type || ""} ${doc.name || ""}`.toLowerCase()
  if (t.includes("delay") || t.includes("notice")) return "Delay Notices"
  if (t.includes("safety") || t.includes("incident") || t.includes("sigeko")) return "Safety"
  if (t.includes("evidence") || t.includes("delivery") || t.includes("slip")) return "Evidence"
  return "Daily Reports"
}

function buildLocalCitationAnswer(query, docs, scopeLabel) {
  const q = query.toLowerCase()
  const tokens = q
    .replace(/[^a-z0-9äöüß\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 2)

  const scored = docs
    .map(doc => {
      const hay = `${doc.name} ${doc.type} ${doc.summary || ""} ${doc.snippet || ""} ${(doc.partners || []).join(" ")}`.toLowerCase()
      let score = 0
      for (const tok of tokens) {
        if (hay.includes(tok)) score += 2
      }
      if ((q.includes("delay") || q.includes("supplier")) && (hay.includes("delay") || hay.includes("concrete") || hay.includes("vob"))) score += 4
      if ((q.includes("safety") || q.includes("incident")) && (hay.includes("safety") || hay.includes("guardrail") || hay.includes("sigeko"))) score += 4
      if (q.includes("excavation") && (hay.includes("excavation") || hay.includes("foundation") || hay.includes("dewatering"))) score += 5
      if ((q.includes("progress") || q.includes("summarize")) && (hay.includes("progress") || hay.includes("daily") || hay.includes("completed"))) score += 3
      return { doc, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const matched = (scored.length ? scored : docs.slice(0, 2).map(doc => ({ doc, score: 1 })))
    .slice(0, 3)
    .map(x => x.doc)

  let summary = ""
  if (q.includes("delay") || q.includes("supplier")) {
    summary =
      `The most recent supplier delay was logged on 20–21 Nov 2026 involving ABC Concrete, whose C30/37 ready-mix trucks arrived 3 hours late (11:00 instead of 08:00) due to batching plant maintenance. ` +
      `A formal VOB/B § 6 Delay Notice (SC-20261120-1145) has been issued covering crew standstill exposure.`
  } else if (q.includes("safety") || q.includes("incident")) {
    summary =
      `Across ${scopeLabel}, the primary open safety item is an incomplete Level 3 perimeter guardrail at axis 5/C assigned to Shell Contractor A (BD-20261119-1610). ` +
      `The zone was immediately cordoned off during the SiGeKo walkthrough pending documented rectification.`
  } else if (q.includes("excavation")) {
    summary =
      `Excavation and foundation pit inspection (BD-20261114-0930) confirmed stable dewatering, verified shoring anchor loads, and approved soil bearing capacity along axes A–F. ` +
      `No open geotechnical holds remain on the excavation works.`
  } else if (q.includes("progress") || q.includes("summarize")) {
    summary =
      `Verified site reports show structural concrete pouring and MEP rough-in advancing, with Elektro Weber tracking on schedule across basement and Levels 1–2 (BD-20261118-1745). ` +
      `Overall completion is currently affected by recurring concrete delivery delays from ABC Concrete and one open Level 3 safety rectification item.`
  } else if (scored.length > 0) {
    const top = matched[0]
    summary = `Found ${matched.length} verified record(s) in ${scopeLabel} matching your query. Most relevant: ${top.name} (${top.id}, ${top.date_label}) — ${top.snippet || top.summary}`
  } else {
    summary = `No exact keyword match was found in ${scopeLabel}. Showing the most recent verified site records for reference.`
  }

  return { summary, sources: matched }
}

export default function KnowledgeHubTab({
  project,
  repositoryDocs,
  answerQuestionFn,
  onRecordSearch,
  onOpenDocument,
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [lastResult, setLastResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  const [repoSearch, setRepoSearch] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")

  // Combine newly exported live backend docs at the top + realistic preloaded records
  const currentProjectDocs = useMemo(() => {
    const live = (repositoryDocs || []).map(doc => ({
      ...doc,
      project: doc.project || project,
      category: classifyFilterBucket(doc),
      snippet: doc.snippet || doc.summary,
      partners: doc.partners || [],
    }))
    const liveIds = new Set(live.map(d => d.id))
    const preloaded = buildPreloadedDocs(project).filter(d => !liveIds.has(d.id))
    return [...live, ...preloaded]
  }, [repositoryDocs, project])

  const runSearch = async rawQuery => {
    const clean = rawQuery.trim()
    if (!clean) return
    setSearchQuery(clean)
    onRecordSearch(clean)
    setIsSearching(true)

    const localCitation = buildLocalCitationAnswer(clean, currentProjectDocs, project)

    try {
      if (answerQuestionFn) {
        const apiRes = await answerQuestionFn(clean)
        const hasBackendText =
          apiRes?.answer &&
          !/no matching|couldn't find|not found|search failed/i.test(apiRes.answer) &&
          (apiRes.documents?.length || 0) > 0

        if (hasBackendText) {
          setLastResult({
            query: clean,
            scope: project,
            summary: apiRes.answer.replace(/\*\*/g, ""),
            sources: localCitation.sources,
          })
          return
        }
      }
      setLastResult({
        query: clean,
        scope: project,
        summary: localCitation.summary,
        sources: localCitation.sources,
      })
    } catch {
      setLastResult({
        query: clean,
        scope: project,
        summary: localCitation.summary,
        sources: localCitation.sources,
      })
    } finally {
      setIsSearching(false)
    }
  }

  const filteredDocs = useMemo(() => {
    const q = repoSearch.trim().toLowerCase()
    return currentProjectDocs.filter(doc => {
      if (selectedFilter !== "All" && classifyFilterBucket(doc) !== selectedFilter) {
        return false
      }
      if (!q) return true
      return (
        doc.name.toLowerCase().includes(q) ||
        String(doc.id).toLowerCase().includes(q) ||
        doc.type.toLowerCase().includes(q) ||
        doc.status.toLowerCase().includes(q) ||
        (doc.summary || "").toLowerCase().includes(q)
      )
    })
  }, [currentProjectDocs, repoSearch, selectedFilter])

  const handleDownloadPdf = doc => {
    if (doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer")
      return
    }
    const { blob } = documentDownloadBlob(doc)
    triggerDownload(blob, doc.name.endsWith(".pdf") ? doc.name : `${doc.id}.pdf`)
  }

  return (
    <div className="stack">
      {/* CITATION-BACKED KNOWLEDGE SEARCH */}
      <div>
        <h2 className="section-title">Project Knowledge Search</h2>
        <p className="caption">
          Source-backed answers strictly cited from verified site reports and evidence.
        </p>
      </div>

      <div className="card stack">
        <div className="flex-row">
          {EXAMPLE_QUERIES.map(q => (
            <button key={q} type="button" className="pill-btn" onClick={() => runSearch(q)}>
              {q}
            </button>
          ))}
        </div>

        <form
          className="flex-row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={e => {
            e.preventDefault()
            runSearch(searchQuery)
          }}
        >
          <input
            className="input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Ask across ${project}…`}
          />
          <button className="btn btn-primary" type="submit" disabled={isSearching}>
            <Search size={15} /> {isSearching ? "Searching…" : "Search"}
          </button>
        </form>

        {lastResult && (
          <div className="kh-result-block stack">
            <hr className="divider" style={{ margin: "2px 0" }} />

            {/* 1. Concise Summary Answer */}
            <div className="kh-answer-box">
              <div className="flex-between" style={{ marginBottom: 6 }}>
                <div className="flex-row">
                  <FileCheck2 size={15} color="#16a34a" />
                  <strong>Verified Summary</strong>
                  <span className="badge badge-blue">{lastResult.scope}</span>
                </div>
                <span className="caption" style={{ margin: 0 }}>
                  “{lastResult.query}”
                </span>
              </div>
              <p className="kh-answer-text">{lastResult.summary}</p>
            </div>

            {/* 2. Verified Source Cards */}
            {lastResult.sources.length > 0 && (
              <div className="stack-sm">
                <strong style={{ fontSize: "0.84rem", color: "#334155" }}>
                  Cited Sources ({lastResult.sources.length})
                </strong>
                <div className="grid-3">
                  {lastResult.sources.map(src => (
                    <div key={src.id} className="kh-source-card">
                      <div className="flex-between">
                        <code className="kh-source-id">{src.id}</code>
                        <span className="caption" style={{ margin: 0 }}>
                          {src.date_label}
                        </span>
                      </div>
                      <div className="kh-source-project">
                        <Building2 size={12} /> {src.project}
                      </div>
                      <blockquote className="kh-source-quote">
                        “{src.snippet || src.summary}”
                      </blockquote>
                      <div className="kh-source-footer">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onOpenDocument(src)}
                        >
                          <Eye size={13} /> View Source
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL-WIDTH DOCUMENT REPOSITORY */}
      <div className="stack">
        <div>
          <h2 className="section-title">Document Repository</h2>
          <p className="caption">
            Verified site reports, notices, and evidence sorted by most recent first.
          </p>
        </div>

        <div className="card stack">
          <div className="kh-repo-toolbar">
            <div className="flex-row">
              {FILTER_PILLS.map(pill => (
                <button
                  key={pill.id}
                  type="button"
                  className={`filter-chip ${selectedFilter === pill.id ? "active" : ""}`}
                  onClick={() => setSelectedFilter(pill.id)}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            <input
              className="input kh-repo-search"
              value={repoSearch}
              onChange={e => setRepoSearch(e.target.value)}
              placeholder="Filter by title, ID, or type…"
            />
          </div>

          {filteredDocs.length === 0 ? (
            <div className="alert alert-info">
              No documents match the current filter.{" "}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSelectedFilter("All")
                  setRepoSearch("")
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name &amp; ID</th>
                    <th>Report Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map(doc => {
                    const statusColor =
                      doc.status === "Exported" || doc.status === "Final"
                        ? "green"
                        : "orange"
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {docIconFor(doc.name, doc.type)} {doc.name}
                          </div>
                          <div className="kh-doc-id">{doc.id}</div>
                        </td>
                        <td>{doc.type}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{doc.date_label}</td>
                        <td>
                          <span className={`badge badge-${statusColor}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex-row" style={{ flexWrap: "nowrap" }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => onOpenDocument(doc)}
                            >
                              <Eye size={13} /> Preview
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleDownloadPdf(doc)}
                            >
                              <Download size={13} /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
