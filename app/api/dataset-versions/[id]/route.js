import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

/** PATCH /api/dataset-versions/[id] */
export async function PATCH(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.datasetVersion.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const data = {}
    if (body.version != null && String(body.version).trim()) data.version = String(body.version).trim()
    if (body.description !== undefined) data.description = body.description != null ? String(body.description) : null
    if (body.effectiveAt != null) data.effectiveAt = new Date(body.effectiveAt)
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, version: serialize(existing) })
    }
    const v = await prisma.datasetVersion.update({ where: { id }, data })
    return NextResponse.json({ success: true, version: serialize(v) })
  } catch (e) {
    console.error('PATCH /api/dataset-versions/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/dataset-versions/[id] */
export async function DELETE(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.datasetVersion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/dataset-versions/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
