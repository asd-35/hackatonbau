import fs from "node:fs/promises"
import path from "node:path"

const DEFAULT_PROJECTS = [
  "Office Tower Munich",
  "Industrial Plant Stuttgart"
]

const normalize = value =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

function detectDocumentProject(text) {
  const content = String(text || "").slice(0, 1800)

  const pdf = content.match(
    /(?:^|\n)\s*Project:\s*([^\n·|]+)/i
  )

  if (pdf) return pdf[1].trim()

  const voice = content.match(
    /working at (?:the )?(.+?) construction site in ([\p{L}-]+)/iu
  )

  if (voice) {
    return `${voice[1].trim()} ${voice[2]}`
  }

  return null
}

export function installProjectWorkspaces(app, {
  getDb,
  persist,
  dataDir
}) {
  const registryPath = path.join(dataDir, "projects.json")
  let registered = []
  let saveQueue = Promise.resolve()

  const ready = (async () => {
    try {
      const data = JSON.parse(
        await fs.readFile(registryPath, "utf8")
      )
      registered = Array.isArray(data.projects)
        ? data.projects
        : []
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn("Project registry:", error.message)
      }
    }
  })()

  function projectNames() {
    const db = getDb()

    const names = [
      ...DEFAULT_PROJECTS,
      ...registered.map(item => item.name),
      ...(db.evidence || []).map(item => item.project),
      ...(db.documents || []).map(item => item.project),
      ...(db.schedule || []).map(item => item.project)
    ]

    const unique = new Map()

    for (const value of names) {
      const name = String(value || "").trim()
      if (!name) continue

      const key = normalize(name)

      if (!unique.has(key)) unique.set(key, name)
    }

    return [...unique.values()]
  }

  function validateName(value) {
    const name = String(value || "").trim()

    if (
      name.length < 3 ||
      name.length > 100 ||
      /[<>/\\]/.test(name)
    ) {
      throw new Error("Invalid project name")
    }

    return name
  }

  function saveRegistry() {
    const snapshot = JSON.stringify({
      projects: registered
    }, null, 2)

    saveQueue = saveQueue
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(dataDir, { recursive: true })
        const temp = `${registryPath}.tmp`
        await fs.writeFile(temp, snapshot)
        await fs.rename(temp, registryPath)
      })

    return saveQueue
  }

  async function registerProject(value) {
    await ready
    const name = validateName(value)

    const existing = projectNames().find(
      item => normalize(item) === normalize(name)
    )

    if (existing) return existing

    registered.push({
      name,
      created_at: new Date().toISOString()
    })

    await saveRegistry()
    return name
  }

  function projectActivity(project) {
    const db = getDb()
    const same = item =>
      normalize(item.project) === normalize(project)

    const evidence = (db.evidence || []).filter(same)
    const documents = (db.documents || []).filter(same)
    const schedule = (db.schedule || []).filter(same)

    const activity = [
      ...evidence.map(item => ({
        id: item.id,
        type: "evidence",
        name: item.name,
        category: item.category,
        date: item.uploaded_at,
        url: `/api/evidence/${item.id}/file`
      })),
      ...documents.map(item => ({
        id: item.id,
        type: "report",
        name: item.name,
        category: item.type,
        date: item.created_at,
        url: `/api/repository/${item.id}/file`
      }))
    ].sort(
      (a, b) => String(b.date).localeCompare(String(a.date))
    )

    const mismatches = evidence
      .map(item => ({
        id: item.id,
        name: item.name,
        detected_project: detectDocumentProject(
          item.extracted_text ||
          item.transcription?.text ||
          ""
        )
      }))
      .filter(item =>
        item.detected_project &&
        normalize(item.detected_project) !== normalize(project)
      )

    return {
      project,
      counts: {
        evidence: evidence.length,
        reports: documents.length,
        schedule_entries: schedule.length,
        voice_recordings: evidence.filter(
          item => item.category === "voice"
        ).length,
        photos: evidence.filter(
          item => item.category === "photo"
        ).length,
        pdfs: evidence.filter(
          item => /\.pdf$/i.test(item.name)
        ).length,
        total_files: evidence.length + documents.length
      },
      latest_activity: activity.slice(0, 30),
      last_activity: activity[0]?.date || null,
      project_mismatches: mismatches
    }
  }

  // List all available projects
  app.get("/api/projects", async (req, res, next) => {
    try {
      await ready

      const items = projectNames().map(name => {
        const overview = projectActivity(name)

        return {
          name,
          ...overview.counts,
          last_activity: overview.last_activity
        }
      })

      res.json({ items })
    } catch (error) {
      next(error)
    }
  })

  // Create a new construction project
  app.post("/api/projects", async (req, res, next) => {
    try {
      const name = await registerProject(req.body?.name)

      res.status(201).json({
        success: true,
        project: name
      })
    } catch (error) {
      res.status(400).json({
        error: error.message
      })
    }
  })

  // Get one project's files, stats and recent activity
  app.get("/api/projects/:project/overview", async (req, res, next) => {
    try {
      await ready
      const project = validateName(req.params.project)

      res.json({
        success: true,
        ...projectActivity(project)
      })
    } catch (error) {
      next(error)
    }
  })

  // Move an uploaded file to another construction project
  app.patch("/api/evidence/:id/project", async (req, res, next) => {
    try {
      const db = getDb()
      const item = (db.evidence || []).find(
        entry => entry.id === req.params.id
      )

      if (!item) {
        return res.status(404).json({
          error: "Evidence not found"
        })
      }

      const destination = await registerProject(
        req.body?.project
      )

      const previousProject = item.project

      item.project = destination
      item.project_changed_at = new Date().toISOString()

      await persist()

      res.json({
        success: true,
        id: item.id,
        previous_project: previousProject,
        project: destination
      })
    } catch (error) {
      res.status(400).json({
        error: error.message
      })
    }
  })

  // Move a generated report to another construction project
  app.patch("/api/repository/:id/project", async (req, res, next) => {
    try {
      const db = getDb()
      const item = (db.documents || []).find(
        entry => entry.id === req.params.id
      )

      if (!item) {
        return res.status(404).json({
          error: "Report not found"
        })
      }

      const destination = await registerProject(
        req.body?.project
      )

      const previousProject = item.project

      item.project = destination
      item.project_changed_at = new Date().toISOString()

      await persist()

      res.json({
        success: true,
        id: item.id,
        previous_project: previousProject,
        project: destination
      })
    } catch (error) {
      res.status(400).json({
        error: error.message
      })
    }
  })
}