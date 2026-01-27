import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { Prisma } from '@prisma/client'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

export async function GET(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const snapshots = await prisma.instrumentSnapshot.findMany({
      where: { instrumentId: id },
      orderBy: { asOf: 'desc' },
    })
    return NextResponse.json({ success: true, snapshots: serialize(snapshots) })
  } catch (e) {
    console.error('GET /api/instruments/[id]/snapshots:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const inst = await prisma.instrument.findUnique({ where: { id } })
    if (!inst) return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const dec = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : undefined)
    const str = (v) => (v != null && v !== '' ? String(v) : undefined)
    const rt = body.rateType || 'Variable'
    const valid = ['Fixed', 'Variable', 'QuoteBased', 'Promo', 'Unknown'].includes(rt)

    const snapshot = await prisma.instrumentSnapshot.create({
      data: {
        instrumentId: id,
        asOf: body.asOf ? new Date(body.asOf) : new Date(),
        apyMin: dec(body.apyMin),
        apyMax: dec(body.apyMax),
        rateType: valid ? rt : 'Variable',
        apyLabelOverride: str(body.apyLabelOverride),
        promoFlag: Boolean(body.promoFlag),
        sourceUrl: str(body.sourceUrl),
      },
    })
    return NextResponse.json({ success: true, snapshot: serialize(snapshot) })
  } catch (e) {
    console.error('POST /api/instruments/[id]/snapshots:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
