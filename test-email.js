// Script de test de connexion email
import { testEmailConnection, sendEmail } from './lib/email.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

async function testEmail() {
  try {
    console.log('🔄 Test de connexion SMTP...\n')
    
    // Vérifier les variables d'environnement
    const requiredVars = ['MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_PORT']
    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error('❌ Variables d\'environnement manquantes:')
      missingVars.forEach(varName => console.error(`   - ${varName}`))
      console.error('\nAjoutez ces variables à votre fichier .env')
      process.exit(1)
    }
    
    console.log('📧 Configuration:')
    console.log(`   Host: ${process.env.MAIL_HOST}`)
    console.log(`   Port: ${process.env.MAIL_PORT}`)
    console.log(`   Username: ${process.env.MAIL_USERNAME}`)
    console.log(`   Encryption: ${process.env.MAIL_ENCRYPTION || 'ssl'}`)
    console.log(`   From: ${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}\n`)
    
    // Test de connexion
    console.log('🔌 Test de connexion au serveur SMTP...')
    const connectionTest = await testEmailConnection()
    
    if (connectionTest.success) {
      console.log('✅ Connexion SMTP réussie!\n')
    } else {
      console.error('❌ Erreur de connexion:', connectionTest.error)
      process.exit(1)
    }
    
    // Test d'envoi (optionnel - décommentez pour tester l'envoi réel)
    const testSend = process.argv[2] === '--send'
    if (testSend) {
      const testEmailAddress = process.argv[3] || process.env.MAIL_USERNAME
      console.log(`📨 Test d'envoi d'email à ${testEmailAddress}...`)
      
      const sendResult = await sendEmail({
        to: testEmailAddress,
        subject: 'Test d\'envoi d\'email - Digital Credit Compass',
        html: `
          <h1>Test d'envoi d'email</h1>
          <p>Ceci est un email de test depuis votre application Digital Credit Compass.</p>
          <p>Si vous recevez cet email, la configuration est correcte ! ✅</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        `,
        text: `Test d'envoi d'email\n\nCeci est un email de test depuis votre application Digital Credit Compass.\n\nSi vous recevez cet email, la configuration est correcte ! ✅\n\nDate: ${new Date().toLocaleString('fr-FR')}`,
      })
      
      if (sendResult.success) {
        console.log('✅ Email envoyé avec succès!')
        console.log(`   Message ID: ${sendResult.messageId}`)
      } else {
        console.error('❌ Erreur lors de l\'envoi:', sendResult.error)
      }
    } else {
      console.log('\n💡 Pour tester l\'envoi d\'un email réel, exécutez:')
      console.log('   npm run test:email --send votre-email@example.com')
    }
    
    console.log('\n✅ Tous les tests sont passés!')
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

testEmail()
