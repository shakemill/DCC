import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// GET - Récupérer tous les plans (optionnellement filtrés par userId)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    const where = userId ? { userId } : {}
    
    const plans = await prisma.incomePlan.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Convertir Decimal en number pour la réponse JSON
    const formattedPlans = plans.map(plan => ({
      ...plan,
      loanAmount: parseFloat(plan.loanAmount),
      incomeObjective: plan.incomeObjective ? parseFloat(plan.incomeObjective) : null,
      ltv: parseFloat(plan.ltv),
      collateralUSD: parseFloat(plan.collateralUSD),
      collateralBTC: parseFloat(plan.collateralBTC),
      bitcoinPrice: parseFloat(plan.bitcoinPrice),
    }))
    
    return NextResponse.json({ success: true, plans: formattedPlans })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau plan
export async function POST(request) {
  try {
    let data
    try {
      data = await request.json()
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    // Validation des données requises
    if (!data.loanAmount || !data.currency || data.riskTolerance === undefined || !data.ltv || !data.collateralUSD || !data.collateralBTC || !data.bitcoinPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Préparer les données pour Prisma
    const planData = {
      userId: data.userId || null,
      loanAmount: new Prisma.Decimal(data.loanAmount),
      incomeObjective: data.incomeObjective ? new Prisma.Decimal(data.incomeObjective) : null,
      currency: data.currency,
      riskTolerance: parseInt(data.riskTolerance),
      ltv: new Prisma.Decimal(data.ltv),
      collateralUSD: new Prisma.Decimal(data.collateralUSD),
      collateralBTC: new Prisma.Decimal(data.collateralBTC),
      bitcoinPrice: new Prisma.Decimal(data.bitcoinPrice),
    }
    
    console.log('Creating plan with data:', {
      ...planData,
      loanAmount: planData.loanAmount.toString(),
      ltv: planData.ltv.toString(),
      collateralUSD: planData.collateralUSD.toString(),
      collateralBTC: planData.collateralBTC.toString(),
      bitcoinPrice: planData.bitcoinPrice.toString(),
    })
    
    const plan = await prisma.incomePlan.create({
      data: planData
    })
    
    // Convertir Decimal en number pour la réponse JSON
    const formattedPlan = {
      ...plan,
      loanAmount: parseFloat(plan.loanAmount),
      incomeObjective: plan.incomeObjective ? parseFloat(plan.incomeObjective) : null,
      ltv: parseFloat(plan.ltv),
      collateralUSD: parseFloat(plan.collateralUSD),
      collateralBTC: parseFloat(plan.collateralBTC),
      bitcoinPrice: parseFloat(plan.bitcoinPrice),
    }
    
    return NextResponse.json({ success: true, plan: formattedPlan })
  } catch (error) {
    console.error('Error creating plan:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    
    // Ensure we always return valid JSON
    const errorResponse = {
      success: false,
      error: error.message || 'An error occurred while creating the plan',
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        code: error.code,
        meta: error.meta
      }
    }
    
    return NextResponse.json(
      errorResponse,
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
}
