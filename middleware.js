import { NextResponse } from 'next/server'

/** Middleware – Coming Soon redirect is handled by ComingSoonGate (client) because
 * fetching same-origin API from Edge middleware is unreliable. */
export function middleware() {
  return NextResponse.next()
}
