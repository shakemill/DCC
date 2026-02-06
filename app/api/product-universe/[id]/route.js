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

/** PATCH /api/product-universe/[id] */
export async function PATCH(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.productUniverse.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.ticker != null && String(body.ticker).trim()) data.ticker = String(body.ticker).trim()
    if (body.product != null && String(body.product).trim()) data.product = String(body.product).trim()
    if (body.rateType != null) data.rateType = String(body.rateType).trim() || 'variable'
    if (body.seniority != null) data.seniority = String(body.seniority).trim()
    if (body.notes !== undefined) data.notes = body.notes != null ? String(body.notes).trim() || null : null
    if (body.apyMinPct !== undefined) data.apyMinPct = toDecimal(body.apyMinPct) ?? null
    if (body.apyMaxPct !== undefined) data.apyMaxPct = toDecimal(body.apyMaxPct) ?? null
    if (body.hv30VolatilityPct !== undefined) data.hv30VolatilityPct = toDecimal(body.hv30VolatilityPct) ?? null
    if (body.liquidityType !== undefined) data.liquidityType = body.liquidityType != null ? String(body.liquidityType).trim() || null : null
    if (body.lockDurationYears !== undefined) data.lockDurationYears = toDecimal(body.lockDurationYears) ?? null
    if (body.paymentFrequency !== undefined) data.paymentFrequency = body.paymentFrequency != null ? String(body.paymentFrequency).trim() || null : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, product: serialize(existing) })
    }
    const updated = await prisma.productUniverse.update({ where: { id }, data })
    return NextResponse.json({ success: true, product: serialize(updated) })
  } catch (e) {
    console.error('PATCH /api/product-universe/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/product-universe/[id] */
export async function DELETE(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.productUniverse.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/product-universe/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
