import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { computeBtcLenderQualityScore } from '@/lib/btcLenderScore'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

const SYSTEM_PROMPT = `You are a Senior Digital Credit Yield Research Analyst for Digital Credit Compass (DCC).
Your task is to PRE-FILL the Provider Quality Score inputs for each Bitcoin-backed lender based on publicly available information.
We will compute the final score (0–100) deterministically from these inputs.

For each lender, return a JSON object with the following keys when you can infer them from the input. Use null or omit keys when unknown.

TRANSPARENCY (machine-scorable):
- tosPublic: true/false (public terms of service without login)
- liquidationLtvPublished: true/false (exact liquidation LTV disclosed)
- marginCallRulesPublished: true/false (margin call level(s) defined)
- feeScheduleDisclosed: "Yes" | "Partial" | "No"
- collateralHandlingDisclosed: "Yes" | "Partial" | "No"
- termsAfterOnboarding: true/false (terms only after sign-up) — penalty
- liquidationVague: true/false ("may liquidate" etc.) — penalty
- feesVariableNoRange: true/false (fees "variable" with no range) — penalty

RISK CONTROL:
- collateralTopUpSpeed: "Instant" | "Same-day" | "Delayed" | "Not allowed"
- partialRepayment: "Anytime" | "Limited" | "Not allowed"
- earlyClosure: "Anytime" | "With penalty" | "Locked"
- marginCallGracePeriod: "≥24h" | "1–12h" | "Immediate"
- autoRepay: true/false
- autoTopUp: true/false
- alerts: true/false

JURISDICTION:
- governingLaw: "US" | "Switzerland" | "Luxembourg" | "Germany" | "EU" | "UK" | "Singapore" | "UAE" | "Hong Kong" | "Cayman" | "BVI" | "Seychelles" | "Panama" | "Unknown"
- separateSpv: true/false (separate lending SPV)

STRUCTURE:
- custodyModel: "Segregated" | "Commingled"
- rehypothecationAllowed: true/false
- btcLentOnward: true/false
- counterpartyCount: "Single" | "Multiple"

TRACK RECORD:
- yearsOperating: number (e.g. 3)
- knownIncidents: "None" | "Minor" | "Major"
- historicalFreezes: true/false

Respond with ONLY a valid JSON object, no other text. Format:
{
  "prefills": [
    {
      "id": "lender-uuid-from-input",
      "tosPublic": true,
      "liquidationLtvPublished": true,
      "marginCallRulesPublished": true,
      "feeScheduleDisclosed": "Yes",
      "collateralHandlingDisclosed": "Yes",
      "collateralTopUpSpeed": "Instant",
      "partialRepayment": "Anytime",
      "earlyClosure": "Anytime",
      "marginCallGracePeriod": "≥24h",
      "governingLaw": "US",
      "separateSpv": true,
      "custodyModel": "Segregated",
      "rehypothecationAllowed": false,
      "yearsOperating": 5,
      "knownIncidents": "None",
      "historicalFreezes": false
    }
  ]
}

Include exactly one entry per lender id. Use only the keys you can infer; omit or set null for unknown. Use ONLY the information provided for each product.`

/** POST /api/bitcoin-backed-lenders/score – pre-fill scoring fields via ChatGPT, then compute score deterministically and persist */
export async function POST(request) {
  try {
    if (!prisma?.bitcoinBackedLender) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY is not configured. Set it in .env to use the Score feature.' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string') : null

    const where = ids && ids.length > 0 ? { id: { in: ids } } : {}
    const lenders = await prisma.bitcoinBackedLender.findMany({
      where,
      orderBy: [{ category: 'asc' }, { issuerProvider: 'asc' }, { productInstrument: 'asc' }],
    })

    if (lenders.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No lenders to score.',
      })
    }

    const userPrompt = `Bitcoin-backed lenders to pre-fill (id | issuerProvider | productInstrument | apyCost | jurisdiction | notes | sources | category):

${lenders
  .map(
    (p) =>
      `${p.id} | ${p.issuerProvider ?? ''} | ${p.productInstrument ?? ''} | ${p.apyCost ?? ''} | ${p.jurisdiction ?? ''} | ${(p.notes ?? '').slice(0, 300)} | ${p.sources ?? ''} | ${p.category ?? ''}`
  )
  .join('\n')}

Return the JSON object with "prefills" array: one object per id with the keys you can infer (tosPublic, liquidationLtvPublished, feeScheduleDisclosed, collateralTopUpSpeed, governingLaw, custodyModel, yearsOperating, etc.). Omit or null unknown.`

    const openai = new OpenAI({ apiKey: apiKey.trim() })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const raw = completion?.choices?.[0]?.message?.content
    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Empty response from OpenAI.' },
        { status: 500 }
      )
    }

    let parsed
    try {
      const jsonStr = raw.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse OpenAI response as JSON.' },
        { status: 500 }
      )
    }

    const prefills = parsed?.prefills
    if (!Array.isArray(prefills)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response format: expected "prefills" array.' },
        { status: 500 }
      )
    }

    const byId = new Map(lenders.map((p) => [p.id, p]))
    const scoringKeys = [
      'tosPublic', 'liquidationLtvPublished', 'marginCallRulesPublished', 'feeScheduleDisclosed', 'collateralHandlingDisclosed',
      'termsAfterOnboarding', 'liquidationVague', 'feesVariableNoRange',
      'collateralTopUpSpeed', 'partialRepayment', 'earlyClosure', 'marginCallGracePeriod', 'autoRepay', 'autoTopUp', 'alerts',
      'governingLaw', 'separateSpv',
      'custodyModel', 'rehypothecationAllowed', 'btcLentOnward', 'counterpartyCount',
      'yearsOperating', 'knownIncidents', 'historicalFreezes',
    ]
    let updated = 0

    for (const entry of prefills) {
      const id = entry?.id
      if (!id || !byId.has(id)) continue

      const existing = byId.get(id)
      const prefill = { ...entry }
      delete prefill.id

      const data = {}
      for (const key of scoringKeys) {
        if (prefill[key] === undefined) continue
        const v = prefill[key]
        if (key === 'yearsOperating') {
          const n = v == null ? null : Number(v)
          data[key] = n != null && Number.isFinite(n) ? n : null
        } else if (typeof v === 'boolean') {
          data[key] = v
        } else if (typeof v === 'string' && v.trim() !== '') {
          data[key] = v.trim()
        } else if (v === null) {
          data[key] = null
        }
      }

      const merged = { ...existing, ...data }
      const computed = computeBtcLenderQualityScore(merged)
      if (computed) {
        data.qualityScore = computed.total
        data.qualityScoreBreakdown = JSON.stringify(computed.breakdown)
      }

      if (Object.keys(data).length > 0) {
        await prisma.bitcoinBackedLender.update({
          where: { id },
          data,
        })
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `Pre-fill and score updated for ${updated} lender(s).`,
    })
  } catch (e) {
    console.error('POST /api/bitcoin-backed-lenders/score:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Score computation failed' },
      { status: 500 }
    )
  }
}
