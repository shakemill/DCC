import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { Prisma } from '@prisma/client'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

const toDecimal = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : undefined)

const MODEL_UNAVAILABLE = { success: false, error: 'Database model not available. On the server run: prisma generate && pnpm run build, then redeploy.' }

/** PATCH /api/crypto-lending-providers/[id] */
export async function PATCH(request, { params }) {
  try {
    if (!prisma?.cryptoLendingProvider) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.cryptoLendingProvider.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.provider != null && String(body.provider).trim()) data.provider = String(body.provider).trim()
    if (body.type != null) data.type = String(body.type).trim() || 'CeFi'
    if (body.jurisdiction !== undefined) data.jurisdiction = body.jurisdiction != null ? String(body.jurisdiction).trim() || null : null
    if (body.apyMin !== undefined) data.apyMin = toDecimal(body.apyMin) ?? null
    if (body.apyMax !== undefined) data.apyMax = toDecimal(body.apyMax) ?? null
    if (body.hv30Pct !== undefined) data.hv30Pct = toDecimal(body.hv30Pct) ?? null
    if (body.liquidity !== undefined) data.liquidity = body.liquidity != null ? String(body.liquidity).trim() || null : null
    if (body.comment !== undefined) data.comment = body.comment != null ? String(body.comment).trim() || null : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, provider: serialize(existing) })
    }
    const updated = await prisma.cryptoLendingProvider.update({ where: { id }, data })
    return NextResponse.json({ success: true, provider: serialize(updated) })
  } catch (e) {
    console.error('PATCH /api/crypto-lending-providers/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/crypto-lending-providers/[id] */
export async function DELETE(request, { params }) {
  try {
    if (!prisma?.cryptoLendingProvider) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.cryptoLendingProvider.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/crypto-lending-providers/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
