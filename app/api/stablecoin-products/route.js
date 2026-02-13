import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

const VALID_CATEGORIES = ['cefi_savings', 'collateralised_lending']

export async function GET() {
  try {
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const products = await prisma.stablecoinProduct.findMany({
      orderBy: [{ category: 'asc' }, { issuer: 'asc' }, { product: 'asc' }],
    })
    return NextResponse.json({
      success: true,
      products: serialize(products),
    })
  } catch (error) {
    console.error('Stablecoin products fetch error:', error)
    const message = error?.message || 'Failed to load stablecoin products'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/** POST /api/stablecoin-products – create */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const issuer = body.issuer != null ? String(body.issuer).trim() : ''
    const product = body.product != null ? String(body.product).trim() : ''
    const category = body.category != null ? String(body.category).trim() : ''
    if (!issuer || !product) {
      return NextResponse.json(
        { success: false, error: 'issuer and product are required' },
        { status: 400 }
      )
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'category must be cefi_savings or collateralised_lending' },
        { status: 400 }
      )
    }
    const data = {
      issuer,
      product,
      category,
      apy: body.apy != null ? String(body.apy).trim() || null : null,
      duration: body.duration != null ? String(body.duration).trim() || null : null,
      collateral: body.collateral != null ? String(body.collateral).trim() || null : null,
      jurisdiction: body.jurisdiction != null ? String(body.jurisdiction).trim() || null : null,
      lockup: body.lockup != null ? String(body.lockup).trim() || null : null,
      seniority: body.seniority != null ? String(body.seniority).trim() || null : null,
      notes: body.notes != null ? String(body.notes).trim() || null : null,
      sources: body.sources != null ? String(body.sources).trim() || null : null,
    }
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const created = await prisma.stablecoinProduct.create({ data })
    return NextResponse.json({ success: true, product: serialize(created) })
  } catch (e) {
    console.error('POST /api/stablecoin-products:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
