import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'

export async function GET() {
  try {
    const versions = await prisma.datasetVersion.findMany({
      orderBy: { effectiveAt: 'desc' },
    })
    return NextResponse.json({ success: true, versions: serialize(versions) })
  } catch (e) {
    console.error('GET /api/dataset-versions:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { version, description, effectiveAt } = body
    if (!version || typeof version !== 'string' || !version.trim()) {
      return NextResponse.json({ success: false, error: 'version required' }, { status: 400 })
    }

    const v = await prisma.datasetVersion.create({
      data: {
        version: version.trim(),
        description: description != null ? String(description) : undefined,
        effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
      },
    })
    return NextResponse.json({ success: true, version: serialize(v) })
  } catch (e) {
    console.error('POST /api/dataset-versions:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
