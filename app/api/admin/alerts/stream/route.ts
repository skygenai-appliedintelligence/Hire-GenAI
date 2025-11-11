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
    // Alert: High spend companies
    const highSpendRes = await DatabaseService.query(
      `SELECT name, monthly_spend_cap, 
        (SELECT COALESCE(SUM(cost), 0) FROM (
          SELECT cost FROM cv_parsing_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          UNION ALL
          SELECT cost FROM question_generation_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          UNION ALL
          SELECT cost FROM video_interview_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
        ) m) as month_spent
      FROM companies c
      WHERE monthly_spend_cap IS NOT NULL
      HAVING (SELECT COALESCE(SUM(cost), 0) FROM (
        SELECT cost FROM cv_parsing_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
        UNION ALL
        SELECT cost FROM question_generation_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
        UNION ALL
        SELECT cost FROM video_interview_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
      ) m) > monthly_spend_cap * 0.8`
    )

    highSpendRes.forEach((row: any) => {
      alerts.push({
        id: `high-spend-${row.name}`,
        title: "High Spend Alert",
        description: `${row.name} has spent $${typeof row.month_spent === 'string' ? parseFloat(row.month_spent).toFixed(2) : row.month_spent?.toFixed(2)} this month`,
        severity: "warning",
        timestamp: new Date().toISOString(),
      })
    })
  } catch (err) {
    console.warn("Failed to fetch high spend alerts:", err)
  }

  try {
    // Alert: Low wallet balance
    const lowWalletRes = await DatabaseService.query(
      `SELECT id, name, wallet_balance FROM companies WHERE wallet_balance < 100 AND status = 'active' LIMIT 5`
    )

    if (lowWalletRes.length > 0) {
      alerts.push({
        id: "low-wallet",
        title: "Low Wallet Balance",
        description: `${lowWalletRes.length} companies have wallet balance below $100`,
        severity: "warning",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.warn("Failed to fetch wallet alerts:", err)
  }

  try {
    // Alert: Failed interviews
    const failedRes = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM interviews WHERE status = 'failed' AND DATE(created_at) = CURRENT_DATE`
    )

    if (failedRes[0]?.count > 0) {
      alerts.push({
        id: "failed-interviews",
        title: "Failed Interviews",
        description: `${failedRes[0].count} interviews failed today`,
        severity: "info",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.warn("Failed to fetch failed interview alerts:", err)
  }

  return alerts
}
