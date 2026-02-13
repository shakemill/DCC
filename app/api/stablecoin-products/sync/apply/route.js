import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

const VALID_CATEGORIES = ['cefi_savings', 'collateralised_lending']

const ALLOWED_KEYS = new Set([
  'issuer', 'product', 'apy', 'duration', 'collateral', 'jurisdiction',
  'lockup', 'seniority', 'notes', 'sources', 'category',
])

function sanitizeRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const row = {}
  for (const key of ALLOWED_KEYS) {
    const v = raw[key]
    if (v != null && typeof v === 'string') {
      row[key] = v.trim() || null
    } else {
      row[key] = null
    }
  }
  if (!row.issuer || !row.product) return null
  if (!VALID_CATEGORIES.includes(row.category)) return null
  return row
}

/** POST /api/stablecoin-products/sync/apply – write approved rows to DB */
export async function POST(request) {
  try {
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { success: false, error: 'Body must be { rows: Array }.' },
        { status: 400 }
      )
    }

    const rawRows = body.rows
    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'rows must be a non-empty array.' },
        { status: 400 }
      )
    }

    const rows = rawRows.map(sanitizeRow).filter(Boolean)
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rows (each row must have issuer, product and category cefi_savings or collateralised_lending).' },
        { status: 400 }
      )
    }

    const category = rows[0].category
    await prisma.stablecoinProduct.deleteMany({ where: { category } })
    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      await prisma.stablecoinProduct.createMany({ data: chunk })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (e) {
    console.error('POST /api/stablecoin-products/sync/apply:', e)
    const message = e?.message || 'Apply failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
