import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test de connexion simple
    await prisma.$connect()
    
    // Test de requête
    const result = await prisma.$queryRaw`SELECT 1 as test, DATABASE() as current_db, VERSION() as mysql_version`
    
    // Compter les plans existants
    const count = await prisma.incomePlan.count()
    
    return NextResponse.json({
      success: true,
      message: 'Connexion MySQL réussie!',
      database: result[0]?.current_db || 'unknown',
      mysqlVersion: result[0]?.mysql_version || 'unknown',
      plansCount: count
    })
  } catch (error) {
    console.error('Erreur de connexion:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: 'Erreur de connexion à la base de données'
      },
      { status: 500 }
    )
  }
}
