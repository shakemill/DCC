import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

export async function GET(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const report = await prisma.suitabilityReport.findUnique({
      where: { id },
    })
    if (!report) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      report: serialize(report),
    })
  } catch (e) {
    console.error('GET /api/reports/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** PATCH /api/reports/[id] – update report (admin; frozenData, etc.) */
export async function PATCH(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.suitabilityReport.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.userId != null) data.userId = String(body.userId)
    if (body.incomePlanId !== undefined) data.incomePlanId = body.incomePlanId != null && body.incomePlanId !== '' ? String(body.incomePlanId) : null
    if (body.datasetVersionId !== undefined) data.datasetVersionId = body.datasetVersionId != null && body.datasetVersionId !== '' ? String(body.datasetVersionId) : null
    if (body.reportType != null && ['Suitability', 'Income', 'Risk'].includes(body.reportType)) data.reportType = body.reportType
    if (body.frozenData != null && typeof body.frozenData === 'object') data.frozenData = body.frozenData
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, report: serialize(existing) })
    }
    const report = await prisma.suitabilityReport.update({ where: { id }, data })
    return NextResponse.json({ success: true, report: serialize(report) })
  } catch (e) {
    console.error('PATCH /api/reports/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    await prisma.suitabilityReport.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/reports/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
