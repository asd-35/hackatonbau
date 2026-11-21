import React, { useEffect, useMemo, useState } from "react"
import { Check, Copy, FileSearch, Sparkles, X } from "lucide-react"

const BASELINE_DOC_COUNT = 6

function buildBaselineTalkingPoints(project) {
  return [
    {
      id: "tp-1",
      text: "ABC Concrete arrived 3 hours late for the third time this month — confirm backup batching plant allocation and review €24,500 VOB/B § 6 standstill claim.",
      source: "Delay Notice · 20 Nov",
    },
    {
      id: "tp-2",
      text: "Incomplete perimeter guardrail on Level 3 (Axis 5/C) remains open — verify Shell Contractor A rectification and SiGeKo sign-off before resuming crane lifts.",
      source: "Safety Inspection · 19 Nov",
    },
    {
      id: "tp-3",
      text: `Core slab progress on ${project} sits at 62% vs. 71% planned (-9 days) — confirm Saturday shift crew availability for East Curtain Wall bracket pre-assembly.`,
      source: "Daily Report · 21 Nov",
    },
    {
      id: "tp-4",
      text: "Forecast sub-zero night temperatures next week — confirm winter curing blankets and site heating readiness prior to Level 5 pour.",
      source: "Daily Report · 20 Nov",
    },
    {
      id: "tp-5",
      text: "Elektro Weber completed 85% of Level 1–2 electrical rough-in on schedule — align drywall closure handover date.",
      source: "Daily Report · 18 Nov",
    },
  ]
}

export default function MeetingIntelligenceTab({
  project,
  repositoryDocs = [],
  evidenceCount = 0,
  onToast,
}) {
  const [talkingPoints, setTalkingPoints] = useState(() =>
    buildBaselineTalkingPoints(project)
  )
  const [isScanning, setIsScanning] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setTalkingPoints(buildBaselineTalkingPoints(project))
    setCopied(false)
  }, [project])

  const totalDocsToScan = useMemo(
    () => BASELINE_DOC_COUNT + (repositoryDocs?.length || 0) + (evidenceCount || 0),
    [repositoryDocs, evidenceCount]
  )

  const handleScan = () => {
    setIsScanning(true)
    setCopied(false)
    setTimeout(() => {
      const livePoints = (repositoryDocs || []).slice(0, 3).map((doc, idx) => ({
        id: `live-${doc.id || idx}`,
        text: doc.summary || `Review latest ${doc.type || "report"}: ${doc.name}.`,
        source: `${doc.type || "Report"} · ${doc.date_label || "Today"}`,
      }))
      const baseline = buildBaselineTalkingPoints(project)
      setTalkingPoints([...livePoints, ...baseline].slice(0, 6))
      setIsScanning(false)
      onToast?.(`Scanned ${totalDocsToScan} project documents and refreshed talking points`, "✅")
    }, 280)
  }

  const handleDismiss = id => {
    setTalkingPoints(prev => prev.filter(item => item.id !== id))
  }

  const handleCopyNotes = async () => {
    if (!talkingPoints.length) return
    const text = [
      `Meeting Talking Points — ${project}`,
      "",
      ...talkingPoints.map(
        (tp, idx) => `${idx + 1}. ${tp.text} (${tp.source})`
      ),
    ].join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onToast?.("Talking points copied to clipboard", "📋")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onToast?.("Could not access clipboard", "⚠️")
    }
  }

  return (
    <div className="stack mi-prep-shell">
      <p className="mi-prep-subtitle">
        Scan recent project reports and documents to generate talking points for your upcoming meeting.
      </p>

      {/* Top Action Bar */}
      <div className="card mi-action-bar">
        <div className="mi-action-meta">
          <span className="mi-project-pill">{project}</span>
          <span className="mi-doc-count">
            <FileSearch size={14} />
            {totalDocsToScan} project documents available to scan
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={isScanning}
          onClick={handleScan}
        >
          <Sparkles size={15} />
          {isScanning ? "Scanning documents…" : "Scan Documents & Generate Notes"}
        </button>
      </div>

      {/* Generated Talking Points Card */}
      <div className="card mi-points-card">
        <div className="mi-points-header">
          <div>
            <h2 className="section-title">Talking Points to Discuss</h2>
            <p className="caption">
              {talkingPoints.length} item{talkingPoints.length === 1 ? "" : "s"} extracted from recent reports and evidence
            </p>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            disabled={!talkingPoints.length}
            onClick={handleCopyNotes}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy Notes"}
          </button>
        </div>

        {talkingPoints.length === 0 ? (
          <div className="mi-empty-points">
            All talking points dismissed. Click <strong>Scan Documents &amp; Generate Notes</strong> to refresh from project records.
          </div>
        ) : (
          <ul className="mi-points-list">
            {talkingPoints.map(item => (
              <li key={item.id} className="mi-point-row">
                <span className="mi-point-bullet" />
                <div className="mi-point-body">
                  <p className="mi-point-text">{item.text}</p>
                  <span className="mi-point-source">{item.source}</span>
                </div>
                <button
                  type="button"
                  className="mi-point-dismiss"
                  onClick={() => handleDismiss(item.id)}
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
    </div>
  )
}
