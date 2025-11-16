import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

// Store active connections for broadcasting
const activeConnections = new Set<ReadableStreamDefaultController>()

// Broadcast alert to all connected clients
export function broadcastAlert(alert: any) {
  const data = `data: ${JSON.stringify(alert)}\n\n`
  activeConnections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch (err) {
      activeConnections.delete(controller)
    }
  })
}

export async function GET(req: NextRequest) {
  // Set up SSE headers
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  }

  const stream = new ReadableStream({
    async start(controller) {
      activeConnections.add(controller)

      // Send initial connection message
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: "connected", message: "Connected to alerts stream" })}\n\n`
        )
      )

      // Send current alerts
      try {
        const alerts = await fetchCurrentAlerts()
        alerts.forEach((alert) => {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: "alert", ...alert })}\n\n`)
          )
        })
      } catch (err) {
        console.error("Failed to fetch initial alerts:", err)
      }

      // Poll for new alerts every 10 seconds
      const interval = setInterval(async () => {
        try {
          const alerts = await fetchCurrentAlerts()
          alerts.forEach((alert) => {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: "alert", ...alert })}\n\n`)
            )
          })
        } catch (err) {
          console.error("Failed to fetch alerts:", err)
        }
      }, 10000)

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        activeConnections.delete(controller)
        controller.close()
      })
    },
  })

  return new NextResponse(stream, { headers })
}

async function fetchCurrentAlerts() {
  const alerts: any[] = []

  try {
    // Alert: Recently failed interviews (in the last 24 hours)
    const failedRes = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM interviews 
       WHERE status = 'failed' 
       AND completed_at IS NOT NULL 
       AND completed_at >= NOW() - INTERVAL '24 hours'`
    )

    if (failedRes[0]?.count > 0) {
      alerts.push({
        id: "failed-interviews",
        title: "Failed Interviews",
        description: `${failedRes[0].count} interviews failed in the last 24 hours`,
        severity: "warning",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.warn("Failed to fetch failed interview alerts:", err)
  }

  try {
    // Alert: Companies with pending applications
    const pendingAppsRes = await DatabaseService.query(
      `SELECT c.id, c.name, COUNT(a.id) as pending_count
       FROM companies c
       LEFT JOIN jobs j ON j.company_id = c.id
       LEFT JOIN applications a ON a.job_id = j.id AND a.status = 'applied'
       WHERE c.status = 'active'
       GROUP BY c.id, c.name
       HAVING COUNT(a.id) > 10
       LIMIT 5`
    )

    if (pendingAppsRes.length > 0) {
      alerts.push({
        id: "pending-applications",
        title: "High Pending Applications",
        description: `${pendingAppsRes.length} companies have more than 10 pending applications`,
        severity: "info",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.warn("Failed to fetch pending applications alerts:", err)
  }

  try {
    // Alert: Expired interview links
    const expiredLinksRes = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM interview_links 
       WHERE expires_at < NOW() 
       AND used_at IS NULL`
    )

    if (expiredLinksRes[0]?.count > 0) {
      alerts.push({
        id: "expired-links",
        title: "Expired Interview Links",
        description: `${expiredLinksRes[0].count} interview links have expired without being used`,
        severity: "info",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.warn("Failed to fetch expired links alerts:", err)
  }

  return alerts
}
