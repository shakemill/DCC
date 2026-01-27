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

    const reports = await prisma.suitabilityReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      success: true,
      reports: serialize(reports.map((r) => ({ id: r.id, userId: r.userId, reportType: r.reportType, createdAt: r.createdAt, incomePlanId: r.incomePlanId, datasetVersionId: r.datasetVersionId }))),
    })
  } catch (e) {
    console.error('GET /api/reports:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
