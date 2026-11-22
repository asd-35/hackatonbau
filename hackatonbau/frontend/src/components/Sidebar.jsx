import React, { useMemo, useState } from "react"
import { FolderPlus } from "lucide-react"

export default function Sidebar({
  project,
  projects = [],
  projectsLoading = false,
  onProjectChange,
  onCreateProject,
  tabs,
  activeTab,
  onTabChange
}) {
  const [mascotFailed, setMascotFailed] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newProject, setNewProject] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const currentProject = useMemo(
    () => projects.find(item =>
      (typeof item === "string" ? item : item.name) === project
    ),
    [projects, project]
  )

  const options = projects
    .map(item => typeof item === "string" ? item : item.name)
    .filter(Boolean)

  if (project && !options.includes(project)) options.unshift(project)

  const count = typeof currentProject === "object"
    ? currentProject?.total_files
    : null

  const scheduleCount = typeof currentProject === "object"
    ? currentProject?.schedule_entries
    : null

  const create = async event => {
    event.preventDefault()

    const name = newProject.trim()

    if (name.length < 3) {
      setCreateError("Enter at least 3 characters")
      return
    }

    setCreating(true)
    setCreateError("")

    try {
      const created = await onCreateProject(name)

      if (created) {
        setNewProject("")
        setShowCreate(false)
      }
    } catch (error) {
      setCreateError(error.message || "Could not create project")
    } finally {
      setCreating(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-lockup">
          {!mascotFailed && (
            <img
              src="/assets/logo2.png"
              alt="BauDackel mascot"
              className="brand-mascot"
              onError={() => setMascotFailed(true)}
            />
          )}

          <div className="brand-wordmark">
            <span className="brand-word-bau">Bau</span>
            <span className="brand-word-dackel">Dackel</span>
          </div>
        </div>

        <div className="brand-tagline">
          Your site, in one workspace.
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {tabs.map(tab => (
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

      <div className="sidebar-card">
        <select
          aria-label="Active project"
          className="sidebar-select"
          value={project}
          disabled={projectsLoading || creating}
          onChange={e => onProjectChange(e.target.value)}
        >
          {options.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="sidebar-helper-text" style={{ marginTop: 12 }}>
          {count != null
            ? `${count} saved file${count === 1 ? "" : "s"} · ${scheduleCount || 0} schedule entries`
            : "Your project's files and reports are stored separately."}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreate(value => !value)
            setCreateError("")
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 12,
            padding: "8px 10px",
            width: "100%",
            border: "1px solid #40516c",
            borderRadius: 8,
            color: "#fff",
            background: "transparent",
            cursor: "pointer",
            fontSize: 12
          }}
        >
          <FolderPlus size={15} />
          {showCreate ? "Cancel" : "Create New Project"}
        </button>

        {showCreate && (
          <form
            onSubmit={create}
            style={{
              display: "grid",
              gap: 8,
              marginTop: 10
            }}
          >
            <input
              autoFocus
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              maxLength={100}
              placeholder="e.g. Hospital Hamburg"
              aria-label="New project name"
              style={{
                width: "100%",
                minWidth: 0,
                padding: "9px",
                border: "1px solid #40516c",
                borderRadius: 8,
                color: "#fff",
                background: "#101b30"
              }}
            />

            {createError && (
              <span style={{ color: "#fecaca", fontSize: 11 }}>
                {createError}
              </span>
            )}

            <button
              type="submit"
              disabled={creating}
              style={{
                padding: "8px",
                border: 0,
                borderRadius: 8,
                cursor: "pointer",
                background: "#f97316",
                color: "white",
                fontWeight: 600
              }}
            >
              {creating ? "Creating..." : "Create & Open"}
            </button>
          </form>
        )}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-name">👤 Site Team</div>
        <div className="sidebar-user-role">Local Workspace</div>
      </div>
    </aside>
  )
}