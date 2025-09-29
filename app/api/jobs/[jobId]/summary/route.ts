import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

// GET /api/jobs/:jobId/summary?companyId=...
// Returns minimal job details for analytics header
export async function GET(req: Request, ctx: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const { jobId } = await (ctx.params as any)
  const url = new URL(req.url)
  const companyId = url.searchParams.get("companyId")

  if (!jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 })
  if (!companyId) return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 })

  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      // DB not configured; return a minimal placeholder so UI still works
      return NextResponse.json({
        ok: true,
        job: { id: jobId, title: null, employment_type: null, created_at: null },
      })
    }

    const job = await DatabaseService.getJobByIdForCompany(jobId, companyId)
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        title: job.title,
        employment_type: job.employment_type ?? null,
        created_at: job.created_at ?? null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load job" }, { status: 500 })
  }
}
