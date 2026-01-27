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

function computeFiatMetrics(planParams, allocation) {
  const targetMonthly = Number(planParams.targetMonthlyIncome) || 0
  const targetAnnual = Number(planParams.targetAnnualIncome) || 0
  const targetAnnualIncome = targetAnnual > 0 ? targetAnnual : targetMonthly * 12
  const horizon = Number(planParams.horizon) || 12
  const region = planParams.region || 'UAE'
  const liquidityPreference = planParams.liquidityPreference || 'Market-traded'
  const excludeDiscretionary = Boolean(planParams.excludeDiscretionary)
  const availableCapital = Number(planParams.availableCapital) || 0

  if (targetAnnualIncome <= 0 || !allocation.length) return null

  const totalWeight = allocation.reduce((sum, a) => sum + (a.weight || 0), 0)
  if (Math.abs(totalWeight - 100) > 0.01) return null

  const portfolioApyMin = allocation.reduce(
    (sum, a) => sum + ((a.weight / 100) * (a.apyMin || 0)),
    0
  )
  const portfolioApyMax = allocation.reduce(
    (sum, a) => sum + ((a.weight / 100) * (a.apyMax || 0)),
    0
  )
  const requiredCapitalMin = targetAnnualIncome / (portfolioApyMin / 100 || 1e-6)
  const requiredCapitalMax = targetAnnualIncome / (portfolioApyMax / 100 || 1e-6)
  const expectedIncomeMin =
    availableCapital > 0 ? (availableCapital * portfolioApyMin) / 100 : null
  const expectedIncomeMax =
    availableCapital > 0 ? (availableCapital * portfolioApyMax) / 100 : null

  const warnings = []
  const issuerWeights = {}
  allocation.forEach((a) => {
    issuerWeights[a.issuer] = (issuerWeights[a.issuer] || 0) + a.weight
  })
  Object.entries(issuerWeights).forEach(([issuer, weight]) => {
    if (weight > 70)
      warnings.push({
        type: 'issuer',
        severity: 'red',
        message: `${issuer} concentration: ${weight.toFixed(1)}% (Red: >70%)`,
      })
    else if (weight > 50)
      warnings.push({
        type: 'issuer',
        severity: 'amber',
        message: `${issuer} concentration: ${weight.toFixed(1)}% (Amber: >50%)`,
      })
  })

  allocation.forEach((a) => {
    if (liquidityPreference === 'On-demand' && a.liquidity !== 'On-demand') {
      warnings.push({
        type: 'liquidity',
        severity: 'amber',
        message: `${a.name}: liquidity mismatch`,
      })
    }
  })

  const discretionaryWeight = allocation
    .filter((a) => a.rateType === 'Discretionary')
    .reduce((sum, a) => sum + a.weight, 0)
  if (discretionaryWeight > 50)
    warnings.push({
      type: 'discretionary',
      severity: 'red',
      message: `Discretionary-rate concentration: ${discretionaryWeight.toFixed(1)}% (Red: >50%)`,
    })
  else if (discretionaryWeight > 30)
    warnings.push({
      type: 'discretionary',
      severity: 'amber',
      message: `Discretionary-rate concentration: ${discretionaryWeight.toFixed(1)}% (Amber: >30%)`,
    })

  allocation.forEach((a) => {
    const regions = a.region || []
    if (regions.length && !regions.includes(region)) {
      warnings.push({
        type: 'eligibility',
        severity: 'red',
        message: `${a.name}: not available in ${region}`,
      })
    }
  })

  const rateAsOf =
    allocation.length > 0 && allocation[0].rateAsOf
      ? new Date(allocation[0].rateAsOf).toISOString()
      : new Date().toISOString()

  return {
    targetAnnualIncome,
    targetMonthlyIncome: targetAnnualIncome / 12,
    portfolioApyMin,
    portfolioApyMax,
    requiredCapitalMin,
    requiredCapitalMax,
    expectedIncomeMin,
    expectedIncomeMax,
    warnings,
    rateAsOf,
  }
}

function computeStablecoinMetrics(planParams, allocation) {
  const principal = Number(planParams.principal) || 0
  const horizon = Number(planParams.horizon) || 12
  const targetMonthly = Number(planParams.targetMonthlyIncome) || 0
  const region = planParams.region || 'UAE'
  const liquidityPreference = planParams.liquidityPreference || 'On-demand'
  const stablecoinAsset = planParams.stablecoinAsset || 'USDC'

  if (principal <= 0 || !allocation.length) return null

  const totalWeight = allocation.reduce((sum, a) => sum + (a.weight || 0), 0)
  if (Math.abs(totalWeight - 100) > 0.01) return null

  let monthlyIncomeMin = 0
  let monthlyIncomeMax = 0
  allocation.forEach((a) => {
    const eligible = a.eligibilityStatus === 'Eligible'
    if (eligible && a.apyMin != null)
      monthlyIncomeMin +=
        (principal * (a.weight / 100) * (Number(a.apyMin) / 100)) / 12
    if (eligible && a.apyMax != null)
      monthlyIncomeMax +=
        (principal * (a.weight / 100) * (Number(a.apyMax) / 100)) / 12
  })
  const totalIncomeMin = monthlyIncomeMin * horizon
  const totalIncomeMax = monthlyIncomeMax * horizon
  const gapVsTarget = targetMonthly > 0 ? targetMonthly - monthlyIncomeMin : null

  const portfolioApyMin =
    principal > 0
      ? allocation.reduce(
          (sum, a) =>
            sum +
            (a.eligibilityStatus === 'Eligible' && a.apyMin != null
              ? (a.weight / 100) * Number(a.apyMin)
              : 0),
          0
        )
      : null
  const portfolioApyMax =
    principal > 0
      ? allocation.reduce(
          (sum, a) =>
            sum +
            (a.eligibilityStatus === 'Eligible' && a.apyMax != null
              ? (a.weight / 100) * Number(a.apyMax)
              : 0),
          0
        )
      : null

  const warnings = []
  allocation.forEach((a) => {
    if (a.eligibilityStatus === 'Not eligible') {
      warnings.push({
        type: 'eligibility',
        severity: 'red',
        message: `${a.productName}: Not eligible in ${region}`,
      })
    } else if (a.eligibilityStatus === 'Check eligibility') {
      warnings.push({
        type: 'eligibility',
        severity: 'amber',
        message: `${a.productName}: Check eligibility for ${region}`,
      })
    }
  })

  allocation.forEach((a) => {
    if (
      liquidityPreference === 'On-demand' &&
      a.liquidity !== 'On-demand' &&
      a.liquidity !== 'Flexible'
    ) {
      warnings.push({
        type: 'liquidity',
        severity: 'amber',
        message: `${a.productName}: liquidity mismatch (${a.liquidity} vs ${liquidityPreference})`,
      })
    } else if (
      liquidityPreference === '24h' &&
      ['Weekly', 'Monthly', 'Locked'].includes(a.liquidity)
    ) {
      warnings.push({
        type: 'liquidity',
        severity: 'red',
        message: `${a.productName}: significant liquidity mismatch`,
      })
    }
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

  const rateAsOf =
    allocation.length > 0 && allocation[0].rateAsOf
      ? new Date(allocation[0].rateAsOf).toISOString()
      : new Date().toISOString()

  return {
    principal,
    horizon,
    stablecoinAsset,
    monthlyIncomeMin,
    monthlyIncomeMax,
    totalIncomeMin,
    totalIncomeMax,
    gapVsTarget,
    portfolioApyMin,
    portfolioApyMax,
    warnings,
    rateAsOf,
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
    if (source !== 'fiat' && source !== 'stablecoin') {
      return NextResponse.json(
        { success: false, error: 'source must be fiat or stablecoin' },
        { status: 400 }
      )
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
        { success: false, error: 'Instrument weights must sum to 100%' },
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

    if (source === 'fiat') {
      const moduleVal = 'M1B'
      const invalid = dbInstruments.some((i) => i.module !== moduleVal)
      if (invalid) {
        return NextResponse.json(
          { success: false, error: 'All instruments must be 1B (Fiat) for Income Fiat report' },
          { status: 400 }
        )
      }
    } else {
      const moduleVal = 'M1C'
      const invalid = dbInstruments.some((i) => i.module !== moduleVal)
      if (invalid) {
        return NextResponse.json(
          { success: false, error: 'All instruments must be 1C (Stablecoin) for Income Stablecoin report' },
          { status: 400 }
        )
      }
    }

    let allocation = []
    let latestRateAsOf = null

    for (const a of allocationInput) {
      const inst = byId.get(a.id)
      if (!inst) continue
      const snap = inst.snapshots[0] || null
      const region = Array.isArray(inst.regionEligibility) && inst.regionEligibility.length
        ? inst.regionEligibility
        : regionFromJurisdiction(inst.jurisdiction)
      const rateAsOf = snap?.asOf ? new Date(snap.asOf).toISOString() : null
      if (rateAsOf && (!latestRateAsOf || rateAsOf > latestRateAsOf))
        latestRateAsOf = rateAsOf

      if (source === 'fiat') {
        allocation.push({
          id: inst.id,
          issuer: inst.issuer,
          name: inst.productName,
          weight: weightById.get(inst.id) || 0,
          apyMin: toNum(snap?.apyMin),
          apyMax: toNum(snap?.apyMax),
          rateType: snap?.rateType || inst.apyLabel || 'Variable',
          liquidity: inst.lockup === 'Market' ? 'Market-traded' : (inst.lockup || '—'),
          region: region.length ? region : ['Global'],
          rateAsOf,
        })
      } else {
        const eligibilityStatus =
          region.length && !region.some((r) => r === 'On-chain' || r === 'Global')
            ? 'Eligible'
            : 'Check eligibility'
        const userRegion = planParams.region || 'UAE'
        const notEligible =
          region.length &&
          !region.some((r) => r === 'On-chain' || r === 'Global') &&
          !region.includes(userRegion)
        const effectiveEligibility = notEligible ? 'Not eligible' : eligibilityStatus

        allocation.push({
          id: inst.id,
          issuer: inst.issuer,
          productName: inst.productName,
          venueType: inst.venueType || '—',
          supportedAsset: inst.supportedAsset || 'USDC',
          liquidity: inst.lockup || inst.noticePeriod || '—',
          weight: weightById.get(inst.id) || 0,
          apyMin: toNum(snap?.apyMin),
          apyMax: toNum(snap?.apyMax),
          rateType: snap?.rateType || 'Variable',
          eligibilityStatus: effectiveEligibility,
          region,
          rateAsOf,
        })
      }
    }

    const metrics =
      source === 'fiat'
        ? computeFiatMetrics(planParams, allocation)
        : computeStablecoinMetrics(planParams, allocation)

    if (!metrics) {
      return NextResponse.json(
        { success: false, error: 'Could not compute income metrics; check planParams and allocation' },
        { status: 400 }
      )
    }

    const frozenInstruments = allocation.map((a) => ({
      id: a.id,
      issuer: a.issuer,
      name: a.name || a.productName,
      weight: a.weight,
      apyMin: a.apyMin,
      apyMax: a.apyMax,
    }))

    const { warnings: _w, ...metricsRest } = metrics
    const frozenData = {
      source,
      planParams,
      allocation: frozenInstruments,
      metrics: metricsRest,
      warnings: _w || [],
      rateAsOf: metrics.rateAsOf,
      generatedAt: new Date().toISOString(),
    }

    const report = await prisma.suitabilityReport.create({
      data: {
        userId,
        incomePlanId: incomePlanId || undefined,
        reportType: 'Income',
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
    console.error('POST /api/reports/income:', e)
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}
