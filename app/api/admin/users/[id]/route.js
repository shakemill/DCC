import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { hashPassword } from '@/lib/auth'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

/** PATCH /api/admin/users/[id] – update user */
export async function PATCH(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }
    const { name, email, password } = body
    const data = {}
    if (name != null && String(name).trim()) data.name = String(name).trim()
    if (email != null && String(email).trim()) {
      const em = String(email).trim()
      const other = await prisma.user.findFirst({ where: { email: em, NOT: { id } } })
      if (other) return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 })
      data.email = em
    }
    if (password != null && String(password)) {
      if (String(password).length < 8) {
        return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      data.password = await hashPassword(String(password))
    }
    if (Object.keys(data).length === 0) {
      const out = { ...existing, password: undefined }
      return NextResponse.json({ success: true, user: serialize(out) })
    }
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json({ success: true, user: serialize(updated) })
  } catch (e) {
    console.error('PATCH /api/admin/users/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/** DELETE /api/admin/users/[id] */
export async function DELETE(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e?.code === 'P2025') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    console.error('DELETE /api/admin/users/[id]:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
