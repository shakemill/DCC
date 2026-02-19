import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { parseApy } from '@/lib/parseApy'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

/** Deterministic: sort by qualityScore desc (null last), then APY, take top 3 per category */
function selectTopByScore(products) {
  const sortFn = (a, b) => {
    const scoreA = a.qualityScore ?? -1
    const scoreB = b.qualityScore ?? -1
    if (scoreA !== scoreB) return scoreB - scoreA
    return (b.apyNum ?? 0) - (a.apyNum ?? 0)
  }
  const lending = products
    .filter((p) => p.category === 'collateralised_lending')
    .map((p) => ({ ...p, apyNum: parseApy(p.apy) ?? 0 }))
    .sort(sortFn)
    .slice(0, 3)
    .map(({ apyNum, ...rest }) => rest)

  const cefi = products
    .filter((p) => p.category === 'cefi_savings')
    .map((p) => ({ ...p, apyNum: parseApy(p.apy) ?? 0 }))
    .sort(sortFn)
    .slice(0, 3)
    .map(({ apyNum, ...rest }) => rest)

  return { collateralisedLending: lending, cefiSavings: cefi }
}

/** POST /api/stablecoin-products/select-top – top 3 per category by qualityScore (from DB). Optionally filter by baseStablecoin. */
export async function POST(request) {
  try {
    if (!prisma?.stablecoinProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }

    let where = {}
    try {
      const body = await request.json().catch(() => ({}))
      const base = body?.baseStablecoin != null ? String(body.baseStablecoin).trim() : ''
      if (base === 'USDC') {
        where = { OR: [{ baseStablecoin: 'USDC' }, { baseStablecoin: 'USDC/USDT' }, { baseStablecoin: null }] }
      } else if (base === 'USDT') {
        where = { OR: [{ baseStablecoin: 'USDT' }, { baseStablecoin: 'USDC/USDT' }, { baseStablecoin: null }] }
      }
    } catch {
      // Ignore body parse errors, fetch all
    }

    const products = await prisma.stablecoinProduct.findMany({
      where,
      orderBy: [{ category: 'asc' }, { issuer: 'asc' }],
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        collateralisedLending: [],
        cefiSavings: [],
        message: 'No products in database. Admin can populate via Generate from ChatGPT in Admin > Stablecoin.',
      })
    }

    const result = selectTopByScore(products)
    return NextResponse.json({
      success: true,
      collateralisedLending: serialize(result.collateralisedLending),
      cefiSavings: serialize(result.cefiSavings),
    })
  } catch (e) {
    console.error('POST /api/stablecoin-products/select-top:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Select top failed' },
      { status: 500 }
    )
  }
}
