import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateVerificationToken, getVerificationTokenExpires } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export async function POST(request) {
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
    
    const { name, email, password } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    let existingUser
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
      })
    } catch (dbError) {
      console.error('Database error when checking existing user:', dbError)
      throw dbError
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const verificationTokenExpires = getVerificationTokenExpires()

    // Create user
    let user
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          verificationToken,
          verificationTokenExpires,
        },
      })
    } catch (dbError) {
      console.error('Database error when creating user:', dbError)
      console.error('Error code:', dbError.code)
      console.error('Error meta:', dbError.meta)
      throw dbError
    }

    // Send verification email
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`
    
    const emailResult = await sendEmail({
      to: email,
      subject: 'Verify your email address - Digital Credit Compass',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f49d1d;">Welcome to Digital Credit Compass!</h1>
          <p>Hello ${name},</p>
          <p>Thank you for registering with Digital Credit Compass. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #f49d1d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Digital Credit Compass. All rights reserved.</p>
        </div>
      `,
      text: `
        Welcome to Digital Credit Compass!
        
        Hello ${name},
        
        Thank you for registering with Digital Credit Compass. Please verify your email address by visiting this link:
        
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, please ignore this email.
        
        © ${new Date().getFullYear()} Digital Credit Compass. All rights reserved.
      `,
    })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Still return success, but log the error
    }

    // Don't return password or token in response
    const { password: _, verificationToken: __, ...userResponse } = user

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        user: userResponse,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    console.error('Error stack:', error.stack)
    
    // Ensure we always return JSON, even on error
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during registration. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
}
