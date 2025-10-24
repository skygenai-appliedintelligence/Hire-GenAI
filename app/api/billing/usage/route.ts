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

    // Get usage totals
    const totals = await DatabaseService.getCompanyUsage(companyId, {
      jobId,
      startDate,
      endDate
    })

    // Get job usage breakdown
    const jobUsage = await DatabaseService.getUsageByJob(companyId, {
      startDate,
      endDate
    })

    return NextResponse.json({
      ok: true,
      jobUsage,
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
