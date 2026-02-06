import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { Prisma } from '@prisma/client'

const toDecimal = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : null)

export async function GET() {
  try {
    const providers = await prisma.cryptoLendingProvider.findMany({
      orderBy: [{ provider: 'asc' }],
    })
    return NextResponse.json({
      success: true,
      providers: serialize(providers),
    })
  } catch (error) {
    console.error('Crypto lending providers fetch error:', error)
    const message = error?.message || 'Failed to load crypto lending providers'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

/** POST /api/crypto-lending-providers – create */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const provider = body.provider != null ? String(body.provider).trim() : ''
    const type = body.type != null ? String(body.type).trim() : ''
    if (!provider || !type) {
      return NextResponse.json({ success: false, error: 'provider and type are required' }, { status: 400 })
    }
    const data = {
      provider,
      type: type || 'CeFi',
      jurisdiction: body.jurisdiction != null ? String(body.jurisdiction).trim() || null : null,
      apyMin: toDecimal(body.apyMin),
      apyMax: toDecimal(body.apyMax),
      hv30Pct: toDecimal(body.hv30Pct),
      liquidity: body.liquidity != null ? String(body.liquidity).trim() || null : null,
      comment: body.comment != null ? String(body.comment).trim() || null : null,
    }
    const created = await prisma.cryptoLendingProvider.create({ data })
    return NextResponse.json({ success: true, provider: serialize(created) })
  } catch (e) {
    console.error('POST /api/crypto-lending-providers:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
