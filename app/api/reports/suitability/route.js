import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { userId, incomePlanId, datasetVersionId, planParams = {}, instruments: instrumentInput = [] } = body
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    }

    const toNum = (v) => (v != null && v !== '' ? Number(v) : null)
    const frozenInstruments = []
    for (const item of instrumentInput) {
      const id = typeof item === 'string' ? item : item?.id
      if (!id) continue
      const inst = await prisma.instrument.findUnique({
        where: { id },
        include: {
          snapshots: { orderBy: { asOf: 'desc' }, take: 1 },
        },
      })
      if (!inst) continue
      const snap = inst.snapshots[0] || null
      frozenInstruments.push({
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
          supportedAsset: inst.supportedAsset ?? null,
          venueType: inst.venueType ?? null,
          riskTags: inst.riskTags ?? null,
        },
        snapshot: snap
          ? {
              id: snap.id,
              asOf: snap.asOf.toISOString(),
              apyMin: toNum(snap.apyMin),
              apyMax: toNum(snap.apyMax),
              rateType: snap.rateType,
              promoFlag: snap.promoFlag,
            }
          : null,
        weight: typeof item === 'object' && item?.weight != null ? item.weight : undefined,
      })
    }

    const frozenData = {
      planParams,
      instruments: frozenInstruments,
      generatedAt: new Date().toISOString(),
    }

    const report = await prisma.suitabilityReport.create({
      data: {
        userId,
        incomePlanId: incomePlanId || undefined,
        datasetVersionId: datasetVersionId || undefined,
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
        datasetVersionId: report.datasetVersionId,
      }),
    })
  } catch (e) {
    console.error('POST /api/reports/suitability:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
