import { api } from "../api/client"

export async function translateReportTemplate(template) {
  const response = await api("/api/report/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      target_language: "de",
      template
    })
  })

  const translated = response?.template

  if (
    !response?.success ||
    !translated ||
    !translated.sections
  ) {
    throw new Error("German translation failed")
  }

  const before = Object.keys(template.sections).sort()
  const after = Object.keys(translated.sections).sort()

  if (
    JSON.stringify(before) !== JSON.stringify(after) ||
    template.date !== translated.date ||
    template.bautag !== translated.bautag ||
    (template.photos || []).length !==
      (translated.photos || []).length
  ) {
    throw new Error(
      "German translation changed report structure"
    )
  }

  return translated
}