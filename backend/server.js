import express from "express"
import cors from "cors"
import multer from "multer"
import path from "node:path"

const app = express()
const PORT = 3000

const WHISPER_URL = "http://127.0.0.1:8001"
const QWEN_URL = "http://127.0.0.1:8002"

app.use(cors({ origin: "http://localhost:5173" }))
app.use(express.json({ limit: "128kb" }))

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
})

const audioExtensions = new Set([
    ".wav", ".mp3", ".webm", ".ogg", ".m4a", ".mp4", ".flac"
])

async function requestAI(url, body, headers, timeout = 300000) {
    const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(timeout)
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || "AI service failed")
    }

    return data
}

async function generateReport(text) {
    const result = await requestAI(
        `${QWEN_URL}/generate`,
        JSON.stringify({ text }),
        { "Content-Type": "application/json" }
    )

    return result.report
}

async function transcribeAudio(file) {
    const extension = path.extname(file.originalname).toLowerCase()

    if (!audioExtensions.has(extension)) {
        throw new Error("Unsupported audio format")
    }

    return await requestAI(
        `${WHISPER_URL}/transcribe`,
        file.buffer,
        {
            "Content-Type": "application/octet-stream",
            "X-Audio-Extension": extension
        }
    )
}

// Backend health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "running",
        services: {
            whisper: WHISPER_URL,
            qwen: QWEN_URL
        }
    })
})

// Text -> Qwen -> JSON
app.post("/api/report/text", async (req, res) => {
    const { text } = req.body || {}

    if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({
            error: "Text is required"
        })
    }

    try {
        console.log("Text received:", text)

        const report = await generateReport(text)

        console.log("Qwen report generated")

        res.json({
            success: true,
            report
        })
    } catch (error) {
        console.error("Qwen error:", error.message)

        res.status(502).json({
            success: false,
            error: error.message
        })
    }
})

// Audio -> Whisper -> JSON
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: "Audio file required"
        })
    }

    try {
        const transcription = await transcribeAudio(req.file)

        res.json({
            success: true,
            transcription
        })
    } catch (error) {
        console.error("Whisper error:", error.message)

        res.status(502).json({
            success: false,
            error: error.message
        })
    }
})

// Audio -> Whisper -> Qwen -> JSON
app.post("/api/report", upload.single("audio"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: "Audio file required"
        })
    }

    try {
        console.log("Audio received")

        const transcription = await transcribeAudio(req.file)

        console.log("Whisper:", transcription.text)

        if (!transcription.text?.trim()) {
            return res.status(422).json({
                success: false,
                error: "No speech detected"
            })
        }

        const report = await generateReport(transcription.text)

        console.log("Qwen report generated")

        res.json({
            success: true,
            transcription,
            report
        })
    } catch (error) {
        console.error("Pipeline error:", error.message)

        res.status(502).json({
            success: false,
            error: error.message
        })
    }
})

// Upload errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: error.message
        })
    }

    console.error(error)

    res.status(500).json({
        error: "Request failed"
    })
})

app.listen(PORT, () => {
    console.log(`Express running on http://localhost:${PORT}`)
})