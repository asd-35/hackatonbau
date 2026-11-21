import React, { useCallback, useMemo, useState } from "react";
import {
  DAILY_REPORT,
  DEFAULT_REPOSITORY_DOCS,
  PROJECTS,
  REPORT_LANGUAGES,
  REPORT_TYPES,
  SAMPLE_EVIDENCE,
  SAMPLE_EVIDENCE_SIZES,
  UNASSIGNED,
} from "./data/mockData";
import {
  answerQuestion,
  classifyEvidence,
  evidenceCategory,
  evidenceFileTypeLabel,
  formatFileSize,
  formatIdStamp,
  formatNowTimestamp,
  formatTimeHHMM,
  formatTodayDisplay,
  noticeToEditorText,
  parseLlmReport,
  reportToEditorText,
  simulateLlmReport,
} from "./utils/documentUtils";
import Sidebar from "./components/Sidebar";
import DailyDocumentationTab from "./components/DailyDocumentationTab";
import KnowledgeHubTab from "./components/KnowledgeHubTab";
import PerformanceMonitoringTab from "./components/PerformanceMonitoringTab";
import MeetingIntelligenceTab from "./components/MeetingIntelligenceTab";
import ProjectAssistantDrawer from "./components/ProjectAssistantDrawer";
import { EvidencePreviewModal, RepositoryDocumentModal } from "./components/Modals";
import ToastContainer from "./components/ToastContainer";

const TABS = [
  { id: "workflow", label: "🏗️ Daily Documentation" },
  { id: "knowledge", label: "📚 Knowledge Hub" },
  { id: "performance", label: "📊 Performance Monitoring" },
  { id: "meetings", label: "🤝 Meeting Intelligence" },
];

export default function App() {
  const [project, setProject] = useState(PROJECTS[0]);
  const [activeTab, setActiveTab] = useState("workflow");
  const [pmActionFeedback, setPmActionFeedback] = useState(null);

  // Evidence state
  const [sampleNames, setSampleNames] = useState([]);
  const [uploadedFileMap, setUploadedFileMap] = useState({});
  const [evidenceTimes, setEvidenceTimes] = useState({});
  const [removedNames, setRemovedNames] = useState(() => new Set());
  const [lastUploadFeedback, setLastUploadFeedback] = useState(null);

  // Classification state: assignedReportTypes maps fileName -> string[] (supports multiple report types per file)
  const [assignedReportTypes, setAssignedReportTypes] = useState({});
  const [manuallyAssigned, setManuallyAssigned] = useState(() => new Set());
  const [reviewType, setReviewType] = useState(null);
  const [reviewedReportTypes, setReviewedReportTypes] = useState(() => new Set());
  const [classificationConfirmed, setClassificationConfirmed] = useState(false);

  // Clarification & Draft state
  const [clarification, setClarification] = useState(null);
  const [reportType, setReportType] = useState(DAILY_REPORT);
  const [reportLanguage, setReportLanguage] = useState("English");
  const [noticeTypeChoice, setNoticeTypeChoice] = useState("Delay Notice");
  const [noticeSummaryInput, setNoticeSummaryInput] = useState("");
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [llmReportJson, setLlmReportJson] = useState(null);
  const [llmPrompt, setLlmPrompt] = useState(null);
  const [documentDraft, setDocumentDraft] = useState("");
  const [savedDraft, setSavedDraft] = useState(null);
  const [lockedTimestamp, setLockedTimestamp] = useState(null);
  const [lockedDocId, setLockedDocId] = useState(null);
  const [clientVersion, setClientVersion] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState(null);

  // Knowledge Hub & Assistant state
  const [repositoryDocs, setRepositoryDocs] = useState(() =>
    DEFAULT_REPOSITORY_DOCS.map((d) => ({ ...d }))
  );
  const [recentSearches, setRecentSearches] = useState([
    "When was the last supplier delay?",
    "Show all safety incidents.",
  ]);
  const [kbMessages, setKbMessages] = useState([]);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Modals & Toasts
  const [previewEvidenceItem, setPreviewEvidenceItem] = useState(null);
  const [previewRepoDoc, setPreviewRepoDoc] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, icon = "✅") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const getUploadTime = useCallback(
    (fileName) => {
      if (SAMPLE_EVIDENCE[fileName]) return SAMPLE_EVIDENCE[fileName];
      return evidenceTimes[fileName] || formatTimeHHMM();
    },
    [evidenceTimes]
  );

  // Build active evidence records
  const evidenceRecords = useMemo(() => {
    const records = {};
    for (const name of sampleNames) {
      if (removedNames.has(name)) continue;
      const sizeBytes = SAMPLE_EVIDENCE_SIZES[name] || 128_000;
      records[name] = {
        name,
        file_type: evidenceFileTypeLabel(name),
        category: evidenceCategory(name),
        uploaded_at: SAMPLE_EVIDENCE[name] || "10:00",
        size_bytes: sizeBytes,
        size_label: formatFileSize(sizeBytes),
        source: "Sample",
      };
    }
    for (const [name, fileData] of Object.entries(uploadedFileMap)) {
      if (removedNames.has(name)) continue;
      const sizeBytes = fileData.size || 0;
      records[name] = {
        name,
        file_type: evidenceFileTypeLabel(name),
        category: evidenceCategory(name),
        uploaded_at: evidenceTimes[name] || fileData.uploadedAt,
        size_bytes: sizeBytes,
        size_label: formatFileSize(sizeBytes),
        source: "Uploaded",
      };
    }
    return records;
  }, [sampleNames, uploadedFileMap, removedNames, evidenceTimes]);

  const evidenceNames = useMemo(() => Object.keys(evidenceRecords), [evidenceRecords]);

  // Photo numbering (101+) and data URLs for real uploaded photos
  const { photoIds, photoDataUrls } = useMemo(() => {
    const photoNames = evidenceNames
      .filter((name) => evidenceCategory(name) === "photo")
      .sort((a, b) => (evidenceRecords[a]?.uploaded_at || "").localeCompare(evidenceRecords[b]?.uploaded_at || ""));
    const ids = {};
    const urls = {};
    photoNames.forEach((name, idx) => {
      const pid = 101 + idx;
      ids[name] = pid;
      if (uploadedFileMap[name]?.dataUrl) {
        urls[pid] = uploadedFileMap[name].dataUrl;
      }
    });
    return { photoIds: ids, photoDataUrls: urls };
  }, [evidenceNames, evidenceRecords, uploadedFileMap]);

  const photosByType = useMemo(() => {
    const map = {};
    for (const rt of Object.keys(REPORT_TYPES)) {
      const files = evidenceNames
        .filter((name) => (assignedReportTypes[name] || []).includes(rt) && photoIds[name])
        .sort((a, b) => (evidenceRecords[a]?.uploaded_at || "").localeCompare(evidenceRecords[b]?.uploaded_at || ""));
      map[rt] = files.map((name) => [photoIds[name], name]);
    }
    return map;
  }, [evidenceNames, assignedReportTypes, photoIds, evidenceRecords]);

  // Handlers: Evidence
  const handleLoadSample = useCallback(() => {
    const names = Object.keys(SAMPLE_EVIDENCE);
    setSampleNames(names);
    setAssignedReportTypes((prev) => {
      const next = { ...prev };
      names.forEach((n) => {
        if (!next[n]) next[n] = [classifyEvidence(n)];
      });
      return next;
    });
    setClassificationConfirmed(false);
    const msg = `${names.length} files added to today's evidence workspace (stored in session state, ready for classification).`;
    setLastUploadFeedback(msg);
    addToast(msg, "✅");
  }, [addToast]);

  const handleFilesUpload = useCallback(
    (files) => {
      const nowTime = formatTimeHHMM();
      const addedNames = [];
      files.forEach((file) => {
        addedNames.push(file.name);
        const cat = evidenceCategory(file.name);
        const objectUrl = URL.createObjectURL(file);
        if (cat === "photo") {
          const reader = new FileReader();
          reader.onload = () => {
            setUploadedFileMap((prev) => ({
              ...prev,
              [file.name]: {
                size: file.size,
                uploadedAt: nowTime,
                objectUrl,
                dataUrl: String(reader.result || ""),
              },
            }));
          };
          reader.readAsDataURL(file);
        } else {
          setUploadedFileMap((prev) => ({
            ...prev,
            [file.name]: {
              size: file.size,
              uploadedAt: nowTime,
              objectUrl,
              dataUrl: null,
            },
          }));
        }
      });

      setRemovedNames((prev) => {
        const next = new Set(prev);
        addedNames.forEach((n) => next.delete(n));
        return next;
      });
      setEvidenceTimes((prev) => {
        const next = { ...prev };
        addedNames.forEach((n) => {
          if (!next[n]) next[n] = nowTime;
        });
        return next;
      });
      setAssignedReportTypes((prev) => {
        const next = { ...prev };
        addedNames.forEach((n) => {
          if (!next[n]) next[n] = [classifyEvidence(n)];
        });
        return next;
      });
      setClassificationConfirmed(false);
      const count = addedNames.length;
      const msg = `${count} file${count === 1 ? "" : "s"} added to today's evidence workspace (stored in session state, ready for classification).`;
      setLastUploadFeedback(msg);
      addToast(msg, "✅");
    },
    [addToast]
  );

  const handleQuickDictate = useCallback(() => {
    const nowTime = formatTimeHHMM();
    const baseName = `Voice_Note_Dictation_${nowTime.replace(":", "")}.mp3`;
    let fileName = baseName;
    let counter = 2;
    while (uploadedFileMap[fileName]) {
      fileName = `Voice_Note_Dictation_${nowTime.replace(":", "")}_${counter}.mp3`;
      counter += 1;
    }
    setUploadedFileMap((prev) => ({
      ...prev,
      [fileName]: {
        size: 1_240_000,
        uploadedAt: nowTime,
        objectUrl: null,
        dataUrl: null,
      },
    }));
    setRemovedNames((prev) => {
      const next = new Set(prev);
      next.delete(fileName);
      return next;
    });
    setEvidenceTimes((prev) => ({ ...prev, [fileName]: nowTime }));
    setAssignedReportTypes((prev) => ({ ...prev, [fileName]: [DAILY_REPORT] }));
    setActiveTab("workflow");
    addToast(`Quick Dictate recorded: ${fileName}`, "🎤");
  }, [uploadedFileMap, addToast]);

  const handleRemoveEvidence = useCallback(
    (fileName) => {
      setRemovedNames((prev) => new Set(prev).add(fileName));
      setSampleNames((prev) => prev.filter((n) => n !== fileName));
      setAssignedReportTypes((prev) => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });
      setManuallyAssigned((prev) => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
      setClassificationConfirmed(false);
      addToast(`Removed ${fileName} from Evidence Inbox`, "🗑️");
    },
    [addToast]
  );

  const handleRestoreRemoved = useCallback(() => {
    const toRestore = Object.keys(SAMPLE_EVIDENCE).filter((name) => removedNames.has(name));
    setRemovedNames(new Set());
    if (toRestore.length) {
      setSampleNames((prev) => Array.from(new Set([...prev, ...toRestore])));
      setAssignedReportTypes((prev) => {
        const next = { ...prev };
        toRestore.forEach((n) => {
          next[n] = [classifyEvidence(n)];
        });
        return next;
      });
    }
    addToast("Restored removed evidence files", "↩️");
  }, [removedNames, addToast]);

  const handleToggleReportType = useCallback((fileName, targetReport) => {
    setAssignedReportTypes((prev) => {
      const current = Array.isArray(prev[fileName]) ? prev[fileName] : [];
      const exists = current.includes(targetReport);
      const updated = exists
        ? current.filter((rt) => rt !== targetReport)
        : [...current, targetReport];
      setManuallyAssigned((mPrev) => {
        const next = new Set(mPrev);
        if (updated.length === 0) next.delete(fileName);
        else next.add(fileName);
        return next;
      });
      return { ...prev, [fileName]: updated };
    });
    setClassificationConfirmed(false);
  }, []);

  const handleRerunClassification = useCallback(() => {
    const next = {};
    evidenceNames.forEach((n) => {
      next[n] = [classifyEvidence(n)];
    });
    setAssignedReportTypes(next);
    setManuallyAssigned(new Set());
    setClassificationConfirmed(false);
    addToast(`AI classification updated for ${evidenceNames.length} files`, "✨");
  }, [evidenceNames, addToast]);

  const handleOpenReview = useCallback((rt) => {
    setReviewType(rt);
    setReviewedReportTypes((prev) => new Set(prev).add(rt));
  }, []);

  // Draft generation
  const handleGenerateDraft = useCallback(
    ({
      kind,
      noticeType = null,
      noticeSummary = "",
      attachments = null,
      overrideReportType = null,
      overrideClarification = null,
    }) => {
      const effClarification = overrideClarification || clarification;
      if (kind === "Notice" || kind === "Delay notice") {
        const selectedNotice = noticeType || "Delay Notice";
        const created = formatNowTimestamp("en");
        const docId = `SC-${formatIdStamp()}`;
        const draft = noticeToEditorText(
          project,
          effClarification,
          created,
          selectedNotice,
          noticeSummary,
          attachments,
          docId
        );
        setLlmReportJson(null);
        setLlmPrompt(null);
        setGeneratedDocument(selectedNotice);
        setLockedTimestamp(created);
        setLockedDocId(docId);
        setDocumentDraft(draft);
      } else {
        const chosenReportType = overrideReportType || reportType || DAILY_REPORT;
        setReportType(chosenReportType);
        const lang = REPORT_LANGUAGES[reportLanguage] || "en";
        const created = formatNowTimestamp(lang);
        const docId = `BD-${formatIdStamp()}`;
        const safeClarification = effClarification || {
          hours: 3,
          supplier: "ABC Concrete",
          impact: "Yes — Critical Path",
        };
        const raw = simulateLlmReport(
          lang,
          chosenReportType,
          safeClarification,
          photosByType[chosenReportType] || [],
          created,
          getUploadTime
        );
        setLlmReportJson(raw);
        setLlmPrompt({ reportType: chosenReportType, language: lang });
        const title = REPORT_TYPES[chosenReportType].titles[lang];
        const draft = reportToEditorText(
          parseLlmReport(raw),
          project,
          lang,
          created,
          title,
          docId,
          "Draft for Review"
        );
        setGeneratedDocument(chosenReportType);
        setLockedTimestamp(created);
        setLockedDocId(docId);
        setDocumentDraft(draft);
      }
      setSavedDraft(null);
      setExported(false);
      setExportSuccessMsg(null);
    },
    [clarification, project, reportType, reportLanguage, photosByType, getUploadTime]
  );

  const handleSaveDraft = useCallback(() => {
    setSavedDraft({ text: documentDraft, time: formatTimeHHMM() });
    setExported(false);
    addToast("Draft saved and ready for export", "💾");
  }, [documentDraft, addToast]);

  const handleMarkExported = useCallback(
    ({ fileName, docType, evidenceCount, summary, blob, mime, docId }) => {
      setExported(true);
      const now = new Date();
      const record = {
        id: docId || `DOC-${formatIdStamp()}`,
        name: fileName,
        type: docType,
        created_at: now.toISOString(),
        date_label: `${formatTodayDisplay()}, ${formatTimeHHMM()}`,
        status: "Exported",
        evidence_count: evidenceCount,
        summary,
        mime,
        blob,
      };
      setRepositoryDocs((prev) => [record, ...prev.filter((d) => d.name !== fileName)]);
      const msg = `Exported ${fileName} (ID: ${docId}) and stored it in the Document Repository.`;
      setExportSuccessMsg(msg);
      addToast(msg, "✅");
    },
    [addToast]
  );

  // Cross-tab quick actions (from Performance Monitoring & CP-02)
  const ensureSampleEvidenceLoaded = useCallback(() => {
    if (sampleNames.length === 0 && Object.keys(uploadedFileMap).length === 0) {
      const names = Object.keys(SAMPLE_EVIDENCE);
      setSampleNames(names);
      setAssignedReportTypes((prev) => {
        const next = { ...prev };
        names.forEach((n) => {
          if (!next[n]) next[n] = [classifyEvidence(n)];
        });
        return next;
      });
    }
  }, [sampleNames.length, uploadedFileMap]);

  const handlePmCreateDelayNotice = useCallback(
    (activity, rootCause, delayDays) => {
      ensureSampleEvidenceLoaded();
      setClassificationConfirmed(true);
      const effClar = clarification || {
        hours: Math.max(delayDays * 2, 3),
        supplier: "ABC Concrete",
        impact: "Yes — Critical Path",
      };
      if (!clarification) setClarification(effClar);
      const summaryText = `${activity} delayed by ${delayDays} days. Root cause: ${rootCause}`;
      setNoticeTypeChoice("Delay Notice");
      setNoticeSummaryInput(summaryText);
      handleGenerateDraft({
        kind: "Notice",
        noticeType: "Delay Notice",
        noticeSummary: summaryText,
        attachments: ["Delivery_Note.pdf", "Supplier_Email.msg", "Daily_Report_15_Nov.pdf"],
        overrideClarification: effClar,
      });
      setPmActionFeedback(
        `Delay Notice draft created for ${activity} (+${delayDays} days). Open the Daily Documentation tab (Step 6 · Edit Document) to review and export.`
      );
      addToast(`Delay Notice draft generated for ${activity}`, "⚖️");
    },
    [ensureSampleEvidenceLoaded, clarification, handleGenerateDraft, addToast]
  );

  const handlePmGenerateReport = useCallback(() => {
    ensureSampleEvidenceLoaded();
    setClassificationConfirmed(true);
    const effClar = clarification || {
      hours: 3,
      supplier: "ABC Concrete",
      impact: "Yes — Critical Path",
    };
    if (!clarification) setClarification(effClar);
    handleGenerateDraft({
      kind: "Report",
      overrideReportType: DAILY_REPORT,
      overrideClarification: effClar,
    });
    setPmActionFeedback(
      "Daily Construction Report draft generated from active site evidence. Open the Daily Documentation tab (Step 6 · Edit Document) to review and export."
    );
    addToast("Daily Construction Report draft generated", "📋");
  }, [ensureSampleEvidenceLoaded, clarification, handleGenerateDraft, addToast]);

  const handlePmReviewEvidence = useCallback(() => {
    ensureSampleEvidenceLoaded();
    handleOpenReview(DAILY_REPORT);
    setPmActionFeedback(
      "Evidence loaded and Daily Construction Report opened for review in the Daily Documentation tab."
    );
    addToast("Opened evidence for review", "🔍");
  }, [ensureSampleEvidenceLoaded, handleOpenReview, addToast]);

  // Knowledge Hub & Assistant helpers
  const savedDocLabel = generatedDocument && savedDraft ? `${generatedDocument} draft` : null;

  const answerQuestionFn = useCallback(
    (q) => answerQuestion(q, clarification, savedDocLabel),
    [clarification, savedDocLabel]
  );

  const recordSearch = useCallback((q) => {
    setRecentSearches((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 6));
  }, []);

  const handleAssistantAsk = useCallback(
    (q) => {
      recordSearch(q);
      const reply = answerQuestionFn(q);
      setKbMessages((prev) => [...prev, { role: "user", content: q }, reply]);
    },
    [recordSearch, answerQuestionFn]
  );

  const handleDeleteRepoDoc = useCallback(
    (id, name) => {
      setRepositoryDocs((prev) => prev.filter((d) => d.id !== id));
      addToast(`Deleted ${name} from Document Repository`, "🗑️");
    },
    [addToast]
  );

  return (
    <div className="app-shell">
      <Sidebar
        project={project}
        onProjectChange={setProject}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickDictate={handleQuickDictate}
      />

      <main className="main-content">
        <header className="site-hero">
          <div className="site-eyebrow">{project} · LIVE WORKSPACE</div>
          <h1>🏗 Good morning, John</h1>
        </header>

        {pmActionFeedback && (
          <div className="alert alert-info" style={{ marginBottom: 14, justifyContent: "space-between" }}>
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
            project={project}
            onCreateDelayNotice={handlePmCreateDelayNotice}
            onGenerateReport={handlePmGenerateReport}
            onReviewEvidence={handlePmReviewEvidence}
          />
        )}

        {activeTab === "meetings" && (
          <MeetingIntelligenceTab project={project} onToast={addToast} />
        )}
      </main>

      <ProjectAssistantDrawer
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
  );
}
