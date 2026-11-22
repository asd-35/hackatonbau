import React, { useEffect, useState } from "react"
import { Mail, Send, X } from "lucide-react"
import {
  documentSlug,
  parseEditorText,
  reportPhotos
} from "../utils/documentUtils"
import {
  generateReportDocxBlob,
  generateReportPdfBlob
} from "../utils/exporters"

export default function EmailReportButton({
  project,
  generatedDocument,
  savedDraft,
  draftIsSaved,
  lockedTimestamp,
  lockedDocId,
  photoDataUrls,
  includeInternal = true
}) {
  const [open, setOpen] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [format, setFormat] = useState("pdf")
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    setOpen(false)
    setFeedback("")
  }, [project, lockedDocId])

  const show = () => {
    setSubject(`${generatedDocument} | ${project} | ${lockedDocId}`)
    setMessage(
      `Hello,\n\nPlease find the construction report for ${project} attached.\n\nBest regards,\nBauDackel Site Team`
    )
    setFeedback("")
    setOpen(true)
  }

  const send = async event => {
    event.preventDefault()

    if (!savedDraft?.text || !draftIsSaved || sending) return

    setSending(true)
    setFeedback("")

    try {
      const doc = parseEditorText(
        savedDraft.text,
        lockedTimestamp,
        lockedDocId
      )

      doc.fields = {
        ...doc.fields,
        status: "Exported"
      }

      const photos = reportPhotos(doc, photoDataUrls)
      const isPdf = format === "pdf"

      const blob = isPdf
        ? generateReportPdfBlob(doc, photos, includeInternal)
        : await generateReportDocxBlob(
            doc,
            photos,
            includeInternal
          )

      const extension = isPdf ? "pdf" : "docx"

      const mime = isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

      const filename = `${documentSlug(generatedDocument)}.${extension}`

      const body = new FormData()

      body.append("to", recipient.trim())
      body.append("subject", subject.trim())
      body.append("message", message)
      body.append("project", project)

      body.append(
        "report",
        new File([blob], filename, { type: mime })
      )

      const response = await fetch(
        "/api/reports/email/send",
        {
          method: "POST",
          body
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error || `Server error (${response.status})`
        )
      }

      setFeedback(
        `Email submitted for delivery to ${recipient.trim()}`
      )
    } catch (error) {
      setFeedback(`Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        disabled={!draftIsSaved}
        onClick={show}
      >
        <Mail size={15} />
        Send Email
      </button>

      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          style={{ zIndex: 9999 }}
          onMouseDown={event => {
            if (
              event.target === event.currentTarget &&
              !sending
            ) {
              setOpen(false)
            }
          }}
        >
          <div
            className="modal-card stack"
            role="dialog"
            aria-modal="true"
            aria-label="Email construction report"
            style={{
              width: "min(520px, calc(100vw - 24px))",
              maxHeight: "85vh",
              overflowY: "auto"
            }}
          >
            <div className="flex-between">
              <div>
                <h3 style={{ margin: 0 }}>
                  Send construction report
                </h3>

                <p className="caption">
                  {project} · {lockedDocId}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={sending}
                onClick={() => setOpen(false)}
                aria-label="Close email dialog"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={send} className="stack-sm">
              <label
                className="field-label"
                htmlFor="email-report-to"
              >
                Recipient email
              </label>

              <input
                id="email-report-to"
                className="input"
                type="email"
                required
                autoComplete="email"
                value={recipient}
                onChange={event =>
                  setRecipient(event.target.value)
                }
                placeholder="site.manager@example.com"
              />

              <label
                className="field-label"
                htmlFor="email-report-subject"
              >
                Subject
              </label>

              <input
                id="email-report-subject"
                className="input"
                required
                maxLength={180}
                value={subject}
                onChange={event =>
                  setSubject(event.target.value)
                }
              />

              <label
                className="field-label"
                htmlFor="email-report-message"
              >
                Message
              </label>

              <textarea
                id="email-report-message"
                className="textarea"
                rows={5}
                maxLength={4000}
                value={message}
                onChange={event =>
                  setMessage(event.target.value)
                }
              />

              <label
                className="field-label"
                htmlFor="email-report-format"
              >
                Attachment format
              </label>

              <select
                id="email-report-format"
                className="input"
                value={format}
                onChange={event =>
                  setFormat(event.target.value)
                }
              >
                <option value="pdf">PDF</option>
                <option value="docx">Word (.docx)</option>
              </select>

              <p
                className="caption"
                style={{ margin: 0 }}
              >
                The saved report will be attached automatically.
                Only addresses configured by the site administrator
                can receive emails.
              </p>

              {feedback && (
                <div
                  role="status"
                  className="alert alert-info"
                  style={{
                    color: feedback.startsWith("Error:")
                      ? "#b91c1c"
                      : "#166534"
                  }}
                >
                  {feedback}
                </div>
              )}

              <div
                className="flex-row"
                style={{ justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  className="btn"
                  disabled={sending}
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    sending ||
                    !recipient.trim() ||
                    !subject.trim()
                  }
                >
                  <Send size={14} />
                  {sending
                    ? "Sending..."
                    : "Send with attachment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}