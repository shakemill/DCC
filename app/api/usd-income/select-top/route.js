import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { parseApy } from '@/lib/parseApy'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

/** Deterministic: top 3 per venue by qualityScore then apyDistribution. venue null/empty/CeFi → CeFi, DeFi → DeFi. */
function selectTopByVenue(products) {
  const sortFn = (a, b) => {
    const scoreA = a.qualityScore ?? -1
    const scoreB = b.qualityScore ?? -1
    if (scoreA !== scoreB) return scoreB - scoreA
    return (b.apyNum ?? 0) - (a.apyNum ?? 0)
  }
  const defi = products
    .filter((p) => (p.venue || '').toLowerCase() === 'defi')
    .map((p) => ({ ...p, apyNum: parseApy(p.apyDistribution) ?? 0 }))
    .sort(sortFn)
    .slice(0, 3)
    .map(({ apyNum, ...rest }) => rest)

  const cefi = products
    .filter((p) => (p.venue || '').toLowerCase() !== 'defi')
    .map((p) => ({ ...p, apyNum: parseApy(p.apyDistribution) ?? 0 }))
    .sort(sortFn)
    .slice(0, 3)
    .map(({ apyNum, ...rest }) => rest)

  return { defiProducts: defi, cefiProducts: cefi }
}

/** POST /api/usd-income/select-top – top 3 per venue (DeFi/CeFi) by qualityScore. Returns defiProducts, cefiProducts for 30/70 modelled ratio. */
export async function POST() {
  try {
    if (!prisma?.usdIncomeProduct) {
      return NextResponse.json(MODEL_UNAVAILABLE, { status: 503 })
    }

    const products = await prisma.usdIncomeProduct.findMany({
      orderBy: [{ issuer: 'asc' }, { ticker: 'asc' }],
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        defiProducts: [],
        cefiProducts: [],
        topProducts: [],
        message: 'No products in database. Admin can populate via Generate from ChatGPT in Admin > Fiat Income.',
      })
    }

    const result = selectTopByVenue(products)
    const topProducts = [...result.defiProducts, ...result.cefiProducts]

    return NextResponse.json({
      success: true,
      defiProducts: serialize(result.defiProducts),
      cefiProducts: serialize(result.cefiProducts),
      topProducts: serialize(topProducts),
    })
  } catch (e) {
    console.error('POST /api/usd-income/select-top:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Select top failed' },
      { status: 500 }
    )
  }
}
