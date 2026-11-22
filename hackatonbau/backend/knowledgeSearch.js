import fs from "node:fs/promises"
import path from "node:path"

const TEXT_EXT = new Set([".txt", ".md", ".csv", ".json", ".eml"])
const DOCUMENT_EXT = new Set([".pdf", ".docx", ".msg", ...TEXT_EXT])
const GENERIC = new Set(["project", "site", "building", "construction", "document", "report", "daily", "from", "about", "munich"])
const STOP = new Set(["what", "when", "where", "which", "does", "with", "have", "were", "this", "that", "there", "tell", "show", "please", "give", "summarize", "summarise", "summary", "about", "would", "could", "project", "report", "documents", "document", "files", "from", "into", "the", "and", "for", "how", "was", "are", "all"])

const normal = value => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const words = value => normal(value).split(" ").filter(Boolean)

function declaredProject(text) {
  const first = String(text || "").slice(0, 1800)
  const printed = first.match(/(?:^|\n)\s*Project\s*:\s*([^\n·|]{4,100})/im)
  if (printed) return printed[1].trim()

  const spoken = first.match(/(?:working at|working on|at)\s+(?:the\s+)?(.{4,75}?)\s+construction\s+site\s+in\s+([\p{L}-]+)/iu)
  if (spoken) return `${spoken[1].trim()} ${spoken[2]}`

  return ""
}

function siteMatch(question, site) {
  if (!site) return 0

  const q = normal(question)
  const siteName = normal(site)

  if (q.includes(siteName)) return 100

  const candidate = words(site).filter(
    word => word.length >= 5 && !GENERIC.has(word)
  )
  const found = candidate.filter(
    word => q.split(" ").includes(word)
  )

  if (found.length >= 2) return found.length * 10
  if (found.length === 1) return 8
  return 0
}

function recordForEvidence(item) {
  return {
    key: `e-${item.id}`,
    kind: "E",
    name: item.name,
    type: item.category === "voice"
      ? "Voice recording"
      : item.category === "photo"
        ? "Site photo"
        : "Uploaded evidence",
    text: String(
      item.extracted_text ||
      item.transcription?.text ||
      item.summary ||
      ""
    ).trim(),
    date: item.uploaded_at,
    url: `/api/evidence/${item.id}/file`,
    icon: "📎",
    declared: declaredProject(
      item.extracted_text || item.transcription?.text || ""
    )
  }
}

function recordForDocument(item) {
  return {
    key: `d-${item.id}`,
    kind: "D",
    name: item.name,
    type: item.extracted_text?.trim()
      ? "Saved report"
      : "Report summary only",
    text: String(
      item.extracted_text || item.summary || ""
    ).trim(),
    date: item.created_at,
    url: `/api/repository/${item.id}/file`,
    icon: "📄",
    declared: declaredProject(item.extracted_text || "")
  }
}

function selectRecords(allRecords, question, workspace) {
  const q = normal(question)

  const explicitlyNamed = allRecords
    .map(record => ({
      record,
      match: siteMatch(q, record.declared)
    }))
    .filter(item => item.match > 0)
    .sort((a, b) => b.match - a.match)

  const explicit = explicitlyNamed.length > 0

  const allFiles =
    /\b(?:all|every|each)\s+(?:the\s+)?(?:uploaded\s+)?(?:documents|files|recordings|reports|pdfs|voice|evidence)/i.test(question) ||
    /\b(?:entire|whole)\s+(?:repository|collection)/i.test(question)

  let selected

  if (explicit) {
    const requestedSites = new Set(
      explicitlyNamed.map(item => normal(item.record.declared))
    )

    selected = allRecords.filter(
      record => requestedSites.has(normal(record.declared))
    )
  } else if (allFiles) {
    selected = allRecords
  } else {
    selected = allRecords.filter(
      record =>
        !record.declared ||
        normal(record.declared) === normal(workspace)
    )
  }

  if (/\b(?:voice|audio|recording|recordings|transcript|transcription|dictation)\b/i.test(question)) {
    selected = selected.filter(
      record => record.type === "Voice recording"
    )
  } else if (
    /\b(?:pdf|pdfs)\b/i.test(question) &&
    /\b(?:all|every|each|summari[sz]e)\b/i.test(question)
  ) {
    selected = selected.filter(
      record => /\.pdf$/i.test(record.name)
    )
  }

  return { selected, explicit, allFiles }
}

function chunks(text, size = 5200, overlap = 200) {
  const result = []

  for (let offset = 0; offset < text.length && result.length < 30;) {
    const end = Math.min(text.length, offset + size)
    result.push(text.slice(offset, end))

    if (end === text.length) break
    offset = end - overlap
  }

  return result
}

function selectPassages(records, question) {
  const pieces = records.flatMap((record, rank) =>
    chunks(record.text).map((text, part) => ({
      ...record,
      text,
      part,
      rank
    }))
  )

  const amount = pieces.reduce(
    (sum, item) => sum + item.text.length,
    0
  )

  // Small collections: give Qwen ALL selected document content.
  if (amount <= 30000 && pieces.length <= 24) {
    return pieces
  }

  // Larger collections: rank document sections.
  const terms = words(question).filter(
    term => term.length > 2 && !STOP.has(term)
  )

  const summary =
    /\b(summarize|summarise|summary|overview|compare|entire|all|every|meeting|progress)\b/i.test(question)

  for (const piece of pieces) {
    const content = normal(`${piece.name} ${piece.text}`)

    piece.score = terms.reduce(
      (score, term) =>
        score + (content.includes(term) ? 3 : 0),
      0
    ) + (summary && piece.part === 0 ? 4 : 0)
  }

  pieces.sort(
    (a, b) =>
      b.score - a.score ||
      a.rank - b.rank ||
      a.part - b.part
  )

  let budget = 28500
  const selected = []
  const fileCounts = new Map()

  // Include at least one section per file for broad summaries.
  if (summary) {
    for (const file of records) {
      const piece = pieces.find(
        item => item.key === file.key
      )

      if (!piece || budget < 400 || selected.length >= 24) break

      const text = piece.text.slice(
        0,
        Math.min(2000, budget)
      )

      selected.push({ ...piece, text })
      budget -= text.length + 120
      fileCounts.set(file.key, 1)
    }
  }

  for (const piece of pieces) {
    if (budget < 400 || selected.length >= 24) break

    if (selected.some(
      item => item.key === piece.key && item.part === piece.part
    )) continue

    if ((fileCounts.get(piece.key) || 0) >= 4) continue

    const text = piece.text.slice(
      0,
      Math.min(5000, budget)
    )

    selected.push({ ...piece, text })
    budget -= text.length + 120

    fileCounts.set(
      piece.key,
      (fileCounts.get(piece.key) || 0) + 1
    )
  }

  return selected
}

export function installKnowledgeSearch(app, {
  getDb,
  persist,
  extractPath,
  filesDir,
  docsDir,
  qwenUrl,
  projectName
}) {
  const attempted = new Set()

  async function indexProject(project, force = false) {
    const db = getDb()

    const items = [
      ...db.evidence
        .filter(item => item.project === project)
        .map(item => ({
          item,
          dir: filesDir,
          key: `e-${item.id}`
        })),
      ...db.documents
        .filter(item => item.project === project)
        .map(item => ({
          item,
          dir: docsDir,
          key: `d-${item.id}`
        }))
    ]

    const stats = {
      indexed: 0,
      skipped: 0,
      failed: [],
      unreadable: []
    }

    let changed = false

    for (const { item, dir, key } of items) {
      if (
        item.extracted_text?.trim() ||
        !item.diskName ||
        (!force && attempted.has(key))
      ) {
        stats.skipped++
        continue
      }

      const extension = path.extname(
        item.diskName
      ).toLowerCase()

      if (!DOCUMENT_EXT.has(extension)) {
        stats.skipped++
        continue
      }

      attempted.add(key)

      try {
        const filename = path.join(dir, item.diskName)

        const extracted = TEXT_EXT.has(extension)
          ? {
              text: (
                await fs.readFile(filename, "utf8")
              ).slice(0, 100000),
              warning: null
            }
          : await extractPath(filename)

        item.extracted_text = String(
          extracted.text || ""
        ).trim()

        item.extraction_warning = extracted.warning || null
        item.extraction_attempted = true

        changed = true

        if (item.extracted_text) {
          stats.indexed++
        } else {
          stats.unreadable.push({
            name: item.name,
            reason: item.extraction_warning || "No selectable text"
          })
        }
      } catch (error) {
        stats.failed.push({
          name: item.name,
          error: error.message
        })
      }
    }

    if (changed) await persist()
    return stats
  }

  app.post("/api/knowledge/reindex", async (req, res) => {
    try {
      const project = projectName(req.body?.project)

      res.json({
        success: true,
        project,
        ...await indexProject(project, true)
      })
    } catch (error) {
      res.status(500).json({
        error: error.message
      })
    }
  })

  app.post("/api/knowledge/search", async (req, res) => {
    try {
      const project = projectName(req.body?.project)
      const question = String(
        req.body?.question || ""
      ).trim()

      if (!question || question.length > 1600) {
        return res.status(400).json({
          error: "Question must contain 1 to 1600 characters"
        })
      }

      const indexing = await indexProject(project)
      const db = getDb()

      const records = [
        ...db.evidence
          .filter(item => item.project === project)
          .map(recordForEvidence),

        ...db.documents
          .filter(item => item.project === project)
          .map(recordForDocument),

        ...db.schedule
          .filter(item => item.project === project)
          .map((item, index) => ({
            key: `s-${item.id || index}`,
            kind: "S",
            name: item.Activity || "Schedule entry",
            type: "Project schedule",
            text: JSON.stringify(item),
            date: null,
            url: null,
            icon: "📊",
            declared: ""
          }))
      ].filter(item => item.text)

      const emptyResult = answer => ({
        success: true,
        indexing,
        search_mode: "qwen3 full-context",
        result: {
          role: "assistant",
          found: false,
          answer,
          documents: [],
          sources: [],
          source_count: 0
        }
      })

      if (!records.length) {
        return res.json(
          emptyResult(
            `No readable documents are indexed for ${project}.`
          )
        )
      }

      const { selected, explicit } = selectRecords(
        records,
        question,
        project
      )

      if (!selected.length) {
        return res.json(
          emptyResult(
            "No matching site or document type was found in this workspace."
          )
        )
      }

      const passages = selectPassages(
        selected,
        question
      )

      const counts = { E: 0, D: 0, S: 0 }

      const sources = passages.map(item => ({
        ...item,
        id: `${item.kind}${++counts[item.kind]}`
      }))

      console.log(
        `[Knowledge] ${question.slice(0, 90)} | ` +
        `${selected.length} files, ` +
        `${sources.length} passages, ` +
        `${sources.reduce((n, s) => n + s.text.length, 0)} chars`
      )

      const response = await fetch(`${qwenUrl}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(420000),
        body: JSON.stringify({
          project,
          question,
          explicit_site_query: explicit,
          history: Array.isArray(req.body?.history)
            ? req.body.history.slice(-4)
            : [],
          sources: sources.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            text: s.text,
            declared_project: s.declared,
            project_mismatch: Boolean(
              s.declared &&
              normal(s.declared) !== normal(project)
            )
          }))
        })
      })

      const payload = await response.json().catch(
        () => ({})
      )

      if (!response.ok) {
        throw new Error(
          payload.error || `Qwen returned HTTP ${response.status}`
        )
      }

      const answer = payload.result || {}

      const used = [
        ...new Map(
          (Array.isArray(answer.source_ids) ? answer.source_ids : [])
            .map(id =>
              sources.find(source => source.id === id)
            )
            .filter(Boolean)
            .map(s => [s.key, s])
        ).values()
      ]

      const details = used.map(s => ({
        id: s.key.slice(2),
        name: s.name,
        type: s.type,
        url: s.url,
        date: s.date,
        icon: s.icon,
        snippet: s.text.slice(0, 300),
        declared_project: s.declared || null,
        project_mismatch: Boolean(
          s.declared &&
          normal(s.declared) !== normal(project)
        )
      }))

      const found = answer.found === true && details.length > 0

      const otherSites = [
        ...new Set(
          used
            .filter(
              s =>
                s.declared &&
                normal(s.declared) !== normal(project)
            )
            .map(s => s.declared)
        )
      ]

      const notice = otherSites.length
        ? `\n\nNote: ${otherSites.join(", ")} is different ` +
          `from the selected workspace (${project}). ` +
          "The source file was uploaded under this workspace."
        : ""

      res.json({
        success: true,
        search_mode: "qwen3 full-context",
        indexing,
        result: {
          role: "assistant",
          found,
          answer: found
            ? String(answer.answer || "") + notice
            : "I couldn't verify that from the indexed project records.",
          documents: details.map(s => [
            s.icon,
            s.name,
            s.type,
            s.url
          ]),
          sources: details,
          source_count: details.length
        }
      })
    } catch (error) {
      console.error("Knowledge search:", error)

      res.status(502).json({
        error: error.message
      })
    }
  })
}