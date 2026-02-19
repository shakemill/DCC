import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date(), // Token not expired
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user: mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    })

    // Send welcome email
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const dashboardUrl = `${baseUrl}/dashboard`
    const name = user.name?.trim() || 'there'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; width: 100%; box-sizing: border-box;">
        <div style="text-align: center;">
          <p style="font-size: 16px; color: #1e293b; margin: 0 0 8px 0;">${name}</p>
          <p style="font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 16px 0;">Welcome to Digital Credit Compass.</p>
        </div>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">Your account has been successfully created. You now have access to an independent, non-custodial platform designed to help you model income strategies and evaluate risk across Bitcoin, USD, and stablecoin credit instruments.</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 8px 0;">With your account, you can:</p>
        <ul style="font-size: 15px; color: #334155; line-height: 1.8; margin: 0 0 16px 0; padding-left: 20px;">
          <li>Run income scenarios using Bitcoin, USD, and stablecoin strategies</li>
          <li>Explore the Yield Board and review available income instruments</li>
          <li>Analyze structural risk, stability, and income potential</li>
        </ul>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px 0;">Digital Credit Compass does not custody assets, execute transactions, or require wallet access. All analysis is independent and designed to support informed planning.</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 8px 0;">Access your dashboard:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${dashboardUrl}" style="background-color: #f49d1d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Open Digital Credit Compass</a>
        </p>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">If you have any questions, you may reply directly to this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="text-align: center; font-size: 13px; color: #475569; margin: 0 0 4px 0;"><strong>Digital Credit Compass</strong></p>
        <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;">Independent. Non-custodial. Risk-first.</p>
        <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;"><a href="mailto:support@digitalcreditcompass.com" style="color: #f49d1d;">support@digitalcreditcompass.com</a></p>
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">Important disclosure: Digital Credit Compass is an analytics and planning platform and does not provide investment advice, brokerage, or custody services.</p>
      </div>
    `
    const text = `
${name}

Welcome to Digital Credit Compass.

Your account has been successfully created. You now have access to an independent, non-custodial platform designed to help you model income strategies and evaluate risk across Bitcoin, USD, and stablecoin credit instruments.

With your account, you can:

• Run income scenarios using Bitcoin, USD, and stablecoin strategies
• Explore the Yield Board and review available income instruments
• Analyze structural risk, stability, and income potential

Digital Credit Compass does not custody assets, execute transactions, or require wallet access. All analysis is independent and designed to support informed planning.

Access your dashboard: ${dashboardUrl}

If you have any questions, you may reply directly to this email.

---
Digital Credit Compass
Independent. Non-custodial. Risk-first.
support@digitalcreditcompass.com

Important disclosure: Digital Credit Compass is an analytics and planning platform and does not provide investment advice, brokerage, or custody services.
    `.trim()
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Your Digital Credit Compass account is ready',
      html,
      text,
    })
    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during email verification. Please try again.',
      },
      { status: 500 }
    )
  }
}
