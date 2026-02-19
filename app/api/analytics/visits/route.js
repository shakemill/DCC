import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    if (!prisma?.pageVisit) {
      return NextResponse.json(
        { success: false, error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.' },
        { status: 503 }
      )
    }

    const [visits, total] = await Promise.all([
      prisma.pageVisit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.pageVisit.count({ where: { userId } }),
    ])

    return NextResponse.json({
      success: true,
      visits: serialize(visits),
      total,
    })
  } catch (e) {
    console.error('GET /api/analytics/visits:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
