import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { hashPassword } from '@/lib/auth'

/** GET /api/admin/users – list all users (no password) */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json({ success: true, users: serialize(users) })
  } catch (e) {
    console.error('GET /api/admin/users:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** POST /api/admin/users – create user */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const { name, email, password } = body
    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'name, email, password required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email: String(email).trim() } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 })
    }
    const hashed = await hashPassword(String(password))
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        password: hashed,
      },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json({ success: true, user: serialize(user) })
  } catch (e) {
    console.error('POST /api/admin/users:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
