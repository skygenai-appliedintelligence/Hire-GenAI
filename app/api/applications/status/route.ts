import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/applications/status
// Body: { applicationId: string, qualified: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { applicationId?: string; qualified?: boolean }
    const applicationId = body?.applicationId
    const qualified = Boolean(body?.qualified)

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: "Missing applicationId" }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })
    }

    // Detect available columns
    const colRows = await (DatabaseService as any)["query"]?.call(
      DatabaseService,
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'applications' 
         AND column_name IN ('is_qualified','qualification_score','status')`,
      []
    ) as any[]
    const cols = new Set((colRows || []).map((r: any) => String(r.column_name)))

    // Build update
    const updates: string[] = []
    const params: any[] = []
    let p = 1

    if (cols.has('is_qualified')) {
      updates.push(`is_qualified = $${p++}`)
      params.push(qualified)
    }

    // Optionally set status to a matching enum if available
    let chosenStatus: string | null = null
    if (cols.has('status')) {
      const enumRows = await (DatabaseService as any)["query"]?.call(
        DatabaseService,
        `SELECT e.enumlabel as enum_value
         FROM pg_type t 
         JOIN pg_enum e ON t.oid = e.enumtypid  
         WHERE t.typname = 'status_application'`,
        []
      ) as any[]
      const statuses = new Set((enumRows || []).map((r: any) => String(r.enum_value)))
      if (qualified) {
        const preferred = ['cv_qualified','qualified','screening_passed','shortlisted']
        chosenStatus = preferred.find(s => statuses.has(s)) || null
      } else {
        const preferred = ['cv_unqualified','unqualified','rejected','screening_failed']
        chosenStatus = preferred.find(s => statuses.has(s)) || null
      }

      if (chosenStatus) {
        updates.push(`status = $${p++}::status_application`)
        params.push(chosenStatus)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ ok: false, error: "No updatable columns found" }, { status: 500 })
    }

    params.push(applicationId)
    await (DatabaseService as any)["query"]?.call(
      DatabaseService,
      `UPDATE applications SET ${updates.join(', ')} WHERE id = $${p}::uuid`,
      params
    )

    return NextResponse.json({ ok: true, applicationId, qualified, status: chosenStatus })
  } catch (e: any) {
    console.error("Update application status error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to update status" }, { status: 500 })
  }
}
