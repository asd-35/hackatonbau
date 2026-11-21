import React, { useState } from "react";
import { Mic } from "lucide-react";
import { PROJECTS } from "../data/mockData";

export default function Sidebar({
  project,
  onProjectChange,
  tabs,
  activeTab,
  onTabChange,
  onQuickDictate,
  isRecording,
}) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {!logoFailed ? (
          <div className="brand-blended">
            <img
              src="/assets/logo.png"
              alt="BauDackel"
              onError={() => setLogoFailed(true)}
            />
          </div>
        ) : (
          <div className="brand-fallback">
            <span className="brand-mark">▰</span> BauDackel
          </div>
        )}
        <div className="brand-tagline">Your site, in one workspace.</div>
      </div>

      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`sidebar-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="btn btn-primary btn-block sidebar-dictate-btn"
        onClick={onQuickDictate}
      >
        <Mic size={15} /> {isRecording ? "Stop recording" : "Quick Dictate"}
      </button>

      <div className="sidebar-card">
        <select
          aria-label="Active project"
          className="sidebar-select"
          value={project}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          {PROJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <div className="caption" style={{padding:"8px 0"}}>Live progress is available in Performance Monitoring once you enter a real schedule.</div>
        {/* Demo figures removed until a project schedule is configured. */}
        {/* <div className="progress-wrap">
          <div className="progress-label">Progress · 62%</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: "62%" }} />
          </div>
        </div>

        <div className="sidebar-metrics">
          <div>
            <div className="sidebar-metric-label">Open issues</div>
            <div className="sidebar-metric-value">3</div>
          </div>
          <div>
            <div className="sidebar-metric-label">Delay risks</div>
            <div className="sidebar-metric-value">2</div>
          </div>
        </div> */}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-name">👤 Site Team</div>
        <div className="sidebar-user-role">Local Workspace</div>
      </div>
    </aside>
  );
}
