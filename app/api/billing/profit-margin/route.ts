import { NextRequest, NextResponse } from 'next/server'
import { getProfitMarginPercentage } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/billing/profit-margin
// Returns the current profit margin percentage
export async function GET(request: NextRequest) {
  try {
    const profitMarginPercentage = getProfitMarginPercentage()
    
    return NextResponse.json({
      profitMarginPercentage,
      description: `${profitMarginPercentage}% markup added to base OpenAI costs`
    })
  } catch (error: any) {
    console.error('Error fetching profit margin:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profit margin', details: error.message },
      { status: 500 }
    )
  }
}
