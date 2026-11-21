// Multi-label evidence classification. Every rule is a proposal for human review.
// Use extracted content rather than relying on a timestamp-based upload filename.
export const REPORT_TYPES = [
    "Daily Construction Report",
    "Site Inspection Report",
    "Incident/Safety Report",
    "Construction Progress Report",
    "Equipment Breakdown Report"
]

const normalize = value => String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()

// Strong signals include whole phrases, not incidental words such as "broken" in "broken leg".
const RULES = [
    {
        type:"Incident/Safety Report",
        signals:[
            [/(?:\bfall(?:en|ing)?\b|\bfell\b|\bslipp?(?:ed|ing)\b|\btripp?(?:ed|ing)\b|\bnear[- ]?miss\b|\balmost fell\b)/,3,"Fall or near miss"],
            [/\b(?:ambulance|paramedic|emergency services|hospital(?:i[sz]ed)?|first aid|medic|rettungswagen|krankenwagen|notarzt)\b/,4,"Medical or emergency response"],
            [/\b(?:broke|fractured|fracture|injured?|sprained|bleeding|wounded?|hurt)\b.{0,40}\b(?:leg|arm|hand|foot|head|back|worker|person|employee|knee)\b/,4,"Reported bodily injury"],
            [/\b(?:worker|person|employee|arbeiter|mitarbeiter)\b.{0,50}\b(?:hurt|injured|fractured|bleeding|fell|slipped|collapsed|unfall|verletzt)\b/,4,"Worker injury"],
            [/\b(?:accident|injury|incident|workplace injury|unfall|arbeitsunfall|verletzung|hazard|near miss|safety incident)\b/,3,"Incident or hazard described"],
            [/\b(?:missing|broken|unsafe|damaged|open)\b.{0,35}\b(?:guardrail|safety barrier|handrail|fall protection|scaffold|harness|ppe|helmet|safety net)\b/,3,"Unsafe protection or equipment"],
            [/\b(?:guardrail|safety barrier|fall protection|fall hazard|safety risk|no helmet|no harness|unsafe working)\b/,3,"Safety protection concern"],
            [/\b(?:sicherheitsmangel|absturz|gefahr|schutzgelander|schutzgelaender)\b/,3,"Safety-related German description"]
        ]
    },
    {
        type:"Site Inspection Report",
        signals:[
            [/\b(?:inspection|inspected|inspecting|site inspection|site test|onsite test|on-site test|test(?:ed|ing)? on (?:the )?(?:site|scene)|quality check|quality control|qa\/?qc|audit|walkthrough|begehung|prufung|pruefung|abnahme)\b/,3,"Site inspection or test performed"],
            [/\b(?:inspected|examined|verified|measured|checked|tested|sampled|assessed|surveyed|observed|found during inspection|inspection found)\b/,2,"Checking or verification activity"],
            [/\b(?:inspection|test|check|survey)\b.{0,80}\b(?:missing|defective|failed|noncompliant|non-compliant|damaged|deviation|discrepancy|passed)\b/,3,"Inspection finding"],
            [/\b(?:missing|defective|defect|nonconforming|non-conforming|not compliant|wrong dimensions|failed test)\b.{0,70}\b(?:test|inspection|check|audit|survey)\b/,3,"Defect found during check"]
        ]
    },
    {
        type:"Construction Progress Report",
        signals:[
            [/\b(?:installed|constructed|completed|finished|erected|poured|excavated|assembled|mounted|built|laid|demolished|backfilled|commissioned|fertiggestellt|eingebaut|montiert)\b/,3,"Work completed or installed"],
            [/\b(?:planned|actual|ahead of schedule|behind schedule|milestone|progress|completion|productivity|work completed|target|baseline|schedule delay|verspatung|fortschritt)\b/,3,"Planned or actual progress"],
            [/\b\d+(?:\.\d+)?\s*%\b|\b(?:percent|percentage)\s+(?:complete|finished|done)\b/,3,"Progress quantity"],
            [/\b(?:unable to finish|could not complete|work halted|work stopped|delay(?:ed)? installation|materials? (?:did not arrive|missing|late))\b/,2,"Work or schedule disruption"]
        ]
    },
    {
        type:"Equipment Breakdown Report",
        signals:[
            [/\b(?:crane|excavator|forklift|lift|hoist|generator|compressor|concrete pump|machine|machinery|bulldozer|loader|equipment|bagger|kran|maschine)\b.{0,100}\b(?:failed|broke down|broken|stopped|not working|malfunction(?:ed)?|out of service|hydraulic|mechanical fault|defect|repair|maintenance|overheated)\b/,4,"Construction equipment malfunction"],
            [/\b(?:failed|broken|stopped|malfunction(?:ed)?|out of service|repair(?:ed)?|maintenance|hydraulic failure)\b.{0,100}\b(?:crane|excavator|forklift|lift|hoist|generator|compressor|concrete pump|machine|equipment|bagger|kran|maschine)\b/,4,"Equipment outage or repair"],
            [/\b(?:equipment breakdown|machine breakdown|pump failure|hydraulic leak|engine fault|mechanical breakdown|kranausfall|maschinenausfall)\b/,4,"Equipment failure"]
        ]
    }
]

export function classifyEvidence({name="", text="", category=""}={}) {
    const body=normalize(text).replace(/\b(?:no|without|zero|kein|keine)\s+(?:reported\s+)?(?:injur(?:y|ies)|accidents?|incidents?|hazards?)\b/g, "")
    const file=normalize(name)
    const scores={}
    const reasons={}
    let types=[]

    for (const {type, signals} of RULES) {
        let score=0
        const matches=[]
        for (const [pattern, weight, description] of signals) {
            if (pattern.test(body)) {
                score+=weight
                matches.push(description)
            }
        }
        // Meaningful text should determine classification. Descriptive file names are weak hints.
        if (!body && file && signals.some(([pattern])=>pattern.test(file))) {
            score=Math.max(score,1)
            matches.push("Filename suggests this type; content not verified")
        }
        scores[type]=score
        if (score>=2) {
            types.push(type)
            reasons[type]=matches
        }
    }

    // Daily report is useful for site notes containing actual work or events.
    if (body || types.length) types.unshift("Daily Construction Report")
    else if (category==="voice" || category==="photo") types=[] // no semantic evidence yet
    else types=["Daily Construction Report"] // undecoded documents remain reviewable

    return {
        types:[...new Set(types)],
        scores,
        reasons,
        method:"multi-label rules",
        needs_review:!body || (types.length===1 && types[0]==="Daily Construction Report")
    }
}