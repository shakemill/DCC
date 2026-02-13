import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/** GET /api/admin/stats – dashboard counts */
export async function GET() {
  try {
    const [users, instruments, cryptoLendingProviders, bitcoinBackedLenders, usdIncomeProducts, stablecoinProducts] = await Promise.all([
      prisma.user.count(),
      prisma.instrument.count(),
      prisma.cryptoLendingProvider.count(),
      prisma.bitcoinBackedLender ? prisma.bitcoinBackedLender.count() : Promise.resolve(0),
      prisma.usdIncomeProduct ? prisma.usdIncomeProduct.count() : Promise.resolve(0),
      prisma.stablecoinProduct ? prisma.stablecoinProduct.count() : Promise.resolve(0),
    ])
    return NextResponse.json({
      success: true,
      stats: { users, instruments, cryptoLendingProviders, bitcoinBackedLenders, usdIncomeProducts, stablecoinProducts },
    })
  } catch (e) {
    console.error('GET /api/admin/stats:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

