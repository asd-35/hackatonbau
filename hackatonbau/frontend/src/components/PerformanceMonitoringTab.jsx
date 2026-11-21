import React, { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  Plus,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  X,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import { api, projectQuery } from "../api/client"
import { varianceIndicator } from "../utils/documentUtils"

const PORTFOLIO_PROJECTS = [
  {
    name: "Office Tower Munich",
    shortName: "Office Tower Munich",
    manager: "J. Smith",
    valueM: 18.0,
    planned: 71,
    actual: 62,
    budgetVar: 3.1,
    scheduleDays: -9,
    vobRisk: 24500,
    safetyOpen: 2,
    status: "Critical",
  },
  {
    name: "Clinic Expansion Augsburg",
    shortName: "Clinic Augsburg",
    manager: "M. Weber",
    valueM: 14.5,
    planned: 55,
    actual: 51,
    budgetVar: 1.4,
    scheduleDays: -3,
    vobRisk: 12000,
    safetyOpen: 1,
    status: "At Risk",
  },
  {
    name: "Logistics Hub Ingolstadt",
    shortName: "Logistics Ingolstadt",
    manager: "L. Bauer",
    valueM: 9.2,
    planned: 80,
    actual: 82,
    budgetVar: -0.8,
    scheduleDays: 2,
    vobRisk: 0,
    safetyOpen: 0,
    status: "On Track",
  },
  {
    name: "School Campus Rosenheim",
    shortName: "School Rosenheim",
    manager: "K. Huber",
    valueM: 6.8,
    planned: 40,
    actual: 41,
    budgetVar: 0.2,
    scheduleDays: 0,
    vobRisk: 3200,
    safetyOpen: 1,
    status: "On Track",
  },
]

const DELAY_ROOT_CAUSES = [
  { name: "Supplier / Concrete", value: 42, color: "#dc2626" },
  { name: "Subcontractor Shortage", value: 26, color: "#f97316" },
  { name: "Weather", value: 18, color: "#3b82f6" },
  { name: "Safety / Approvals", value: 14, color: "#0f172a" },
]

const DEFAULT_PROJECT_SCHEDULES = {
  "Office Tower Munich": [
    {
      id: "otm-1",
      Activity: "Core Concrete Pour L5–L6",
      Trade: "Structural",
      "Planned Progress": 85,
      "Actual Progress": 72,
      "Planned Completion": "2026-11-18",
      "Actual Completion": "2026-11-27",
      "Root Cause": "Supplier / Concrete batching delay",
    },
    {
      id: "otm-2",
      Activity: "Curtain Wall Facade East",
      Trade: "Facade",
      "Planned Progress": 68,
      "Actual Progress": 58,
      "Planned Completion": "2026-12-05",
      "Actual Completion": "2026-12-14",
      "Root Cause": "Subcontractor crew shortage",
    },
    {
      id: "otm-3",
      Activity: "MEP Riser Rough-In",
      Trade: "MEP",
      "Planned Progress": 60,
      "Actual Progress": 56,
      "Planned Completion": "2026-12-12",
      "Actual Completion": "2026-12-15",
      "Root Cause": "Safety / Guardrail rectification hold",
    },
  ],
  "Clinic Expansion Augsburg": [
    {
      id: "cea-1",
      Activity: "Operating Wing Steel Framing",
      Trade: "Structural",
      "Planned Progress": 65,
      "Actual Progress": 60,
      "Planned Completion": "2026-11-28",
      "Actual Completion": "2026-12-01",
      "Root Cause": "Supplier / Steel delivery slot shift",
    },
    {
      id: "cea-2",
      Activity: "Cleanroom HVAC Ductwork",
      Trade: "HVAC",
      "Planned Progress": 45,
      "Actual Progress": 42,
      "Planned Completion": "2026-12-18",
      "Actual Completion": "2026-12-21",
      "Root Cause": "Approvals / Hygiene sign-off pending",
    },
  ],
  "Logistics Hub Ingolstadt": [
    {
      id: "lhi-1",
      Activity: "Industrial Slab & Joint Sealing",
      Trade: "Concrete",
      "Planned Progress": 84,
      "Actual Progress": 86,
      "Planned Completion": "2026-11-25",
      "Actual Completion": "2026-11-23",
      "Root Cause": "",
    },
    {
      id: "lhi-2",
      Activity: "Loading Dock Levelers",
      Trade: "Equipment",
      "Planned Progress": 76,
      "Actual Progress": 78,
      "Planned Completion": "2026-12-04",
      "Actual Completion": "2026-12-02",
      "Root Cause": "",
    },
  ],
  "School Campus Rosenheim": [
    {
      id: "scr-1",
      Activity: "Timber Roof Trusses Building A",
      Trade: "Carpentry",
      "Planned Progress": 44,
      "Actual Progress": 46,
      "Planned Completion": "2026-12-10",
      "Actual Completion": "2026-12-10",
      "Root Cause": "",
    },
    {
      id: "scr-2",
      Activity: "Site Drainage & Utilities",
      Trade: "Civil",
      "Planned Progress": 36,
      "Actual Progress": 36,
      "Planned Completion": "2026-12-16",
      "Actual Completion": "2026-12-16",
      "Root Cause": "Weather / Heavy rainfall pause",
    },
  ],
}

const STATUS_META = {
  Critical: { badge: "badge-red", color: "#dc2626" },
  "At Risk": { badge: "badge-orange", color: "#f97316" },
  "On Track": { badge: "badge-green", color: "#16a34a" },
}

const blank = () => ({
  id: crypto.randomUUID(),
  Activity: "",
  Trade: "",
  "Planned Progress": 0,
  "Actual Progress": 0,
  "Planned Completion": "",
  "Actual Completion": "",
  "Root Cause": "",
})

const clampPct = v => Math.min(100, Math.max(0, Number(v) || 0))

const formatEur = amount =>
  `€${Number(amount || 0).toLocaleString("en-US")}`

const formatSignedPct = val =>
  `${val > 0 ? "+" : ""}${val.toFixed(1)}%`

const formatSignedDays = days => {
  if (days === 0) return "0 days"
  return `${days > 0 ? "+" : ""}${days} days`
}

function RiskMatrixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        background: "#0f172a",
        color: "#ffffff",
        padding: "8px 11px",
        borderRadius: 8,
        fontSize: "0.78rem",
        boxShadow: "0 8px 20px rgba(15,23,42,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
      <div>Value: €{d.valueM.toFixed(1)}M</div>
      <div>Schedule: {formatSignedDays(d.scheduleDays)}</div>
      <div>Budget Var.: {formatSignedPct(d.budgetVar)}</div>
      <div>Status: {d.status}</div>
    </div>
  )
}

export default function PerformanceMonitoringTab({ project }) {
  const [viewMode, setViewMode] = useState("portfolio")
  const [selectedProject, setSelectedProject] = useState(
    PORTFOLIO_PROJECTS.some(p => p.name === project) ? project : PORTFOLIO_PROJECTS[0].name
  )
  const [manageOpen, setManageOpen] = useState(false)

  // Schedule persistence state (backed by /api/schedule per selectedProject)
  const [rows, setRows] = useState([])
  const [hasSavedSchedule, setHasSavedSchedule] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (PORTFOLIO_PROJECTS.some(p => p.name === project)) {
      setSelectedProject(project)
    }
  }, [project])

  useEffect(() => {
    let alive = true
    setMessage("")
    api(`/api/schedule${projectQuery(selectedProject)}`)
      .then(v => {
        if (!alive) return
        const items = v.items || []
        if (items.length > 0) {
          setRows(items)
          setHasSavedSchedule(true)
        } else {
          setRows(DEFAULT_PROJECT_SCHEDULES[selectedProject] || [])
          setHasSavedSchedule(false)
        }
      })
      .catch(() => {
        if (!alive) return
        setRows(DEFAULT_PROJECT_SCHEDULES[selectedProject] || [])
        setHasSavedSchedule(false)
      })
    return () => {
      alive = false
    }
  }, [selectedProject])

  const updateRow = (idx, field, value) =>
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))

  const saveSchedule = async () => {
    setBusy(true)
    try {
      const res = await api("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: selectedProject, items: rows }),
      })
      setRows(res.items || rows)
      setHasSavedSchedule(true)
      setMessage(`Saved schedule for ${selectedProject}.`)
    } catch (e) {
      setMessage(`Save failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const importCsv = async file => {
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split(/\r?\n/)
    const splitCsv = line =>
      line
        .match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)
        ?.map(x => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) || []
    const headers = splitCsv(lines[0]).map(v => v.trim().toLowerCase().replace(/\s+/g, "_"))
    const loaded = lines
      .slice(1)
      .filter(Boolean)
      .map(line => {
        const cells = splitCsv(line)
        const get = (...keys) => {
          let i = -1
          for (const k of keys) {
            i = headers.indexOf(k)
            if (i >= 0) break
          }
          return i < 0 ? "" : cells[i] || ""
        }
        return {
          id: crypto.randomUUID(),
          Activity: get("activity", "task"),
          Trade: get("trade"),
          "Planned Progress": clampPct(get("planned_progress", "planned")),
          "Actual Progress": clampPct(get("actual_progress", "actual")),
          "Planned Completion": get("planned_completion", "planned_date"),
          "Actual Completion": get("actual_completion", "actual_date"),
          "Root Cause": get("root_cause", "reason"),
        }
      })
      .filter(r => r.Activity)

    if (!loaded.length) {
      setMessage("CSV needs an Activity column and progress values.")
      return
    }
    setRows(loaded)
    setMessage(`Imported ${loaded.length} rows for ${selectedProject}. Click Save schedule to persist.`)
  }

  // Portfolio-level KPI calculations
  const portfolioKpis = useMemo(() => {
    const totalValueM = PORTFOLIO_PROJECTS.reduce((acc, p) => acc + p.valueM, 0)
    const weightedBudgetVar =
      PORTFOLIO_PROJECTS.reduce((acc, p) => acc + p.valueM * p.budgetVar, 0) / totalValueM
    const cpi = 1 / (1 + weightedBudgetVar / 100)

    const onTrackCount = PORTFOLIO_PROJECTS.filter(p => p.status === "On Track").length
    const atRiskCount = PORTFOLIO_PROJECTS.filter(p => p.status === "At Risk").length
    const criticalCount = PORTFOLIO_PROJECTS.filter(p => p.status === "Critical").length

    const totalPlanned = PORTFOLIO_PROJECTS.reduce((acc, p) => acc + p.planned * p.valueM, 0)
    const totalActual = PORTFOLIO_PROJECTS.reduce((acc, p) => acc + p.actual * p.valueM, 0)
    const spi = totalPlanned > 0 ? totalActual / totalPlanned : 1

    const totalVobRisk = PORTFOLIO_PROJECTS.reduce((acc, p) => acc + p.vobRisk, 0)
    const totalSafetyOpen = PORTFOLIO_PROJECTS.reduce((acc, p) => acc + p.safetyOpen, 0)

    return {
      totalValueM,
      weightedBudgetVar,
      cpi,
      onTrackCount,
      atRiskCount,
      criticalCount,
      spi,
      totalVobRisk,
      totalSafetyOpen,
    }
  }, [])

  const activeProjectMeta = useMemo(
    () => PORTFOLIO_PROJECTS.find(p => p.name === selectedProject) || PORTFOLIO_PROJECTS[0],
    [selectedProject]
  )

  const projectSummary = useMemo(() => {
    if (!rows.length) {
      return {
        planned: activeProjectMeta.planned,
        actual: activeProjectMeta.actual,
        variance: activeProjectMeta.actual - activeProjectMeta.planned,
      }
    }
    const planned = Math.round(
      rows.reduce((n, r) => n + clampPct(r["Planned Progress"]), 0) / rows.length
    )
    const actual = Math.round(
      rows.reduce((n, r) => n + clampPct(r["Actual Progress"]), 0) / rows.length
    )
    return { planned, actual, variance: actual - planned }
  }, [rows, activeProjectMeta])

  const handleSelectProjectRow = projectName => {
    setSelectedProject(projectName)
    setViewMode("project")
  }

  return (
    <div className="stack">
      {/* Executive Header */}
      <div className="exec-header">
        <div>
          <div className="flex-row">
            <h2 className="section-title">Executive Portfolio Dashboard</h2>
            <span className="live-sync-badge">
              <span className="live-sync-dot" />
              Portfolio Live Sync
            </span>
          </div>
          <p className="caption">
            {viewMode === "portfolio"
              ? "Cross-site cost, schedule, VOB/B claim exposure, and safety overview across 4 active Bavarian sites."
              : `Single-project performance & schedule breakdown for ${selectedProject} (Site Manager: ${activeProjectMeta.manager}).`}
          </p>
        </div>

        <div className="exec-header-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setManageOpen(true)}
          >
            <SlidersHorizontal size={14} />
            Manage Schedule / Import CSV
          </button>
        </div>
      </div>

      {/* Segmented View Toggle */}
      <div className="exec-view-bar">
        <div className="exec-segmented" role="tablist" aria-label="Performance view mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "portfolio"}
            className={`exec-seg-btn ${viewMode === "portfolio" ? "active" : ""}`}
            onClick={() => setViewMode("portfolio")}
          >
            All Projects
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "project"}
            className={`exec-seg-btn ${viewMode === "project" ? "active" : ""}`}
            onClick={() => setViewMode("project")}
          >
            {selectedProject}
          </button>
        </div>

        {viewMode === "project" && (
          <div className="flex-row">
            <span className={`badge ${STATUS_META[activeProjectMeta.status].badge}`}>
              {activeProjectMeta.status}
            </span>
            <span className="caption" style={{ margin: 0 }}>
              {hasSavedSchedule ? "Custom saved schedule" : "Preloaded baseline schedule"}
            </span>
          </div>
        )}
      </div>

      {viewMode === "portfolio" ? (
        <>
          {/* PART 2: TOP KPI STRIP (4 C-LEVEL METRICS) */}
          <div className="exec-kpi-grid">
            <div className="exec-kpi-card">
              <div className="exec-kpi-top">
                <span className="exec-kpi-label">Active Portfolio Value</span>
                <Building2 size={15} color="#64748b" />
              </div>
              <div className="exec-kpi-value">
                €{portfolioKpis.totalValueM.toFixed(1)}M
              </div>
              <div className="exec-kpi-sub warn">
                {formatSignedPct(portfolioKpis.weightedBudgetVar)} Cost Risk · CPI{" "}
                {portfolioKpis.cpi.toFixed(2)}
              </div>
            </div>

            <div className="exec-kpi-card">
              <div className="exec-kpi-top">
                <span className="exec-kpi-label">Portfolio Schedule Health</span>
                <CalendarClock size={15} color="#64748b" />
              </div>
              <div className="exec-kpi-value">SPI {portfolioKpis.spi.toFixed(2)}</div>
              <div className="exec-kpi-sub">
                {portfolioKpis.onTrackCount} On Track · {portfolioKpis.atRiskCount} At Risk ·{" "}
                {portfolioKpis.criticalCount} Critical
              </div>
            </div>

            <div className="exec-kpi-card">
              <div className="exec-kpi-top">
                <span className="exec-kpi-label">VOB/B Claim &amp; Delay Exposure</span>
                <TrendingUp size={15} color="#dc2626" />
              </div>
              <div className="exec-kpi-value">
                {formatEur(portfolioKpis.totalVobRisk)}
              </div>
              <div className="exec-kpi-sub risk">Pending Claims</div>
            </div>

            <div className="exec-kpi-card">
              <div className="exec-kpi-top">
                <span className="exec-kpi-label">Safety &amp; Critical Defects</span>
                <ShieldAlert size={15} color="#f97316" />
              </div>
              <div className="exec-kpi-value">
                {portfolioKpis.totalSafetyOpen} Critical Open
              </div>
              <div className="exec-kpi-sub warn">SiGeKo &amp; Quality Defects</div>
            </div>
          </div>

          {/* PART 3: MACRO COMPARISON CHARTS (3 VISUALS) */}
          <div className="exec-charts-grid">
            {/* Chart 1: Planned vs Actual Progress (Horizontal Bar / Soll-Ist) */}
            <div className="exec-chart-card">
              <div>
                <h3 className="exec-chart-title">Planned vs. Actual Progress (Soll-Ist)</h3>
                <p className="exec-chart-sub">Completion (%) by site</p>
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={PORTFOLIO_PROJECTS}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                    barGap={3}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      width={112}
                      tick={{ fontSize: 11, fill: "#334155" }}
                    />
                    <Tooltip formatter={value => `${value}%`} />
                    <Bar dataKey="planned" name="Planned" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} />
                    <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]} barSize={10}>
                      {PORTFOLIO_PROJECTS.map(entry => (
                        <Cell
                          key={entry.name}
                          fill={entry.actual >= entry.planned ? "#16a34a" : "#f97316"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="exec-chart-legend">
                <span className="exec-legend-item">
                  <span className="exec-legend-dot" style={{ background: "#cbd5e1" }} />
                  Planned
                </span>
                <span className="exec-legend-item">
                  <span className="exec-legend-dot" style={{ background: "#f97316" }} />
                  Actual (Behind)
                </span>
                <span className="exec-legend-item">
                  <span className="exec-legend-dot" style={{ background: "#16a34a" }} />
                  Actual (On/Ahead)
                </span>
              </div>
            </div>

            {/* Chart 2: Project Risk Matrix (Scatter / Bubble Chart) */}
            <div className="exec-chart-card">
              <div>
                <h3 className="exec-chart-title">Project Risk Matrix</h3>
                <p className="exec-chart-sub">Schedule (days) vs. Budget Var. (%) · Size = €M</p>
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 16, left: -8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="scheduleDays"
                      name="Schedule Variance"
                      domain={[-12, 6]}
                      unit="d"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="budgetVar"
                      name="Budget Variance"
                      domain={[-2, 4]}
                      unit="%"
                      tick={{ fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="valueM" range={[160, 620]} name="Value (€M)" />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Tooltip content={<RiskMatrixTooltip />} />
                    <Scatter data={PORTFOLIO_PROJECTS} name="Projects">
                      {PORTFOLIO_PROJECTS.map(entry => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_META[entry.status].color}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="exec-chart-legend">
                <span className="exec-legend-item">
                  <span className="exec-legend-dot" style={{ background: "#dc2626" }} />
                  Critical
                </span>
                <span className="exec-legend-item">
                  <span className="exec-legend-dot" style={{ background: "#f97316" }} />
                  At Risk
                </span>
                <span className="exec-legend-item">
                  <span className="exec-legend-dot" style={{ background: "#16a34a" }} />
                  On Track
                </span>
              </div>
            </div>

            {/* Chart 3: Cross-Site Delay Root Causes (Donut Chart) */}
            <div className="exec-chart-card">
              <div>
                <h3 className="exec-chart-title">Cross-Site Delay Root Causes</h3>
                <p className="exec-chart-sub">Share of documented schedule delays</p>
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DELAY_ROOT_CAUSES}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {DELAY_ROOT_CAUSES.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="exec-chart-legend">
                {DELAY_ROOT_CAUSES.map(item => (
                  <span key={item.name} className="exec-legend-item">
                    <span className="exec-legend-dot" style={{ background: item.color }} />
                    {item.name} ({item.value}%)
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PART 4: EXECUTIVE PORTFOLIO COMPARISON TABLE (SCORECARD) */}
          <div className="card stack-sm">
            <div className="flex-between">
              <div className="flex-row">
                <BarChart3 size={16} color="#0f172a" />
                <strong style={{ fontSize: "0.95rem" }}>
                  Executive Portfolio Scorecard
                </strong>
              </div>
              <span className="caption" style={{ margin: 0 }}>
                Click any project row to inspect its schedule detail
              </span>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project &amp; Site Manager</th>
                    <th>Value</th>
                    <th>Progress (Plan / Act.)</th>
                    <th>Budget Var.</th>
                    <th>Schedule</th>
                    <th>VOB/B Risk</th>
                    <th>Safety</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PORTFOLIO_PROJECTS.map(p => (
                    <tr
                      key={p.name}
                      className="scorecard-row"
                      onClick={() => handleSelectProjectRow(p.name)}
                    >
                      <td>
                        <div className="scorecard-project-name">{p.name}</div>
                        <div className="scorecard-manager">{p.manager}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>€{p.valueM.toFixed(1)}M</td>
                      <td>
                        <span style={{ color: "#64748b" }}>{p.planned}%</span>
                        {" / "}
                        <strong
                          style={{
                            color: p.actual < p.planned ? "#c2410c" : "#166534",
                          }}
                        >
                          {p.actual}%
                        </strong>
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          color:
                            p.budgetVar > 2
                              ? "#dc2626"
                              : p.budgetVar > 0.5
                                ? "#c2410c"
                                : "#166534",
                        }}
                      >
                        {formatSignedPct(p.budgetVar)}
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          color:
                            p.scheduleDays <= -5
                              ? "#dc2626"
                              : p.scheduleDays < 0
                                ? "#c2410c"
                                : "#166534",
                        }}
                      >
                        {formatSignedDays(p.scheduleDays)}
                      </td>
                      <td style={{ fontWeight: p.vobRisk > 0 ? 600 : 400 }}>
                        {formatEur(p.vobRisk)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            p.safetyOpen >= 2
                              ? "badge-red"
                              : p.safetyOpen === 1
                                ? "badge-orange"
                                : "badge-green"
                          }`}
                        >
                          {p.safetyOpen} Open
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_META[p.status].badge}`}>
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
        /* SINGLE-PROJECT DETAIL / SCHEDULE VIEW */
        <div className="stack">
          <div className="exec-kpi-grid">
            <div className="exec-kpi-card">
              <div className="exec-kpi-label">Contract Value</div>
              <div className="exec-kpi-value">
                €{activeProjectMeta.valueM.toFixed(1)}M
              </div>
              <div className="exec-kpi-sub">
                Budget Var.: {formatSignedPct(activeProjectMeta.budgetVar)}
              </div>
            </div>

            <div className="exec-kpi-card">
              <div className="exec-kpi-label">Planned vs. Actual</div>
              <div className="exec-kpi-value">
                {projectSummary.planned}% / {projectSummary.actual}%
              </div>
              <div
                className={`exec-kpi-sub ${
                  projectSummary.variance < -5
                    ? "risk"
                    : projectSummary.variance < 0
                      ? "warn"
                      : "good"
                }`}
              >
                Variance: {projectSummary.variance > 0 ? "+" : ""}
                {projectSummary.variance}% · {formatSignedDays(activeProjectMeta.scheduleDays)}
              </div>
            </div>

            <div className="exec-kpi-card">
              <div className="exec-kpi-label">VOB/B Claim Exposure</div>
              <div className="exec-kpi-value">
                {formatEur(activeProjectMeta.vobRisk)}
              </div>
              <div className="exec-kpi-sub">Documented site claims</div>
            </div>

            <div className="exec-kpi-card">
              <div className="exec-kpi-label">Safety &amp; Critical Defects</div>
              <div className="exec-kpi-value">
                {activeProjectMeta.safetyOpen} Open
              </div>
              <div className="exec-kpi-sub">Site Manager: {activeProjectMeta.manager}</div>
            </div>
          </div>

          <div className="card stack-sm">
            <strong>Planned vs. Actual Completion — {selectedProject}</strong>
            <div className="progress-wrap">
              <div className="progress-label">Planned · {projectSummary.planned}%</div>
              <div className="progress-track">
                <div
                  className="progress-fill navy"
                  style={{ width: `${projectSummary.planned}%` }}
                />
              </div>
            </div>
            <div className="progress-wrap">
              <div className="progress-label">Actual · {projectSummary.actual}%</div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${
                    projectSummary.actual >= projectSummary.planned ? "green" : ""
                  }`}
                  style={{ width: `${projectSummary.actual}%` }}
                />
              </div>
            </div>
          </div>

          <div className="card stack-sm">
            <div className="flex-between">
              <strong style={{ fontSize: "0.95rem" }}>
                Project Schedule Activities ({rows.length})
              </strong>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setManageOpen(true)}
              >
                <SlidersHorizontal size={13} />
                Edit Schedule / Import CSV
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Trade</th>
                    <th>Plan %</th>
                    <th>Actual %</th>
                    <th>Plan Completion</th>
                    <th>Actual Completion</th>
                    <th>Variance</th>
                    <th>Root Cause</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const delta = clampPct(r["Actual Progress"]) - clampPct(r["Planned Progress"])
                    const ind = varianceIndicator(delta)
                    return (
                      <tr key={r.id || i}>
                        <td style={{ fontWeight: 600 }}>{r.Activity || "Untitled activity"}</td>
                        <td>{r.Trade || "—"}</td>
                        <td>{clampPct(r["Planned Progress"])}%</td>
                        <td style={{ fontWeight: 600 }}>{clampPct(r["Actual Progress"])}%</td>
                        <td>{r["Planned Completion"] || "—"}</td>
                        <td>{r["Actual Completion"] || "—"}</td>
                        <td>
                          <span className={`badge badge-${ind.color}`}>
                            {delta > 0 ? "+" : ""}
                            {delta}%
                          </span>
                        </td>
                        <td style={{ color: "#475569" }}>
                          {r["Root Cause"] ? (
                            <span className="flex-row" style={{ gap: 5 }}>
                              {delta < -5 && <AlertTriangle size={13} color="#dc2626" />}
                              {r["Root Cause"]}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RELOCATED SCHEDULE MANAGEMENT / CSV IMPORT MODAL */}
      {manageOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setManageOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Manage Schedule and Import CSV"
        >
          <div
            className="modal-card schedule-modal-card stack"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-between">
              <div>
                <h3 style={{ margin: 0 }}>Manage Schedule / Import CSV</h3>
                <p className="caption" style={{ margin: "2px 0 0" }}>
                  Editing schedule for <strong>{selectedProject}</strong>. CSV columns: Activity,
                  Trade, Planned Progress, Actual Progress, Planned Completion, Actual Completion,
                  Root Cause.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setManageOpen(false)}
                aria-label="Close schedule manager"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-row">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setRows(prev => [...prev, blank()])}
              >
                <Plus size={14} /> Add activity
              </button>
              <label className="btn btn-sm" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Import CSV
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
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={saveSchedule}
              >
                <Save size={14} /> {busy ? "Saving…" : "Save schedule"}
              </button>
            </div>

            {message && <div className="alert alert-info">{message}</div>}

            <div className="table-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Trade</th>
                    <th style={{ width: 82 }}>Plan %</th>
                    <th style={{ width: 82 }}>Actual %</th>
                    <th>Plan Date</th>
                    <th>Actual Date</th>
                    <th>Root Cause</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>
                        <input
                          className="input"
                          value={r.Activity}
                          onChange={e => updateRow(i, "Activity", e.target.value)}
                          placeholder="e.g. Install facade panels"
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={r.Trade || ""}
                          onChange={e => updateRow(i, "Trade", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          value={r["Planned Progress"]}
                          onChange={e => updateRow(i, "Planned Progress", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          value={r["Actual Progress"]}
                          onChange={e => updateRow(i, "Actual Progress", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="date"
                          value={r["Planned Completion"] || ""}
                          onChange={e => updateRow(i, "Planned Completion", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="date"
                          value={r["Actual Completion"] || ""}
                          onChange={e => updateRow(i, "Actual Completion", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          value={r["Root Cause"] || ""}
                          onChange={e => updateRow(i, "Root Cause", e.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => setRows(prev => prev.filter((_, n) => n !== i))}
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
