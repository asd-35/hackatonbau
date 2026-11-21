import React from "react";
import { AlertTriangle, Clock, Eye, FileText, Scale } from "lucide-react";
import { PROGRESS_TREND_DATA, SCHEDULE_ACTIVITIES } from "../data/mockData";
import {
  computePerformanceSummary,
  detectDelays,
  generateDeviationAlerts,
  varianceIndicator,
} from "../utils/documentUtils";

function TrendLineChart({ data }) {
  const width = 520;
  const height = 210;
  const pad = { top: 20, right: 24, bottom: 32, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xPos = (i) => pad.left + (i / (data.length - 1)) * plotW;
  const yPos = (val) => pad.top + plotH - (val / 100) * plotH;

  const plannedPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(d.Planned)}`)
    .join(" ");
  const actualPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(d.Actual)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              y1={yPos(tick)}
              x2={width - pad.right}
              y2={yPos(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={pad.left - 8} y={yPos(tick) + 4} textAnchor="end" fontSize="10" fill="#64748b">
              {tick}%
            </text>
          </g>
        ))}

        {data.map((d, i) => (
          <text
            key={d.Week}
            x={xPos(i)}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            {d.Week}
          </text>
        ))}

        <path d={plannedPath} fill="none" stroke="#0f172a" strokeWidth="2.5" />
        <path d={actualPath} fill="none" stroke="#f97316" strokeWidth="2.5" />

        {data.map((d, i) => (
          <g key={`pts-${d.Week}`}>
            <circle cx={xPos(i)} cy={yPos(d.Planned)} r="4" fill="#0f172a">
              <title>{`${d.Week} Planned: ${d.Planned}%`}</title>
            </circle>
            <circle cx={xPos(i)} cy={yPos(d.Actual)} r="4" fill="#f97316">
              <title>{`${d.Week} Actual: ${d.Actual}%`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="flex-row" style={{ justifyContent: "center", fontSize: "0.78rem", color: "#475569" }}>
        <span>
          <strong style={{ color: "#0f172a" }}>●</strong> Planned
        </span>
        <span>
          <strong style={{ color: "#f97316" }}>●</strong> Actual
        </span>
      </div>
    </div>
  );
}

export default function PerformanceMonitoringTab({
  project,
  onCreateDelayNotice,
  onGenerateReport,
  onReviewEvidence,
}) {
  const summary = computePerformanceSummary(SCHEDULE_ACTIVITIES);
  const delays = detectDelays(SCHEDULE_ACTIVITIES);
  const alerts = generateDeviationAlerts(SCHEDULE_ACTIVITIES);

  return (
    <div className="stack">
      {/* PM-02: Progress Dashboard */}
      <div>
        <div className="flex-row">
          <h2 className="section-title">Progress Dashboard</h2>
          <span className={`badge badge-${summary.health_color}`}>
            Project Health Score: {summary.health_score}/100 · {summary.health_label}
          </span>
        </div>
        <p className="caption">
          Live execution KPIs and baseline comparison for <strong>{project}</strong>.
        </p>
      </div>

      <div className="grid-5">
        <div className="metric-box">
          <div className="metric-label">Project Completion</div>
          <div className="metric-value">{summary.completion_pct}%</div>
          <div className={`metric-delta ${summary.variance_pct < 0 ? "neg" : "pos"}`}>
            {summary.variance_pct}% vs plan
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Planned Progress</div>
          <div className="metric-value">{summary.planned_pct}%</div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Actual Progress</div>
          <div className="metric-value">{summary.actual_pct}%</div>
          <div className={`metric-delta ${summary.variance_pct < 0 ? "neg" : "pos"}`}>
            {summary.variance_pct}%
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Activities On Track</div>
          <div className="metric-value">{summary.on_track}</div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Activities Delayed</div>
          <div className="metric-value" style={{ color: "#dc2626" }}>
            {summary.delayed}
          </div>
        </div>
      </div>

      <div className="grid-perf">
        <div className="card stack">
          <strong>Execution Progress Bars</strong>
          <div className="progress-wrap">
            <div className="progress-label">Planned baseline · {summary.planned_pct}%</div>
            <div className="progress-track">
              <div className="progress-fill navy" style={{ width: `${summary.planned_pct}%` }} />
            </div>
          </div>
          <div className="progress-wrap">
            <div className="progress-label">Actual completion · {summary.actual_pct}%</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${summary.actual_pct}%` }} />
            </div>
          </div>
          <div className="progress-wrap">
            <div className="progress-label">Health score · {summary.health_score} / 100</div>
            <div className="progress-track">
              <div className="progress-fill green" style={{ width: `${summary.health_score}%` }} />
            </div>
          </div>
          <div className="caption">
            Average crew productivity: <strong>{summary.avg_productivity}%</strong> (target 95%) ·{" "}
            <strong>{alerts.length}</strong> active deviation alert{alerts.length === 1 ? "" : "s"}.
          </div>
        </div>

        <div className="card stack-sm">
          <strong>Planned vs Actual Progress Trend (%)</strong>
          <TrendLineChart data={PROGRESS_TREND_DATA} />
        </div>
      </div>

      {/* PM-01: Planned vs Actual Comparison */}
      <div style={{ marginTop: 8 }}>
        <h2 className="section-title">Planned vs Actual Comparison</h2>
        <p className="caption">
          Activity-level schedule variance with automated red / yellow / green status indicators.
        </p>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Trade</th>
              <th style={{ width: 140 }}>Planned</th>
              <th style={{ width: 140 }}>Actual</th>
              <th>Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {SCHEDULE_ACTIVITIES.map((item) => {
              const variance = item["Actual Progress"] - item["Planned Progress"];
              const indicator = varianceIndicator(variance);
              return (
                <tr key={item.Activity}>
                  <td>
                    <strong>{item.Activity}</strong>
                  </td>
                  <td>{item.Trade}</td>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div
                          className="progress-fill navy"
                          style={{ width: `${item["Planned Progress"]}%` }}
                        />
                      </div>
                      <span className="caption" style={{ margin: 0 }}>
                        {item["Planned Progress"]}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${item["Actual Progress"]}%` }}
                        />
                      </div>
                      <span className="caption" style={{ margin: 0 }}>
                        {item["Actual Progress"]}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>{variance >= 0 ? `+${variance}%` : `${variance}%`}</strong>
                  </td>
                  <td>
                    <span className={`badge badge-${indicator.color}`}>{indicator.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PM-04: Delay Detection */}
      <div style={{ marginTop: 8 }}>
        <div className="flex-row">
          <h2 className="section-title">Delay Detection</h2>
          <span className="badge badge-red">
            <Clock size={12} /> {delays.length} schedule delays detected
          </span>
        </div>
        <p className="caption">
          Detected completion slips from schedule baseline with one-click Delay Notice generation.
        </p>
      </div>

      <div className="stack">
        {delays.map((delay) => (
          <div key={delay.activity} className="card stack-sm">
            <div className="flex-between">
              <div className="flex-row">
                <strong>{delay.activity}</strong>
                <span className="caption" style={{ margin: 0 }}>
                  · {delay.trade}
                </span>
                <span className={`badge badge-${delay.color}`}>Severity: {delay.severity}</span>
                <span className={`badge badge-${delay.color}`}>Delay: +{delay.delay_days} days</span>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  onCreateDelayNotice(delay.activity, delay.root_cause, delay.delay_days)
                }
              >
                <Scale size={14} /> Create Delay Notice
              </button>
            </div>
            <div className="grid-3">
              <div className="caption">
                <strong>Planned completion:</strong> {delay.planned_completion}
              </div>
              <div className="caption">
                <strong>Actual / Forecast:</strong> {delay.actual_completion}
              </div>
              <div className="caption">
                <strong>Related document:</strong> <code>{delay.related_document}</code>
              </div>
            </div>
            <div>
              <strong>Impact assessment:</strong> {delay.impact}
            </div>
            <div className="caption">
              <strong>Recommended action:</strong> {delay.recommended_action}
            </div>
          </div>
        ))}
      </div>

      {/* PM-05: Deviation Alert Engine */}
      <div style={{ marginTop: 8 }}>
        <div className="flex-row">
          <h2 className="section-title">Deviation Alert Engine</h2>
          <span className="badge badge-orange">
            <AlertTriangle size={12} /> {alerts.length} active alerts
          </span>
        </div>
        <p className="caption">
          Automatic threshold monitoring: Progress variance &gt; 10% · Schedule variance &gt; 5 days ·
          Productivity below target.
        </p>
      </div>

      <div className="stack">
        {alerts.map((alert) => (
          <div key={alert.id} className="card stack-sm">
            <div className="flex-row">
              <strong>
                {alert.id} · {alert.activity}
              </strong>
              <span className={`badge badge-${alert.color}`}>{alert.level}</span>
            </div>
            <div className="caption" style={{ margin: 0 }}>
              Triggered thresholds: {alert.triggers.join(" · ")}
            </div>
            <div>
              <strong>Root cause:</strong> {alert.root_cause}
            </div>
            <div>
              <strong>Suggested action:</strong> {alert.suggested_action}
            </div>
            <div className="caption" style={{ margin: 0 }}>
              Related documents:{" "}
              {alert.related_documents.map((d, idx) => (
                <React.Fragment key={d}>
                  {idx > 0 && ", "}
                  <code>{d}</code>
                </React.Fragment>
              ))}
            </div>
            <div className="flex-row" style={{ marginTop: 4 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  onCreateDelayNotice(
                    alert.activity,
                    alert.root_cause,
                    Math.max(alert.delay_days, 1)
                  )
                }
              >
                <Scale size={14} /> Create Notice
              </button>
              <button className="btn btn-sm" onClick={onGenerateReport}>
                <FileText size={14} /> Generate Report
              </button>
              <button className="btn btn-sm" onClick={onReviewEvidence}>
                <Eye size={14} /> Review Evidence
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
