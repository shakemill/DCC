import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/** GET /api/admin/stats – dashboard counts */
export async function GET() {
  try {
    const [users, instruments, versions] = await Promise.all([
      prisma.user.count(),
      prisma.instrument.count(),
      prisma.datasetVersion.count(),
    ])
    return NextResponse.json({
      success: true,
      stats: { users, instruments, versions },
    })
  } catch (e) {
    console.error('GET /api/admin/stats:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
