import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Analytics endpoint filtered by specific jdId
// Returns real-time stats from database for that job only
export async function GET(_req: Request, ctx: { params: Promise<{ jdId: string }> | { jdId: string } }) {
  const { jdId } = await (ctx.params as any)
  if (!jdId) {
    return NextResponse.json({ ok: false, error: "Missing jdId" }, { status: 400 })
  }

  try {
    // If database not configured, return zeros
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ 
        ok: true, 
        jdId, 
        stats: {
          applicants: 0,
          qualified: 0,
          interviewsCompleted: 0,
          inProgress: 0,
          recommended: 0,
          rejected: 0,
        }
      })
    }

    // First, get the enum values for status
    const enumQuery = `
      SELECT e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'status_application'
    `
    const enumRows = await (DatabaseService as any)["query"]?.call(DatabaseService, enumQuery, []).catch(() => []) as any[]
    const validStatuses = (enumRows || []).map((r: any) => r.enum_value)

    // Map status categories
    const qualifiedStatuses = validStatuses.filter((s: string) => 
      s.includes('qualified') || s.includes('screening_passed')
    )
    const interviewStatuses = validStatuses.filter((s: string) => 
      s.includes('interview') && !s.includes('scheduled')
    )
    const inProgressStatuses = validStatuses.filter((s: string) => 
      s.includes('scheduled') || s.includes('pending') || s.includes('progress')
    )
    const recommendedStatuses = validStatuses.filter((s: string) => 
      s.includes('offer') || s.includes('hired') || s.includes('accepted')
    )
    const rejectedStatuses = validStatuses.filter((s: string) => 
      s.includes('reject') || s.includes('declined') || s.includes('failed')
    )

    // Query to get counts for this specific job only
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE 1=1) as total_applicants,
        COUNT(*) FILTER (WHERE status::text = ANY($2::text[])) as qualified_count,
        COUNT(*) FILTER (WHERE status::text = ANY($3::text[])) as interviews_count,
        COUNT(*) FILTER (WHERE status::text = ANY($4::text[])) as in_progress_count,
        COUNT(*) FILTER (WHERE status::text = ANY($5::text[])) as recommended_count,
        COUNT(*) FILTER (WHERE status::text = ANY($6::text[])) as rejected_count
      FROM applications
      WHERE job_id = $1::uuid
    `

    const result = await (DatabaseService as any)["query"]?.call(DatabaseService, statsQuery, [
      jdId,
      qualifiedStatuses.length > 0 ? qualifiedStatuses : ['__none__'],
      interviewStatuses.length > 0 ? interviewStatuses : ['__none__'],
      inProgressStatuses.length > 0 ? inProgressStatuses : ['__none__'],
      recommendedStatuses.length > 0 ? recommendedStatuses : ['__none__'],
      rejectedStatuses.length > 0 ? rejectedStatuses : ['__none__'],
    ]) as any[]

    const row = result?.[0] || {}

    const stats = {
      applicants: parseInt(row.total_applicants || '0'),
      qualified: parseInt(row.qualified_count || '0'),
      interviewsCompleted: parseInt(row.interviews_count || '0'),
      inProgress: parseInt(row.in_progress_count || '0'),
      recommended: parseInt(row.recommended_count || '0'),
      rejected: parseInt(row.rejected_count || '0'),
    }

    console.log(`📊 Analytics for job ${jdId}:`, stats)

    return NextResponse.json({ ok: true, jdId, stats })
  } catch (e: any) {
    console.error('Analytics fetch error:', e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load analytics" }, { status: 500 })
  }
}
