import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/openai-usage
 * Fetch usage data from database (costs already fetched from OpenAI at record time)
 * Query params:
 *   - startDate: Start date (ISO string, optional)
 *   - endDate: End date (ISO string, optional)
 *   - companyId: Company ID (required)
 *   - jobId: Job ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const companyId = searchParams.get('companyId')
    const jobId = searchParams.get('jobId') || undefined

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Calculate date range
    const startDate = startDateParam ? new Date(startDateParam) : undefined
    const endDate = endDateParam ? new Date(endDateParam) : undefined

    // Get ALL usage data from database (costs already include real OpenAI costs + profit margin)
    console.log('📊 [API] Fetching usage for company:', companyId, 'Date range:', startDate, 'to', endDate)
    const dbTotals = await DatabaseService.getCompanyUsage(companyId, { 
      jobId: jobId || undefined, 
      startDate, 
      endDate 
    })
    console.log('✅ [API] DB Totals:', dbTotals)

    // Get job breakdown
    const jobUsage = await DatabaseService.getUsageByJob(companyId, { startDate, endDate })

    // Format response to match UI expectations
    const response = {
      ok: true,
      totals: {
        cvParsing: dbTotals.cvParsing,
        cvCount: dbTotals.cvCount,
        jdQuestions: dbTotals.jdQuestions,
        tokenCount: dbTotals.tokenCount,
        questionCount: dbTotals.questionCount,
        video: dbTotals.video,
        videoMinutes: dbTotals.videoMinutes,
        interviewCount: dbTotals.interviewCount
      },
      jobUsage,
      source: 'database-with-real-openai-costs',
      message: 'Costs fetched from OpenAI at record time and stored in DB with profit margin',
      debugInfo: {
        companyId,
        dateRange: { start: startDate, end: endDate }
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error fetching OpenAI usage:', error)
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || 'Failed to fetch OpenAI usage data',
        details: error.toString(),
        source: 'openai-platform-error'
      },
      { status: 500 }
    )
  }
}
