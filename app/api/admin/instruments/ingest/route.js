import { NextResponse } from 'next/server'
import { upsertInstrumentsFromCanonical } from '@/lib/instruments/ingest'

/**
 * POST /api/admin/instruments/ingest
 * Body: { instruments: CanonicalInstrument[] }
 * Protégé par ADMIN_API_KEY si défini (header x-admin-key).
 */
export async function POST(request) {
  try {
    const adminKey = process.env.ADMIN_API_KEY
    if (adminKey) {
      const provided = request.headers.get('x-admin-key') || request.nextUrl.searchParams.get('x-admin-key')
      if (provided !== adminKey) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { instruments } = body
    if (!Array.isArray(instruments)) {
      return NextResponse.json(
        { success: false, error: 'Body must contain instruments array' },
        { status: 400 }
      )
    }

    const result = await upsertInstrumentsFromCanonical(instruments)

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      snapshotsAdded: result.snapshotsAdded,
      errors: result.errors,
    })
  } catch (e) {
    console.error('POST /api/admin/instruments/ingest:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
