import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import OpenAI from 'openai'

const toDecimal = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : null)

function parseJsonFromMessage(content) {
  if (!content || typeof content !== 'string') return null
  let str = content.trim()
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) str = codeBlock[1].trim()
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

/** POST /api/crypto-lending-providers/sync – fetch top 20 from OpenAI and replace table */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API key is not configured. Set OPENAI_API_KEY in environment.' },
      { status: 503 }
    )
  }

  try {
    if (!prisma?.cryptoLendingProvider) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Database model not available. On the server run: prisma generate && pnpm run build, then redeploy.',
        },
        { status: 503 }
      )
    }
    const openai = new OpenAI({ apiKey: apiKey.trim() })

    const systemPrompt = `You are a data assistant. Reply only with a valid JSON array of objects. No other text or markdown. Each object must have exactly these keys: provider (string, e.g. "Nexo"), type (string: "DeFi" or "CeFi"), jurisdiction (string, e.g. "EU", "US", "Global", "Singapore"), apyMin (number, APY min %), apyMax (number, APY max %), hv30Pct (number or null, volatility %), liquidity (string, e.g. "high", "medium", "low"), comment (string, short English note). Use null for unknown numeric fields.`

    const userPrompt = `List the top 20 most popular crypto lending or loan providers (platforms where users can lend crypto or take loans). Include both DeFi and CeFi. For each provider return one object in the JSON array with: provider, type, jurisdiction (regulatory jurisdiction or headquarters, e.g. EU, US, Global, Singapore, UK), apyMin, apyMax, hv30Pct, liquidity, comment. Use realistic approximate APY ranges, jurisdiction, and liquidity where known; otherwise use null or "unknown". Output only the JSON array, no other text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    })

    const raw = completion?.choices?.[0]?.message?.content
    const arr = parseJsonFromMessage(raw)
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse or empty response from OpenAI.' },
        { status: 422 }
      )
    }

    const rows = arr.slice(0, 20).map((item) => {
      const provider = item?.provider != null ? String(item.provider).trim() : ''
      const type = item?.type != null ? String(item.type).trim() : 'CeFi'
      return {
        provider: provider || 'Unknown',
        type: type || 'CeFi',
        jurisdiction: item.jurisdiction != null ? String(item.jurisdiction).trim() || null : null,
        apyMin: toDecimal(item.apyMin),
        apyMax: toDecimal(item.apyMax),
        hv30Pct: toDecimal(item.hv30Pct),
        liquidity: item.liquidity != null ? String(item.liquidity).trim() || null : null,
        comment: item.comment != null ? String(item.comment).trim() || null : null,
      }
    }).filter((r) => r.provider !== 'Unknown')

    await prisma.cryptoLendingProvider.deleteMany({})
    const result = await prisma.cryptoLendingProvider.createMany({ data: rows })
    const count = result?.count ?? rows.length

    return NextResponse.json({ success: true, count })
  } catch (e) {
    console.error('POST /api/crypto-lending-providers/sync:', e)
    const message = e?.message || 'Sync failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
