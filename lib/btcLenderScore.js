/**
 * DCC Provider Quality Score for Bitcoin-backed lending platforms.
 * Deterministic computation from admin dropdown/input fields.
 * Returns { total, breakdown } or null if insufficient data.
 */

function toBool(v) {
  if (v === true || v === 1) return true
  if (v === false || v === 0) return false
  if (v == null || v === '') return null
  const s = String(v).toLowerCase()
  if (s === 'true' || s === 'yes' || s === '1') return true
  if (s === 'false' || s === 'no' || s === '0') return false
  return null
}

function toStr(v) {
  if (v == null || v === '') return null
  return String(v).trim() || null
}

/** Transparency 0–30: TOS +6, liquidation LTV +6, margin call +6, fee schedule +6, collateral +6. Penalties −5 each. */
function transparencyScore(lender) {
  let pts = 0
  if (toBool(lender.tosPublic)) pts += 6
  if (toBool(lender.liquidationLtvPublished)) pts += 6
  if (toBool(lender.marginCallRulesPublished)) pts += 6
  const fee = toStr(lender.feeScheduleDisclosed)
  if (fee === 'Yes') pts += 6
  else if (fee === 'Partial') pts += 3
  const coll = toStr(lender.collateralHandlingDisclosed)
  if (coll === 'Yes') pts += 6
  else if (coll === 'Partial') pts += 3
  if (toBool(lender.termsAfterOnboarding)) pts -= 5
  if (toBool(lender.liquidationVague)) pts -= 5
  if (toBool(lender.feesVariableNoRange)) pts -= 5
  return Math.max(0, Math.min(30, pts))
}

/** Risk Control 0–25: top-up 0–7, partial repayment 0–6, early closure 0–5, grace 0–4, tools 0–3. */
function riskControlScore(lender) {
  const topUp = toStr(lender.collateralTopUpSpeed)
  let pts = 0
  if (topUp === 'Instant') pts += 7
  else if (topUp === 'Same-day') pts += 4
  else if (topUp === 'Delayed') pts += 2
  const part = toStr(lender.partialRepayment)
  if (part === 'Anytime') pts += 6
  else if (part === 'Limited') pts += 3
  const closure = toStr(lender.earlyClosure)
  if (closure === 'Anytime') pts += 5
  else if (closure === 'With penalty') pts += 3
  const grace = toStr(lender.marginCallGracePeriod)
  if (grace === '≥24h' || grace === '24h') pts += 4
  else if (grace === '1–12h' || grace === '1-12h') pts += 2
  if (toBool(lender.autoRepay)) pts += 2
  else if (toBool(lender.autoTopUp)) pts += 2
  if (toBool(lender.alerts)) pts += 1
  return Math.max(0, Math.min(25, pts))
}

const JURISDICTION_TIERS = {
  US: 20,
  Switzerland: 20,
  Luxembourg: 20,
  Germany: 20,
  EU: 20,
  UK: 17,
  Singapore: 17,
  UAE: 14,
  'Hong Kong': 14,
  Cayman: 8,
  BVI: 8,
  Seychelles: 5,
  Panama: 5,
  Unknown: 0,
}

/** Jurisdiction 0–20: tier + governing law stated +2, separate SPV +2. Cap 20. */
function jurisdictionScore(lender) {
  const law = toStr(lender.governingLaw)
  let pts = 0
  if (law) {
    const tier = JURISDICTION_TIERS[law] ?? JURISDICTION_TIERS.Unknown
    pts = typeof tier === 'number' ? tier : 0
  }
  if (toBool(lender.separateSpv)) pts += 2
  if (law) pts += 2
  return Math.max(0, Math.min(20, pts))
}

/** Structure 0–15: custody base then penalties. */
function structureScore(lender) {
  const custody = toStr(lender.custodyModel)
  const rehyp = toBool(lender.rehypothecationAllowed)
  let pts = 0
  if (custody === 'Segregated' && !rehyp) pts = 15
  else if (custody === 'Segregated' && rehyp) pts = 10
  else if (custody === 'Commingled') pts = 7
  else pts = 4
  if (toBool(lender.rehypothecationAllowed)) pts -= 3
  if (toBool(lender.btcLentOnward)) pts -= 3
  if (toStr(lender.counterpartyCount) === 'Multiple') pts -= 2
  return Math.max(0, pts)
}

/** Track Record 0–10: years + incidents, then penalties. */
function trackRecordScore(lender) {
  const years = lender.yearsOperating != null ? Number(lender.yearsOperating) : null
  const incidents = toStr(lender.knownIncidents)
  const freezes = toBool(lender.historicalFreezes)
  let pts = 0
  if (incidents === 'Major' || freezes) pts = 2
  else if (years != null && Number.isFinite(years)) {
    if (years >= 5 && incidents !== 'Minor' && incidents !== 'Major') pts = 10
    else if (years >= 3 && years < 5) pts = 7
    else if (years >= 1 && years < 3) pts = 5
    else if (years < 1) pts = 2
  }
  if (freezes) pts -= 3
  if (incidents === 'Major') pts -= 5
  return Math.max(0, Math.min(10, pts))
}

const SCORING_STRING_FIELDS = [
  'feeScheduleDisclosed',
  'collateralHandlingDisclosed',
  'collateralTopUpSpeed',
  'partialRepayment',
  'earlyClosure',
  'marginCallGracePeriod',
  'governingLaw',
  'custodyModel',
  'counterpartyCount',
  'knownIncidents',
]
const SCORING_BOOL_FIELDS = [
  'tosPublic',
  'liquidationLtvPublished',
  'marginCallRulesPublished',
  'termsAfterOnboarding',
  'liquidationVague',
  'feesVariableNoRange',
  'autoRepay',
  'autoTopUp',
  'alerts',
  'separateSpv',
  'rehypothecationAllowed',
  'btcLentOnward',
  'historicalFreezes',
]

function parseBool(v) {
  if (v === true || v === 1) return true
  if (v === false || v === 0 || v === null || v === '') return false
  const s = String(v).toLowerCase()
  return s === 'true' || s === 'yes' || s === '1'
}

/**
 * Apply scoring fields from body onto data. For PATCH set onlyDefined: true to only set keys present in body.
 */
export function applyBtcLenderScoringFields(data, body, { onlyDefined = false } = {}) {
  for (const key of SCORING_STRING_FIELDS) {
    if (onlyDefined && body[key] === undefined) continue
    const v = body[key]
    data[key] = v != null && v !== '' ? String(v).trim() || null : null
  }
  for (const key of SCORING_BOOL_FIELDS) {
    if (onlyDefined && body[key] === undefined) continue
    const v = body[key]
    if (v === undefined && onlyDefined) continue
    data[key] = v === null || v === '' ? null : parseBool(v)
  }
  if (onlyDefined && body.yearsOperating === undefined) return
  const yr = body.yearsOperating
  const n = yr == null || yr === '' ? null : Number(yr)
  data.yearsOperating = n != null && Number.isFinite(n) && n >= 0 ? n : null
}


/**
 * Compute Provider Quality Score (0–100) from lender record.
 * @param {Object} lender - Record with scoring fields (from DB or body)
 * @returns {{ total: number, breakdown: { transparency, riskControl, jurisdiction, structure, trackRecord } } | null}
 */
export function computeBtcLenderQualityScore(lender) {
  if (!lender || typeof lender !== 'object') return null
  const transparency = transparencyScore(lender)
  const riskControl = riskControlScore(lender)
  const jurisdiction = jurisdictionScore(lender)
  const structure = structureScore(lender)
  const trackRecord = trackRecordScore(lender)
  const total = transparency + riskControl + jurisdiction + structure + trackRecord
  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: {
      transparency,
      riskControl,
      jurisdiction,
      structure,
      trackRecord,
    },
  }
}
