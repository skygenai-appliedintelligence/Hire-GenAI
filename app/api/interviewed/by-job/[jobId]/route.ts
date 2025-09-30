import { NextResponse } from "next/server"

// API endpoint to fetch interviewed candidates by job ID
// In Next.js 15, params may be a Promise in route handlers; await it.
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const { jobId } = await (ctx.params as any)
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 })
  }

  try {
    // TODO: Replace with real database query
    // SELECT * FROM interviews WHERE job_id = jobId
    // For now, return placeholder data
    const interviewed = [
      {
        id: "int-1",
        candidateName: "David Kim",
        email: "david.kim@email.com",
        phone: "+1-555-0126",
        cvUrl: "https://example.com/cv/david-kim.pdf",
        status: "Interview Completed",
        interviewDate: "2024-01-15T10:00:00Z",
        interviewRound: "Technical Round",
        score: 87
      },
      {
        id: "int-2",
        candidateName: "Lisa Wang", 
        email: "lisa.wang@email.com",
        phone: "+1-555-0127",
        cvUrl: "https://example.com/cv/lisa-wang.pdf",
        status: "Interview Scheduled",
        interviewDate: "2024-01-20T14:00:00Z",
        interviewRound: "System Design"
      },
      {
        id: "int-3",
        candidateName: "James Miller",
        email: "james.miller@email.com",
        phone: "+1-555-0128", 
        cvUrl: "https://example.com/cv/james-miller.pdf",
        status: "Awaiting Results",
        interviewDate: "2024-01-18T11:00:00Z",
        interviewRound: "Behavioral Round",
        score: 91
      },
      {
        id: "int-4",
        candidateName: "Anna Thompson",
        email: "anna.thompson@email.com",
        phone: "+1-555-0129",
        cvUrl: "https://example.com/cv/anna-thompson.pdf", 
        status: "Interview Completed",
        interviewDate: "2024-01-12T09:00:00Z",
        interviewRound: "Final Round",
        score: 94
      }
    ]

    return NextResponse.json({ ok: true, jobId, interviewed })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load interviewed candidates" }, { status: 500 })
  }
}
