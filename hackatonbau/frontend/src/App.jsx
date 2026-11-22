import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DAILY_REPORT,
  PROJECTS,
  REPORT_LANGUAGES,
  REPORT_TYPES,
  SAMPLE_EVIDENCE,
  SAMPLE_EVIDENCE_SIZES
} from "./data/mockData"
import {
  classifyEvidence,
  evidenceCategory,
  evidenceFileTypeLabel,
  formatFileSize,
  formatIdStamp,
  formatNowTimestamp,
  formatTimeHHMM,
  noticeToEditorText,
  parseLlmReport,
  reportToEditorText,
  simulateLlmReport
} from "./utils/documentUtils"
import { api, formRequest, projectQuery, fileUrl } from "./api/client"
import { aiReportToTemplate } from "./utils/aiReportAdapter"
import Sidebar from "./components/Sidebar"
import DailyDocumentationTab from "./components/DailyDocumentationTab"
import KnowledgeHubTab from "./components/KnowledgeHubTab"
import PerformanceMonitoringTab from "./components/PerformanceMonitoringTab"
import MeetingIntelligenceTab from "./components/MeetingIntelligenceTab"
import ProjectAssistantDrawer from "./components/ProjectAssistantDrawer"
import { EvidencePreviewModal, RepositoryDocumentModal } from "./components/Modals"
import ToastContainer from "./components/ToastContainer"
import { translateReportTemplate } from "./utils/translateReport"

const TABS = [
  { id: "workflow", label: "🏗️ Daily Documentation" },
  { id: "knowledge", label: "📚 Knowledge Hub" },
  { id: "performance", label: "📊 Performance Monitoring" },
  { id: "meetings", label: "🤝 Meeting Intelligence" }
]

export default function App() {
  const [project, setProject] = useState(() => {
    try {
      return localStorage.getItem("baudackel-active-project") || PROJECTS[0]
    } catch {
      return PROJECTS[0]
    }
  })
  const [projects, setProjects] = useState(PROJECTS.map(name => ({ name })))
  const [projectsLoading, setProjectsLoading] = useState(true)
  const projectRef = useRef(project)
  projectRef.current = project

  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [freeformNotes, setFreeformNotes] = useState("")
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const [activeTab, setActiveTab] = useState("workflow")
  const [pmActionFeedback, setPmActionFeedback] = useState(null)

  // Evidence state
  const [sampleNames, setSampleNames] = useState([])
  const [uploadedFileMap, setUploadedFileMap] = useState({})
  const [evidenceTimes, setEvidenceTimes] = useState({})
  const [removedNames, setRemovedNames] = useState(() => new Set())
  const [lastUploadFeedback, setLastUploadFeedback] = useState(null)

  // Classification state
  const [assignedReportTypes, setAssignedReportTypes] = useState({})
  const [manuallyAssigned, setManuallyAssigned] = useState(() => new Set())
  const [reviewType, setReviewType] = useState(null)
  const [reviewedReportTypes, setReviewedReportTypes] = useState(() => new Set())
  const [classificationConfirmed, setClassificationConfirmed] = useState(false)

  // Draft state
  const [clarification, setClarification] = useState(null)
  const [reportType, setReportType] = useState(DAILY_REPORT)
  const [reportLanguage, setReportLanguage] = useState("English")
  const [noticeTypeChoice, setNoticeTypeChoice] = useState("Delay Notice")
  const [noticeSummaryInput, setNoticeSummaryInput] = useState("")
  const [generatedDocument, setGeneratedDocument] = useState(null)
  const [llmReportJson, setLlmReportJson] = useState(null)
  const [llmPrompt, setLlmPrompt] = useState(null)
  const [documentDraft, setDocumentDraft] = useState("")
  const [savedDraft, setSavedDraft] = useState(null)
  const [lockedTimestamp, setLockedTimestamp] = useState(null)
  const [lockedDocId, setLockedDocId] = useState(null)
  const [exported, setExported] = useState(false)
  const [exportSuccessMsg, setExportSuccessMsg] = useState(null)

  // Knowledge Hub and Assistant state
  const [repositoryDocs, setRepositoryDocs] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [kbMessages, setKbMessages] = useState([])
  const [assistantOpen, setAssistantOpen] = useState(false)

  // Modals and notifications
  const [previewEvidenceItem, setPreviewEvidenceItem] = useState(null)
  const [previewRepoDoc, setPreviewRepoDoc] = useState(null)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, icon = "✅") => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, icon }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  // Load the real projects registered in Express.
  const refreshProjects = useCallback(async () => {
    const response = await api("/api/projects")
    const items = Array.isArray(response.items) ? response.items : []
    if (items.length) setProjects(items)
    return items
  }, [])

  useEffect(() => {
    let live = true

    refreshProjects()
      .then(items => {
        if (!live) return
        if (items.length && !items.some(item => item.name === projectRef.current)) {
          projectRef.current = items[0].name
          setProject(items[0].name)
        }
      })
      .catch(error => {
        if (live) addToast(`Project list unavailable: ${error.message}`, "⚠️")
      })
      .finally(() => {
        if (live) setProjectsLoading(false)
      })

    return () => { live = false }
  }, [refreshProjects, addToast])

  // Prevent project changes while an upload or AI operation is running.
  const handleProjectChange = useCallback((next, { skipConfirm = false } = {}) => {
    if (!next || next === projectRef.current) return true

    if (isUploading || isGenerating || isRecording) {
      addToast("Finish uploading, generating or recording before switching sites", "⚠️")
      return false
    }

    if (
      !skipConfirm &&
      documentDraft.trim() &&
      !exported &&
      !window.confirm(
        "This report draft has not been exported. Switching sites will clear it. Continue?"
      )
    ) {
      return false
    }

    projectRef.current = next
    setProject(next)

    try {
      localStorage.setItem("baudackel-active-project", next)
    } catch {}

    return true
  }, [
    isUploading,
    isGenerating,
    isRecording,
    documentDraft,
    exported,
    addToast
  ])

  const handleCreateProject = useCallback(async name => {
    const cleanName = String(name || "").trim()

    if (cleanName.length < 3) {
      throw new Error("Project name needs at least 3 characters")
    }

    if (isUploading || isGenerating || isRecording) {
      throw new Error("Finish the current upload, report or recording first")
    }

    if (
      documentDraft.trim() &&
      !exported &&
      !window.confirm(
        "Your current report draft has not been exported. Create and switch to the new site?"
      )
    ) {
      return null
    }

    const response = await api("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName })
    })

    const created = response.project

    await refreshProjects()
    handleProjectChange(created, { skipConfirm: true })

    addToast(`Project ${created} is ready`, "✅")
    return created
  }, [
    refreshProjects,
    handleProjectChange,
    isUploading,
    isGenerating,
    isRecording,
    documentDraft,
    exported,
    addToast
  ])

  // Restore only the active project's uploaded files and exported reports.
  useEffect(() => {
    let live = true

    // Clear all temporary state from the previous project.
    setSampleNames([])
    setUploadedFileMap({})
    setEvidenceTimes({})
    setRemovedNames(new Set())
    setLastUploadFeedback(null)
    setAssignedReportTypes({})
    setManuallyAssigned(new Set())
    setReviewType(null)
    setReviewedReportTypes(new Set())
    setClassificationConfirmed(false)
    setClarification(null)
    setFreeformNotes("")
    setReportType(DAILY_REPORT)
    setReportLanguage("English")
    setNoticeTypeChoice("Delay Notice")
    setNoticeSummaryInput("")
    setGeneratedDocument(null)
    setLlmReportJson(null)
    setLlmPrompt(null)
    setDocumentDraft("")
    setSavedDraft(null)
    setLockedTimestamp(null)
    setLockedDocId(null)
    setExported(false)
    setExportSuccessMsg(null)
    setRepositoryDocs([])
    setKbMessages([])
    setRecentSearches([])
    setAssistantOpen(false)
    setPmActionFeedback(null)
    setPreviewEvidenceItem(null)
    setPreviewRepoDoc(null)

    Promise.all([
      api(`/api/evidence${projectQuery(project)}`),
      api(`/api/repository${projectQuery(project)}`)
    ])
      .then(async ([evidence, docs]) => {
        if (!live) return

        const files = {}
        const types = {}

        for (const item of evidence.items || []) {
          let name = item.name
          let n = 2

          while (files[name]) {
            name = item.name.replace(/(\.[^.]+)?$/, ` (${n++})$1`)
          }

          files[name] = {
            id: item.id,
            size: item.size,
            uploadedAt: new Date(item.uploaded_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            objectUrl: fileUrl(item.url),
            dataUrl: null,
            extractedText: item.extracted_text,
            transcription: item.transcription,
            warnings: item.warnings,
            summary: item.summary
          }

          types[name] = Array.isArray(item.assigned_types)
            ? item.assigned_types
            : [classifyEvidence(name)]
        }

        setUploadedFileMap(files)
        setAssignedReportTypes(types)

        setManuallyAssigned(
          new Set(
            (evidence.items || [])
              .filter(item => item.classification_manual)
              .map(item =>
                Object.entries(files).find(([, meta]) =>
                  meta.id === item.id
                )?.[0]
              )
              .filter(Boolean)
          )
        )

        setRepositoryDocs(docs.items || [])

        // Load real photo data URLs for PDF and Word export.
        for (const [name, meta] of Object.entries(files)) {
          if (evidenceCategory(name) !== "photo") continue

          fetch(meta.objectUrl)
            .then(response => response.blob())
            .then(blob => new Promise(resolve => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.readAsDataURL(blob)
            }))
            .then(dataUrl => {
              if (!live) return

              setUploadedFileMap(prev =>
                prev[name]
                  ? {
                      ...prev,
                      [name]: {
                        ...prev[name],
                        dataUrl
                      }
                    }
                  : prev
              )
            })
            .catch(() => {})
        }
      })
      .catch(error => {
        if (live) {
          addToast(`Backend not available: ${error.message}`, "⚠️")
        }
      })

    return () => {
      live = false
    }
  }, [project, addToast])

  const getUploadTime = useCallback(fileName => {
    if (SAMPLE_EVIDENCE[fileName]) return SAMPLE_EVIDENCE[fileName]
    return evidenceTimes[fileName] || formatTimeHHMM()
  }, [evidenceTimes])

  const evidenceRecords = useMemo(() => {
    const records = {}

    for (const name of sampleNames) {
      if (removedNames.has(name)) continue

      const sizeBytes = SAMPLE_EVIDENCE_SIZES[name] || 128000

      records[name] = {
        name,
        file_type: evidenceFileTypeLabel(name),
        category: evidenceCategory(name),
        uploaded_at: SAMPLE_EVIDENCE[name] || "10:00",
        size_bytes: sizeBytes,
        size_label: formatFileSize(sizeBytes),
        source: "Sample"
      }
    }

    for (const [name, fileData] of Object.entries(uploadedFileMap)) {
      if (removedNames.has(name)) continue

      const sizeBytes = fileData.size || 0

      records[name] = {
        name,
        file_type: evidenceFileTypeLabel(name),
        category: evidenceCategory(name),
        uploaded_at: evidenceTimes[name] || fileData.uploadedAt,
        size_bytes: sizeBytes,
        size_label: formatFileSize(sizeBytes),
        source: "Uploaded"
      }
    }

    return records
  }, [
    sampleNames,
    uploadedFileMap,
    removedNames,
    evidenceTimes
  ])

  const evidenceNames = useMemo(
    () => Object.keys(evidenceRecords),
    [evidenceRecords]
  )

  const { photoIds, photoDataUrls } = useMemo(() => {
    const photoNames = evidenceNames
      .filter(name => evidenceCategory(name) === "photo")
      .sort((a, b) =>
        (evidenceRecords[a]?.uploaded_at || "").localeCompare(
          evidenceRecords[b]?.uploaded_at || ""
        )
      )

    const ids = {}
    const urls = {}

    photoNames.forEach((name, idx) => {
      const pid = 101 + idx
      ids[name] = pid

      if (uploadedFileMap[name]?.dataUrl) {
        urls[pid] = uploadedFileMap[name].dataUrl
      }
    })

    return { photoIds: ids, photoDataUrls: urls }
  }, [evidenceNames, evidenceRecords, uploadedFileMap])

  const photosByType = useMemo(() => {
    const map = {}

    for (const rt of Object.keys(REPORT_TYPES)) {
      const files = evidenceNames
        .filter(name =>
          (assignedReportTypes[name] || []).includes(rt) &&
          photoIds[name]
        )
        .sort((a, b) =>
          (evidenceRecords[a]?.uploaded_at || "").localeCompare(
            evidenceRecords[b]?.uploaded_at || ""
          )
        )

      map[rt] = files.map(name => [photoIds[name], name])
    }

    return map
  }, [evidenceNames, assignedReportTypes, photoIds, evidenceRecords])

  // Sample evidence
  const handleLoadSample = useCallback(() => {
    const names = Object.keys(SAMPLE_EVIDENCE)

    setSampleNames(names)

    setAssignedReportTypes(prev => {
      const next = { ...prev }

      names.forEach(name => {
        if (!next[name]) next[name] = [classifyEvidence(name)]
      })

      return next
    })

    setClassificationConfirmed(false)

    const msg = `${names.length} files added to today's evidence workspace (stored in session state, ready for classification).`

    setLastUploadFeedback(msg)
    addToast(msg, "✅")
  }, [addToast])

  // Upload real files into the currently selected project's backend records.
  const handleFilesUpload = useCallback(async files => {
    if (!files?.length) return

    setIsUploading(true)

    try {
      for (const file of files) {
        try {
          const response = await formRequest(
            "/api/evidence",
            { project },
            file
          )

          const item = response.item
          const nowTime = formatTimeHHMM()

          let name = file.name
          const suffix = item.id.slice(0, 6)

          if (uploadedFileMap[name]) {
            name = file.name.replace(
              /(\.[^.]+)?$/,
              `_${suffix}$1`
            )
          }

          const photo = evidenceCategory(file.name) === "photo"

          const dataUrl = photo
            ? await new Promise(resolve => {
                const reader = new FileReader()
                reader.onload = () => resolve(String(reader.result || ""))
                reader.readAsDataURL(file)
              })
            : null

          setRemovedNames(prev => {
            const next = new Set(prev)
            next.delete(name)
            return next
          })

          setUploadedFileMap(prev => ({
            ...prev,
            [name]: {
              id: item.id,
              size: file.size,
              uploadedAt: nowTime,
              objectUrl: fileUrl(item.url),
              dataUrl,
              extractedText: item.extracted_text,
              transcription: item.transcription,
              warnings: item.warnings,
              summary: item.summary
            }
          }))

          setEvidenceTimes(prev => ({
            ...prev,
            [name]: nowTime
          }))

          setAssignedReportTypes(prev => ({
            ...prev,
            [name]: Array.isArray(item.assigned_types)
              ? item.assigned_types
              : [classifyEvidence(file.name)]
          }))

          if (item.warnings?.length) {
            addToast(`${file.name}: ${item.warnings.join("; ")}`, "⚠️")
          } else {
            addToast(`${file.name} uploaded and processed`, "✅")
          }
        } catch (error) {
          addToast(`Upload failed for ${file.name}: ${error.message}`, "⚠️")
        }
      }

      setClassificationConfirmed(false)
      setLastUploadFeedback(`${files.length} file(s) submitted to local backend.`)
      refreshProjects().catch(() => {})
    } finally {
      setIsUploading(false)
    }
  }, [project, uploadedFileMap, addToast, refreshProjects])

  const handleQuickDictate = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      return
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("Microphone recording unavailable in this browser")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      mediaStreamRef.current = stream

      const mime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find(type => MediaRecorder.isTypeSupported(type)) || ""

      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : {}
      )

      mediaRecorderRef.current = recorder
      const chunks = []

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null

        const extension = recorder.mimeType.includes("mp4")
          ? "m4a"
          : "webm"

        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm"
        })

        if (blob.size) {
          await handleFilesUpload([
            new File(
              [blob],
              `Voice_${Date.now()}.${extension}`,
              { type: blob.type }
            )
          ])
        } else {
          addToast("Recording was empty", "⚠️")
        }
      }

      recorder.start(500)
      setIsRecording(true)
      addToast("Recording started. Click Stop recording when finished", "🎤")
    } catch (error) {
      setIsRecording(false)
      addToast(`Microphone: ${error.message}`, "⚠️")
    }
  }, [handleFilesUpload, addToast])

  const handleRemoveEvidence = useCallback(async fileName => {
    const id = uploadedFileMap[fileName]?.id

    if (id) {
      try {
        await api(`/api/evidence/${id}`, {
          method: "DELETE"
        })
      } catch (error) {
        addToast(`Delete failed: ${error.message}`, "⚠️")
        return
      }

      setUploadedFileMap(prev => {
        const next = { ...prev }
        delete next[fileName]
        return next
      })
    }

    setRemovedNames(prev => new Set(prev).add(fileName))
    setSampleNames(prev => prev.filter(name => name !== fileName))

    setAssignedReportTypes(prev => {
      const next = { ...prev }
      delete next[fileName]
      return next
    })

    setManuallyAssigned(prev => {
      const next = new Set(prev)
      next.delete(fileName)
      return next
    })

    setClassificationConfirmed(false)
    addToast(`Removed ${fileName}`, "🗑️")
    refreshProjects().catch(() => {})
  }, [uploadedFileMap, addToast, refreshProjects])

  const handleRestoreRemoved = useCallback(() => {
    const toRestore = Object.keys(SAMPLE_EVIDENCE)
      .filter(name => removedNames.has(name))

    setRemovedNames(new Set())

    if (toRestore.length) {
      setSampleNames(prev =>
        Array.from(new Set([...prev, ...toRestore]))
      )

      setAssignedReportTypes(prev => {
        const next = { ...prev }

        toRestore.forEach(name => {
          next[name] = uploadedFileMap[name]?.id
            ? assignedReportTypes[name] || [classifyEvidence(name)]
            : [classifyEvidence(name)]
        })

        return next
      })
    }

    addToast("Restored removed evidence files", "↩️")
  }, [
    removedNames,
    uploadedFileMap,
    assignedReportTypes,
    addToast
  ])

  const handleToggleReportType = useCallback(async (fileName, targetReport) => {
    const previous = Array.isArray(assignedReportTypes[fileName])
      ? assignedReportTypes[fileName]
      : []

    const updated = previous.includes(targetReport)
      ? previous.filter(rt => rt !== targetReport)
      : [...previous, targetReport]

    setAssignedReportTypes(prev => ({
      ...prev,
      [fileName]: updated
    }))

    setManuallyAssigned(prev => new Set(prev).add(fileName))
    setClassificationConfirmed(false)

    const id = uploadedFileMap[fileName]?.id

    if (!id) return

    try {
      await api(`/api/evidence/${id}/classification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_types: updated })
      })
    } catch (error) {
      setAssignedReportTypes(prev => ({
        ...prev,
        [fileName]: previous
      }))

      addToast(`Could not save classification: ${error.message}`, "⚠️")
    }
  }, [
    assignedReportTypes,
    uploadedFileMap,
    addToast
  ])

  const handleRerunClassification = useCallback(async () => {
    try {
      const response = await api("/api/evidence/reclassify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project })
      })

      const byId = Object.fromEntries(
        (response.items || []).map(item => [item.id, item])
      )

      const next = {}

      evidenceNames.forEach(name => {
        const id = uploadedFileMap[name]?.id

        next[name] = id && byId[id]
          ? byId[id].assigned_types
          : [classifyEvidence(name)]
      })

      setAssignedReportTypes(next)
      setManuallyAssigned(new Set())
      setClassificationConfirmed(false)

      addToast(
        `Reclassified ${response.count} uploaded items. Review suggested report types.`,
        "✨"
      )
    } catch (error) {
      addToast(`Classification failed: ${error.message}`, "⚠️")
    }
  }, [
    project,
    evidenceNames,
    uploadedFileMap,
    addToast
  ])

  const handleOpenReview = useCallback(rt => {
    setReviewType(rt)
    setReviewedReportTypes(prev => new Set(prev).add(rt))
  }, [])

  // Generate reports with the existing Qwen backend.
  const handleGenerateDraft = useCallback(async ({
    kind,
    noticeType = null,
    noticeSummary = "",
    attachments = null,
    overrideReportType = null,
    overrideClarification = null
  }) => {
    setIsGenerating(true)

    try {
      const chosenReportType = overrideReportType || reportType || DAILY_REPORT

      const selected = evidenceNames.filter(name =>
        (assignedReportTypes[name] || []).includes(chosenReportType)
      )

      const ids = selected
        .map(name => uploadedFileMap[name]?.id)
        .filter(Boolean)

      const lang = REPORT_LANGUAGES[reportLanguage] || "en"
      const created = formatNowTimestamp(lang)
      const docId = `BD-${formatIdStamp()}`

      let draft
      let docType = chosenReportType

      if (kind === "Notice" || kind === "Delay notice") {
        const notes = noticeSummary.trim() || freeformNotes.trim()

        if (!notes) {
          addToast("Write a factual notice summary before drafting", "⚠️")
          return
        }

        docType = noticeType || "Delay Notice"

        draft = noticeToEditorText(
          project,
          overrideClarification || clarification,
          created,
          docType,
          notes,
          attachments,
          `SC-${formatIdStamp()}`
        )

        setLlmReportJson(null)
        setLlmPrompt(null)
      } else if (ids.length || freeformNotes.trim()) {
        const answer = await api("/api/drafts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            reportType: chosenReportType,
            evidenceIds: ids,
            notes: freeformNotes
          })
        })

        const ai = answer.report

        const realPhotos = (
          photosByType[chosenReportType] || []
        ).filter(([, name]) =>
          Boolean(uploadedFileMap[name]?.id)
        )

        let template = aiReportToTemplate(
          ai,
          chosenReportType,
          realPhotos,
          selected
        )

        if (lang === "de") {
          template = await translateReportTemplate(template)
        }

        draft = reportToEditorText(
          template,
          project,
          lang,
          created,
          REPORT_TYPES[chosenReportType].titles[lang],
          docId,
          lang === "de"
            ? "Entwurf zur Prüfung"
            : "Draft for Review"
        )

        setLlmReportJson(JSON.stringify(ai, null, 2))

        setLlmPrompt({
          reportType: chosenReportType,
          language: lang,
          warnings: answer.warnings
        })

        if (lang === "de") {
          addToast("German report generated. Review before export.", "✅")
        } else {
          addToast("Draft generated from uploaded evidence", "✅")
        }
      } else if (sampleNames.length) {
        const demo = simulateLlmReport(
          lang,
          chosenReportType,
          overrideClarification || clarification || {
            hours: 3,
            supplier: "DEMO supplier",
            impact: "Demo only"
          },
          photosByType[chosenReportType] || [],
          created,
          getUploadTime
        )

        draft = reportToEditorText(
          parseLlmReport(demo),
          project,
          lang,
          created,
          REPORT_TYPES[chosenReportType].titles[lang],
          docId,
          "SAMPLE / NOT VERIFIED"
        )

        setLlmReportJson(demo)

        setLlmPrompt({
          reportType: chosenReportType,
          language: lang,
          demo: true
        })

        addToast(
          "Demo sample draft generated. Not based on uploaded evidence",
          "⚠️"
        )
      } else {
        addToast(
          "Upload real evidence or enter notes before generating a report",
          "⚠️"
        )
        return
      }

      setReportType(chosenReportType)
      setGeneratedDocument(docType)
      setLockedTimestamp(created)
      setLockedDocId(docId)
      setDocumentDraft(draft)
      setSavedDraft(null)
      setExported(false)
      setExportSuccessMsg(null)
    } catch (error) {
      addToast(`Report failed: ${error.message}`, "⚠️")
    } finally {
      setIsGenerating(false)
    }
  }, [
    clarification,
    project,
    reportType,
    reportLanguage,
    evidenceNames,
    assignedReportTypes,
    uploadedFileMap,
    freeformNotes,
    photosByType,
    sampleNames,
    getUploadTime,
    addToast
  ])

  const handleSaveDraft = useCallback(() => {
    setSavedDraft({
      text: documentDraft,
      time: formatTimeHHMM()
    })

    setExported(false)
    addToast("Draft saved and ready for export", "💾")
  }, [documentDraft, addToast])

  // Archive exported reports under their project.
  const handleMarkExported = useCallback(async ({
    fileName,
    docType,
    evidenceCount,
    summary,
    blob,
    mime,
    docId
  }) => {
    try {
      const response = await formRequest(
        "/api/repository",
        {
          project,
          type: docType,
          evidence_count: evidenceCount,
          summary
        },
        new File([blob], fileName, { type: mime })
      )

      const item = response.item

      if (projectRef.current === project) {
        setRepositoryDocs(prev => [item, ...prev])
      }

      refreshProjects().catch(() => {})

      const msg = `Exported ${fileName} and saved in the project repository`

      if (projectRef.current === project) {
        setExported(true)
        setExportSuccessMsg(msg)
      }

      addToast(msg, "✅")
    } catch (error) {
      addToast(
        `File downloaded, but server archive failed: ${error.message}`,
        "⚠️"
      )
    }
  }, [project, addToast, refreshProjects])

  // Performance Monitoring actions
  const handlePmCreateDelayNotice = useCallback((
    activity,
    rootCause,
    delayDays
  ) => {
    const summaryText = `Activity: ${activity}. Reported schedule difference: ${delayDays || "unconfirmed"} days. Root cause: ${rootCause || "not confirmed"}.`

    setNoticeTypeChoice("Delay Notice")
    setNoticeSummaryInput(summaryText)

    handleGenerateDraft({
      kind: "Notice",
      noticeType: "Delay Notice",
      noticeSummary: summaryText,
      attachments: evidenceNames
    })

    setPmActionFeedback(
      "Draft notice created from the selected schedule row. Verify source documents before sending."
    )

    addToast(`Notice draft created for ${activity}`, "⚠️")
  }, [handleGenerateDraft, evidenceNames, addToast])

  const handlePmGenerateReport = useCallback(() => {
    setReportType(DAILY_REPORT)
    setActiveTab("workflow")

    setPmActionFeedback(
      "Review and select your actual evidence, then generate a daily report draft in Step 3."
    )

    addToast(
      "Open Daily Documentation to generate the report from uploaded evidence",
      "📋"
    )
  }, [addToast])

  const handlePmReviewEvidence = useCallback(() => {
    handleOpenReview(DAILY_REPORT)
    setActiveTab("workflow")

    setPmActionFeedback(
      "Opened evidence review. Only real uploaded evidence is used for live drafts."
    )
  }, [handleOpenReview])

  // Project-specific Knowledge Hub search.
  const answerQuestionFn = useCallback(async question => {
    const response = await api("/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, question })
    })

    return response.result
  }, [project])

  const recordSearch = useCallback(question => {
    setRecentSearches(prev => [
      question,
      ...prev.filter(item => item !== question)
    ].slice(0, 6))
  }, [])

  const handleAssistantAsk = useCallback(async question => {
    recordSearch(question)

    setKbMessages(prev => [
      ...prev,
      { role: "user", content: question }
    ])

    const requestedProject = project

    try {
      const reply = await answerQuestionFn(question)

      // Ignore answers belonging to a previously selected project.
      if (projectRef.current === requestedProject) {
        setKbMessages(prev => [...prev, reply])
      }
    } catch (error) {
      if (projectRef.current === requestedProject) {
        setKbMessages(prev => [
          ...prev,
          {
            role: "assistant",
            answer: `Search failed: ${error.message}`,
            documents: [],
            confidence: 0
          }
        ])
      }
    }
  }, [recordSearch, answerQuestionFn, project])

  const handleDeleteRepoDoc = useCallback(async (id, name) => {
    try {
      await api(`/api/repository/${id}`, {
        method: "DELETE"
      })

      setRepositoryDocs(prev =>
        prev.filter(doc => doc.id !== id)
      )

      refreshProjects().catch(() => {})
      addToast(`Deleted ${name}`, "🗑️")
    } catch (error) {
      addToast(`Delete failed: ${error.message}`, "⚠️")
    }
  }, [addToast, refreshProjects])

  return (
    <div className="app-shell">
      <Sidebar
        project={project}
        projects={projects}
        projectsLoading={projectsLoading}
        onProjectChange={handleProjectChange}
        onCreateProject={handleCreateProject}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="main-content">
        <header className="site-hero">
          <div className="site-eyebrow">
            {project} · LIVE WORKSPACE
          </div>

          <h1>
  {({
    workflow: "Daily Documentation",
    knowledge: "Knowledge Hub",
    performance: "Performance Monitoring",
    meetings: "Meeting Intelligence"
  })[activeTab] || "BauDackel"}
</h1>
        </header>

        {pmActionFeedback && (
          <div
            className="alert alert-info"
            style={{
              marginBottom: 14,
              justifyContent: "space-between"
            }}
          >
            <span>⚡ {pmActionFeedback}</span>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPmActionFeedback(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "workflow" && (
          <DailyDocumentationTab
            key={project}
            project={project}
            evidenceRecords={evidenceRecords}
            evidenceNames={evidenceNames}
            uploadedFileMap={uploadedFileMap}
            removedNames={removedNames}
            sampleLoaded={sampleNames.length > 0}
            assignedReportTypes={assignedReportTypes}
            manuallyAssigned={manuallyAssigned}
            reviewType={reviewType}
            classificationConfirmed={classificationConfirmed}
            reportType={reportType}
            reportLanguage={reportLanguage}
            generatedDocument={generatedDocument}
            documentDraft={documentDraft}
            savedDraft={savedDraft}
            lockedTimestamp={lockedTimestamp}
            lockedDocId={lockedDocId}
            exported={exported}
            exportSuccessMsg={exportSuccessMsg}
            photoDataUrls={photoDataUrls}
            isRecording={isRecording}
            isUploading={isUploading}
            isGenerating={isGenerating}
            freeformNotes={freeformNotes}
            onSetFreeformNotes={setFreeformNotes}
            llmReportJson={llmReportJson}
            onFilesUpload={handleFilesUpload}
            onLoadSample={handleLoadSample}
            onQuickDictate={handleQuickDictate}
            onRestoreRemoved={handleRestoreRemoved}
            onRemoveEvidence={handleRemoveEvidence}
            onPreviewEvidence={setPreviewEvidenceItem}
            onToggleReportType={handleToggleReportType}
            onRerunClassification={handleRerunClassification}
            onOpenReview={handleOpenReview}
            onSetReportType={setReportType}
            onSetReportLanguage={setReportLanguage}
            onGenerateDraft={handleGenerateDraft}
            onDraftChange={setDocumentDraft}
            onSaveDraft={handleSaveDraft}
            onMarkExported={handleMarkExported}
            onQuickGenerateDailyReport={handlePmGenerateReport}
            onQuickCreateDelayNotice={handlePmCreateDelayNotice}
          />
        )}

        {activeTab === "knowledge" && (
          <KnowledgeHubTab
            key={project}
            project={project}
            repositoryDocs={repositoryDocs}
            answerQuestionFn={answerQuestionFn}
            onRecordSearch={recordSearch}
            onOpenDocument={setPreviewRepoDoc}
            onDeleteDocument={handleDeleteRepoDoc}
          />
        )}

        {activeTab === "performance" && (
          <PerformanceMonitoringTab
            key={project}
            project={project}
            onCreateDelayNotice={handlePmCreateDelayNotice}
            onGenerateReport={handlePmGenerateReport}
            onReviewEvidence={handlePmReviewEvidence}
          />
        )}

        {activeTab === "meetings" && (
          <MeetingIntelligenceTab
            key={project}
            project={project}
            repositoryDocs={repositoryDocs}
            evidenceCount={evidenceNames.length}
            onToast={addToast}
          />
        )}
      </main>

      <ProjectAssistantDrawer
        key={project}
        isOpen={assistantOpen}
        onOpen={() => setAssistantOpen(true)}
        onClose={() => setAssistantOpen(false)}
        project={project}
        repositoryDocs={repositoryDocs}
        messages={kbMessages}
        recentSearches={recentSearches}
        onAskQuestion={handleAssistantAsk}
        onClearChat={() => setKbMessages([])}
      />

      <EvidencePreviewModal
        item={previewEvidenceItem}
        onClose={() => setPreviewEvidenceItem(null)}
      />

      <RepositoryDocumentModal
        doc={previewRepoDoc}
        onClose={() => setPreviewRepoDoc(null)}
      />

      <ToastContainer toasts={toasts} />
    </div>
  )
}