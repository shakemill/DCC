// Script de test de connexion MySQL avec Prisma
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testConnection() {
  try {
    console.log('🔄 Test de connexion à MySQL...\n')
    
    // Test de connexion simple
    await prisma.$connect()
    console.log('✅ Connexion à MySQL réussie!\n')
    
    // Test de requête simple
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Requête SQL testée avec succès:', result)
    
    // Vérifier si la base de données existe
    const databases = await prisma.$queryRaw`
      SELECT SCHEMA_NAME 
      FROM INFORMATION_SCHEMA.SCHEMATA 
      WHERE SCHEMA_NAME = 'dcc_db'
    `
    
    if (databases.length > 0) {
      console.log('✅ Base de données "dcc_db" trouvée\n')
    } else {
      console.log('⚠️  Base de données "dcc_db" non trouvée. Créez-la d\'abord.\n')
    }
    
    console.log('✅ Tous les tests de connexion sont passés!')
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message)
    console.error('\nVérifiez:')
    console.error('1. Que MySQL est démarré')
    console.error('2. Que le fichier .env contient DATABASE_URL')
    console.error('3. Que les identifiants dans DATABASE_URL sont corrects')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
