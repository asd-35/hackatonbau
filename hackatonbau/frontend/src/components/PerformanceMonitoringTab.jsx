import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  BarChart3, Building2, CalendarClock, FileSearch, Plus,
  RefreshCw, Save, ShieldAlert, SlidersHorizontal,
  TrendingUp, Upload, X
} from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis
} from "recharts"
import { api, projectQuery } from "../api/client"

const COLORS = {
  Critical: "#dc2626",
  "At Risk": "#f97316",
  "On Track": "#16a34a",
  "No Data": "#94a3b8"
}

const CAUSES = [
  {
    name: "Suppliers / Materials",
    color: "#dc2626",
    pattern: /(?:deliver\w*|supplier|concrete|material|shipment|procurement).{0,100}(?:delay|late|short|missing|not arriv|out of stock)|(?:delay|late|short|missing).{0,100}(?:deliver\w*|supplier|concrete|material|shipment)/i
  },
  {
    name: "Staffing",
    color: "#f97316",
    pattern: /(?:staff|crew|worker|subcontractor|electrician).{0,100}(?:short|absent|missing|reduced|understaff|did not arrive)|(?:short|understaff).{0,100}(?:staff|crew|worker|subcontractor)/i
  },
  {
    name: "Weather",
    color: "#3b82f6",
    pattern: /(?:rain|drizzle|fog|wind|snow|weather|frost).{0,110}(?:delay|stop|halt|slow|suspend|prevent|risk)|(?:delay|halt|suspend).{0,100}(?:rain|fog|weather|snow|wind)/i
  },
  {
    name: "Safety / Quality",
    color: "#0f172a",
    pattern: /(?:safety|inspection|guardrail|defect|weld|approval|smoke seal|fire protection).{0,110}(?:delay|hold|suspend|blocked|pending|failed)|(?:delay|hold|suspend|blocked).{0,100}(?:safety|inspection|guardrail|defect|approval)/i
  },
  {
    name: "Design / Coordination",
    color: "#8b5cf6",
    pattern: /(?:clash|conflict|drawing|design|coordination|alignment).{0,110}(?:delay|hold|suspend|block|pending|unresolved|required)|(?:delay|hold|suspend|block).{0,100}(?:design|drawing|clash|conflict)/i
  }
]

const num = value =>
  Number(String(value ?? "").replace(",", "."))

const pct = value =>
  Number.isFinite(num(value))
    ? Math.min(100, Math.max(0, num(value)))
    : null

const fmtPct = value =>
  value == null ? "No data" : `${Number(value.toFixed(1))}%`

const fmtMoney = value =>
  value == null
    ? "No data"
    : `€${Math.round(value).toLocaleString("en-US")}`

const fmtDays = value =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${value}d`

const list = response =>
  Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : []

const compact = value =>
  String(value || "").replace(/\s+/g, " ").trim()

const projectLabel = name =>
  name.length <= 23
    ? name
    : name.replace(/\s+/g, " ").slice(0, 22) + "…"

const blank = () => ({
  id: crypto.randomUUID(),
  Activity: "",
  Trade: "",
  "Planned Progress": "",
  "Actual Progress": "",
  "Planned Completion": "",
  "Actual Completion": "",
  "Root Cause": ""
})

function sourceText(record) {
  const transcript = record.transcription

  return [
    record.extracted_text,
    typeof transcript === "string"
      ? transcript
      : transcript?.text,
    record.summary,
    record.description
  ]
    .filter(value =>
      typeof value === "string" && value.trim()
    )
    .join("\n")
}

function progressPair(text) {
  const t = compact(text)

  const patterns = [
    /overall\s+(?:site|project)\s+(?:progress|completion)\s*:?\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*\(?\s*planned\s*:?\s*(\d{1,3}(?:[.,]\d+)?)\s*%/i,
    /overall\s+(?:site|project)\s+(?:progress|completion)\s*:?\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*actual\s*(?:vs\.?|against|compared with)\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*planned/i,
    /actual\s+(?:site|project)\s+completion.{0,65}?(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:,\s*)?(?:compared with|vs\.?|against)\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*planned/i,
    /(?:overall\s+)?(?:site|project)\s+progress.{0,100}?(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:vs\.?|against)\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*planned/i,
    /(\d{1,3}(?:[.,]\d+)?)\s*%\s*actual\s*(?:vs\.?|against)\s*(\d{1,3}(?:[.,]\d+)?)\s*%\s*planned/i
  ]

  for (const pattern of patterns) {
    const match = t.match(pattern)

    if (match) {
      return {
        actual: pct(match[1]),
        planned: pct(match[2])
      }
    }
  }

  const reverse = t.match(
    /(?:overall\s+)?(?:site|project)\s+progress.{0,70}?planned\s*:?\s*(\d{1,3})\s*%.{0,50}?actual\s*:?\s*(\d{1,3})\s*%/i
  )

  return reverse
    ? {
        planned: pct(reverse[1]),
        actual: pct(reverse[2])
      }
    : null
}

function money(raw) {
  if (!raw) return null

  const normalized = raw.replace(/\s/g, "")

  const marker = /(?:mio\.?|million|m)\b/i.test(normalized)
    ? 1e6
    : /(?:k|thousand)\b/i.test(normalized)
      ? 1e3
      : 1

  let number = normalized.replace(/[^\d.,]/g, "")

  if (number.includes(",") && number.includes(".")) {
    number = number.replace(/,/g, "")
  } else if (/^\d{1,3}(,\d{3})+$/.test(number)) {
    number = number.replace(/,/g, "")
  } else if (/^\d{1,3}(\.\d{3})+$/.test(number)) {
    number = number.replace(/\./g, "")
  } else {
    number = number.replace(",", ".")
  }

  const n = Number(number)

  return Number.isFinite(n) && n > 0
    ? n * marker
    : null
}

function extractFinancials(text) {
  const t = compact(text)

  const value = t.match(
    /(?:contract\s+value|project\s+budget|total\s+budget|project\s+value)\s*:?\s*(€\s*[\d.,]+\s*(?:million|mio\.?|m)?|[\d.,]+\s*(?:million|mio\.?)\s*€?)/i
  )

  const variance = t.match(
    /(?:budget\s+var(?:iance)?|cost\s+var(?:iance)?|budget\s+deviation)\s*:?\s*([+-]?\d+(?:[.,]\d+)?)\s*%/i
  )

  const claims = [
    ...t.matchAll(
      /(?:claim|standstill\s+cost|vob\/b|cost\s+exposure).{0,100}?(€\s*[\d.,]+\s*(?:million|mio\.?|m)?)/gi
    )
  ]
    .map(match => money(match[1]))
    .filter(Boolean)

  return {
    value: money(value?.[1]),
    budgetVar: variance ? num(variance[1]) : null,
    claims
  }
}

function scheduleGap(text) {
  const t = compact(text)

  const behind = t.match(
    /(?:approximately\s+)?(\d+)\s*(?:working\s+)?days?\s+behind\s+schedule/i
  )

  if (behind) return -Number(behind[1])

  const ahead = t.match(
    /(\d+)\s*(?:working\s+)?days?\s+ahead\s+of\s+schedule/i
  )

  if (ahead) return Number(ahead[1])

  const signed = t.match(
    /(?:project\s+currently|overall\s+schedule|cumulative\s+delay).{0,70}?(-\d+)\s*days?/i
  )

  if (signed) return Number(signed[1])

  const cumulative = t.match(
    /(\d+)\s*[- ]day\s+cumulative\s+delay/i
  )

  return cumulative ? -Number(cumulative[1]) : null
}

function dateGap(planned, actual) {
  if (
    !/^\d{4}-\d\d-\d\d$/.test(planned || "") ||
    !/^\d{4}-\d\d-\d\d$/.test(actual || "")
  ) {
    return null
  }

  const p = Date.parse(`${planned}T00:00:00Z`)
  const a = Date.parse(`${actual}T00:00:00Z`)

  return Number.isFinite(p) && Number.isFinite(a)
    ? Math.round((p - a) / 86400000)
    : null
}

function declaredSite(text) {
  const beginning = String(text || "").slice(0, 1400)

  const printed = beginning.match(
    /(?:^|\n)\s*Project\s*:\s*([^\n·|]{3,100})/im
  )

  if (printed) return printed[1].trim()

  const spoken = beginning.match(
    /(?:working at|working on)\s+(?:the\s+)?(.{4,75}?)\s+construction\s+site\s+in\s+([\p{L}-]+)/iu
  )

  return spoken
    ? `${spoken[1].trim()} ${spoken[2]}`
    : ""
}

function flagsFor(text) {
  const t = compact(text)
    .replace(/\bno injuries (?:were )?reported\b/gi, "")
    .replace(/\bno accidents (?:were )?reported\b/gi, "")

  const safety =
    /(?:guardrail|fall.protection|unsealed\s+floor|near.miss|slipp(?:ed|ery)|injur(?:y|ed)|safety\s+(?:incident|hazard)|smoke\s+seal|failed\s+inspection|defective\s+weld)/i.test(t)

  return { safety }
}

function makeProject(
  name,
  evidence,
  reports,
  schedule,
  metadata = {}
) {
  const files = [
    ...evidence.map(item => ({
      ...item,
      kind: "Evidence",
      sourceDate: item.uploaded_at || item.created_at
    })),
    ...reports.map(item => ({
      ...item,
      kind: "Report",
      sourceDate: item.created_at || item.uploaded_at
    }))
  ].sort((a, b) =>
    String(b.sourceDate || "").localeCompare(
      String(a.sourceDate || "")
    )
  )

  // Only analyze records describing the correct site.
  const sources = files
    .map(file => ({
      id: file.id,
      name: file.name || "Untitled",
      kind: file.kind,
      text: sourceText(file),
      date: file.sourceDate
    }))
    .filter(file => {
      if (!file.text) return false

      const site = declaredSite(file.text)

      return (
        !site ||
        compact(site).toLowerCase() ===
          compact(name).toLowerCase()
      )
    })

  // Prefer overall project figures over individual activity figures.
  const latestProgress = sources
    .map(item => ({
      ...item,
      parsed: progressPair(item.text)
    }))
    .find(item =>
      item.parsed?.planned != null &&
      item.parsed?.actual != null
    )

  const scheduleRows = schedule.filter(row => row.Activity)

  const withProgress = scheduleRows.filter(row =>
    row["Planned Progress"] !== "" &&
    row["Planned Progress"] != null &&
    row["Actual Progress"] !== "" &&
    row["Actual Progress"] != null &&
    Number.isFinite(num(row["Planned Progress"])) &&
    Number.isFinite(num(row["Actual Progress"]))
  )

  const scheduleProgress = withProgress.length
    ? {
        planned:
          withProgress.reduce(
            (n, row) => n + pct(row["Planned Progress"]),
            0
          ) / withProgress.length,
        actual:
          withProgress.reduce(
            (n, row) => n + pct(row["Actual Progress"]),
            0
          ) / withProgress.length
      }
    : null

  const progress = scheduleProgress || latestProgress?.parsed || null

  const financial = sources.map(item => ({
    ...item,
    parsed: extractFinancials(item.text)
  }))

  const value =
    financial.find(item => item.parsed.value != null)
      ?.parsed.value ?? null

  const budgetVar =
    financial.find(item => item.parsed.budgetVar != null)
      ?.parsed.budgetVar ?? null

  const claimValues = [
    ...new Set(
      financial.flatMap(item => item.parsed.claims)
    )
  ]

  const claim = claimValues.length
    ? claimValues.reduce((a, b) => a + b, 0)
    : null

  const reportedDays = sources
    .map(item => scheduleGap(item.text))
    .find(value => value != null)

  const activityDays = scheduleRows
    .map(row =>
      dateGap(
        row["Planned Completion"],
        row["Actual Completion"]
      )
    )
    .filter(value => value != null)

  const days =
    reportedDays ??
    (activityDays.length ? Math.min(...activityDays) : null)

  const safetySources = sources.filter(item =>
    flagsFor(item.text).safety
  )

  const issues = new Set()
  const delayMentions = []

  for (const source of sources) {
    const t = compact(source.text)

    for (const cause of CAUSES) {
      if (cause.pattern.test(t)) {
        delayMentions.push({
          name: cause.name,
          source: source.name
        })
      }
    }
  }

  for (const row of scheduleRows) {
    const t = String(row["Root Cause"] || "")

    if (t) {
      for (const cause of CAUSES) {
        if (
          cause.pattern.test(`${t} delay`) ||
          cause.pattern.test(t)
        ) {
          delayMentions.push({
            name: cause.name,
            source: row.Activity
          })
        }
      }
    }

    if (
      row["Planned Progress"] !== "" &&
      row["Actual Progress"] !== "" &&
      pct(row["Actual Progress"]) <
        pct(row["Planned Progress"])
    ) {
      issues.add(row.Activity)
    }
  }

  const progressGap = progress
    ? progress.actual - progress.planned
    : null

  const status =
    progressGap == null &&
    !safetySources.length &&
    !issues.size
      ? "No Data"
      : progressGap != null && progressGap <= -8
        ? "Critical"
        : (progressGap != null && progressGap < -2) ||
            safetySources.length >= 1 ||
            issues.size
          ? "At Risk"
          : "On Track"

  return {
    name,
    shortName: projectLabel(name),
    planned: progress?.planned ?? null,
    actual: progress?.actual ?? null,
    progressGap,
    progressSource: scheduleProgress
      ? "Saved activity schedule (unweighted average)"
      : latestProgress?.name || null,
    value,
    budgetVar,
    claim,
    days,
    status,
    safetySignals: safetySources.length,
    issueCount: safetySources.length + issues.size,
    sources,
    schedule: scheduleRows,
    documents: files.length,
    delayMentions,
    lastActivity: metadata.last_activity || null,
    sourceNames: sources.map(item => item.name),
    scheduleEntries: scheduleRows.length
  }
}

function csvRows(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)

  const split = line => {
    const values = []
    let value = ""
    let quoted = false

    for (let i = 0; i < line.length; i++) {
      const c = line[i]

      if (c === '"' && line[i + 1] === '"' && quoted) {
        value += '"'
        i++
      } else if (c === '"') {
        quoted = !quoted
      } else if (c === "," && !quoted) {
        values.push(value.trim())
        value = ""
      } else {
        value += c
      }
    }

    values.push(value.trim())
    return values
  }

  const headers = split(lines[0] || "").map(x =>
    x.toLowerCase().replace(/\s+/g, "_")
  )

  return lines
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const values = split(line)

      const get = (...keys) => {
        const i = keys
          .map(k => headers.indexOf(k))
          .find(i => i >= 0)

        return i == null ? "" : values[i] || ""
      }

      return {
        id: crypto.randomUUID(),
        Activity: get("activity", "task"),
        Trade: get("trade"),
        "Planned Progress": get(
          "planned_progress",
          "planned"
        ),
        "Actual Progress": get(
          "actual_progress",
          "actual"
        ),
        "Planned Completion": get(
          "planned_completion",
          "planned_date"
        ),
        "Actual Completion": get(
          "actual_completion",
          "actual_date"
        ),
        "Root Cause": get("root_cause", "reason")
      }
    })
    .filter(row => row.Activity)
}

function Metric({
  title,
  value,
  subtitle,
  Icon,
  color = ""
}) {
  return (
    <div className="exec-kpi-card">
      <div className="exec-kpi-top">
        <span className="exec-kpi-label">{title}</span>
        <Icon size={15} color="#64748b" />
      </div>

      <div className="exec-kpi-value">{value}</div>

      <div className={`exec-kpi-sub ${color}`}>
        {subtitle}
      </div>
    </div>
  )
}

function RiskTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const p = payload[0].payload

  return (
    <div
      style={{
        background: "#0f172a",
        color: "white",
        padding: 12,
        borderRadius: 8,
        fontSize: 12
      }}
    >
      <strong>{p.name}</strong>
      <div>Progress gap: {fmtPct(p.progressGap)}</div>
      <div>Safety / schedule flags: {p.issueCount}</div>
      <div>Documents: {p.documents}</div>
    </div>
  )
}

function Empty({
  children = "No documented data available yet."
}) {
  return (
    <div
      style={{
        height: 210,
        display: "grid",
        placeItems: "center",
        color: "#64748b",
        fontSize: 13,
        textAlign: "center",
        padding: 22
      }}
    >
      {children}
    </div>
  )
}

export default function PerformanceMonitoringTab({ project }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [viewMode, setViewMode] = useState("portfolio")
  const [selectedProject, setSelectedProject] = useState(project)
  const [rows, setRows] = useState([])
  const [manageOpen, setManageOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [aiBrief, setAiBrief] = useState(null)
  const [askingAi, setAskingAi] = useState(false)

  const refresh = useCallback(
    () => setRefreshIndex(index => index + 1),
    []
  )

  useEffect(() => {
    setSelectedProject(project)
    setAiBrief(null)
  }, [project])

  useEffect(() => {
    let alive = true

    setLoading(true)
    setLoadError("")

    ;(async () => {
      const response = await api("/api/projects")
      const registered = list(response)

      const loaded = await Promise.all(
        registered.map(async entry => {
          const name =
            typeof entry === "string"
              ? entry
              : entry.name

          const paths = [
            "/api/evidence",
            "/api/repository",
            "/api/schedule"
          ].map(root =>
            api(`${root}${projectQuery(name)}`)
          )

          const results = await Promise.allSettled(paths)

          const failed = results
            .map((result, index) =>
              result.status === "rejected"
                ? ["Evidence", "Reports", "Schedule"][index]
                : ""
            )
            .filter(Boolean)

          return {
            data: makeProject(
              name,
              ...results.map(result =>
                result.status === "fulfilled"
                  ? list(result.value)
                  : []
              ),
              entry
            ),
            failed
          }
        })
      )

      if (!alive) return

      setProjects(loaded.map(item => item.data))

      const failed = loaded.filter(
        item => item.failed.length
      )

      setLoadError(
        failed.length
          ? `Some project data could not be loaded: ${
              failed
                .map(item =>
                  `${item.data.name} (${item.failed.join(", ")})`
                )
                .join("; ")
            }.`
          : ""
      )
    })()
      .catch(error => {
        if (alive) {
          setLoadError(
            `Portfolio loading failed: ${error.message}`
          )
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [refreshIndex])

  const active =
    projects.find(item => item.name === selectedProject) ||
    makeProject(selectedProject, [], [], [])

  useEffect(() => {
    setRows(active.schedule.map(item => ({ ...item })))
    setMessage("")
    setAiBrief(null)
  }, [selectedProject, projects])

  const indicators = useMemo(() => {
    const progressProjects = projects.filter(
      item =>
        item.planned != null &&
        item.actual != null
    )

    const reportedValue = projects.filter(
      item => item.value != null
    )

    const claims = projects.filter(
      item => item.claim != null
    )

    const totalValue = reportedValue.reduce(
      (sum, item) => sum + item.value,
      0
    )

    const ratio =
      progressProjects.reduce(
        (sum, p) => sum + p.actual,
        0
      ) /
      (
        progressProjects.reduce(
          (sum, p) => sum + p.planned,
          0
        ) || 1
      )

    return {
      value: reportedValue.length
        ? totalValue
        : null,
      valueCount: reportedValue.length,
      progressRatio: progressProjects.length
        ? ratio
        : null,
      progressCount: progressProjects.length,
      claims: claims.length
        ? claims.reduce(
            (sum, item) => sum + item.claim,
            0
          )
        : null,
      claimCount: claims.length,
      safety: projects.reduce(
        (sum, item) => sum + item.safetySignals,
        0
      ),
      safetyProjects: projects.filter(
        item => item.safetySignals
      ).length,
      statuses: {
        "On Track": projects.filter(
          p => p.status === "On Track"
        ).length,
        "At Risk": projects.filter(
          p => p.status === "At Risk"
        ).length,
        Critical: projects.filter(
          p => p.status === "Critical"
        ).length
      }
    }
  }, [projects])

  const donut = useMemo(() => {
    const counts = new Map(
      CAUSES.map(item => [item.name, 0])
    )

    for (const p of projects) {
      for (const mention of p.delayMentions) {
        counts.set(
          mention.name,
          (counts.get(mention.name) || 0) + 1
        )
      }
    }

    return CAUSES
      .map(item => ({
        name: item.name,
        value: counts.get(item.name) || 0,
        color: item.color
      }))
      .filter(item => item.value > 0)
  }, [projects])

  const chartProjects = projects.filter(
    p => p.planned != null && p.actual != null
  )

  const scatterProjects = projects.filter(
    p =>
      p.progressGap != null &&
      (p.sources.length || p.scheduleEntries)
  )

  const saveSchedule = async () => {
    if (!selectedProject) return

    setBusy(true)
    setMessage("")

    try {
      const response = await api("/api/schedule", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project: selectedProject,
          items: rows.filter(row =>
            row.Activity.trim()
          )
        })
      })

      setRows(list(response))

      setMessage(
        `Saved ${list(response).length} activities for ${selectedProject}.`
      )

      refresh()
    } catch (error) {
      setMessage(`Save failed: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const importCsv = async file => {
    if (!file) return

    try {
      const imported = csvRows(await file.text())

      if (!imported.length) {
        throw new Error(
          "CSV needs an Activity column"
        )
      }

      setRows(imported)

      setMessage(
        `Imported ${imported.length} rows. Click Save schedule to persist.`
      )
    } catch (error) {
      setMessage(error.message)
    }
  }

  const askAi = async () => {
    setAskingAi(true)
    setAiBrief(null)

    try {
      const response = await api("/api/knowledge/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project: selectedProject,
          question:
            `Summarize the CURRENT documented construction progress, ` +
            `delays, safety concerns and next actions for ${selectedProject}. ` +
            `Use only documents about this site. Include source citations ` +
            `and distinguish resolved from unresolved items.`
        })
      })

      setAiBrief(
        response.result || {
          found: false,
          answer: "No grounded project brief available."
        }
      )
    } catch (error) {
      setAiBrief({
        found: false,
        answer: `AI summary failed: ${error.message}`
      })
    } finally {
      setAskingAi(false)
    }
  }

  const chooseProject = name => {
    setSelectedProject(name)
    setViewMode("project")
  }

  const tracked = projects.filter(
    p => p.documents || p.scheduleEntries
  ).length

  return (
    <div className="stack">
      <div className="exec-header">
        <div>
          <div className="flex-row">
            <h2 className="section-title">
              Executive Portfolio Dashboard
            </h2>

            <span className="live-sync-badge">
              <span className="live-sync-dot" />
              Real project records
            </span>
          </div>

          <p className="caption">
            {viewMode === "portfolio"
              ? `Live overview of ${projects.length} registered sites. ${tracked} have project records.`
              : `Actual saved project data for ${selectedProject}. Missing metrics are shown as unavailable.`}
          </p>
        </div>

        <div className="exec-header-actions">
          <button
            className="btn btn-sm"
            type="button"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={14} />
            {loading ? "Loading…" : "Refresh Data"}
          </button>

          <button
            className="btn btn-sm"
            type="button"
            onClick={() => {
              setSelectedProject(
                viewMode === "portfolio"
                  ? project
                  : selectedProject
              )
              setManageOpen(true)
            }}
          >
            <SlidersHorizontal size={14} />
            Manage Schedule / Import CSV
          </button>
        </div>
      </div>

      {loadError && (
        <div
          className="alert alert-info"
          style={{ color: "#b91c1c" }}
        >
          {loadError}
        </div>
      )}

      <div className="exec-view-bar">
        <div
          className="exec-segmented"
          role="tablist"
          aria-label="Performance view mode"
        >
          <button
            type="button"
            className={`exec-seg-btn ${
              viewMode === "portfolio" ? "active" : ""
            }`}
            onClick={() => setViewMode("portfolio")}
          >
            All Projects
          </button>

          <button
            type="button"
            className={`exec-seg-btn ${
              viewMode === "project" ? "active" : ""
            }`}
            onClick={() => setViewMode("project")}
          >
            {selectedProject}
          </button>
        </div>

        {viewMode === "project" && (
          <span
            className={`badge ${
              active.status === "Critical"
                ? "badge-red"
                : active.status === "At Risk"
                  ? "badge-orange"
                  : active.status === "On Track"
                    ? "badge-green"
                    : ""
            }`}
          >
            {active.status}
          </span>
        )}
      </div>

      {viewMode === "portfolio" ? (
        <>
          <div className="exec-kpi-grid">
            <Metric
              title="Documented Portfolio Value"
              value={
                indicators.value == null
                  ? "No data"
                  : `€${(indicators.value / 1e6).toFixed(2)}M`
              }
              subtitle={`${indicators.valueCount}/${projects.length} projects have a stated contract value`}
              Icon={Building2}
            />

            <Metric
              title="Portfolio Progress Health"
              value={
                indicators.progressRatio == null
                  ? "No data"
                  : `Ratio ${indicators.progressRatio.toFixed(2)}`
              }
              subtitle={`${indicators.progressCount}/${projects.length} with plan/actual · ${indicators.statuses["On Track"]} on track · ${indicators.statuses["At Risk"]} at risk · ${indicators.statuses.Critical} critical (not EVM SPI)`}
              Icon={CalendarClock}
            />

            <Metric
              title="Claim Amounts in Records"
              value={fmtMoney(indicators.claims)}
              subtitle={`${indicators.claimCount} projects mention claim amounts · not verified as outstanding`}
              Icon={TrendingUp}
              color="warn"
            />

            <Metric
              title="Safety / Quality Signals"
              value={`${indicators.safety} document${
                indicators.safety === 1 ? "" : "s"
              }`}
              subtitle={`Across ${indicators.safetyProjects} projects · signals, not confirmed open incidents`}
              Icon={ShieldAlert}
              color="warn"
            />
          </div>

          <div className="exec-charts-grid">
            <div className="exec-chart-card">
              <h3 className="exec-chart-title">
                Planned vs. Actual Progress (Soll-Ist)
              </h3>

              <p className="exec-chart-sub">
                Only projects with documented progress
              </p>

              {chartProjects.length ? (
                <div
                  style={{
                    height: Math.max(
                      230,
                      chartProjects.length * 50
                    )
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartProjects}
                      layout="vertical"
                      margin={{
                        top: 8,
                        right: 18,
                        left: 10,
                        bottom: 4
                      }}
                      barGap={3}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={118}
                        tick={{ fontSize: 10 }}
                      />

                      <Tooltip
                        formatter={v =>
                          `${Number(v.toFixed(1))}%`
                        }
                      />

                      <Bar
                        name="Planned"
                        dataKey="planned"
                        fill="#cbd5e1"
                        barSize={10}
                      />

                      <Bar
                        name="Actual"
                        dataKey="actual"
                        barSize={10}
                      >
                        {chartProjects.map(p => (
                          <Cell
                            key={p.name}
                            fill={
                              p.actual >= p.planned
                                ? "#16a34a"
                                : "#f97316"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty>
                  Upload a progress report or save a
                  schedule to populate this chart.
                </Empty>
              )}

              <div className="exec-chart-legend">
                <span className="exec-legend-item">
                  <span
                    className="exec-legend-dot"
                    style={{ background: "#cbd5e1" }}
                  />
                  Planned
                </span>

                <span className="exec-legend-item">
                  <span
                    className="exec-legend-dot"
                    style={{ background: "#f97316" }}
                  />
                  Actual behind
                </span>

                <span className="exec-legend-item">
                  <span
                    className="exec-legend-dot"
                    style={{ background: "#16a34a" }}
                  />
                  On/ahead
                </span>
              </div>
            </div>

            <div className="exec-chart-card">
              <h3 className="exec-chart-title">
                Project Risk Matrix
              </h3>

              <p className="exec-chart-sub">
                Progress variance (percentage points) vs.
                documented safety/schedule flags ·
                bubble size = records
              </p>

              {scatterProjects.length ? (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <ScatterChart
                      margin={{
                        top: 10,
                        right: 12,
                        left: -10,
                        bottom: 12
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        type="number"
                        dataKey="progressGap"
                        name="Progress gap"
                        unit="pp"
                        tick={{ fontSize: 11 }}
                        domain={[
                          "dataMin - 2",
                          "dataMax + 2"
                        ]}
                      />

                      <YAxis
                        type="number"
                        dataKey="issueCount"
                        allowDecimals={false}
                        name="Flagged records"
                        tick={{ fontSize: 11 }}
                        domain={[0, "dataMax + 1"]}
                      />

                      <ZAxis
                        type="number"
                        dataKey="documents"
                        range={[100, 480]}
                      />

                      <ReferenceLine
                        x={0}
                        stroke="#94a3b8"
                        strokeDasharray="3 3"
                      />

                      <Tooltip content={<RiskTooltip />} />

                      <Scatter data={scatterProjects}>
                        {scatterProjects.map(p => (
                          <Cell
                            key={p.name}
                            fill={COLORS[p.status]}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty>
                  Risk comparisons need documented
                  progress figures.
                </Empty>
              )}

              <div className="exec-chart-legend">
                <span className="exec-legend-item">
                  <span
                    className="exec-legend-dot"
                    style={{
                      background: COLORS.Critical
                    }}
                  />
                  Critical
                </span>

                <span className="exec-legend-item">
                  <span
                    className="exec-legend-dot"
                    style={{
                      background: COLORS["At Risk"]
                    }}
                  />
                  At risk
                </span>

                <span className="exec-legend-item">
                  <span
                    className="exec-legend-dot"
                    style={{
                      background: COLORS["On Track"]
                    }}
                  />
                  On track
                </span>
              </div>
            </div>

            <div className="exec-chart-card">
              <h3 className="exec-chart-title">
                Cross-Site Delay Contributors
              </h3>

              <p className="exec-chart-sub">
                Occurrences in actual uploaded records
                and schedules
              </p>

              {donut.length ? (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={donut}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {donut.map(item => (
                          <Cell
                            key={item.name}
                            fill={item.color}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={v =>
                          `${v} source mention${
                            v === 1 ? "" : "s"
                          }`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty>
                  No attributable delay causes
                  documented yet.
                </Empty>
              )}

              <div className="exec-chart-legend">
                {donut.map(item => (
                  <span
                    className="exec-legend-item"
                    key={item.name}
                  >
                    <span
                      className="exec-legend-dot"
                      style={{
                        background: item.color
                      }}
                    />
                    {item.name} ({item.value})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card stack-sm">
            <div className="flex-between">
              <div className="flex-row">
                <BarChart3 size={16} />
                <strong>
                  Executive Portfolio Scorecard
                </strong>
              </div>

              <span className="caption">
                Click a project to inspect its source data
              </span>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Files</th>
                    <th>Contract Value</th>
                    <th>Plan / Actual</th>
                    <th>Budget Var.</th>
                    <th>Schedule</th>
                    <th>Claim Amounts</th>
                    <th>Safety Flags</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {projects.map(p => (
                    <tr
                      className="scorecard-row"
                      key={p.name}
                      onClick={() =>
                        chooseProject(p.name)
                      }
                    >
                      <td>
                        <div className="scorecard-project-name">
                          {p.name}
                        </div>
                      </td>

                      <td>{p.documents}</td>

                      <td>
                        {p.value == null
                          ? "—"
                          : `€${(
                              p.value / 1e6
                            ).toFixed(2)}M`}
                      </td>

                      <td>
                        {p.planned == null
                          ? "—"
                          : `${fmtPct(p.planned)} / ${fmtPct(p.actual)}`}
                      </td>

                      <td>
                        {p.budgetVar == null
                          ? "—"
                          : `${
                              p.budgetVar > 0
                                ? "+"
                                : ""
                            }${p.budgetVar}%`}
                      </td>

                      <td>
                        {fmtDays(p.days)}
                      </td>

                      <td>
                        {fmtMoney(p.claim)}
                      </td>

                      <td>
                        {p.safetySignals} flagged
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            p.status === "Critical"
                              ? "badge-red"
                              : p.status === "At Risk"
                                ? "badge-orange"
                                : p.status === "On Track"
                                  ? "badge-green"
                                  : ""
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="stack">
          <div className="exec-kpi-grid">
            <Metric
              title="Contract Value"
              value={
                active.value == null
                  ? "No data"
                  : `€${(
                      active.value / 1e6
                    ).toFixed(2)}M`
              }
              subtitle={
                active.budgetVar == null
                  ? "Budget variance not documented"
                  : `Budget variance ${active.budgetVar}%`
              }
              Icon={Building2}
            />

            <Metric
              title="Planned / Actual"
              value={
                active.planned == null
                  ? "No data"
                  : `${fmtPct(active.planned)} / ${fmtPct(active.actual)}`
              }
              subtitle={
                active.progressGap == null
                  ? "Add a schedule or a progress report"
                  : `Gap ${
                      active.progressGap > 0
                        ? "+"
                        : ""
                    }${Number(
                      active.progressGap.toFixed(1)
                    )} pp · ${active.progressSource}`
              }
              Icon={CalendarClock}
            />

            <Metric
              title="Documented Claim Amounts"
              value={fmtMoney(active.claim)}
              subtitle="Referenced amounts, not verified outstanding"
              Icon={TrendingUp}
            />

            <Metric
              title="Safety / Quality Signals"
              value={`${active.safetySignals} flagged documents`}
              subtitle={`${active.documents} saved files · ${active.scheduleEntries} schedule activities`}
              Icon={ShieldAlert}
            />
          </div>

          <div className="card stack-sm">
            <div className="flex-between">
              <strong>
                Actual Project Evidence — {selectedProject}
              </strong>

              <button
                className="btn btn-sm"
                disabled={
                  askingAi ||
                  !active.sources.length
                }
                onClick={askAi}
              >
                <FileSearch size={14} />
                {askingAi
                  ? "Analyzing records…"
                  : "Ask Qwen for Project Brief"}
              </button>
            </div>

            <p className="caption">
              Numbers are extracted from uploaded text
              or saved schedules. Missing values aren't estimated.
            </p>

            {aiBrief && (
              <div
                className="alert alert-info"
                style={{
                  display: "block",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.65
                }}
              >
                {aiBrief.answer ||
                  "No verified answer was found."}

                {aiBrief.sources?.length > 0 && (
                  <div
                    className="caption"
                    style={{ marginTop: 9 }}
                  >
                    Sources:{" "}
                    {aiBrief.sources
                      .map(s => s.name)
                      .join("; ")}
                  </div>
                )}
              </div>
            )}

            {active.planned != null && (
              <>
                <div className="progress-wrap">
                  <div className="progress-label">
                    Planned · {fmtPct(active.planned)}
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill navy"
                      style={{
                        width: `${active.planned}%`
                      }}
                    />
                  </div>
                </div>

                <div className="progress-wrap">
                  <div className="progress-label">
                    Actual · {fmtPct(active.actual)}
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${
                        active.actual >= active.planned
                          ? "green"
                          : ""
                      }`}
                      style={{
                        width: `${active.actual}%`
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="caption">
              {active.sourceNames.length
                ? `Indexed source records: ${active.sourceNames.join("; ")}`
                : "No readable report text or transcripts available for this site."}
            </div>
          </div>

          <div className="card stack-sm">
            <div className="flex-between">
              <strong>
                Project Schedule Activities ({active.schedule.length})
              </strong>

              <button
                className="btn btn-sm"
                onClick={() =>
                  setManageOpen(true)
                }
              >
                <SlidersHorizontal size={14} />
                Edit Schedule / Import CSV
              </button>
            </div>

            {active.schedule.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Trade</th>
                      <th>Planned</th>
                      <th>Actual</th>
                      <th>Plan Date</th>
                      <th>Actual Date</th>
                      <th>Root Cause</th>
                    </tr>
                  </thead>

                  <tbody>
                    {active.schedule.map(
                      (r, index) => (
                        <tr key={r.id || index}>
                          <td>
                            <strong>
                              {r.Activity}
                            </strong>
                          </td>

                          <td>
                            {r.Trade || "—"}
                          </td>

                          <td>
                            {r["Planned Progress"] ?? "—"}%
                          </td>

                          <td>
                            {r["Actual Progress"] ?? "—"}%
                          </td>

                          <td>
                            {r["Planned Completion"] || "—"}
                          </td>

                          <td>
                            {r["Actual Completion"] || "—"}
                          </td>

                          <td>
                            {r["Root Cause"] || "—"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                No schedule saved for this project.
                Click Edit Schedule / Import CSV.
              </Empty>
            )}
          </div>
        </div>
      )}

      {manageOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Manage schedule"
          onClick={() => setManageOpen(false)}
        >
          <div
            className="modal-card schedule-modal-card stack"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-between">
              <div>
                <h3 style={{ margin: 0 }}>
                  Manage Schedule / Import CSV
                </h3>

                <p className="caption">
                  Project:{" "}
                  <strong>{selectedProject}</strong>.
                  Enter real schedule values only.
                </p>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setManageOpen(false)
                }
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-row">
              <button
                className="btn btn-sm"
                onClick={() =>
                  setRows(prev => [
                    ...prev,
                    blank()
                  ])
                }
              >
                <Plus size={14} />
                Add activity
              </button>

              <label
                className="btn btn-sm"
                style={{ cursor: "pointer" }}
              >
                <Upload size={14} />
                Import CSV

                <input
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={e => {
                    importCsv(e.target.files?.[0])
                    e.target.value = ""
                  }}
                />
              </label>

              <button
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={saveSchedule}
              >
                <Save size={14} />
                {busy
                  ? "Saving…"
                  : "Save schedule"}
              </button>
            </div>

            {message && (
              <div className="alert alert-info">
                {message}
              </div>
            )}

            <div
              className="table-wrap"
              style={{
                maxHeight: 360,
                overflowY: "auto"
              }}
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Trade</th>
                    <th>Plan %</th>
                    <th>Actual %</th>
                    <th>Plan Date</th>
                    <th>Actual Date</th>
                    <th>Root Cause</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, index) => (
                    <tr key={r.id || index}>
                      <td>
                        <input
                          className="input"
                          value={r.Activity || ""}
                          onChange={e =>
                            setRows(prev =>
                              prev.map(
                                (row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        Activity:
                                          e.target.value
                                      }
                                    : row
                              )
                            )
                          }
                          placeholder="Activity"
                        />
                      </td>

                      <td>
                        <input
                          className="input"
                          value={r.Trade || ""}
                          onChange={e =>
                            setRows(prev =>
                              prev.map(
                                (row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        Trade:
                                          e.target.value
                                      }
                                    : row
                              )
                            )
                          }
                        />
                      </td>

                      {[
                        "Planned Progress",
                        "Actual Progress"
                      ].map(key => (
                        <td key={key}>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            max="100"
                            value={r[key] ?? ""}
                            onChange={e =>
                              setRows(prev =>
                                prev.map(
                                  (row, i) =>
                                    i === index
                                      ? {
                                          ...row,
                                          [key]:
                                            e.target.value
                                        }
                                      : row
                                )
                              )
                            }
                          />
                        </td>
                      ))}

                      {[
                        "Planned Completion",
                        "Actual Completion"
                      ].map(key => (
                        <td key={key}>
                          <input
                            className="input"
                            type="date"
                            value={r[key] || ""}
                            onChange={e =>
                              setRows(prev =>
                                prev.map(
                                  (row, i) =>
                                    i === index
                                      ? {
                                          ...row,
                                          [key]:
                                            e.target.value
                                        }
                                      : row
                                )
                              )
                            }
                          />
                        </td>
                      ))}

                      <td>
                        <input
                          className="input"
                          value={
                            r["Root Cause"] || ""
                          }
                          onChange={e =>
                            setRows(prev =>
                              prev.map(
                                (row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        "Root Cause":
                                          e.target.value
                                      }
                                    : row
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        <button
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() =>
                            setRows(prev =>
                              prev.filter(
                                (_, i) => i !== index
                              )
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}