import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const userId = body.userId != null ? String(body.userId).trim() : ''
    const path = body.path != null ? String(body.path).trim() : ''
    const referrer = body.referrer != null ? String(body.referrer).trim() || null : null
    if (!userId || !path) {
      return NextResponse.json({ success: false, error: 'userId and path are required' }, { status: 400 })
    }
    if (path.length > 512) {
      return NextResponse.json({ success: false, error: 'path too long' }, { status: 400 })
    }

    if (!prisma?.pageVisit) {
      return NextResponse.json(
        { success: false, error: 'Database model not available. Run: prisma generate && pnpm run build, then redeploy.' },
        { status: 503 }
      )
    }

    await prisma.pageVisit.create({
      data: { userId, path, referrer },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/analytics/visit:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
