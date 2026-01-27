import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

async function resolveId(params) {
  if (params && typeof params === 'object' && 'id' in params) return params.id
  if (params && typeof params.then === 'function') return (await params)?.id
  return params?.id
}

// PATCH - Update plan
export async function PATCH(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'Plan ID is required' }, { status: 400 })
    const existing = await prisma.incomePlan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })

    let data
    try {
      data = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const planData = {}
    if (data.userId !== undefined) planData.userId = data.userId || null
    if (data.loanAmount != null) planData.loanAmount = new Prisma.Decimal(data.loanAmount)
    if (data.incomeObjective !== undefined) planData.incomeObjective = data.incomeObjective != null && data.incomeObjective !== '' ? new Prisma.Decimal(data.incomeObjective) : null
    if (data.currency != null) planData.currency = data.currency
    if (data.riskTolerance !== undefined) planData.riskTolerance = parseInt(data.riskTolerance)
    if (data.ltv != null) planData.ltv = new Prisma.Decimal(data.ltv)
    if (data.collateralUSD != null) planData.collateralUSD = new Prisma.Decimal(data.collateralUSD)
    if (data.collateralBTC != null) planData.collateralBTC = new Prisma.Decimal(data.collateralBTC)
    if (data.bitcoinPrice != null) planData.bitcoinPrice = new Prisma.Decimal(data.bitcoinPrice)

    const plan = await prisma.incomePlan.update({
      where: { id },
      data: planData,
    })
    const formatted = {
      ...plan,
      loanAmount: parseFloat(plan.loanAmount),
      incomeObjective: plan.incomeObjective ? parseFloat(plan.incomeObjective) : null,
      ltv: parseFloat(plan.ltv),
      collateralUSD: parseFloat(plan.collateralUSD),
      collateralBTC: parseFloat(plan.collateralBTC),
      bitcoinPrice: parseFloat(plan.bitcoinPrice),
    }
    return NextResponse.json({ success: true, plan: formatted })
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE - Supprimer un plan
export async function DELETE(request, { params }) {
  try {
    const id = await resolveId(params)
    if (!id) return NextResponse.json({ success: false, error: 'Plan ID is required' }, { status: 400 })
    const plan = await prisma.incomePlan.findUnique({ where: { id } })
    if (!plan) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    await prisma.incomePlan.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Plan deleted successfully' })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An error occurred while deleting the plan'
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
