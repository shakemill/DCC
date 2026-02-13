import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

export async function GET() {
  try {
    if (!prisma?.usdIncomeProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const products = await prisma.usdIncomeProduct.findMany({
      orderBy: [{ issuer: 'asc' }, { ticker: 'asc' }],
    })
    return NextResponse.json({
      success: true,
      products: serialize(products),
    })
  } catch (error) {
    console.error('Fiat income fetch error:', error)
    const message = error?.message || 'Failed to load Fiat income products'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/** POST /api/usd-income – create */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const issuer = body.issuer != null ? String(body.issuer).trim() : ''
    const product = body.product != null ? String(body.product).trim() : ''
    const ticker = body.ticker != null ? String(body.ticker).trim() : ''
    const type = body.type != null ? String(body.type).trim() : ''
    if (!issuer || !product || !ticker || !type) {
      return NextResponse.json(
        { success: false, error: 'issuer, product, ticker and type are required' },
        { status: 400 }
      )
    }
    const hv30Pct =
      body.hv30Pct != null && body.hv30Pct !== ''
        ? (typeof body.hv30Pct === 'number' ? body.hv30Pct : Number(String(body.hv30Pct).trim().replace(/%/g, '')))
        : null
    const data = {
      issuer,
      product,
      ticker,
      type,
      apyDistribution: body.apyDistribution != null ? String(body.apyDistribution).trim() || null : null,
      duration: body.duration != null ? String(body.duration).trim() || null : null,
      seniority: body.seniority != null ? String(body.seniority).trim() || null : null,
      hv30Pct: typeof hv30Pct === 'number' && !Number.isNaN(hv30Pct) ? hv30Pct : null,
      simpleDescription: body.simpleDescription != null ? String(body.simpleDescription).trim() || null : null,
      availability: body.availability != null ? String(body.availability).trim() || null : null,
      btcLinkage: body.btcLinkage != null ? String(body.btcLinkage).trim() || null : null,
      keyRisks: body.keyRisks != null ? String(body.keyRisks).trim() || null : null,
    }
    if (!prisma?.usdIncomeProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const created = await prisma.usdIncomeProduct.create({ data })
    return NextResponse.json({ success: true, product: serialize(created) })
  } catch (e) {
    console.error('POST /api/usd-income:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
