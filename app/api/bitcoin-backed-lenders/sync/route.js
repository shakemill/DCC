import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a Senior Digital Credit Research Analyst working for an institutional-grade fintech platform focused on Bitcoin-backed credit and borrowing structures. Your mandate is fact-finding, structuring, and gap-identification, not marketing.

OBJECTIVE: Generate a comprehensive, structured table of BTC-backed borrowing products (retail + institutional; CeFi, regulated banks, hybrid platforms, representative DeFi). Borrowing cost only, NOT deposit yield. Output suitable for risk analysis, calculator ingestion, institutional comparison, compliance review.

SCOPE: Include three categories, clearly separated: (1) CeFi & Hybrid BTC-Backed Lenders – retail and institutional, quote-based desks allowed, include platforms even if rates not public; (2) On-Chain / DeFi Borrowing – BTC exposure via wrapped BTC (e.g. WBTC), variable protocol-driven rates; (3) Regulated Banks / Private Banks – crypto lombard or BTC-collateralized credit, quote-based acceptable.

STRICT DATA RULES: APY = borrowing cost only. If rates not public write "Quote-based" or "Not publicly disclosed". Do NOT invent numbers. Prefer conservative language. Flag uncertainty in Notes.

TABLE STRUCTURE (columns): Issuer / Provider | Product / Instrument | APY / Cost | Duration | Collateral | Jurisdiction | Lockup | Seniority | Notes | Sources

COLUMN MEANINGS: Issuer/Provider = legal or common entity name. Product/Instrument = exact product or desk name. APY/Cost = borrow APR or variable rate; if unknown use "Quote-based" or "Not publicly disclosed". Duration = termed, revolving, bespoke, on-demand. Collateral = BTC, WBTC, or crypto mix. Jurisdiction = entity domicile or regulatory base. Lockup = termed, none, deal-specific, unknown. Seniority = secured, contractual claim, protocol claim. Notes = flag LTV, liquidation/margin gaps, custody, rehypothecation risk, eligibility. Sources = direct product or official page URL only.

STYLE: Institutional, neutral, risk-first. No hype. No promotional language.`

const USER_PROMPT = `Btc lending providers:
Coverage: retail + institutional BTC-backed lenders (CeFi + hybrid) plus representative on-chain borrowing.
APY here is borrowing cost (not deposit yield).
Gaps to close in implementation: liquidation/margin mechanics, rehypothecation, contracting entity, region availability.

Generate exactly 30 distinct BTC-backed borrowing products across the three categories (CeFi & Hybrid, On-Chain / DeFi, Regulated Banks). Distribute them across categories (e.g. ~12–15 CeFi/Hybrid, ~8–10 DeFi, ~5–8 Regulated Banks). Produce cleanly separated sections with one table per category. After each table include 2–3 bullet clarifications (e.g. APY represents borrowing cost; bank products typically quote-based).

CRITICAL – After all markdown tables and bullet clarifications, add a section exactly titled "## JSON INGESTION" and a single fenced code block (e.g. \`\`\`json) containing ONLY a JSON array of exactly 30 objects. Each object must have exactly these keys: issuerProvider, productInstrument, apyCost, duration, collateral, jurisdiction, lockup, seniority, notes, sources, category. One object per row; use "" for missing string values. For category use "CeFi & Hybrid", "On-Chain / DeFi", or "Regulated Banks". Output no other text inside the code block.`

function parseJsonFromMessage(content) {
  if (!content || typeof content !== 'string') return null
  const str = content.trim()
  // Prefer ## JSON INGESTION block
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
  'issuer / provider': 'issuerProvider',
  'issuer/provider': 'issuerProvider',
  'product / instrument': 'productInstrument',
  'product/instrument': 'productInstrument',
  'apy / cost': 'apyCost',
  'apy/cost': 'apyCost',
  'duration': 'duration',
  'collateral': 'collateral',
  'jurisdiction': 'jurisdiction',
  'lockup': 'lockup',
  'seniority': 'seniority',
  'notes': 'notes',
  'sources': 'sources',
  'category': 'category',
}

function parseMarkdownTables(content) {
  if (!content || typeof content !== 'string') return []
  const lines = content.split(/\r?\n/)
  const rows = []
  let headers = null
  let category = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (/^#+\s+.+/.test(trimmed) && !trimmed.toLowerCase().includes('json')) {
      category = trimmed.replace(/^#+\s+/, '').trim()
    }
    if (!trimmed.startsWith('|') || trimmed.endsWith('---')) continue
    const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean)
    if (cells.length < 2) continue
    const normalized = cells.map((c) => c.toLowerCase().replace(/\s+/g, ' '))
    if (normalized.some((c) => c === 'issuer' || c.includes('provider'))) {
      headers = cells.map((c) => c.toLowerCase().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / '))
      continue
    }
    if (!headers || cells.length < headers.length) continue
    const obj = { category: category || null }
    for (let j = 0; j < headers.length && j < cells.length; j++) {
      const key = HEADER_TO_KEY[headers[j]] || headers[j].replace(/\s+/g, '')
      if (key) obj[key] = cells[j] || ''
    }
    if (obj.issuerProvider || obj.productInstrument) rows.push(obj)
  }
  return rows
}

function toRow(item) {
  const str = (v) => (v != null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null)
  return {
    issuerProvider: str(item?.issuerProvider) || 'Unknown',
    productInstrument: str(item?.productInstrument) || 'Unknown',
    apyCost: str(item?.apyCost),
    duration: str(item?.duration),
    collateral: str(item?.collateral),
    jurisdiction: str(item?.jurisdiction),
    lockup: str(item?.lockup),
    seniority: str(item?.seniority),
    notes: str(item?.notes),
    sources: str(item?.sources),
    category: str(item?.category),
  }
}

/** POST /api/bitcoin-backed-lenders/sync – generate from OpenAI, return rows (no DB write) */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API key is not configured. Set OPENAI_API_KEY in environment.' },
      { status: 503 }
    )
  }

  try {
    if (!prisma?.bitcoinBackedLender) {
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

    const MAX_ROWS = 30
    const rows = arr
      .map((item) => toRow(item))
      .filter((r) => r.issuerProvider !== 'Unknown' && r.productInstrument !== 'Unknown')
      .slice(0, MAX_ROWS)
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rows extracted from response.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ success: true, rows })
  } catch (e) {
    console.error('POST /api/bitcoin-backed-lenders/sync:', e)
    const message = e?.message || 'Sync failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
