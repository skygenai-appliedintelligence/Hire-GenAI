import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Add caching headers to improve performance
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

    // Fetch real interview data from database with timeout
    const interviews = await Promise.race([
      DatabaseService.getInterviews(companyId, jobId || undefined),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      )
    ]) as any[]

    console.log(`Found ${interviews.length} interviews for company ${companyId}`)

    return NextResponse.json({
      ok: true,
      interviews: interviews
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
      }
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
