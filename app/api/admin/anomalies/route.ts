import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const anomalies = [
      {
        title: "Spend Spike Detected",
        description: "Acme Corp spending increased 45% compared to 7-day baseline",
        severity: "warning",
        company: "Acme Corp",
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        title: "Unusual Interview Duration",
        description: "Interview int-045 lasted 2 hours (normal: 45-60 min)",
        severity: "info",
        company: "Tech Startup",
        detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      {
        title: "High Failure Rate",
        description: "Global Inc has 40% interview failure rate (normal: <5%)",
        severity: "critical",
        company: "Global Inc",
        detectedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ]

    return NextResponse.json({
      ok: true,
      anomalies,
    })
  } catch (error) {
    console.error("Failed to get anomalies:", error)
    return NextResponse.json({ ok: false, error: "Failed to load anomalies" }, { status: 500 })
  }
}
