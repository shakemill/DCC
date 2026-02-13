import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

const VALID_CATEGORIES = ['cefi_savings', 'collateralised_lending']

/** PATCH /api/stablecoin-products/[id] */
export async function PATCH(request, { params }) {
  try {
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.stablecoinProduct.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.issuer != null && String(body.issuer).trim()) data.issuer = String(body.issuer).trim()
    if (body.product != null && String(body.product).trim()) data.product = String(body.product).trim()
    if (body.category != null && VALID_CATEGORIES.includes(String(body.category).trim())) data.category = String(body.category).trim()
    if (body.apy !== undefined) data.apy = body.apy != null ? String(body.apy).trim() || null : null
    if (body.duration !== undefined) data.duration = body.duration != null ? String(body.duration).trim() || null : null
    if (body.collateral !== undefined) data.collateral = body.collateral != null ? String(body.collateral).trim() || null : null
    if (body.jurisdiction !== undefined) data.jurisdiction = body.jurisdiction != null ? String(body.jurisdiction).trim() || null : null
    if (body.lockup !== undefined) data.lockup = body.lockup != null ? String(body.lockup).trim() || null : null
    if (body.seniority !== undefined) data.seniority = body.seniority != null ? String(body.seniority).trim() || null : null
    if (body.notes !== undefined) data.notes = body.notes != null ? String(body.notes).trim() || null : null
    if (body.sources !== undefined) data.sources = body.sources != null ? String(body.sources).trim() || null : null
    if (body.qualityScore !== undefined) data.qualityScore = body.qualityScore != null && !Number.isNaN(Number(body.qualityScore)) ? Math.round(Number(body.qualityScore)) : null
    if (body.qualityScoreBreakdown !== undefined) data.qualityScoreBreakdown = body.qualityScoreBreakdown != null ? String(body.qualityScoreBreakdown).trim() || null : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, product: serialize(existing) })
    }
    const updated = await prisma.stablecoinProduct.update({ where: { id }, data })
    return NextResponse.json({ success: true, product: serialize(updated) })
  } catch (e) {
    console.error('PATCH /api/stablecoin-products/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/stablecoin-products/[id] */
export async function DELETE(request, { params }) {
  try {
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.stablecoinProduct.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/stablecoin-products/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
