import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

/** GET /api/admin/reports – list all suitability reports */
export async function GET() {
  try {
    const reports = await prisma.suitabilityReport.findMany({
      orderBy: { createdAt: 'desc' },
    })
    const out = reports.map((r) => ({
      id: r.id,
      userId: r.userId,
      incomePlanId: r.incomePlanId,
      datasetVersionId: r.datasetVersionId,
      reportType: r.reportType,
      createdAt: r.createdAt,
    }))
    return NextResponse.json({ success: true, reports: serialize(out) })
  } catch (e) {
    console.error('GET /api/admin/reports:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** POST /api/admin/reports – create report (admin) */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const { userId, reportType, incomePlanId, datasetVersionId, frozenData } = body
    if (!userId || !reportType) {
      return NextResponse.json({ success: false, error: 'userId and reportType required' }, { status: 400 })
    }
    const valid = ['Suitability', 'Income', 'Risk'].includes(reportType)
    if (!valid) return NextResponse.json({ success: false, error: 'reportType must be Suitability, Income, or Risk' }, { status: 400 })
    const report = await prisma.suitabilityReport.create({
      data: {
        userId: String(userId),
        incomePlanId: incomePlanId != null && incomePlanId !== '' ? String(incomePlanId) : undefined,
        datasetVersionId: datasetVersionId != null && datasetVersionId !== '' ? String(datasetVersionId) : undefined,
        reportType,
        frozenData: frozenData != null && typeof frozenData === 'object' ? frozenData : {},
      },
    })
    return NextResponse.json({ success: true, report: serialize(report) })
  } catch (e) {
    console.error('POST /api/admin/reports:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
