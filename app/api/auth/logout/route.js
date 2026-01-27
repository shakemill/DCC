import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // In a real app, you might want to invalidate a session token here
    // For now, we just return success as logout is handled client-side
    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during logout',
      },
      { status: 500 }
    )
  }
}
