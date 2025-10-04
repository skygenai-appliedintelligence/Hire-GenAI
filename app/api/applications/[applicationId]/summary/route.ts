import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/applications/:applicationId/summary
// Returns job title, company and location for an application
export async function GET(_req: Request, ctx: { params: Promise<{ applicationId: string }> | { applicationId: string } }) {
  const { applicationId } = await (ctx.params as any)
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: "Missing applicationId" }, { status: 400 })
  }

  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        applicationId,
        job: { title: "RPA Developer", location: "India" },
        company: { name: "AI Consulting" }
      })
    }

    // Check columns existence for flexible schemas
    const jobColsQ = `
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='jobs' 
        AND column_name IN ('title','company_name','location_text','company_id')
    `
    const jobColsRows = await (DatabaseService as any)["query"]?.call(DatabaseService, jobColsQ, []) as any[]
    const jobCols = new Set((jobColsRows || []).map((r: any) => r.column_name))

    const selectCompanyNameFromJobs = jobCols.has('company_name') ? ', j.company_name' : ''
    const selectLocation = jobCols.has('location_text') ? ', j.location_text' : ''
    const selectCompanyId = jobCols.has('company_id') ? ', j.company_id' : ''

    const q = `
      SELECT 
        a.id as application_id,
        a.job_id,
        j.title
        ${selectCompanyNameFromJobs}
        ${selectLocation}
        ${selectCompanyId}
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1::uuid
      LIMIT 1
    `
    const rows = await (DatabaseService as any)["query"]?.call(DatabaseService, q, [applicationId]) as any[]
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 })
    }
    const row = rows[0]

    // If company_name missing on jobs, try companies table
    let companyName: string | null = row.company_name ?? null
    if (!companyName && row.company_id) {
      try {
        const cRows = await (DatabaseService as any)["query"]?.call(
          DatabaseService,
          `SELECT name FROM companies WHERE id = $1::uuid LIMIT 1`,
          [row.company_id]
        ) as any[]
        if (cRows && cRows.length > 0) companyName = cRows[0].name || null
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      applicationId,
      job: {
        id: row.job_id,
        title: row.title || null,
        location: row.location_text || null,
      },
      company: {
        id: row.company_id || null,
        name: companyName || null,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch application summary" }, { status: 500 })
  }
}
