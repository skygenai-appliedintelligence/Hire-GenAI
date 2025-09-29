import { NextResponse } from "next/server"

// GET /api/applications/by-job/:jobId
// Returns applications for a given job. Replace with DB query later.
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const { jobId } = await (ctx.params as any)
  if (!jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 })

  try {
    // TODO: Hook into database. For now, return empty list with shape.
    return NextResponse.json({
      ok: true,
      jobId,
      applications: [] as Array<{
        id: string
        candidateName: string
        email: string
        phone: string
        cvUrl: string
        status: "CV Unqualified" | "CV Qualified"
        appliedAt?: string
      }>,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load applications" }, { status: 500 })
  }
}
