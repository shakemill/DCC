import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { Prisma } from '@prisma/client'

const toDecimal = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : null)

export async function GET() {
  try {
    const products = await prisma.productUniverse.findMany({
      orderBy: [{ ticker: 'asc' }],
    })
    return NextResponse.json({
      success: true,
      products: serialize(products),
    })
  } catch (error) {
    console.error('Product universe fetch error:', error)
    const message = error?.message || 'Failed to load product universe'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/** POST /api/product-universe – create */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const ticker = body.ticker != null ? String(body.ticker).trim() : ''
    const product = body.product != null ? String(body.product).trim() : ''
    const rateType = body.rateType != null ? String(body.rateType).trim() : 'variable'
    const seniority = body.seniority != null ? String(body.seniority).trim() : ''
    if (!ticker || !product) {
      return NextResponse.json({ success: false, error: 'ticker and product are required' }, { status: 400 })
    }
    const liquidityType = body.liquidityType != null ? String(body.liquidityType).trim() || null : null
    const paymentFrequency = body.paymentFrequency != null ? String(body.paymentFrequency).trim() || null : null
    const data = {
      ticker,
      product,
      apyMinPct: toDecimal(body.apyMinPct),
      apyMaxPct: toDecimal(body.apyMaxPct),
      rateType: rateType || 'variable',
      hv30VolatilityPct: toDecimal(body.hv30VolatilityPct),
      seniority: seniority || '',
      liquidityType: liquidityType || null,
      lockDurationYears: toDecimal(body.lockDurationYears),
      paymentFrequency: paymentFrequency || null,
      notes: body.notes != null ? String(body.notes).trim() || null : null,
    }
    const created = await prisma.productUniverse.create({ data })
    return NextResponse.json({ success: true, product: serialize(created) })
  } catch (e) {
    console.error('POST /api/product-universe:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
