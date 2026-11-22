import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Eye, FileCheck2, RefreshCw, Search } from "lucide-react"
import { api } from "../api/client"
import { docIconFor, documentDownloadBlob } from "../utils/documentUtils"
import { triggerDownload } from "../utils/exporters"

const EXAMPLE_QUERIES = [
  "When was the last supplier delay?",
  "Show all safety incidents.",
  "Find reports related to excavation.",
  "Summarize project progress."
]

const FILTER_PILLS = [
  { id: "All", label: "All" },
  { id: "Daily Reports", label: "Daily Reports" },
  { id: "Delay Notices", label: "Delay Notices" },
  { id: "Safety", label: "Safety" },
  { id: "Evidence", label: "Evidence" }
]

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "")

function fileUrl(url) {
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`
}

function docCategory(doc) {
  if (
    doc.kind === "evidence" ||
    doc.category === "voice" ||
    doc.category === "photo" ||
    doc.category === "text"
  ) return "Evidence"

  const text = `${doc.type || ""} ${doc.name || ""}`.toLowerCase()
  if (text.includes("delay") || text.includes("hindrance")) return "Delay Notices"
  if (text.includes("safety") || text.includes("incident") || text.includes("sigeko")) return "Safety"
  if (text.includes("evidence") || text.includes("delivery slip")) return "Evidence"
  return "Daily Reports"
}

function dateLabel(value) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short"
      })
}

function normalizeReport(doc, project) {
  return {
    ...doc,
    id: String(doc.id),
    name: doc.name || "Untitled report",
    type: doc.type || "Saved report",
    project: doc.project || project,
    kind: "report",
    date_label: doc.date_label || dateLabel(doc.created_at),
    status: doc.status || "Exported",
    category: docCategory(doc),
    snippet: doc.snippet || doc.summary || "",
    url: doc.url || null
  }
}

function normalizeEvidence(item, project) {
  return {
    id: String(item.id),
    name: item.name || "Uploaded evidence",
    type: item.category === "voice"
      ? "Voice recording"
      : item.category === "photo"
        ? "Site photo"
        : "Uploaded evidence",
    kind: "evidence",
    project: item.project || project,
    date_label: dateLabel(item.uploaded_at),
    status: "Uploaded",
    category: "Evidence",
    snippet: item.extracted_text || item.summary || "",
    url: item.url || `/api/evidence/${item.id}/file`
  }
}

function extractSources(answer, docs) {
  const sourceList =
    Array.isArray(answer?.sources) && answer.sources.length
      ? answer.sources
      : (answer?.documents || [])

  return sourceList.map((source, index) => {
    if (Array.isArray(source)) {
      const [, name, type, url] = source
      const existing = docs.find(
        item => item.url === url || item.name === name
      )

      return {
        id: existing?.id || `source-${index}`,
        name: name || existing?.name || "Source",
        type: type || existing?.type || "Record",
        url,
        snippet: existing?.snippet || "",
        date_label: existing?.date_label || ""
      }
    }

    const existing = docs.find(
      item =>
        item.url === source.url ||
        item.id === source.id ||
        item.name === source.name
    )

    return {
      ...existing,
      ...source,
      id: source.id || existing?.id || `source-${index}`,
      date_label: existing?.date_label || dateLabel(source.date),
      snippet: source.snippet || existing?.snippet || ""
    }
  }).filter(source => source.name)
}

function RichText({ text }) {
  return String(text || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <React.Fragment key={i}>{part}</React.Fragment>
    )
}

export default function KnowledgeHubTab({
  project,
  repositoryDocs = [],
  answerQuestionFn,
  onRecordSearch,
  onOpenDocument
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [lastResult, setLastResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [repoSearch, setRepoSearch] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [backendDocs, setBackendDocs] = useState([])
  const [evidenceDocs, setEvidenceDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [loadError, setLoadError] = useState("")

  const refreshDocuments = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingDocs(true)

    const query = `?project=${encodeURIComponent(project)}`

    const results = await Promise.allSettled([
      api(`/api/repository${query}`),
      api(`/api/evidence${query}`)
    ])

    if (results[0].status === "fulfilled") {
      setBackendDocs(
        Array.isArray(results[0].value?.items)
          ? results[0].value.items
          : []
      )
    }

    if (results[1].status === "fulfilled") {
      setEvidenceDocs(
        Array.isArray(results[1].value?.items)
          ? results[1].value.items
          : []
      )
    }

    setLoadError(
      results.every(result => result.status === "rejected")
        ? "Unable to load project files from Express."
        : ""
    )

    if (showLoading) setLoadingDocs(false)
  }, [project])

  useEffect(() => {
    setLastResult(null)
    setBackendDocs([])
    setEvidenceDocs([])

    refreshDocuments(true)

    const handleFocus = () => refreshDocuments(false)
    window.addEventListener("focus", handleFocus)

    const timer = window.setInterval(handleFocus, 30000)

    return () => {
      window.removeEventListener("focus", handleFocus)
      window.clearInterval(timer)
    }
  }, [refreshDocuments])

  const currentProjectDocs = useMemo(() => {
    const combined = new Map()

    for (const doc of repositoryDocs || []) {
      if (doc.project && doc.project !== project) continue
      combined.set(`report-${doc.id}`, normalizeReport(doc, project))
    }

    for (const doc of backendDocs) {
      if (doc.project && doc.project !== project) continue
      combined.set(`report-${doc.id}`, normalizeReport(doc, project))
    }

    for (const item of evidenceDocs) {
      if (item.project && item.project !== project) continue
      combined.set(`evidence-${item.id}`, normalizeEvidence(item, project))
    }

    return [...combined.values()].sort((a, b) => {
      const da = a.created_at || a.uploaded_at || a.date_label || ""
      const db = b.created_at || b.uploaded_at || b.date_label || ""
      return String(db).localeCompare(String(da))
    })
  }, [repositoryDocs, backendDocs, evidenceDocs, project])

  const runSearch = async rawQuery => {
    const question = String(rawQuery || "").trim()
    if (!question || isSearching) return

    setSearchQuery(question)
    onRecordSearch?.(question)
    setIsSearching(true)
    setLastResult(null)

    try {
      const response = answerQuestionFn
        ? await answerQuestionFn(question)
        : await api("/api/knowledge/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project, question })
          })

      const answer = response?.result || response
      const sources = extractSources(answer, currentProjectDocs)

      setLastResult({
        query: question,
        summary: answer?.answer ||
          "No answer was returned by the AI assistant.",
        sources,
        found: answer?.found === true
      })
    } catch (error) {
      setLastResult({
        query: question,
        summary:
          `Knowledge search failed: ${error.message}. ` +
          "Check that Express and project_assistant.py are running.",
        sources: [],
        found: false
      })
    } finally {
      setIsSearching(false)
    }
  }

  const filteredDocs = useMemo(() => {
    const query = repoSearch.trim().toLowerCase()

    return currentProjectDocs.filter(doc => {
      if (
        selectedFilter !== "All" &&
        docCategory(doc) !== selectedFilter
      ) return false

      return !query || [
        doc.name,
        doc.id,
        doc.type,
        doc.status,
        doc.snippet
      ].some(value =>
        String(value || "").toLowerCase().includes(query)
      )
    })
  }, [currentProjectDocs, repoSearch, selectedFilter])

  const openDocument = doc => {
    if (
      doc.kind === "report" &&
      typeof onOpenDocument === "function"
    ) {
      onOpenDocument(doc)
      return
    }

    if (doc.url) {
      window.open(
        fileUrl(doc.url),
        "_blank",
        "noopener,noreferrer"
      )
    }
  }

  const downloadDocument = doc => {
    if (doc.url) {
      window.open(
        fileUrl(doc.url),
        "_blank",
        "noopener,noreferrer"
      )
      return
    }

    try {
      const { blob } = documentDownloadBlob(doc)
      triggerDownload(
        blob,
        doc.name.endsWith(".pdf")
          ? doc.name
          : `${doc.id}.pdf`
      )
    } catch (error) {
      console.error("Download failed", error)
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 className="section-title">
          Project Knowledge Search
        </h2>
        <p className="caption">
          Ask Qwen about actual uploaded evidence, site reports
          and project schedules. Every supported answer shows its sources.
        </p>
      </div>

      <div className="card stack">
        <div className="flex-row">
          {EXAMPLE_QUERIES.map(query => (
            <button
              key={query}
              className="pill-btn"
              type="button"
              onClick={() => runSearch(query)}
            >
              {query}
            </button>
          ))}
        </div>

        <form
          className="flex-row"
          style={{ flexWrap: "nowrap" }}
          onSubmit={event => {
            event.preventDefault()
            runSearch(searchQuery)
          }}
        >
          <input
            className="input"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={`Ask across ${project}…`}
            aria-label="Ask about project documents"
          />

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
          >
            <Search size={15} />
            {isSearching ? "Searching…" : "Search"}
          </button>
        </form>

        {lastResult && (
          <div
            className="kh-result-block stack"
            aria-live="polite"
          >
            <hr
              className="divider"
              style={{ margin: "2px 0" }}
            />

            <div className="kh-answer-box">
              <div
                className="flex-between"
                style={{ marginBottom: 6 }}
              >
                <div className="flex-row">
                  <FileCheck2
                    size={15}
                    color={
                      lastResult.found
                        ? "#16a34a"
                        : "#64748b"
                    }
                  />
                  <strong>
                    {lastResult.found
                      ? "Source-backed answer"
                      : "Not confirmed"}
                  </strong>
                  <span className="badge badge-blue">
                    {project}
                  </span>
                </div>

                <span
                  className="caption"
                  style={{ margin: 0 }}
                >
                  “{lastResult.query}”
                </span>
              </div>

              <p
                className="kh-answer-text"
                style={{ whiteSpace: "pre-wrap" }}
              >
                <RichText text={lastResult.summary} />
              </p>
            </div>

            {lastResult.sources.length > 0 && (
              <div className="stack-sm">
                <strong
                  style={{
                    fontSize: "0.84rem",
                    color: "#334155"
                  }}
                >
                  Referenced source files ({lastResult.sources.length})
                </strong>

                <div className="grid-3">
                  {lastResult.sources.map(source => (
                    <div
                      className="kh-source-card"
                      key={source.id}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          overflowWrap: "anywhere"
                        }}
                      >
                        {source.name}
                      </div>

                      <div className="caption">
                        {source.type}
                        {source.date_label
                          ? ` · ${source.date_label}`
                          : ""}
                      </div>

                      {source.snippet && (
                        <blockquote className="kh-source-quote">
                          “{source.snippet.slice(0, 260)}”
                        </blockquote>
                      )}

                      {source.url && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() =>
                            openDocument({
                              ...source,
                              kind: "evidence"
                            })
                          }
                        >
                          <Eye size={13} />
                          Open source
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="stack">
        <div className="flex-between">
          <div>
            <h2 className="section-title">
              Document Repository
            </h2>
            <p className="caption">
              Real project reports and uploaded evidence,
              newest first. {currentProjectDocs.length} files listed.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => refreshDocuments(true)}
            disabled={loadingDocs}
          >
            <RefreshCw size={14} />
            {loadingDocs ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="card stack">
          <div className="kh-repo-toolbar">
            <div className="flex-row">
              {FILTER_PILLS.map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  className={
                    `filter-chip ${
                      selectedFilter === filter.id
                        ? "active"
                        : ""
                    }`
                  }
                  onClick={() =>
                    setSelectedFilter(filter.id)
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <input
              className="input kh-repo-search"
              value={repoSearch}
              onChange={event =>
                setRepoSearch(event.target.value)
              }
              placeholder="Filter by title, ID, or type…"
            />
          </div>

          {loadError && (
            <div className="alert alert-info">
              {loadError}
            </div>
          )}

          {filteredDocs.length === 0 ? (
            <div className="alert alert-info">
              {loadingDocs
                ? "Loading documents…"
                : "No uploaded files match this project or filter."}

              {(selectedFilter !== "All" || repoSearch) && (
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
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name & ID</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDocs.map(doc => (
                    <tr key={`${doc.kind}-${doc.id}`}>
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            overflowWrap: "anywhere"
                          }}
                        >
                          {docIconFor(doc.name, doc.type)}{" "}
                          {doc.name}
                        </div>
                        <div className="kh-doc-id">
                          {doc.id}
                        </div>
                      </td>

                      <td>{doc.type}</td>

                      <td style={{ whiteSpace: "nowrap" }}>
                        {doc.date_label}
                      </td>

                      <td>
                        <span
                          className={
                            `badge badge-${
                              ["Exported", "Final", "Uploaded"]
                                .includes(doc.status)
                                ? "green"
                                : "orange"
                            }`
                          }
                        >
                          {doc.status}
                        </span>
                      </td>

                      <td>
                        <div
                          className="flex-row"
                          style={{ flexWrap: "nowrap" }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => openDocument(doc)}
                          >
                            <Eye size={13} />
                            Preview
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download size={13} />
                            File
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}