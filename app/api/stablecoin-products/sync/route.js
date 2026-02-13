import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const PROMPT_COLLATERALISED_LENDING = `PROMPT COLLATERALISED LENDING PROVIDERS

ROLE
You are a Senior Digital Credit Yield Research Analyst working for Digital Credit Compass (DCC).
Your job is to deep-search, verify, and normalize on-chain overcollateralized lending / money market products for stablecoins (USDC/USDT), and present them in a risk-first, compliance-aware table suitable for the DCC Yield Board.
You do not market products.
You do not estimate yields.
You assume rates change frequently and must be treated as snapshots.

OBJECTIVE
Deep-search the current DeFi market and generate a curated list of on-chain, overcollateralized lending providers that support:
USDC and/or USDT
On-demand supply / lending (withdraw anytime, subject to protocol constraints)
Overcollateralized borrowing mechanics (borrowers post more collateral than they borrow)
Transparent, protocol-driven interest rates

STRICT INCLUSION RULES (CRITICAL)
Include a protocol/market only if ALL are true:
✅ On-chain protocol (non-custodial)
✅ Product is a money market / lending market or vault that is fundamentally overcollateralized
✅ Supports USDC and/or USDT as a supply asset
✅ Supply position earns yield via utilization-driven interest (and possibly incentives)
✅ Has an official app market page and/or documentation that describes the mechanism
If a protocol offers "strategy vaults," only include those that are clearly lending/supply, not leveraged yield loops.

STRICT EXCLUSION RULES
Exclude:
❌ CeFi earn/rewards programs
❌ Fixed-term lending products (unless the protocol also offers a true on-demand market; then include on-demand only)
❌ RWA treasury tokens/pools
❌ Options/structured income
❌ DEX LP farming or AMM liquidity provision (not lending)
❌ "Delta-neutral" or leveraged yield strategies (unless explicitly flagged as lending-only and low leverage)

APY / SNAPSHOT DISCIPLINE
APY must be recorded as:
X% (snapshot; variable) when you can observe a live displayed APY
Variable (see app) if not reliably visible or requires wallet connection
If incentives materially boost the rate, note it in Notes
If you use an aggregator (e.g., DefiLlama) for a snapshot, you MUST still include the official app link as well

OUTPUT FORMAT (STRICT — DO NOT CHANGE)
Produce one table only, with columns in this exact order:
| Issuer / Provider | Product / Instrument Name | APY | Duration | Collateral | Jurisdiction | Lockup | Seniority | Notes | Sources |

COLUMN RULES
Issuer / Provider: Protocol name (Aave, Compound, SparkLend, Euler, Venus, Kamino, etc.)
Product / Instrument Name: Include protocol version + asset + chain/market label
APY: Snapshot variable or "Variable (see app)"
Duration: Always On-demand
Collateral: Use standardized phrasing like: Overcollateralized crypto borrowing markets, Overcollateralized money market, Overcollateralized lending vaults/markets
Jurisdiction: On-chain (ChainName) (e.g., On-chain (Ethereum), On-chain (Base))
Lockup: Usually None but include: None (protocol can pause in emergencies) when applicable or None (withdrawals depend on utilization/liquidity)
Seniority: Always Protocol claim
Notes: Risk-first, implementation-aware, 1–2 sentences
Sources: Official app link + docs link (aggregators optional but must not be sole source)

FINAL OUTPUT REQUIREMENTS
Output only the table
No intro paragraph
No closing summary
No footnotes outside the table
Every row must contain at least one official app source link`

const PROMPT_CEFI_SAVINGS = `PROMPT ON CEFI SAVINGS PROVIDERS

ROLE
You are a Senior Digital Credit Yield Research Analyst working for Digital Credit Compass (DCC).
Your mandate is to deep-search, verify, and normalize CeFi stablecoin savings products and present them in a risk-first, compliance-aware table suitable for an institutional yield board.
You do not market products.
You do not estimate or smooth yields.
You assume rates, eligibility, and terms can change at any time.

OBJECTIVE
Deep-search the current market and generate a comprehensive list of CeFi savings-style products that meet all of the following criteria:
Asset: USDC and/or USDT
Access: On-demand / flexible (no lock-ups)
Structure: CeFi platform programs (not DeFi protocols)
Yield: Program-based rewards / savings interest
User perspective: "Savings-like" experience
The output must be snapshot-driven and aligned to the DCC Yield Board table format.

STRICT INCLUSION RULES (CRITICAL)
Include a product only if ALL are true:
✅ CeFi platform (exchange or centralized provider)
✅ USDC or USDT supported
✅ Flexible / on-demand withdrawal available
✅ Yield is paid via a rewards, earn, or savings program
✅ Product is currently referenced in official docs or app pages

STRICT EXCLUSION RULES
Exclude:
❌ DeFi protocols (Aave, Compound, etc.)
❌ Fixed-term or bonded-only products
❌ RWA / Treasury products
❌ Option, structured, or derivative income
❌ BTC-linked yield
❌ Deprecated or paused programs
If a provider offers both flexible and fixed, include flexible only and explicitly note that fixed terms exist but are excluded.

OUTPUT FORMAT (STRICT — DO NOT CHANGE)
Produce one table only with columns in this exact order:
| Issuer / Provider | Product / Instrument Name | APY | Duration | Collateral | Jurisdiction | Lockup | Seniority | Notes | Sources |

COLUMN RULES
Issuer / Provider: Platform name (e.g., Coinbase, Kraken, Binance)
Product / Instrument Name: Exact product name as shown in docs (include "Flexible" where relevant)
APY: Variable / snapshot language only; explicitly mention promos, tiers, or "up to" where applicable
Duration: Always On-demand or On-demand (flexible)
Collateral: Always describe as Unsecured (platform program)
Jurisdiction: Platform geography + note that availability varies by region/user eligibility
Lockup: None (flexible). If withdrawals can be delayed, state it clearly
Seniority: Always Unsecured
Notes: Risk-first field; flag how rewards accrue, promo distortions, tier caps, redemption delays, regional restrictions
Sources: Official product pages + help / support pages

FINAL OUTPUT REQUIREMENTS
Output only the table
No intro paragraph
No closing summary
No footnotes outside the table
Clean, ingestion-ready formatting`

const VALID_TYPES = ['cefi_savings', 'collateralised_lending']

const HEADER_TO_KEY = {
  'issuer / provider': 'issuer',
  'issuer/provider': 'issuer',
  'product / instrument name': 'product',
  'product / instrument': 'product',
  'product/instrument name': 'product',
  'product/instrument': 'product',
  'apy': 'apy',
  'duration': 'duration',
  'collateral': 'collateral',
  'jurisdiction': 'jurisdiction',
  'lockup': 'lockup',
  'seniority': 'seniority',
  'notes': 'notes',
  'sources': 'sources',
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
    const normalized = cells.map((c) => c.toLowerCase().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / '))
    if (normalized.some((c) => c.includes('issuer') || c.includes('provider'))) {
      headers = normalized
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

function toRow(item, category) {
  const str = (v) => (v != null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null)
  return {
    issuer: str(item?.issuer) || 'Unknown',
    product: str(item?.product) || 'Unknown',
    apy: str(item?.apy),
    duration: str(item?.duration),
    collateral: str(item?.collateral),
    jurisdiction: str(item?.jurisdiction),
    lockup: str(item?.lockup),
    seniority: str(item?.seniority),
    notes: str(item?.notes),
    sources: str(item?.sources),
    category,
  }
}

/** POST /api/stablecoin-products/sync – body { type: "cefi_savings" | "collateralised_lending" } */
export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API key is not configured. Set OPENAI_API_KEY in environment.' },
      { status: 503 }
    )
  }

  let type = null
  try {
    const body = await request.json().catch(() => ({}))
    type = body?.type ?? new URL(request.url).searchParams.get('type')
    type = type != null ? String(type).trim() : null
  } catch {
    type = null
  }
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { success: false, error: 'type must be cefi_savings or collateralised_lending (body or query)' },
      { status: 400 }
    )
  }

  const userPrompt = type === 'cefi_savings'
    ? 'Generate the table as specified. Output only the markdown table with columns: Issuer / Provider | Product / Instrument Name | APY | Duration | Collateral | Jurisdiction | Lockup | Seniority | Notes | Sources. No intro, no summary.'
    : 'Generate the table as specified. Output only the markdown table with columns: Issuer / Provider | Product / Instrument Name | APY | Duration | Collateral | Jurisdiction | Lockup | Seniority | Notes | Sources. No intro, no summary.'

  const systemContent = type === 'cefi_savings' ? PROMPT_CEFI_SAVINGS : PROMPT_COLLATERALISED_LENDING

  try {
    if (!prisma?.stablecoinProduct) {
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
        { role: 'system', content: systemContent },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const raw = completion?.choices?.[0]?.message?.content
    const arr = parseMarkdownTables(raw)
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse or empty response from OpenAI.' },
        { status: 422 }
      )
    }

    const rows = arr
      .map((item) => toRow(item, type))
      .filter((r) => r.issuer !== 'Unknown' && r.product !== 'Unknown')
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rows extracted from response.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, rows })
  } catch (e) {
    console.error('POST /api/stablecoin-products/sync:', e)
    const message = e?.message || 'Sync failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
