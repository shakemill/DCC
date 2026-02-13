import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

const SYSTEM_PROMPT = `You are a Senior Digital Credit Yield Research Analyst for Digital Credit Compass (DCC).
Your task is to compute the Provider Quality Score (0–100) for each Fiat / USD income product (digital credit yield instruments) based on publicly available information.

Score each product on these 5 dimensions (total must equal the sum of the 5 sub-scores, max 100):

1. TRANSPARENCY (0–30 points): Terms of service/public docs, LTV/liquidation disclosure, margin call mechanics, fee transparency, collateral clarity.
2. RISK CONTROL & FLEXIBILITY (0–25 points): Top-up/partial repayment, early closure, grace period, user control tools.
3. JURISDICTION (0–20 points): Applicable jurisdiction, SPV structure, regulatory clarity.
4. STRUCTURE RISK (0–15 points): Custody model, rehypothecation risk, counterparty concentration.
5. TRACK RECORD (0–10 points): Age of product/protocol, incident history, freezes or restrictions.

Use ONLY the information provided for each product. If information is missing, score that dimension conservatively (lower).
Base scores on observable facts, not speculation.

Respond with ONLY a valid JSON object, no other text. Format:
{
  "scores": [
    {
      "id": "product-uuid-from-input",
      "total": 78,
      "breakdown": {
        "transparency": 24,
        "riskControl": 18,
        "jurisdiction": 17,
        "structure": 10,
        "trackRecord": 9
      }
    }
  ]
}

Include exactly one entry per product id from the input. Each total must be between 0 and 100. Each breakdown sum must equal total.`

/** POST /api/usd-income/score – compute quality scores via ChatGPT and persist */
export async function POST(request) {
  try {
    if (!prisma?.usdIncomeProduct) {
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
    const products = await prisma.usdIncomeProduct.findMany({
      where,
      orderBy: [{ issuer: 'asc' }, { product: 'asc' }],
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No products to score.',
      })
    }

    const userPrompt = `Products to score (id | issuer | product | ticker | type | apyDistribution | duration | seniority | simpleDescription | keyRisks | availability):

${products
  .map(
    (p) =>
      `${p.id} | ${p.issuer ?? ''} | ${p.product ?? ''} | ${p.ticker ?? ''} | ${p.type ?? ''} | ${p.apyDistribution ?? ''} | ${p.duration ?? ''} | ${p.seniority ?? ''} | ${(p.simpleDescription ?? '').slice(0, 200)} | ${(p.keyRisks ?? '').slice(0, 200)} | ${p.availability ?? ''}`
  )
  .join('\n')}

Return the JSON object with scores for each product id.`

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

    const scores = parsed?.scores
    if (!Array.isArray(scores)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response format: expected "scores" array.' },
        { status: 500 }
      )
    }

    const byId = new Map(products.map((p) => [p.id, p]))
    let updated = 0

    for (const entry of scores) {
      const id = entry?.id
      const total = entry?.total
      const breakdown = entry?.breakdown

      if (!id || !byId.has(id)) continue
      if (typeof total !== 'number' || total < 0 || total > 100) continue

      const breakdownStr =
        breakdown && typeof breakdown === 'object'
          ? JSON.stringify({
              transparency: Number(breakdown.transparency) || 0,
              riskControl: Number(breakdown.riskControl) || 0,
              jurisdiction: Number(breakdown.jurisdiction) || 0,
              structure: Number(breakdown.structure) || 0,
              trackRecord: Number(breakdown.trackRecord) || 0,
            })
          : null

      await prisma.usdIncomeProduct.update({
        where: { id },
        data: {
          qualityScore: Math.round(total),
          qualityScoreBreakdown: breakdownStr,
        },
      })
      updated++
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `Scores updated for ${updated} product(s).`,
    })
  } catch (e) {
    console.error('POST /api/usd-income/score:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Score computation failed' },
      { status: 500 }
    )
  }
}
