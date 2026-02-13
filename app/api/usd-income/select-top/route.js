import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { parseApy } from '@/lib/parseApy'

const MODEL_UNAVAILABLE = {
  success: false,
  error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.',
}

/** POST /api/usd-income/select-top – deterministic top 3 by qualityScore then apyDistribution */
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
        topProducts: [],
        message: 'No products in database. Admin can populate via Generate from ChatGPT in Admin > Fiat Income.',
      })
    }

    const withApy = products.map((p) => ({
      ...p,
      apyNum: parseApy(p.apyDistribution) ?? 0,
    }))

    const sorted = withApy.sort((a, b) => {
      const scoreA = a.qualityScore ?? -1
      const scoreB = b.qualityScore ?? -1
      if (scoreA !== scoreB) return scoreB - scoreA
      return (b.apyNum ?? 0) - (a.apyNum ?? 0)
    })

    const top3 = sorted.slice(0, 3).map(({ apyNum, ...rest }) => rest)

    return NextResponse.json({
      success: true,
      topProducts: serialize(top3),
    })
  } catch (e) {
    console.error('POST /api/usd-income/select-top:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Select top failed' },
      { status: 500 }
    )
  }
}
