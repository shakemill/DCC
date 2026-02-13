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

/** PATCH /api/usd-income/[id] */
export async function PATCH(request, { params }) {
  try {
    if (!prisma?.usdIncomeProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.usdIncomeProduct.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.issuer != null && String(body.issuer).trim()) data.issuer = String(body.issuer).trim()
    if (body.product != null && String(body.product).trim()) data.product = String(body.product).trim()
    if (body.ticker != null && String(body.ticker).trim()) data.ticker = String(body.ticker).trim()
    if (body.type != null) data.type = String(body.type).trim() || ''
    if (body.apyDistribution !== undefined) data.apyDistribution = body.apyDistribution != null ? String(body.apyDistribution).trim() || null : null
    if (body.duration !== undefined) data.duration = body.duration != null ? String(body.duration).trim() || null : null
    if (body.seniority !== undefined) data.seniority = body.seniority != null ? String(body.seniority).trim() || null : null
    if (body.simpleDescription !== undefined) data.simpleDescription = body.simpleDescription != null ? String(body.simpleDescription).trim() || null : null
    if (body.availability !== undefined) data.availability = body.availability != null ? String(body.availability).trim() || null : null
    if (body.btcLinkage !== undefined) data.btcLinkage = body.btcLinkage != null ? String(body.btcLinkage).trim() || null : null
    if (body.keyRisks !== undefined) data.keyRisks = body.keyRisks != null ? String(body.keyRisks).trim() || null : null
    if (body.hv30Pct !== undefined) {
      const v = body.hv30Pct
      if (v == null || v === '') data.hv30Pct = null
      else {
        const n = typeof v === 'number' ? v : Number(String(v).trim().replace(/%/g, ''))
        data.hv30Pct = Number.isNaN(n) ? null : n
      }
    }
    if (body.qualityScore !== undefined) {
      const v = body.qualityScore
      data.qualityScore = v == null || v === '' ? null : (typeof v === 'number' ? Math.round(v) : Math.round(Number(v))) || null
    }
    if (body.qualityScoreBreakdown !== undefined) {
      data.qualityScoreBreakdown = body.qualityScoreBreakdown != null ? String(body.qualityScoreBreakdown).trim() || null : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, product: serialize(existing) })
    }
    const updated = await prisma.usdIncomeProduct.update({ where: { id }, data })
    return NextResponse.json({ success: true, product: serialize(updated) })
  } catch (e) {
    console.error('PATCH /api/usd-income/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/usd-income/[id] */
export async function DELETE(request, { params }) {
  try {
    if (!prisma?.usdIncomeProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.usdIncomeProduct.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/usd-income/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
