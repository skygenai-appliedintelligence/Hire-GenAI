import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/applications/score?applicationId=<uuid>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const applicationId = searchParams.get('applicationId')
    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, applicationId, score: null, isQualified: null, status: null })
    }

    // Detect available columns
    const colRows = await (DatabaseService as any)["query"]?.call(
      DatabaseService,
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'applications'
         AND column_name IN ('qualification_score','is_qualified','status')`,
      []
    ) as any[]
    const cols = new Set((colRows || []).map((r: any) => String(r.column_name)))

    const selectScore = cols.has('qualification_score') ? 'qualification_score' : 'NULL::int as qualification_score'
    const selectQualified = cols.has('is_qualified') ? 'is_qualified' : 'NULL::boolean as is_qualified'
    const selectStatus = cols.has('status') ? 'status::text as status' : `NULL::text as status`

    const rows = await (DatabaseService as any)["query"]?.call(
      DatabaseService,
      `SELECT ${selectScore}, ${selectQualified}, ${selectStatus}
       FROM applications WHERE id = $1::uuid LIMIT 1`,
      [applicationId]
    ) as any[]

    const row = rows?.[0] || {}
    return NextResponse.json({
      ok: true,
      applicationId,
      score: typeof row.qualification_score === 'number' ? row.qualification_score : null,
      isQualified: typeof row.is_qualified === 'boolean' ? row.is_qualified : null,
      status: typeof row.status === 'string' ? row.status : null,
    })
  } catch (e: any) {
    console.error('Get application score error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch score' }, { status: 500 })
  }
}
