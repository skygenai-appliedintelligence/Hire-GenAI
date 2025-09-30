import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/analytics/events
// Track analytics events (candidate_submitted, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event, jobId, candidateId, applicationId, timestamp, metadata } = body || {}

    if (!event) {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 })
    }

    // If database is configured, persist the event
    if (DatabaseService.isDatabaseConfigured()) {
      try {
        const query = `
          INSERT INTO analytics_events (
            event_name, 
            job_id, 
            candidate_id, 
            application_id, 
            event_timestamp, 
            metadata, 
            created_at
          )
          VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::timestamp, $6::jsonb, NOW())
          RETURNING id
        `
        const params = [
          event,
          jobId || null,
          candidateId || null,
          applicationId || null,
          timestamp || new Date().toISOString(),
          metadata ? JSON.stringify(metadata) : null,
        ]

        await (DatabaseService as any)["query"]?.call(DatabaseService, query, params)
        console.log(`📊 Analytics event tracked: ${event}`)
      } catch (dbErr: any) {
        console.warn("Analytics DB insert failed:", dbErr?.message)
        // Don't fail the request if analytics fails
      }
    }

    // Also log to console for debugging
    console.log(`[Analytics] ${event}:`, { jobId, candidateId, applicationId, metadata })

    return NextResponse.json({ ok: true, event })
  } catch (err: any) {
    console.error("Analytics event error:", err)
    return NextResponse.json({ error: err?.message || "Failed to track event" }, { status: 500 })
  }
}
