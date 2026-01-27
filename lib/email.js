import nodemailer from 'nodemailer'

// Configuration du transporteur email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '465'),
    secure: process.env.MAIL_ENCRYPTION === 'ssl', // true pour le port 465, false pour les autres ports
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  })
}

/**
 * Envoie un email
 * @param {Object} options - Options d'envoi
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet
 * @param {string} options.html - Corps HTML
 * @param {string} options.text - Corps texte (optionnel)
 * @param {Array} options.attachments - Pièces jointes (optionnel)
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  try {
    // Vérifier que les variables d'environnement sont configurées
    if (!process.env.MAIL_HOST || !process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
      throw new Error('Configuration email manquante. Vérifiez vos variables d\'environnement.')
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Extraire le texte si html est fourni
      attachments,
    }

    const info = await transporter.sendMail(mailOptions)
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email envoyé avec succès',
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur lors de l\'envoi de l\'email',
    }
  }
}

/**
 * Teste la connexion au serveur SMTP
 * @returns {Promise<Object>} Résultat du test
 */
export async function testEmailConnection() {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    
    return {
      success: true,
      message: 'Connexion SMTP réussie',
    }
  } catch (error) {
    console.error('Erreur de connexion SMTP:', error)
    return {
      success: false,
      error: error.message,
      message: 'Erreur de connexion SMTP',
    }
  }
}
