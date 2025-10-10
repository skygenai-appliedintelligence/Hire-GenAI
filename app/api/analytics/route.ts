import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/analytics - company-wide analytics with optional job filter
export async function GET(req: NextRequest) {
  try {
    // Resolve a company_id (in production, from session)
    const companyRows = await DatabaseService.query(
      `SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`
    ) as any[]
    if (!companyRows?.length) {
      // No company yet, return zeros
      return NextResponse.json({
        ok: true,
        analytics: {
          totalApplications: 0,
          qualifiedCandidates: 0,
          interviewsCompleted: 0,
          successfulHires: 0,
          averageTimeToHire: 0,
          topSources: [],
          monthlyTrends: {
            applications: { current: 0, previous: 0, change: 0 },
            interviews: { current: 0, previous: 0, change: 0 },
            hires: { current: 0, previous: 0, change: 0 },
          },
        },
      })
    }
    const companyId = companyRows[0].id

    // Get jobId from query parameters
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const isFiltered = jobId && jobId !== 'all'

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, analytics: { totalApplications: 0, qualifiedCandidates: 0, interviewsCompleted: 0, successfulHires: 0, averageTimeToHire: 0, topSources: [], monthlyTrends: { applications: { current: 0, previous: 0, change: 0 }, interviews: { current: 0, previous: 0, change: 0 }, hires: { current: 0, previous: 0, change: 0 } } } })
    }

    // Check if applications.is_qualified exists
    const colCheck = await DatabaseService.query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'is_qualified'`
    ) as any[]
    const hasIsQualified = (colCheck || []).length > 0

    // Aggregates scoped by company (join jobs) with optional job filter
    const jobFilter = isFiltered ? 'AND j.id = $2::uuid' : ''
    const queryParams = isFiltered ? [companyId, jobId] : [companyId]
    
    const aggregatesQuery = `
      WITH base_apps AS (
        SELECT a.*, j.company_id
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        WHERE j.company_id = $1::uuid ${jobFilter}
      ),
      base_interviews AS (
        SELECT i.*
        FROM interviews i
        JOIN application_rounds ar ON ar.id = i.application_round_id
        JOIN base_apps a ON a.id = ar.application_id
      ),
      apps_this_month AS (
        SELECT COUNT(*) AS cnt FROM base_apps WHERE date_trunc('month', created_at) = date_trunc('month', now())
      ),
      apps_prev_month AS (
        SELECT COUNT(*) AS cnt FROM base_apps WHERE date_trunc('month', created_at) = date_trunc('month', now() - interval '1 month')
      ),
      interviews_this_month AS (
        SELECT COUNT(*) AS cnt FROM base_interviews WHERE completed_at IS NOT NULL AND date_trunc('month', completed_at) = date_trunc('month', now())
      ),
      interviews_prev_month AS (
        SELECT COUNT(*) AS cnt FROM base_interviews WHERE completed_at IS NOT NULL AND date_trunc('month', completed_at) = date_trunc('month', now() - interval '1 month')
      ),
      hires_this_month AS (
        SELECT COUNT(*) AS cnt FROM base_apps WHERE status = 'offer' AND date_trunc('month', created_at) = date_trunc('month', now())
      ),
      hires_prev_month AS (
        SELECT COUNT(*) AS cnt FROM base_apps WHERE status = 'offer' AND date_trunc('month', created_at) = date_trunc('month', now() - interval '1 month')
      )
      SELECT 
        (SELECT COUNT(*) FROM base_apps) AS total_applications,
        (SELECT COUNT(DISTINCT candidate_id) FROM base_apps WHERE ${hasIsQualified ? `is_qualified = true OR` : ''} status IN ('in_progress','offer')) AS qualified_candidates,
        (SELECT COUNT(*) FROM base_interviews WHERE status IN ('success','failed')) AS interviews_completed,
        (SELECT COUNT(*) FROM base_apps WHERE status = 'offer') AS successful_hires,
        (SELECT COALESCE(ROUND(AVG(EXTRACT(DAY FROM now() - created_at))::numeric, 0), 0) FROM base_apps WHERE status = 'offer') AS avg_time_to_hire_days,
        (SELECT cnt FROM apps_this_month) AS apps_current,
        (SELECT cnt FROM apps_prev_month) AS apps_previous,
        (SELECT cnt FROM interviews_this_month) AS interviews_current,
        (SELECT cnt FROM interviews_prev_month) AS interviews_previous,
        (SELECT cnt FROM hires_this_month) AS hires_current,
        (SELECT cnt FROM hires_prev_month) AS hires_previous
    `

    const [agg] = await DatabaseService.query(aggregatesQuery, queryParams) as any[]

    // Top sources with job filter
    const sources = await DatabaseService.query(
      `SELECT COALESCE(NULLIF(source, ''), 'Unknown') AS platform, COUNT(*) AS count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.company_id = $1::uuid ${jobFilter}
       GROUP BY 1
       ORDER BY 2 DESC
       LIMIT 5`,
      queryParams
    ) as any[]

    const pct = (cur: number, prev: number) => {
      if (!prev) return cur ? 100 : 0
      return Math.round(((cur - prev) / prev) * 1000) / 10
    }

    const analytics = {
      totalApplications: parseInt(agg?.total_applications || '0'),
      qualifiedCandidates: parseInt(agg?.qualified_candidates || '0'),
      interviewsCompleted: parseInt(agg?.interviews_completed || '0'),
      successfulHires: parseInt(agg?.successful_hires || '0'),
      averageTimeToHire: parseInt(agg?.avg_time_to_hire_days || '0'),
      topSources: (sources || []).map((s: any) => ({ platform: s.platform, count: parseInt(s.count || '0'), percentage: 0 })),
      monthlyTrends: {
        applications: { current: parseInt(agg?.apps_current || '0'), previous: parseInt(agg?.apps_previous || '0'), change: pct(parseInt(agg?.apps_current || '0'), parseInt(agg?.apps_previous || '0')) },
        interviews: { current: parseInt(agg?.interviews_current || '0'), previous: parseInt(agg?.interviews_previous || '0'), change: pct(parseInt(agg?.interviews_current || '0'), parseInt(agg?.interviews_previous || '0')) },
        hires: { current: parseInt(agg?.hires_current || '0'), previous: parseInt(agg?.hires_previous || '0'), change: pct(parseInt(agg?.hires_current || '0'), parseInt(agg?.hires_previous || '0')) },
      },
    }

    // Calculate percentages for top sources
    const totalFromSources = analytics.topSources.reduce((sum, s) => sum + s.count, 0) || 1
    analytics.topSources = analytics.topSources.map((s) => ({ ...s, percentage: Math.round((s.count / totalFromSources) * 100) }))

    return NextResponse.json({ ok: true, analytics })
  } catch (e: any) {
    console.error('Analytics GET error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load analytics' }, { status: 500 })
  }
}
