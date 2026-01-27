import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { name, email } = body

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // TODO: Get user ID from session/token
    // For now, we'll need to pass it in the request or get it from a token
    // This is a placeholder - you should implement proper authentication
    const userId = body.userId // This should come from a session/token

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: userId,
        },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Update user
    let user
    try {
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email,
        },
      })
    } catch (dbError) {
      console.error('Database error when updating user:', dbError)
      throw dbError
    }

    // Don't return password or token in response
    const { password: _, verificationToken: __, verificationTokenExpires: ___, ...userResponse } = user

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
        user: userResponse,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Profile update error:', error)
    console.error('Error stack:', error.stack)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during profile update. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
