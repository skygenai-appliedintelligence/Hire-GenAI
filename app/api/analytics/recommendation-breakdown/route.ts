import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/analytics/recommendation-breakdown
// Returns hiring pipeline breakdown for recommended candidates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const jobId = searchParams.get('jobId')
    
    if (!companyId) {
      return NextResponse.json({
        ok: false,
        error: 'companyId is required'
      }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ 
        ok: true, 
        breakdown: {
          total: 0,
          sentToManager: 0,
          offerExtended: 0,
          offerAccepted: 0,
          rejectedWithdraw: 0,
          hired: 0
        }
      })
    }

    // Fetch hiring pipeline breakdown
    const breakdown = await DatabaseService.getHiringBucketCounts(companyId, jobId || undefined)

    return NextResponse.json({
      ok: true,
      breakdown: breakdown
    })

  } catch (error) {
    console.error('Error fetching recommendation breakdown:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch recommendation breakdown',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
