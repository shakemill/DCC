// Script de test de connexion MySQL simple
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

async function testConnection() {
  let connection
  
  try {
    console.log('🔄 Test de connexion à MySQL...\n')
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL n\'est pas défini dans le fichier .env')
      console.error('\nCréez un fichier .env avec:')
      console.error('DATABASE_URL="mysql://root:password@localhost:3306/dcc_db"')
      process.exit(1)
    }
    
    // Extraire les informations de connexion depuis DATABASE_URL
    const url = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'))
    const host = url.hostname
    const port = url.port || 3306
    const user = url.username
    const password = url.password
    const database = url.pathname.replace('/', '')
    
    console.log(`📡 Connexion à: ${host}:${port}`)
    console.log(`👤 Utilisateur: ${user}`)
    console.log(`🗄️  Base de données: ${database}\n`)
    
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
    })
    
    console.log('✅ Connexion à MySQL réussie!\n')
    
    // Test de requête simple
    const [rows] = await connection.execute('SELECT 1 as test, DATABASE() as current_db, VERSION() as mysql_version')
    console.log('✅ Requête SQL testée avec succès:', rows[0])
    
    // Vérifier si la base de données existe
    const [databases] = await connection.execute(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [database]
    )
    
    if (databases.length > 0) {
      console.log(`✅ Base de données "${database}" trouvée\n`)
    } else {
      console.log(`⚠️  Base de données "${database}" non trouvée. Créez-la d'abord.\n`)
    }
    
    console.log('✅ Tous les tests de connexion sont passés!')
    console.log('\n📝 Prochaines étapes:')
    console.log('   1. Exécutez: npx prisma migrate dev --name init')
    console.log('   2. Cela créera les tables dans votre base de données')
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message)
    console.error('\n🔍 Vérifiez:')
    console.error('   1. Que MySQL est démarré sur votre machine')
    console.error('   2. Que le fichier .env contient DATABASE_URL')
    console.error('   3. Que les identifiants dans DATABASE_URL sont corrects')
    console.error('   4. Que la base de données existe (créez-la si nécessaire)')
    console.error('\n💡 Exemple de DATABASE_URL:')
    console.error('   DATABASE_URL="mysql://root:password@localhost:3306/dcc_db"')
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

testConnection()
