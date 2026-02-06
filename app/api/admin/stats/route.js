import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/** GET /api/admin/stats – dashboard counts */
export async function GET() {
  try {
    const [users, instruments, versions, productUniverse, cryptoLendingProviders] = await Promise.all([
      prisma.user.count(),
      prisma.instrument.count(),
      prisma.datasetVersion.count(),
      prisma.productUniverse.count(),
      prisma.cryptoLendingProvider.count(),
    ])
    return NextResponse.json({
      success: true,
      stats: { users, instruments, versions, productUniverse, cryptoLendingProviders },
    })
  } catch (e) {
    console.error('GET /api/admin/stats:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

