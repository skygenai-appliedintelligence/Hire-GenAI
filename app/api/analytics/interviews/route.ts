import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      return NextResponse.json({ ok: true, interviews: [] })
    }

    // Fetch real interview data from database
    const interviews = await DatabaseService.getInterviews(companyId, jobId || undefined)

    console.log(`Found ${interviews.length} interviews for company ${companyId}`)

    return NextResponse.json({
      ok: true,
      interviews: interviews
    })

  } catch (error) {
    console.error('Error fetching interviews:', error)
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to fetch interviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
