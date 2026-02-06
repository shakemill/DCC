import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVerificationToken, getResetPasswordTokenExpires } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends a password reset link to the user's email (if the user exists).
 * Always returns 200 with a generic message to avoid email enumeration.
 */
export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const { email } = body
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      })
    }

    const resetToken = generateVerificationToken()
    const resetTokenExpires = getResetPasswordTokenExpires()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpires: resetTokenExpires,
      },
    })

    const baseUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Reset your password - Digital Credit Compass',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f49d1d;">Reset your password</h1>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #f49d1d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a reset, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Digital Credit Compass. All rights reserved.</p>
        </div>
      `,
      text: `
        Reset your password - Digital Credit Compass

        Hello ${user.name},

        You requested a password reset. Visit this link to set a new password:

        ${resetUrl}

        This link will expire in 1 hour.

        If you didn't request a reset, you can ignore this email.

        © ${new Date().getFullYear()} Digital Credit Compass. All rights reserved.
      `,
    })

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
