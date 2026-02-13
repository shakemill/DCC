import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a Senior Digital Credit & Structured Yield Analyst working for an institutional-grade digital credit intelligence platform. Your work is risk-first, compliance-aware, and investment-focused. You do not market products. You classify and filter investable yield instruments.

OBJECTIVE: Generate a curated list titled "Eligible Digital Credit Yield Products". The list must include only yield-generating, investable digital credit instruments with Bitcoin linkage.

MANDATORY FILTERING RULES (CRITICAL): Include a product only if ALL conditions are met: Generates distributable yield or income; Is investable by third-party investors (public securities or ETFs); Has an explicit yield mechanism (dividends, distributions, option income); Has direct BTC linkage (e.g. BTC treasury exposure, company holds BTC). Explicitly EXCLUDE: Zero-coupon instruments; Non-yielding treasury holdings; Internal corporate borrowings; Private, non-investable debt; Products without a clear income mechanism; Products linked to Bitcoin only via derivatives (e.g. option income ETFs, covered-call on BTC). We want only instruments with direct BTC exposure, not derivative-based exposure.

COLUMN RULES: Issuer/Sponsor = legal issuer or ETF sponsor. Product = official product or series name. Ticker/ID = exchange ticker or product identifier. Type = precise classifications (Perpetual preferred, Convertible preferred, Senior preferred, Junior preferred). APY/Distribution = actual yield or distribution mechanics; if variable say Variable; if discretionary state when declared; do NOT imply guarantees. Duration = Perpetual or open-ended. Seniority = Preferred, senior preferred, junior preferred. HV30 (volatility) = 30-day historical volatility in % (number only, e.g. 7 or 28; use empty or null if unknown). Simple Description = one clear sentence on how yield is generated. Availability = brokerage access (e.g. US brokerages (Nasdaq), EU/Global brokers). BTC Linkage = use only "BTC treasury exposure" (direct BTC holdings by issuer). Do NOT use "BTC derivatives"; exclude any product whose sole linkage is via options, futures, or other derivatives. Key Risks = short risk-first list using semicolons (credit risk, dividend discretion, volatility, option risk, FX risk, etc.).

STYLE: Institutional tone, neutral language, risk-first framing. No hype, no opinions, no forecasts. Assume compliance review. Do not invent yields, smooth volatility, imply stability, or use marketing adjectives.`

const USER_PROMPT = `At the top of the output, write exactly:
Eligible Digital Credit Yield Products
Only yield-generating digital credit instruments are included. Non-yield, zero-coupon, or non-investable company borrowings are excluded.

Produce one table only with these columns in this exact order:
| Issuer / Sponsor | Product | Ticker / ID | Type | APY / Distribution | Duration | Seniority | HV30 (volatility %) | Simple Description | Availability | BTC Linkage | Key Risks |

Generate 20–30 distinct eligible products. Include ONLY products with direct BTC exposure (BTC treasury exposure). Exclude products that are linked to Bitcoin solely via derivatives (e.g. option income ETFs, covered-call strategies). Output only: the title, the explanatory sentence, and the table. No commentary after the table, no footnotes. Clean, ingestion-ready formatting.

CRITICAL – After the markdown table, add a section exactly titled "## JSON INGESTION" and a single fenced code block (e.g. \`\`\`json) containing ONLY a JSON array of objects. Each object must have exactly these keys: issuer, product, ticker, type, apyDistribution, duration, seniority, hv30Pct, simpleDescription, availability, btcLinkage, keyRisks. One object per table row; use "" for missing string values and null for missing hv30Pct (number or null). Output no other text inside the code block.`

function parseJsonFromMessage(content) {
  if (!content || typeof content !== 'string') return null
  const str = content.trim()
  const jsonSection = str.match(/##\s*JSON\s*INGESTION\s*[\s\S]*?```(?:json)?\s*([\s\S]*?)```/i)
  const block = jsonSection ? jsonSection[1].trim() : str.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim()
  if (!block) return null
  try {
    return JSON.parse(block)
  } catch {
    return null
  }
}

const HEADER_TO_KEY = {
  'issuer / sponsor': 'issuer',
  'issuer/sponsor': 'issuer',
  'product': 'product',
  'ticker / id': 'ticker',
  'ticker/id': 'ticker',
  'type': 'type',
  'apy / distribution': 'apyDistribution',
  'apy/distribution': 'apyDistribution',
  'duration': 'duration',
  'seniority': 'seniority',
  'hv30 (volatility %)': 'hv30Pct',
  'hv30': 'hv30Pct',
  'hv30 (volatility)': 'hv30Pct',
  'simple description': 'simpleDescription',
  'availability': 'availability',
  'btc linkage': 'btcLinkage',
  'key risks': 'keyRisks',
}

function parseMarkdownTables(content) {
  if (!content || typeof content !== 'string') return []
  const lines = content.split(/\r?\n/)
  const rows = []
  let headers = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed.startsWith('|') || trimmed.endsWith('---')) continue
    const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean)
    if (cells.length < 2) continue
    const normalized = cells.map((c) => c.toLowerCase().replace(/\s+/g, ' '))
    if (normalized.some((c) => c.includes('issuer') || c.includes('sponsor'))) {
      headers = cells.map((c) => c.toLowerCase().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / '))
      continue
    }
    if (!headers || cells.length < headers.length) continue
    const obj = {}
    for (let j = 0; j < headers.length && j < cells.length; j++) {
      const key = HEADER_TO_KEY[headers[j]] || headers[j].replace(/\s+/g, '')
      if (key) obj[key] = cells[j] || ''
    }
    if (obj.issuer || obj.product) rows.push(obj)
  }
  return rows
}

function parseHv30Pct(v) {
  if (v == null || v === undefined) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const s = String(v).trim().replace(/%/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

function toRow(item) {
  const str = (v) => (v != null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null)
  return {
    issuer: str(item?.issuer) || 'Unknown',
    product: str(item?.product) || 'Unknown',
    ticker: str(item?.ticker) || 'Unknown',
    type: str(item?.type) || 'Unknown',
    apyDistribution: str(item?.apyDistribution),
    duration: str(item?.duration),
    seniority: str(item?.seniority),
    hv30Pct: parseHv30Pct(item?.hv30Pct ?? item?.hv30),
    simpleDescription: str(item?.simpleDescription),
    availability: str(item?.availability),
    btcLinkage: str(item?.btcLinkage),
    keyRisks: str(item?.keyRisks),
  }
}

/** POST /api/usd-income/sync – generate from OpenAI, return rows (no DB write) */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API key is not configured. Set OPENAI_API_KEY in environment.' },
      { status: 503 }
    )
  }

  try {
    if (!prisma?.usdIncomeProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
        },
        { status: 503 }
      )
    }
    const openai = new OpenAI({ apiKey: apiKey.trim() })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT },
      ],
      temperature: 0.2,
    })

    const raw = completion?.choices?.[0]?.message?.content
    let arr = parseJsonFromMessage(raw)
    if (!Array.isArray(arr) || arr.length === 0) {
      arr = parseMarkdownTables(raw)
    }
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse or empty response from OpenAI.' },
        { status: 422 }
      )
    }

    const rows = arr
      .map((item) => toRow(item))
      .filter((r) => r.issuer !== 'Unknown' && r.product !== 'Unknown' && r.ticker !== 'Unknown' && r.type !== 'Unknown')
      .filter((r) => !/derivative/i.test(r.btcLinkage || ''))
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rows extracted from response.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, rows })
  } catch (e) {
    console.error('POST /api/usd-income/sync:', e)
    const message = e?.message || 'Sync failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
