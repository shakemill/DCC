import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { parseApy } from '@/lib/parseApy'
import OpenAI from 'openai'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

/** Deterministic fallback: sort by parsed APY descending, take top 3 per category */
function selectTopDeterministic(products) {
  const lending = products
    .filter((p) => p.category === 'collateralised_lending')
    .map((p) => ({ ...p, apyNum: parseApy(p.apy) ?? 0 }))
    .sort((a, b) => (b.apyNum || 0) - (a.apyNum || 0))
    .slice(0, 3)
    .map(({ apyNum, ...rest }) => rest)

  const cefi = products
    .filter((p) => p.category === 'cefi_savings')
    .map((p) => ({ ...p, apyNum: parseApy(p.apy) ?? 0 }))
    .sort((a, b) => (b.apyNum || 0) - (a.apyNum || 0))
    .slice(0, 3)
    .map(({ apyNum, ...rest }) => rest)

  return { collateralisedLending: lending, cefiSavings: cefi }
}

/** POST /api/stablecoin-products/select-top – body { baseStablecoin?: "USDC" | "USDT" } */
export async function POST(request) {
  try {
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const baseStablecoin = (body?.baseStablecoin || 'USDC').toUpperCase()
    if (baseStablecoin !== 'USDC' && baseStablecoin !== 'USDT') {
      return NextResponse.json(
        { success: false, error: 'baseStablecoin must be USDC or USDT' },
        { status: 400 }
      )
    }

    const products = await prisma.stablecoinProduct.findMany({
      orderBy: [{ category: 'asc' }, { issuer: 'asc' }],
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        collateralisedLending: [],
        cefiSavings: [],
        message: 'No products in database. Admin can populate via Generate from ChatGPT in Admin > Stablecoin.',
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.trim()) {
      const result = selectTopDeterministic(products)
      return NextResponse.json({
        success: true,
        collateralisedLending: serialize(result.collateralisedLending),
        cefiSavings: serialize(result.cefiSavings),
        method: 'deterministic',
      })
    }

    // ChatGPT selection
    const systemPrompt = `You are a Senior Digital Credit Yield Research Analyst for Digital Credit Compass (DCC).
Given a list of stablecoin products from our database, select the TOP 3 for collateralised_lending (DeFi overcollateralized lending) and TOP 3 for cefi_savings (CeFi savings) based on:
- Risk-adjusted yield
- Compliance and structure quality
- Prioritize products supporting ${baseStablecoin} where applicable

Respond with ONLY a valid JSON object in this exact format, no other text:
{"collateralisedLending": ["id1","id2","id3"], "cefiSavings": ["id1","id2","id3"]}

Use the product "id" field (UUID) from the input. Select exactly 3 per category if available; fewer if not enough products exist.`

    const userPrompt = `Products (id | category | issuer | product | apy):\n${products.map((p) => `${p.id} | ${p.category} | ${p.issuer} | ${p.product} | ${p.apy}`).join('\n')}\n\nReturn the JSON object with top 3 ids per category.`

    const openai = new OpenAI({ apiKey: apiKey.trim() })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const raw = completion?.choices?.[0]?.message?.content
    if (!raw) {
      const result = selectTopDeterministic(products)
      return NextResponse.json({
        success: true,
        collateralisedLending: serialize(result.collateralisedLending),
        cefiSavings: serialize(result.cefiSavings),
        method: 'deterministic_fallback',
      })
    }

    let parsed
    try {
      const jsonStr = raw.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      const result = selectTopDeterministic(products)
      return NextResponse.json({
        success: true,
        collateralisedLending: serialize(result.collateralisedLending),
        cefiSavings: serialize(result.cefiSavings),
        method: 'deterministic_fallback',
      })
    }

    const byId = new Map(products.map((p) => [p.id, p]))
    const resolve = (ids) => {
      if (!Array.isArray(ids)) return []
      return ids
        .map((id) => byId.get(String(id)))
        .filter(Boolean)
        .slice(0, 3)
    }

    const collateralisedLending = resolve(parsed.collateralisedLending)
    const cefiSavings = resolve(parsed.cefiSavings)

    return NextResponse.json({
      success: true,
      collateralisedLending: serialize(collateralisedLending),
      cefiSavings: serialize(cefiSavings),
      method: 'chatgpt',
    })
  } catch (e) {
    console.error('POST /api/stablecoin-products/select-top:', e)
    // On any error, try deterministic fallback if we have products
    try {
      if (prisma?.stablecoinProduct) {
        const products = await prisma.stablecoinProduct.findMany({})
        if (products.length > 0) {
          const result = selectTopDeterministic(products)
          return NextResponse.json({
            success: true,
            collateralisedLending: serialize(result.collateralisedLending),
            cefiSavings: serialize(result.cefiSavings),
            method: 'deterministic_fallback',
          })
        }
      }
    } catch (_) {}
    return NextResponse.json(
      { success: false, error: e?.message || 'Select top failed' },
      { status: 500 }
    )
  }
}
