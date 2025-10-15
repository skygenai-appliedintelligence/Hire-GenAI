import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/usage
 * Get usage ledger and job usage summary
 * Query params:
 *   - companyId: Company UUID (required)
 *   - jobId: Filter by job (optional)
 *   - startDate: Filter from date (optional)
 *   - endDate: Filter to date (optional)
 *   - entryType: Filter by entry type (optional)
 *   - limit: Limit results (optional, default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const jobId = searchParams.get('jobId') || undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const entryType = searchParams.get('entryType') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Get usage ledger
    const ledger = await DatabaseService.getUsageLedger(companyId, {
      jobId,
      startDate,
      endDate,
      entryType,
      limit
    })

    // Get job usage summary
    const jobUsage = await DatabaseService.getJobUsageSummary(companyId, jobId)

    // Calculate totals by category
    const totals = jobUsage.reduce((acc, job) => {
      acc.cvParsing += parseFloat(job.cv_parsing_cost || 0)
      acc.jdQuestions += parseFloat(job.jd_questions_cost || 0)
      acc.video += parseFloat(job.video_cost || 0)
      acc.total += parseFloat(job.total_cost || 0)
      
      acc.cvCount += parseInt(job.cv_parsing_count || 0)
      acc.tokenCount += parseInt(job.jd_question_tokens_in || 0) + parseInt(job.jd_question_tokens_out || 0)
      acc.videoMinutes += parseFloat(job.video_minutes || 0)
      
      return acc
    }, {
      cvParsing: 0,
      jdQuestions: 0,
      video: 0,
      total: 0,
      cvCount: 0,
      tokenCount: 0,
      videoMinutes: 0
    })

    return NextResponse.json({
      ok: true,
      ledger: ledger.map(entry => ({
        id: entry.id,
        jobId: entry.job_id,
        jobTitle: entry.job_title,
        entryType: entry.entry_type,
        description: entry.description,
        quantity: entry.quantity ? parseFloat(entry.quantity) : null,
        unitPrice: entry.unit_price ? parseFloat(entry.unit_price) : null,
        amount: parseFloat(entry.amount),
        balanceBefore: parseFloat(entry.balance_before),
        balanceAfter: parseFloat(entry.balance_after),
        createdAt: entry.created_at,
        metadata: entry.metadata
      })),
      jobUsage: jobUsage.map(job => ({
        jobId: job.job_id,
        jobTitle: job.job_title,
        jobStatus: job.job_status,
        cvParsingCount: parseInt(job.cv_parsing_count || 0),
        cvParsingCost: parseFloat(job.cv_parsing_cost || 0),
        jdQuestionTokensIn: parseInt(job.jd_question_tokens_in || 0),
        jdQuestionTokensOut: parseInt(job.jd_question_tokens_out || 0),
        jdQuestionsCost: parseFloat(job.jd_questions_cost || 0),
        videoMinutes: parseFloat(job.video_minutes || 0),
        videoCost: parseFloat(job.video_cost || 0),
        totalCost: parseFloat(job.total_cost || 0),
        updatedAt: job.updated_at
      })),
      totals
    })
  } catch (error: any) {
    console.error('Error fetching usage:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
