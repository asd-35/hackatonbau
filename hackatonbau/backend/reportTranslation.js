export function registerReportTranslation(app, qwenUrl) {
  app.post("/api/report/translate", async (req, res) => {
    const { target_language, template } = req.body || {}

    if (
      target_language !== "de" ||
      !template ||
      typeof template !== "object" ||
      !template.sections ||
      typeof template.sections !== "object"
    ) {
      return res.status(400).json({
        error: "Expected a German report template"
      })
    }

    try {
      const response = await fetch(`${qwenUrl}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target_language,
          template
        }),
        signal: AbortSignal.timeout(240000)
      })

      const data = await response.json()

      if (
        !response.ok ||
        !data.success ||
        !data.template?.sections
      ) {
        return res.status(502).json({
          error: data.error || "German translation failed"
        })
      }

      res.json({
        success: true,
        template: data.template
      })
    } catch (error) {
      res.status(502).json({
        error: `Translation service unavailable: ${error.message}`
      })
    }
  })
}