import { sendEmail, testEmailConnection } from '@/lib/email'
import { NextResponse } from 'next/server'

/**
 * POST /api/send-email
 * Envoie un email
 * 
 * Body:
 * {
 *   to: string (required)
 *   subject: string (required)
 *   html: string (required)
 *   text: string (optional)
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { to, subject, html, text } = body

    // Validation
    if (!to || !subject || !html) {
      return NextResponse.json(
        {
          success: false,
          error: 'Les champs "to", "subject" et "html" sont requis',
        },
        { status: 400 }
      )
    }

    // Envoi de l'email
    const result = await sendEmail({ to, subject, html, text })

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Erreur API send-email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: 'Erreur lors de l\'envoi de l\'email',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/send-email
 * Teste la connexion SMTP
 */
export async function GET() {
  try {
    const result = await testEmailConnection()
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Erreur API test-email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: 'Erreur lors du test de connexion',
      },
      { status: 500 }
    )
  }
}
