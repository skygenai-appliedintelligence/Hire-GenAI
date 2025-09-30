import { NextResponse } from "next/server"

// Lightweight analytics endpoint filtered by jdId.
// In a real setup, join applications, interviews, etc. by job_id = jdId and aggregate.
// In Next.js 15, params may be a Promise in route handlers; await it.
export async function GET(_req: Request, ctx: { params: Promise<{ jdId: string }> | { jdId: string } }) {
  const { jdId } = await (ctx.params as any)
  if (!jdId) {
    return NextResponse.json({ ok: false, error: "Missing jdId" }, { status: 400 })
  }

  try {
    // TODO: Replace with real database-backed aggregation.
    // Sample data to show the dashboard cards in action.
    const stats = {
      applicants: 156,
      qualified: 6,  // Updated to match our 6 qualified candidates
      interviewsCompleted: 45,
      inProgress: 23,
      recommended: 12,
      rejected: 8,
    }

    return NextResponse.json({ ok: true, jdId, stats })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load analytics" }, { status: 500 })
  }
}
