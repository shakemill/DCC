import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { Prisma } from '@prisma/client'

const MODULE_MAP = { '1A': 'M1A', '1B': 'M1B', '1C': 'M1C', M1A: 'M1A', M1B: 'M1B', M1C: 'M1C' }
const ASSET_TO_MODULE = { BTC: 'M1A', USD: 'M1B', USDC: 'M1C', USDT: 'M1C' }
const ASSET_FILTER_1C = { USDC: 'USDC', USDT: 'USDT' }

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleQ = searchParams.get('module')
    const asset = searchParams.get('asset')
    const ids = searchParams.get('ids') // comma-separated for compare
    const jurisdiction = searchParams.get('jurisdiction')
    const supportedAsset = searchParams.get('supportedAsset') // 1C filter

    const where = {}

    if (ids) {
      const idList = ids.split(',').map((s) => s.trim()).filter(Boolean)
      if (idList.length) where.id = { in: idList }
    }

    let moduleVal = moduleQ ? MODULE_MAP[moduleQ] || moduleQ : null
    if (!moduleVal && asset) moduleVal = ASSET_TO_MODULE[asset.toUpperCase()]
    if (moduleVal) where.module = moduleVal

    if (jurisdiction) where.jurisdiction = { contains: jurisdiction }
    if (supportedAsset) where.supportedAsset = supportedAsset
    else if (asset && ASSET_FILTER_1C[asset.toUpperCase()]) where.supportedAsset = asset.toUpperCase()

    const instruments = await prisma.instrument.findMany({
      where,
      include: {
        snapshots: {
          orderBy: { asOf: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ module: 'asc' }, { issuer: 'asc' }, { productName: 'asc' }],
    })

    const out = instruments.map((i) => {
      const snapshot = i.snapshots[0] || null
      const row = {
        ...i,
        latestSnapshot: snapshot
          ? {
              id: snapshot.id,
              asOf: snapshot.asOf,
              apyMin: snapshot.apyMin,
              apyMax: snapshot.apyMax,
              rateType: snapshot.rateType,
              apyLabelOverride: snapshot.apyLabelOverride,
              promoFlag: snapshot.promoFlag,
            }
          : null,
      }
      delete row.snapshots
      return row
    })

    return NextResponse.json({ success: true, instruments: serialize(out) })
  } catch (e) {
    console.error('GET /api/instruments:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const {
      module: mod,
      issuer,
      productName,
      collateral,
      jurisdiction,
      lockup,
      seniority,
      notes,
      sources,
      apyLabel,
      duration,
      promoFlag,
      unverifiableReason,
      datasetVersionId,
      // 1A
      ltvTypical,
      marginCallLtv,
      liquidationLtv,
      liquidationPenalty,
      rehypothecationPolicy,
      contractingEntity,
      governingLaw,
      regionEligibility,
      minLoanSize,
      accreditedOnly,
      feeOrigination,
      feeAdmin,
      feeSpread,
      // 1B
      cusip,
      isin,
      dividendRate,
      paymentFrequency,
      coupon,
      maturity,
      conversionTriggers,
      isYield,
      secYield,
      trailingDistributionRate,
      // 1C
      venueType,
      supportedAsset,
      chain,
      userTier,
      noticePeriod,
      redemptionGates,
      dailyLimit,
      riskTags,
      // snapshot
      snapshot,
    } = body

    if (!mod || !issuer || !productName || !collateral || !jurisdiction || !lockup || !seniority) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: module, issuer, productName, collateral, jurisdiction, lockup, seniority' },
        { status: 400 }
      )
    }

    const modVal = MODULE_MAP[mod] || mod
    if (!['M1A', 'M1B', 'M1C'].includes(modVal)) {
      return NextResponse.json({ success: false, error: 'Invalid module' }, { status: 400 })
    }

    const dec = (v) => (v != null && v !== '' ? new Prisma.Decimal(Number(v)) : undefined)
    const str = (v) => (v != null && v !== '' ? String(v) : undefined)
    const json = (v) => (v != null ? v : undefined)

    const inst = await prisma.instrument.create({
      data: {
        module: modVal,
        datasetVersionId: str(datasetVersionId) || undefined,
        issuer: String(issuer),
        productName: String(productName),
        collateral: String(collateral),
        jurisdiction: String(jurisdiction),
        lockup: String(lockup),
        seniority: String(seniority),
        notes: str(notes),
        sources: json(sources),
        apyLabel: str(apyLabel),
        duration: str(duration),
        promoFlag: Boolean(promoFlag),
        unverifiableReason: str(unverifiableReason),
        ltvTypical: dec(ltvTypical),
        marginCallLtv: dec(marginCallLtv),
        liquidationLtv: dec(liquidationLtv),
        liquidationPenalty: str(liquidationPenalty),
        rehypothecationPolicy: str(rehypothecationPolicy),
        contractingEntity: str(contractingEntity),
        governingLaw: str(governingLaw),
        regionEligibility: json(regionEligibility),
        minLoanSize: dec(minLoanSize),
        accreditedOnly: accreditedOnly == null ? undefined : Boolean(accreditedOnly),
        feeOrigination: str(feeOrigination),
        feeAdmin: str(feeAdmin),
        feeSpread: str(feeSpread),
        cusip: str(cusip),
        isin: str(isin),
        dividendRate: dec(dividendRate),
        paymentFrequency: str(paymentFrequency),
        coupon: dec(coupon),
        maturity: str(maturity),
        conversionTriggers: str(conversionTriggers),
        isYield: isYield == null ? undefined : Boolean(isYield),
        secYield: dec(secYield),
        trailingDistributionRate: dec(trailingDistributionRate),
        venueType: str(venueType) && ['DeFi', 'CeFi', 'RWA'].includes(venueType) ? venueType : undefined,
        supportedAsset: str(supportedAsset),
        chain: str(chain),
        userTier: str(userTier),
        noticePeriod: str(noticePeriod),
        redemptionGates: str(redemptionGates),
        dailyLimit: str(dailyLimit),
        riskTags: json(riskTags),
      },
    })

    if (snapshot && typeof snapshot === 'object') {
      const rt = snapshot.rateType || 'Variable'
      const valid = ['Fixed', 'Variable', 'QuoteBased', 'Promo', 'Unknown'].includes(rt)
      await prisma.instrumentSnapshot.create({
        data: {
          instrumentId: inst.id,
          asOf: snapshot.asOf ? new Date(snapshot.asOf) : new Date(),
          apyMin: dec(snapshot.apyMin),
          apyMax: dec(snapshot.apyMax),
          rateType: valid ? rt : 'Variable',
          apyLabelOverride: str(snapshot.apyLabelOverride),
          promoFlag: Boolean(snapshot.promoFlag),
          sourceUrl: str(snapshot.sourceUrl),
        },
      })
    }

    const withSnap = await prisma.instrument.findUnique({
      where: { id: inst.id },
      include: {
        snapshots: { orderBy: { asOf: 'desc' }, take: 1 },
      },
    })
    const s = withSnap?.snapshots?.[0] || null
    const payload = {
      ...withSnap,
      latestSnapshot: s
        ? { id: s.id, asOf: s.asOf, apyMin: s.apyMin, apyMax: s.apyMax, rateType: s.rateType, apyLabelOverride: s.apyLabelOverride, promoFlag: s.promoFlag }
        : null,
    }
    delete payload.snapshots

    return NextResponse.json({ success: true, instrument: serialize(payload) })
  } catch (e) {
    console.error('POST /api/instruments:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
