import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

function toNum(v) {
  return v != null && v !== '' ? Number(v) : null
}

function regionFromJurisdiction(j) {
  if (!j) return []
  return String(j)
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function computeRisk1A(planParams) {
  const totalNeed12m = Number(planParams.totalNeed12m) || 0
  const apr = Number(planParams.apr) || 0
  const btcPrice = Number(planParams.btcPrice) || 40000
  const ltvPct = Number(planParams.ltv) ?? 50
  const marginCallLtvPct = Number(planParams.marginCallLtv) ?? 75
  const liquidationLtvPct = Number(planParams.liquidationLtv) ?? 85
  const ltv = ltvPct / 100
  const marginCallLtv = marginCallLtvPct / 100
  const liquidationLtv = liquidationLtvPct / 100

  if (totalNeed12m <= 0 || btcPrice <= 0) return null

  const btcRequired = totalNeed12m / (btcPrice * ltv)
  const marginCallPrice = totalNeed12m / (btcRequired * marginCallLtv)
  const liquidationPrice = totalNeed12m / (btcRequired * liquidationLtv)
  const riskIndicator = ltv <= 0.5 ? 'green' : ltv <= 0.75 ? 'amber' : 'red'
  const sri = Math.min(100 * Math.pow(ltv / liquidationLtv, 2), 100)
  const sriLevel = sri <= 40 ? 'lower' : sri <= 70 ? 'moderate' : 'high'

  const ltvComparison = [10, 25, 50, 75, 85].map((ltvPercent) => {
    const ltvVal = ltvPercent / 100
    const btcReq = totalNeed12m / (btcPrice * ltvVal)
    const marginPrice = totalNeed12m / (btcReq * marginCallLtv)
    const liqPrice = totalNeed12m / (btcReq * liquidationLtv)
    const risk = ltvPercent <= 50 ? 'green' : ltvPercent <= 75 ? 'amber' : 'red'
    return {
      ltv: ltvPercent,
      btcRequired: btcReq,
      marginCallPrice: marginPrice,
      liquidationPrice: liqPrice,
      risk,
    }
  })

  return {
    totalNeed12m,
    apr,
    btcPrice,
    ltv: ltvPct,
    marginCallLtv: marginCallLtvPct,
    liquidationLtv: liquidationLtvPct,
    btcRequired,
    marginCallPrice,
    liquidationPrice,
    riskIndicator,
    sri,
    sriLevel,
    ltvComparison,
  }
}

function computeRisk1C(planParams, allocation) {
  const region = planParams.region || 'UAE'
  const stablecoinAsset = planParams.stablecoinAsset || 'USDC'
  const totalWeight = allocation.reduce((sum, a) => sum + (a.weight || 0), 0)
  if (Math.abs(totalWeight - 100) > 0.01) return null

  const venueBreakdown = { DeFi: 0, CeFi: 0, RWA: 0 }
  const riskTagsByInstrument = []
  const warnings = []

  allocation.forEach((a) => {
    const v = a.venueType === 'DeFi' || a.venueType === 'CeFi' || a.venueType === 'RWA'
      ? a.venueType
      : 'CeFi'
    venueBreakdown[v] = (venueBreakdown[v] || 0) + (a.weight || 0)
    riskTagsByInstrument.push({
      id: a.id,
      issuer: a.issuer,
      productName: a.productName,
      venueType: a.venueType,
      riskTags: Array.isArray(a.riskTags) ? a.riskTags : [],
      weight: a.weight,
    })
  })

  const cefiWeights = {}
  allocation
    .filter((a) => a.venueType === 'CeFi')
    .forEach((a) => {
      cefiWeights[a.issuer] = (cefiWeights[a.issuer] || 0) + a.weight
    })
  Object.entries(cefiWeights).forEach(([issuer, weight]) => {
    if (weight > 70)
      warnings.push({
        type: 'counterparty',
        severity: 'red',
        message: `${issuer} concentration: ${weight.toFixed(1)}% (Red: >70%)`,
      })
    else if (weight > 50)
      warnings.push({
        type: 'counterparty',
        severity: 'amber',
        message: `${issuer} concentration: ${weight.toFixed(1)}% (Amber: >50%)`,
      })
  })

  const defiWeight = allocation
    .filter((a) => a.venueType === 'DeFi')
    .reduce((sum, a) => sum + a.weight, 0)
  if (defiWeight > 85)
    warnings.push({
      type: 'smart-contract',
      severity: 'red',
      message: `DeFi exposure: ${defiWeight.toFixed(1)}% (Red: >85%)`,
    })
  else if (defiWeight > 70)
    warnings.push({
      type: 'smart-contract',
      severity: 'amber',
      message: `DeFi exposure: ${defiWeight.toFixed(1)}% (Amber: >70%)`,
    })

  const promoWeight = allocation
    .filter((a) => a.rateType === 'Promo')
    .reduce((sum, a) => sum + a.weight, 0)
  if (promoWeight > 50)
    warnings.push({
      type: 'promo',
      severity: 'red',
      message: `Promo-rate exposure: ${promoWeight.toFixed(1)}% (Red: >50%)`,
    })
  else if (promoWeight > 30)
    warnings.push({
      type: 'promo',
      severity: 'amber',
      message: `Promo-rate exposure: ${promoWeight.toFixed(1)}% (Amber: >30%)`,
    })

  if (allocation.length === 1 && allocation[0].weight === 100) {
    warnings.push({
      type: 'peg',
      severity: 'amber',
      message: `100% allocation to ${stablecoinAsset} - consider peg risk and issuer model`,
    })
  }

  return {
    venueBreakdown,
    riskTagsByInstrument,
    warnings,
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const {
      userId,
      source,
      incomePlanId,
      planParams = {},
      instruments: instrumentInput = [],
    } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      )
    }
    if (source !== '1A' && source !== '1C') {
      return NextResponse.json(
        { success: false, error: 'source must be 1A or 1C' },
        { status: 400 }
      )
    }

    if (source === '1A') {
      const metrics = computeRisk1A(planParams)
      if (!metrics) {
        return NextResponse.json(
          { success: false, error: 'Could not compute 1A risk metrics; check planParams (totalNeed12m, btcPrice, etc.)' },
          { status: 400 }
        )
      }
      const frozenData = {
        source: '1A',
        planParams,
        metrics,
        warnings: [],
        generatedAt: new Date().toISOString(),
      }

      const report = await prisma.suitabilityReport.create({
        data: {
          userId,
          incomePlanId: incomePlanId || undefined,
          reportType: 'Risk',
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
    }

    const allocationInput = instrumentInput
      .map((item) => ({
        id: typeof item === 'string' ? item : item?.id,
        weight: typeof item === 'object' && item?.weight != null ? Number(item.weight) : 0,
      }))
      .filter((a) => a.id)
    const totalWeight = allocationInput.reduce((s, a) => s + a.weight, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Instrument weights must sum to 100% for 1C Risk report' },
        { status: 400 }
      )
    }

    const ids = allocationInput.map((a) => a.id)
    const dbInstruments = await prisma.instrument.findMany({
      where: { id: { in: ids } },
      include: {
        snapshots: { orderBy: { asOf: 'desc' }, take: 1 },
      },
    })
    const byId = new Map(dbInstruments.map((i) => [i.id, i]))
    const weightById = new Map(allocationInput.map((a) => [a.id, a.weight]))

    const invalid = dbInstruments.some((i) => i.module !== 'M1C')
    if (invalid) {
      return NextResponse.json(
        { success: false, error: 'All instruments must be 1C (Stablecoin) for Risk 1C report' },
        { status: 400 }
      )
    }

    const allocation = []
    for (const a of allocationInput) {
      const inst = byId.get(a.id)
      if (!inst) continue
      const snap = inst.snapshots[0] || null
      const region = Array.isArray(inst.regionEligibility) && inst.regionEligibility.length
        ? inst.regionEligibility
        : regionFromJurisdiction(inst.jurisdiction)
      allocation.push({
        id: inst.id,
        issuer: inst.issuer,
        productName: inst.productName,
        venueType: inst.venueType || 'CeFi',
        supportedAsset: inst.supportedAsset || 'USDC',
        weight: weightById.get(inst.id) || 0,
        rateType: snap?.rateType || 'Variable',
        riskTags: Array.isArray(inst.riskTags) ? inst.riskTags : [],
        region,
      })
    }

    const result = computeRisk1C(planParams, allocation)
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Could not compute 1C risk metrics' },
        { status: 400 }
      )
    }

    const frozenInstruments = allocation.map((a) => ({
      id: a.id,
      issuer: a.issuer,
      productName: a.productName,
      venueType: a.venueType,
      weight: a.weight,
    }))

    const frozenData = {
      source: '1C',
      planParams,
      instruments: frozenInstruments,
      metrics: {
        venueBreakdown: result.venueBreakdown,
        riskTagsByInstrument: result.riskTagsByInstrument,
      },
      warnings: result.warnings,
      generatedAt: new Date().toISOString(),
    }

    const report = await prisma.suitabilityReport.create({
      data: {
        userId,
        incomePlanId: incomePlanId || undefined,
        reportType: 'Risk',
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
    console.error('POST /api/reports/risk:', e)
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
