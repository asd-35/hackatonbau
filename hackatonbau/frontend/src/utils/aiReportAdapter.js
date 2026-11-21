import { REPORT_TYPES } from "../data/mockData"

const BAD_VALUE = /[{}\[\]<>]|\w_\w|\b(?:undefined|function)\b/i
const EMPTY = /^(?:none|null|unknown|not available|not specified)$/i
const FUTURE = /\b(?:tomorrow|will|should|must|planned? to|plan to|needs? to be)\b/i
const NOT_DONE = /\b(?:not installed|not completed|never installed|wasn't installed|were not installed|awaiting installation)\b/i
const WEATHER = /\b(?:weather|rain|rainy|raining|snow|snowing|cloudy|overcast|sunny|windy|fog|temperature|degrees|celsius|drizzle)\b/i
const STAFFING = /\b(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|hundred)\s+(?:workers?|employees?|laborers?)|workers? (?:present|on site)|crew (?:present|on site))\b/i
const INSPECTION = /\b(?:inspected|inspection|examined|checked|tested|discovered|measured|verified|quality check)\b/i
const SAFETY = /\b(?:fell|fall|slipped|injured|injury|ambulance|taken to (?:the )?hospital|hospitalized|first aid|near miss|hazard|accident|safety barrier|guardrail|unsecured|platform collapsed|safety supervisor|staircase was closed)\b/i
const EQUIPMENT = /\b(?:crane|excavator|forklift|lift|hoist|generator|pump|compressor|bulldozer|machine|machinery)\b/i
const WORK = /\b(?:installed|completed|finished|constructed|poured|mounted|laid|excavated|assembled|backfilled|achieved)\b/i

function normalize(value) {
  if (typeof value !== "string") return ""
  const result = value.replace(/\s+/g, " ").trim()

  return result &&
    result.length <= 600 &&
    !BAD_VALUE.test(result) &&
    !EMPTY.test(result)
    ? result
    : ""
}

function unique(values) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.map(normalize).filter(Boolean))]
}

function format(values) {
  return values.join("\n")
}

function combine(...blocks) {
  return blocks
    .map(x => String(x || "").trim())
    .filter(Boolean)
    .join("\n")
}

function filter(values, expression) {
  return unique(values).filter(value => expression.test(value))
}

function group(details, field) {
  return unique(details?.[field])
}

export function aiReportToTemplate(
  report,
  selectedType,
  photoList = [],
  evidenceNames = []
) {
  const details = report?.section_details || {}

  const weather = filter(details.weather, WEATHER)
  const staffing = filter(details.staffing, STAFFING)

  const inspections = filter(
    details.inspections,
    INSPECTION
  ).filter(s => !/^tomorrow\b/i.test(s))

  const delays = group(details, "delays")
  const instructions = group(details, "instructions")
  const deliveries = group(details, "deliveries")
  const equipmentFacts = filter(details.equipment, EQUIPMENT)

  const equipment = equipmentFacts.length > 1
    ? equipmentFacts.filter(s => !delays.includes(s))
    : equipmentFacts

  const safety = filter(details.safety, SAFETY)

  const completed = filter(
    details.completed_work,
    WORK
  ).filter(
    s => !NOT_DONE.test(s) && !FUTURE.test(s)
  )

  const issues = group(details, "issues")

  const hasSections =
    report?.section_details &&
    Object.keys(details).length > 0

  const work = hasSections
    ? completed
    : unique(report?.completed_work).filter(
        s => WORK.test(s) && !NOT_DONE.test(s) && !FUTURE.test(s)
      )

  const problems = hasSections
    ? issues
    : unique(report?.issues)

  const represented = new Set([
    ...inspections,
    ...delays,
    ...equipment,
    ...safety
  ])

  const extraIssues = problems.filter(
    s => !represented.has(s)
  )

  const count =
    Number.isInteger(report?.workers_present) &&
    report.workers_present >= 0
      ? report.workers_present
      : null

  const photos = Array.isArray(photoList)
    ? photoList
        .filter(
          row =>
            Array.isArray(row) &&
            Number.isInteger(Number(row[0]))
        )
        .map(([id, name]) => ({
          id: Number(id),
          caption: `Evidence: ${name}. Description requires human review.`
        }))
    : []

  const allSections = {
    Witterung: format(weather),

    Besetzung: combine(
      format(staffing),

      count !== null && staffing.length === 0
        ? `${count} workers reported on site.`
        : "",

      normalize(report?.location)
        ? `Reported location: ${normalize(report.location)}`
        : ""
    ),

    Begehung: format(inspections),
    Behinderung: format(delays),
    Anordnung: format(instructions),
    Tagesleistungen: format(work),
    Vorkommnis: format(safety),
    Lieferungen: format(deliveries),
    Geräte: format(equipment),

    "Bemerkung (extern)": format(extraIssues),

    "Fotos / Freigabe": photos.length
      ? `${photos.length} photo(s) attached. Approval not confirmed.`
      : ""
  }

  const allowed =
    REPORT_TYPES[selectedType]?.sections ||
    Object.keys(allSections)

  const sections = Object.fromEntries(
    allowed
      .map(key => [key, allSections[key]])
      .filter(([, body]) => Boolean(body))
  )

  const headline = (
    work[0] ||
    inspections[0] ||
    safety[0] ||
    equipment[0] ||
    "Construction site report"
  ).slice(0, 130)

  const highlights = [
    ...new Set([
      ...work,
      ...safety,
      ...equipment,
      ...weather,
      ...inspections,
      ...extraIssues
    ])
  ]

  const summary =
    highlights.slice(0, 3).join(" ").slice(0, 600) ||
    "Construction evidence uploaded; review required."

  const suppliedDate = String(
    report?.report_date || ""
  ).trim()

  const date = /^\d{4}-\d{2}-\d{2}$/.test(suppliedDate)
    ? suppliedDate
    : new Date().toISOString().slice(0, 10)

  return {
    bautag: "",
    date,
    headline,
    summary,
    sections,
    photos
  }
}