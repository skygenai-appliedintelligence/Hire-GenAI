import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30")
    const status = req.nextUrl.searchParams.get("status") || ""
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Build query with filters
    let query = `
      SELECT 
        i.id,
        c.name as company,
        j.title as job,
        a.candidate_name as candidate,
        i.status,
        EXTRACT(EPOCH FROM (i.completed_at - i.started_at)) / 60 as duration,
        COALESCE(vu.cost, 0) as cost,
        COALESCE(vu.base_cost, 0) as baseCost,
        COALESCE(vu.profit_margin, 0) as profitMargin,
        vu.id as billingId,
        i.evaluation_score as evaluationScore,
        i.started_at as startedAt
      FROM interviews i
      LEFT JOIN applications a ON i.application_id = a.id
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN video_interview_usage vu ON i.id = vu.interview_id
      WHERE i.created_at >= $1
    `

    const params: any[] = [daysAgo]

    if (status) {
      query += ` AND i.status = $${params.length + 1}`
      params.push(status)
    }

    query += ` ORDER BY i.started_at DESC LIMIT 100`

    const interviews = await DatabaseService.query(query, params)

    return NextResponse.json({
      ok: true,
      interviews: interviews.map((i: any) => ({
        ...i,
        duration: Math.round(i.duration || 0),
        cost: typeof i.cost === 'string' ? parseFloat(i.cost) : i.cost,
        baseCost: typeof i.baseCost === 'string' ? parseFloat(i.baseCost) : i.baseCost,
      })),
    })
  } catch (error) {
    console.error("Failed to get interviews:", error)
    // Return empty array on error instead of failing
    return NextResponse.json({
      ok: true,
      interviews: [],
    })
  }
}
