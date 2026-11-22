import { Router } from "express"
import multer from "multer"
import nodemailer from "nodemailer"
import path from "node:path"

const router = Router()
const MAX_FILE_BYTES = 12 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: 1,
    fields: 5
  }
})

const attempts = new Map()

router.post("/send", (req, res) => {
  upload.single("report")(req, res, async error => {
    if (error) {
      return res.status(400).json({
        error: error.code === "LIMIT_FILE_SIZE"
          ? "Attachment is too large (max 12 MB)"
          : "Invalid attachment"
      })
    }

    try {
      const to = String(req.body?.to || "").trim().toLowerCase()
      const subject = String(req.body?.subject || "").trim()
      const message = String(req.body?.message || "").trim()
      const project = String(req.body?.project || "").trim()

      const allowed = String(
        process.env.EMAIL_ALLOWED_RECIPIENTS || ""
      )
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

      if (
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS ||
        !process.env.SMTP_HOST
      ) {
        return res.status(503).json({
          error: "Email SMTP is not configured on the server"
        })
      }

      if (!allowed.length) {
        return res.status(503).json({
          error: "Set EMAIL_ALLOWED_RECIPIENTS in backend/.env first"
        })
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({
          error: "Enter a valid recipient address"
        })
      }

      if (!allowed.includes(to)) {
        return res.status(403).json({
          error: "This recipient is not on the allowed email list"
        })
      }

      if (
        !subject ||
        subject.length > 180 ||
        /[\r\n]/.test(subject)
      ) {
        return res.status(400).json({
          error: "Invalid email subject"
        })
      }

      if (message.length > 4000 || project.length > 100) {
        return res.status(400).json({
          error: "Message or project name is too long"
        })
      }

      const file = req.file
      const ext = path.extname(
        file?.originalname || ""
      ).toLowerCase()

      const validType = ext === ".pdf"
        ? "application/pdf"
        : ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : null

      if (
        !file?.buffer?.length ||
        !validType ||
        file.mimetype !== validType
      ) {
        return res.status(400).json({
          error: "Attach a valid PDF or Word report"
        })
      }

      const key = req.ip || "unknown"
      const now = Date.now()

      const history = (attempts.get(key) || [])
        .filter(t => now - t < 3600000)

      if (history.length >= 8) {
        return res.status(429).json({
          error: "Email limit reached. Try again later."
        })
      }

      history.push(now)
      attempts.set(key, history)

      const port = Number(process.env.SMTP_PORT || 587)

      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        disableFileAccess: true,
        disableUrlAccess: true
      })

      const filename = path.basename(file.originalname)
        .replace(/[^a-zA-Z0-9._ -]/g, "_")
        .slice(0, 120)

      const result = await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: message ||
          `Please find the ${project || "construction"} report attached.`,
        attachments: [{
          filename,
          content: file.buffer,
          contentType: validType
        }]
      })

      if (
        !result.accepted?.some(
          email => email.toLowerCase() === to
        )
      ) {
        throw new Error("Recipient was not accepted by SMTP")
      }

      return res.json({
        success: true,
        message: "Email accepted by mail server"
      })
    } catch (err) {
      console.error("Report email failed:", err.message)

      return res.status(502).json({
        error: "Email could not be sent. Check SMTP settings and server logs."
      })
    }
  })
})

export default router