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

    const instrument = await prisma.instrument.findUnique({
      where: { id },
      include: {
        snapshots: { orderBy: { asOf: 'desc' }, take: 1 },
      },
    })
    if (!instrument) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const s = instrument.snapshots[0] || null
    const payload = {
      ...instrument,
      latestSnapshot: s
        ? {
            id: s.id,
            asOf: s.asOf,
            apyMin: s.apyMin,
            apyMax: s.apyMax,
            rateType: s.rateType,
            apyLabelOverride: s.apyLabelOverride,
            promoFlag: s.promoFlag,
            sourceUrl: s.sourceUrl,
          }
        : null,
    }
    delete payload.snapshots

    return NextResponse.json({ success: true, instrument: serialize(payload) })
  } catch (e) {
    console.error('GET /api/instruments/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const existing = await prisma.instrument.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const dec = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : undefined)
    const str = (v) => (v != null && v !== '' ? String(v) : undefined)
    const json = (v) => (v != null ? v : undefined)

    const allowed = [
      'module',
      'issuer',
      'productName',
      'collateral',
      'jurisdiction',
      'lockup',
      'seniority',
      'notes',
      'sources',
      'apyLabel',
      'duration',
      'promoFlag',
      'unverifiableReason',
      'datasetVersionId',
      'ltvTypical',
      'marginCallLtv',
      'liquidationLtv',
      'liquidationPenalty',
      'rehypothecationPolicy',
      'contractingEntity',
      'governingLaw',
      'regionEligibility',
      'minLoanSize',
      'accreditedOnly',
      'feeOrigination',
      'feeAdmin',
      'feeSpread',
      'ticker',
      'cusip',
      'isin',
      'distributionMechanics',
      'settlementNotes',
      'dividendRate',
      'paymentFrequency',
      'coupon',
      'maturity',
      'conversionTriggers',
      'isYield',
      'secYield',
      'trailingDistributionRate',
      'venueType',
      'supportedAsset',
      'chain',
      'userTier',
      'noticePeriod',
      'redemptionGates',
      'dailyLimit',
      'riskTags',
    ]

    const data = {}
    for (const k of allowed) {
      if (!(k in body)) continue
      const v = body[k]
      if (['ltvTypical', 'marginCallLtv', 'liquidationLtv', 'minLoanSize', 'dividendRate', 'coupon', 'secYield', 'trailingDistributionRate'].includes(k)) {
        data[k] = dec(v)
      } else if (['regionEligibility', 'sources', 'riskTags'].includes(k)) {
        data[k] = json(v)
      } else if (['promoFlag', 'accreditedOnly', 'isYield'].includes(k)) {
        data[k] = v == null ? undefined : Boolean(v)
      } else if (k === 'module' && v) {
        const m = { '1A': 'M1A', '1B': 'M1B', '1C': 'M1C', M1A: 'M1A', M1B: 'M1B', M1C: 'M1C' }[v] || v
        if (['M1A', 'M1B', 'M1C'].includes(m)) data[k] = m
      } else if (['venueType'].includes(k) && v && ['DeFi', 'CeFi', 'RWA'].includes(v)) {
        data[k] = v
      } else {
        data[k] = str(v)
      }
    }

    const updated = await prisma.instrument.update({
      where: { id },
      data,
      include: {
        snapshots: { orderBy: { asOf: 'desc' }, take: 1 },
      },
    })
    const s = updated.snapshots[0] || null
    const payload = {
      ...updated,
      latestSnapshot: s
        ? {
            id: s.id,
            asOf: s.asOf,
            apyMin: s.apyMin,
            apyMax: s.apyMax,
            rateType: s.rateType,
            apyLabelOverride: s.apyLabelOverride,
            promoFlag: s.promoFlag,
          }
        : null,
    }
    delete payload.snapshots

    return NextResponse.json({ success: true, instrument: serialize(payload) })
  } catch (e) {
    console.error('PATCH /api/instruments/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    await prisma.instrument.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/instruments/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
