import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle, Check, Copy, ExternalLink,
  FileSearch, RefreshCw, Sparkles, X
} from "lucide-react"
import { api } from "../api/client"

const TOPICS = [
  {
    id: "safety",
    label: "Safety & Hazards",
    question: "What documented safety hazards, accidents, injuries, missing protections or unresolved safety concerns should be discussed?"
  },
  {
    id: "inspections",
    label: "Inspections & Quality",
    question: "What documented inspection findings, construction defects, quality problems or missing approvals need discussion?"
  },
  {
    id: "delays",
    label: "Schedule & Delays",
    question: "What documented construction delays, missed deadlines or differences between planned and actual progress need discussion?"
  },
  {
    id: "deliveries",
    label: "Suppliers & Deliveries",
    question: "What documented material delivery delays, supplier reliability problems or material shortages need discussion?"
  },
  {
    id: "staffing",
    label: "Workers & Subcontractors",
    question: "What documented staffing shortages, subcontractor performance problems or workforce coordination issues need discussion?"
  },
  {
    id: "equipment",
    label: "Equipment & Machinery",
    question: "What documented equipment failures, machinery problems or equipment availability issues need discussion?"
  },
  {
    id: "coordination",
    label: "Technical Coordination",
    question: "What documented design conflicts, engineering coordination issues, blocked activities or unresolved technical decisions need discussion?"
  },
  {
    id: "progress",
    label: "Construction Progress",
    question: "What important construction progress, completed activities, outstanding work or upcoming milestones should be discussed?"
  },
  {
    id: "actions",
    label: "Actions & Deadlines",
    question: "What documented required actions, assigned responsibilities, outstanding decisions or upcoming deadlines need follow-up?"
  },
  {
    id: "weather",
    label: "Weather & Site Conditions",
    question: "What documented weather conditions or environmental risks affected construction activities or require planning?"
  }
]

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/$/, "")

function sourceUrl(url) {
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`
}

function normalizeSources(result) {
  const sources = Array.isArray(result?.sources)
    ? result.sources
    : []

  return sources
    .filter(source => source?.name)
    .map(source => ({
      id: source.id || source.name,
      name: source.name,
      type: source.type || "Project document",
      url: source.url || null,
      snippet: source.snippet || "",
      date: source.date || null
    }))
}

function getItems(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  return []
}

function cleanAnswer(answer) {
  return String(answer || "")
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .trim()
}

function parsePoint(answer) {
  const text = cleanAnswer(answer)

  if (!text) return null

  const match = text.match(
    /(?:Meeting question|Question to discuss|Discussion question|Question)\s*:/i
  )

  if (match) {
    const position = match.index

    const observation = text
      .slice(0, position)
      .replace(/^(?:Observation|Issue|Finding|Situation|Discussion point)\s*:/i, "")
      .replace(/^\s*[-•\d.)]+\s*/, "")
      .trim()

    const question = text
      .slice(position + match[0].length)
      .trim()

    return {
      observation,
      question
    }
  }

  return {
    observation: text,
    question: ""
  }
}

function normalizedWords(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]{4,}/gu) || []
  )
}

function isDuplicate(first, second) {
  const a = normalizedWords(first)
  const b = normalizedWords(second)

  if (!a.size || !b.size) return false

  const common = [...a].filter(word => b.has(word)).length

  return common / Math.min(a.size, b.size) >= 0.8
}

function buildQuestion(topic, project) {
  return `
You are preparing a construction coordination meeting.

Selected workspace: ${project}

Analyze the supplied project evidence for this specific topic:

${topic.question}

IMPORTANT:
- Read and compare ALL evidence supplied to you.
- Report ONLY facts documented in the sources.
- Do not mix information from different construction projects.
- Do not invent incidents, costs, dates or responsibilities.
- Do not describe a resolved problem as unresolved.
- If no relevant evidence exists, return found=false.
- If relevant evidence exists, return found=true and cite the documents.
- Focus ONLY on ${topic.label}.
- Give exactly ONE important discussion point.
- State why the topic matters.
- Include a clear question the site manager should ask.
- Mention responsible people or deadlines only when documented.
- Keep the answer below 110 words.

Use this format inside your answer:

Observation: [Documented facts and why they matter, with citations]
Meeting question: [Specific question to discuss]

Do not combine unrelated topics.
`
}

export default function MeetingIntelligenceTab({
  project,
  repositoryDocs = [],
  evidenceCount = 0,
  onToast
}) {
  const [talkingPoints, setTalkingPoints] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [scanLabel, setScanLabel] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [hasScanned, setHasScanned] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  const [documentStats, setDocumentStats] = useState({
    reports: 0,
    evidence: 0,
    schedule: 0,
    loaded: false
  })

  const requestId = useRef(0)
  const fallbackRef = useRef({ repositoryDocs, evidenceCount })

  fallbackRef.current = { repositoryDocs, evidenceCount }

  const refreshDocuments = useCallback(async () => {
    const query = `?project=${encodeURIComponent(project)}`

    const results = await Promise.allSettled([
      api(`/api/repository${query}`),
      api(`/api/evidence${query}`),
      api(`/api/schedule${query}`)
    ])

    const fallback = fallbackRef.current

    const reports = results[0].status === "fulfilled"
      ? getItems(results[0].value).length
      : fallback.repositoryDocs.filter(
          doc => !doc.project || doc.project === project
        ).length

    const evidence = results[1].status === "fulfilled"
      ? getItems(results[1].value).length
      : fallback.evidenceCount

    const schedule = results[2].status === "fulfilled"
      ? getItems(results[2].value).length
      : 0

    const stats = {
      reports,
      evidence,
      schedule,
      loaded: true
    }

    setDocumentStats(stats)

    return stats
  }, [project])

  useEffect(() => {
    requestId.current += 1

    setTalkingPoints([])
    setHasScanned(false)
    setLastScan(null)
    setError("")
    setCopied(false)
    setIsScanning(false)
    setScanStep(0)
    setScanLabel("")

    refreshDocuments().catch(console.error)

    return () => {
      requestId.current += 1
    }
  }, [project, refreshDocuments])

  const totalDocuments =
    documentStats.reports +
    documentStats.evidence +
    documentStats.schedule

  const analyzeTopic = async topic => {
    const response = await api("/api/knowledge/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        project,
        question: buildQuestion(topic, project)
      })
    })

    const result = response?.result || response

    if (result?.found !== true) return null

    const sources = normalizeSources(result)
    const parsed = parsePoint(result.answer)

    if (!parsed || !sources.length) return null

    if (!parsed.observation && !parsed.question) return null

    return {
      id: topic.id,
      category: topic.label,
      observation: parsed.observation,
      question: parsed.question,
      sources
    }
  }

  const handleScan = async () => {
    if (isScanning) return

    const currentRequest = ++requestId.current

    setIsScanning(true)
    setScanStep(0)
    setScanLabel("Checking project documents…")
    setTalkingPoints([])
    setHasScanned(false)
    setCopied(false)
    setError("")

    try {
      const stats = await refreshDocuments()

      if (currentRequest !== requestId.current) return

      const total =
        stats.reports +
        stats.evidence +
        stats.schedule

      if (total === 0) {
        setError(
          "No project documents found. Upload evidence or save reports before scanning."
        )
        setHasScanned(true)
        return
      }

      const generated = []
      const failures = []

      // Sequential requests keep GPU usage stable.
      // Each category receives its own Qwen analysis.
      for (let i = 0; i < TOPICS.length; i++) {
        if (currentRequest !== requestId.current) return

        const topic = TOPICS[i]

        setScanStep(i + 1)
        setScanLabel(`Analyzing ${topic.label}…`)

        try {
          const point = await analyzeTopic(topic)

          if (currentRequest !== requestId.current) return
          if (!point) continue

          const duplicate = generated.some(existing =>
            isDuplicate(
              existing.observation,
              point.observation
            )
          )

          if (duplicate) continue

          generated.push(point)

          // Display completed results while remaining
          // categories are still being analyzed.
          setTalkingPoints([...generated])
        } catch (err) {
          console.error(
            `Meeting analysis failed for ${topic.label}:`,
            err
          )

          failures.push(topic.label)
        }
      }

      if (currentRequest !== requestId.current) return

      setHasScanned(true)
      setLastScan(new Date())

      if (failures.length === TOPICS.length) {
        setError(
          "All AI analysis requests failed. Check Express and the Qwen assistant."
        )
      } else if (failures.length) {
        setError(
          `Some categories could not be analyzed: ${failures.join(", ")}.`
        )
      }

      if (generated.length) {
        onToast?.(
          `Generated ${generated.length} evidence-backed meeting topics`,
          "✅"
        )
      } else if (!failures.length) {
        onToast?.(
          "No relevant meeting topics found in the available records",
          "ℹ️"
        )
      }
    } catch (err) {
      if (currentRequest !== requestId.current) return

      console.error("Meeting intelligence error:", err)

      setError(
        err.message ||
        "Failed to analyze project documents."
      )

      setHasScanned(true)
    } finally {
      if (currentRequest === requestId.current) {
        setIsScanning(false)
        setScanLabel("")
      }
    }
  }

  const handleDismiss = id => {
    setTalkingPoints(previous =>
      previous.filter(item => item.id !== id)
    )
  }

  const handleCopyNotes = async () => {
    if (!talkingPoints.length) return

    const text = [
      `Construction Meeting Agenda — ${project}`,
      lastScan
        ? `Generated: ${lastScan.toLocaleString("en-GB")}`
        : "",
      "",
      ...talkingPoints.flatMap((point, index) => [
        `${index + 1}. ${point.category}`,
        point.observation,
        point.question
          ? `Meeting question: ${point.question}`
          : "",
        `Sources: ${point.sources.map(s => s.name).join(", ")}`,
        ""
      ])
    ].join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onToast?.("Meeting notes copied", "📋")

      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast?.("Could not access clipboard", "⚠️")
    }
  }

  return (
    <div className="stack mi-prep-shell">
      <p className="mi-prep-subtitle">
        Analyze uploaded evidence, saved reports and project schedules
        to prepare evidence-backed talking points for your next meeting.
      </p>

      <div className="card mi-action-bar">
        <div className="mi-action-meta">
          <span className="mi-project-pill">
            {project}
          </span>

          <span className="mi-doc-count">
            <FileSearch size={14} />

            {documentStats.loaded
              ? `${totalDocuments} project records available to scan`
              : "Checking project documents…"}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={isScanning}
          onClick={handleScan}
        >
          {isScanning
            ? <RefreshCw size={15} />
            : <Sparkles size={15} />}

          {isScanning
            ? `Analyzing ${scanStep}/${TOPICS.length}`
            : "Scan Documents & Generate Notes"}
        </button>
      </div>

      {isScanning && (
        <div
          className="card"
          style={{
            padding: "16px 18px",
            background: "#fff7ed",
            borderColor: "#fed7aa"
          }}
        >
          <div
            className="flex-row"
            style={{ alignItems: "center", gap: 10 }}
          >
            <Sparkles size={17} color="#ea580c" />

            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13 }}>
                Qwen3 is preparing your meeting agenda
              </strong>

              <p
                className="caption"
                style={{ margin: "5px 0 0" }}
              >
                {scanLabel}
              </p>
            </div>
          </div>

          <div
            style={{
              height: 6,
              marginTop: 14,
              background: "#fed7aa",
              borderRadius: 10,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(scanStep / TOPICS.length) * 100}%`,
                background: "#f97316",
                transition: "width 0.3s"
              }}
            />
          </div>

          <p
            className="caption"
            style={{ margin: "8px 0 0" }}
          >
            {talkingPoints.length} talking points found so far.
            Results appear as each category finishes.
          </p>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            padding: 14,
            background: "#fef2f2",
            borderColor: "#fecaca"
          }}
        >
          <div
            className="flex-row"
            style={{ gap: 10 }}
          >
            <AlertCircle size={17} color="#dc2626" />
            <span style={{ fontSize: 13 }}>
              {error}
            </span>
          </div>
        </div>
      )}

      <div className="card mi-points-card">
        <div className="mi-points-header">
          <div>
            <h2 className="section-title">
              Talking Points to Discuss
            </h2>

            <p className="caption">
              {talkingPoints.length} evidence-backed
              {" "}
              {talkingPoints.length === 1 ? "item" : "items"}
              {" "}
              generated from project records
            </p>

            {lastScan && (
              <p
                className="caption"
                style={{ marginTop: 4 }}
              >
                Last scan: {lastScan.toLocaleString("en-GB")}
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn btn-sm"
            disabled={!talkingPoints.length}
            onClick={handleCopyNotes}
          >
            {copied
              ? <Check size={14} />
              : <Copy size={14} />}

            {copied ? "Copied" : "Copy Notes"}
          </button>
        </div>

        {!talkingPoints.length ? (
          <div className="mi-empty-points">
            {isScanning ? (
              "Analyzing project documents…"
            ) : hasScanned ? (
              "No supported meeting topics found in the available records."
            ) : (
              <>
                Click{" "}
                <strong>
                  Scan Documents & Generate Notes
                </strong>
                {" "}to generate your meeting agenda.
              </>
            )}
          </div>
        ) : (
          <ul className="mi-points-list">
            {talkingPoints.map(point => (
              <li
                key={point.id}
                className="mi-point-row"
              >
                <span className="mi-point-bullet" />

                <div className="mi-point-body">
                  <div style={{ marginBottom: 8 }}>
                    <span className="badge badge-blue">
                      {point.category}
                    </span>
                  </div>

                  <p className="mi-point-text">
                    {point.observation}
                  </p>

                  {point.question && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        background: "#eff6ff",
                        border: "1px solid #dbeafe",
                        borderRadius: 8
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 12,
                          color: "#1d4ed8"
                        }}
                      >
                        Question for the meeting
                      </strong>

                      <p
                        style={{
                          fontSize: 13,
                          margin: "6px 0 0",
                          lineHeight: 1.6
                        }}
                      >
                        {point.question}
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 12
                    }}
                  >
                    <span className="mi-point-source">
                      Sources:
                    </span>

                    {point.sources.map(source =>
                      source.url ? (
                        <a
                          key={source.id}
                          href={sourceUrl(source.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mi-point-source"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#2563eb",
                            textDecoration: "underline"
                          }}
                        >
                          {source.name}
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span
                          key={source.id}
                          className="mi-point-source"
                        >
                          {source.name}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="mi-point-dismiss"
                  onClick={() => handleDismiss(point.id)}
                  aria-label="Dismiss talking point"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasScanned && talkingPoints.length > 0 && (
        <p className="caption">
          Generated from indexed project records.
          Verify important claims against the referenced documents
          before making decisions.
        </p>
      )}
    </div>
  )
}