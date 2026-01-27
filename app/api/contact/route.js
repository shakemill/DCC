import { NextResponse } from 'next/server'
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

    const { name, email, subject, message } = body

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Send email to support (destination définie dans .env : CONTACT_EMAIL)
    const contactTo = process.env.CONTACT_EMAIL || process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const contactPageUrl = `${baseUrl}/contact`
    const emailResult = await sendEmail({
      to: contactTo,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f49d1d;">New Contact Form Submission</h1>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="margin: 20px 0;">
            <h2 style="color: #333;">Message:</h2>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This message was sent from the Digital Credit Compass contact form. <a href="${contactPageUrl}">${contactPageUrl}</a></p>
        </div>
      `,
      text: `
        New Contact Form Submission
        
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        
        Message:
        ${message}
        
        ---
        This message was sent from the Digital Credit Compass contact form. ${contactPageUrl}
      `,
    })

    if (!emailResult.success) {
      console.error('Failed to send contact email:', emailResult.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send message. Please try again later.',
        },
        { status: 500 }
      )
    }

    // Confirmation email to the user (lien contact via APP_URL)
    await sendEmail({
      to: email,
      subject: 'Thank you for contacting Digital Credit Compass',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f49d1d;">Thank you for contacting us!</h1>
          <p>Hello ${name},</p>
          <p>We've received your message and will get back to you as soon as possible.</p>
          <p><strong>Your message:</strong></p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          <p>Need to send another message? <a href="${contactPageUrl}" style="color: #f49d1d;">Contact us</a>.</p>
          <p>Best regards,<br>The Digital Credit Compass Team</p>
        </div>
      `,
      text: `
        Thank you for contacting us!
        
        Hello ${name},
        
        We've received your message and will get back to you as soon as possible.
        
        Your message:
        ${message}
        
        Need to send another message? ${contactPageUrl}
        
        Best regards,
        The Digital Credit Compass Team
      `,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    console.error('Error stack:', error.stack)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while sending your message. Please try again.',
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
