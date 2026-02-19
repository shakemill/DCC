import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const KEY_COMING_SOON = 'comingSoonEnabled'

/** GET /api/site-settings – public read (used by middleware) */
export async function GET() {
  try {
    if (!prisma?.siteConfig) {
      return NextResponse.json({ comingSoon: false })
    }
    const row = await prisma.siteConfig.findUnique({
      where: { key: KEY_COMING_SOON },
    })
    const comingSoon = row?.value === 'true' || row?.value === '1'
    return NextResponse.json({ comingSoon })
  } catch (e) {
    console.error('GET /api/site-settings:', e)
    return NextResponse.json({ comingSoon: false })
  }
}
