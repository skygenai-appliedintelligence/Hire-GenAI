import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, interviews: [] })
    }

    // Resolve company_id - get the first company for now
    // In a production app, this would come from the authenticated user's session
    const companyRows = await DatabaseService.query(
      `SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`
    ) as any[]
    
    if (!companyRows?.length) {
      return NextResponse.json({ ok: true, interviews: [] })
    }
    
    const companyId = companyRows[0].id

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
