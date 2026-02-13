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

/** PATCH /api/bitcoin-backed-lenders/[id] */
export async function PATCH(request, { params }) {
  try {
    if (!prisma?.bitcoinBackedLender) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.bitcoinBackedLender.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.issuerProvider != null && String(body.issuerProvider).trim()) data.issuerProvider = String(body.issuerProvider).trim()
    if (body.productInstrument != null && String(body.productInstrument).trim()) data.productInstrument = String(body.productInstrument).trim()
    if (body.apyCost !== undefined) data.apyCost = body.apyCost != null ? String(body.apyCost).trim() || null : null
    if (body.duration !== undefined) data.duration = body.duration != null ? String(body.duration).trim() || null : null
    if (body.collateral !== undefined) data.collateral = body.collateral != null ? String(body.collateral).trim() || null : null
    if (body.jurisdiction !== undefined) data.jurisdiction = body.jurisdiction != null ? String(body.jurisdiction).trim() || null : null
    if (body.lockup !== undefined) data.lockup = body.lockup != null ? String(body.lockup).trim() || null : null
    if (body.seniority !== undefined) data.seniority = body.seniority != null ? String(body.seniority).trim() || null : null
    if (body.notes !== undefined) data.notes = body.notes != null ? String(body.notes).trim() || null : null
    if (body.sources !== undefined) data.sources = body.sources != null ? String(body.sources).trim() || null : null
    if (body.category !== undefined) data.category = body.category != null ? String(body.category).trim() || null : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, lender: serialize(existing) })
    }
    const updated = await prisma.bitcoinBackedLender.update({ where: { id }, data })
    return NextResponse.json({ success: true, lender: serialize(updated) })
  } catch (e) {
    console.error('PATCH /api/bitcoin-backed-lenders/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/bitcoin-backed-lenders/[id] */
export async function DELETE(request, { params }) {
  try {
    if (!prisma?.bitcoinBackedLender) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.bitcoinBackedLender.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/bitcoin-backed-lenders/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
