import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

export async function GET() {
  try {
    if (!prisma?.bitcoinBackedLender) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const lenders = await prisma.bitcoinBackedLender.findMany({
      orderBy: [{ issuerProvider: 'asc' }, { productInstrument: 'asc' }],
    })
    return NextResponse.json({
      success: true,
      lenders: serialize(lenders),
    })
  } catch (error) {
    console.error('Bitcoin-backed lenders fetch error:', error)
    const message = error?.message || 'Failed to load bitcoin backed lenders'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/** POST /api/bitcoin-backed-lenders – create */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const issuerProvider = body.issuerProvider != null ? String(body.issuerProvider).trim() : ''
    const productInstrument = body.productInstrument != null ? String(body.productInstrument).trim() : ''
    if (!issuerProvider || !productInstrument) {
      return NextResponse.json(
        { success: false, error: 'issuerProvider and productInstrument are required' },
        { status: 400 }
      )
    }
    const data = {
      issuerProvider,
      productInstrument,
      apyCost: body.apyCost != null ? String(body.apyCost).trim() || null : null,
      duration: body.duration != null ? String(body.duration).trim() || null : null,
      collateral: body.collateral != null ? String(body.collateral).trim() || null : null,
      jurisdiction: body.jurisdiction != null ? String(body.jurisdiction).trim() || null : null,
      lockup: body.lockup != null ? String(body.lockup).trim() || null : null,
      seniority: body.seniority != null ? String(body.seniority).trim() || null : null,
      notes: body.notes != null ? String(body.notes).trim() || null : null,
      sources: body.sources != null ? String(body.sources).trim() || null : null,
      category: body.category != null ? String(body.category).trim() || null : null,
    }
    if (!prisma?.bitcoinBackedLender) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }
    const created = await prisma.bitcoinBackedLender.create({ data })
    return NextResponse.json({ success: true, lender: serialize(created) })
  } catch (e) {
    console.error('POST /api/bitcoin-backed-lenders:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
