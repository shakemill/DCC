import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const KEY_COMING_SOON = 'comingSoonEnabled'

/** PATCH /api/admin/site-settings – update coming soon mode */
export async function PATCH(request) {
  try {
    if (!prisma?.siteConfig) {
      return NextResponse.json({ success: false, error: 'SiteConfig model not available' }, { status: 503 })
    }
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const comingSoon = body.comingSoon === true || body.comingSoon === 'true'
    await prisma.siteConfig.upsert({
      where: { key: KEY_COMING_SOON },
      create: { key: KEY_COMING_SOON, value: comingSoon ? 'true' : 'false' },
      update: { value: comingSoon ? 'true' : 'false' },
    })
    return NextResponse.json({ success: true, comingSoon })
  } catch (e) {
    console.error('PATCH /api/admin/site-settings:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
