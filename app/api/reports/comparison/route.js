import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

function toNum(v) {
  return v != null && v !== '' ? Number(v) : null
}

function formatApy(inst) {
  const s = inst.snapshot
  if (!s) return inst.instrument?.apyLabel ?? '—'
  if (s.apyLabelOverride) return s.apyLabelOverride
  if (s.apyMin != null && s.apyMax != null && s.apyMin !== s.apyMax)
    return `${s.apyMin}% – ${s.apyMax}%`
  if (s.apyMin != null) return `${s.apyMin}%`
  if (s.apyMax != null) return `${s.apyMax}%`
  return inst.instrument?.apyLabel ?? '—'
}

const COMPARISON_FIELDS = [
  { key: 'issuer', label: 'Issuer' },
  { key: 'productName', label: 'Product' },
  { key: 'apy', label: 'APY / Cost', isApy: true },
  { key: 'collateral', label: 'Collateral' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'lockup', label: 'Lockup' },
  { key: 'jurisdiction', label: 'Jurisdiction' },
  { key: 'duration', label: 'Duration' },
  { key: 'notes', label: 'Notes' },
]

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const { userId, instruments: instrumentInput = [] } = body
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      )
    }

    const ids = instrumentInput
      .map((item) => (typeof item === 'string' ? item : item?.id))
      .filter(Boolean)
    if (ids.length < 2 || ids.length > 3) {
      return NextResponse.json(
        { success: false, error: 'Select 2 or 3 instruments to compare' },
        { status: 400 }
      )
    }

    const dbInstruments = await prisma.instrument.findMany({
      where: { id: { in: ids } },
      include: {
        snapshots: { orderBy: { asOf: 'desc' }, take: 1 },
      },
    })
    const order = ids
    const ordered = order
      .map((id) => dbInstruments.find((i) => i.id === id))
      .filter(Boolean)
    if (ordered.length !== ids.length) {
      return NextResponse.json(
        { success: false, error: 'One or more instruments not found' },
        { status: 400 }
      )
    }

    const frozenInstruments = ordered.map((inst) => {
      const snap = inst.snapshots[0] || null
      return {
        instrument: {
          id: inst.id,
          module: inst.module,
          issuer: inst.issuer,
          productName: inst.productName,
          collateral: inst.collateral,
          jurisdiction: inst.jurisdiction,
          lockup: inst.lockup,
          seniority: inst.seniority,
          notes: inst.notes ?? null,
          apyLabel: inst.apyLabel ?? null,
          duration: inst.duration ?? null,
        },
        snapshot: snap
          ? {
              id: snap.id,
              asOf: snap.asOf.toISOString(),
              apyMin: toNum(snap.apyMin),
              apyMax: toNum(snap.apyMax),
              rateType: snap.rateType,
              promoFlag: snap.promoFlag,
              apyLabelOverride: snap.apyLabelOverride,
            }
          : null,
      }
    })

    const comparisonTable = COMPARISON_FIELDS.map((field) => {
      const values = frozenInstruments.map((item) => {
        if (field.isApy) return formatApy(item)
        const raw = item.instrument[field.key]
        return raw ?? '—'
      })
      return { feature: field.label, key: field.key, values }
    })

    const frozenData = {
      reportVariant: 'comparison',
      instruments: frozenInstruments,
      comparisonTable,
      generatedAt: new Date().toISOString(),
    }

    const report = await prisma.suitabilityReport.create({
      data: {
        userId,
        reportType: 'Suitability',
        frozenData,
      },
    })

    return NextResponse.json({
      success: true,
      report: serialize({
        id: report.id,
        userId: report.userId,
        reportType: report.reportType,
        createdAt: report.createdAt,
        incomePlanId: report.incomePlanId,
      }),
    })
  } catch (e) {
    console.error('POST /api/reports/comparison:', e)
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
