import { NextResponse } from "next/server"

// API endpoint to fetch qualified candidates by job ID
// In Next.js 15, params may be a Promise in route handlers; await it.
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const { jobId } = await (ctx.params as any)
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 })
  }

  try {
    // TODO: Replace with real database query
    // SELECT * FROM qualified_candidates WHERE job_id = jobId
    // For now, return empty data to show null table state
    const qualified: any[] = []

    return NextResponse.json({ ok: true, jobId, qualified })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load qualified candidates" }, { status: 500 })
  }
}
