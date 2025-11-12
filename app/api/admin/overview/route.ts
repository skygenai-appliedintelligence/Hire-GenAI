import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Query real data from database with fallback to mock data
    let spendData = { total: 0, today: 0, yesterday: 0 }
    let interviewData = { total: 0, successful: 0 }
    let companiesCount = 0
    let jobsCount = 0

    try {
      const totalSpendRes = await DatabaseService.query(
        `SELECT 
          COALESCE(SUM(cost), 0) as total,
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN cost ELSE 0 END), 0) as today,
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' THEN cost ELSE 0 END), 0) as yesterday
        FROM (
          SELECT cost, created_at FROM cv_parsing_usage
          UNION ALL
          SELECT cost, created_at FROM question_generation_usage
          UNION ALL
          SELECT cost, created_at FROM video_interview_usage
        ) usage`
      )
      const rawData = totalSpendRes[0] || { total: 0, today: 0, yesterday: 0 }
      spendData = {
        total: typeof rawData.total === 'number' ? rawData.total : parseFloat(rawData.total) || 0,
        today: typeof rawData.today === 'number' ? rawData.today : parseFloat(rawData.today) || 0,
        yesterday: typeof rawData.yesterday === 'number' ? rawData.yesterday : parseFloat(rawData.yesterday) || 0,
      }
    } catch (err) {
      console.warn("Failed to fetch spend data, using defaults:", err)
    }

    try {
      const interviewsRes = await DatabaseService.query(
        `SELECT 
          COUNT(*)::int as total,
          COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0)::int as successful
        FROM interviews
        WHERE DATE(completed_at) = CURRENT_DATE`
      )
      const rawInterviewData = interviewsRes[0] || { total: 0, successful: 0 }
      interviewData = {
        total: typeof rawInterviewData.total === 'number' ? rawInterviewData.total : parseInt(rawInterviewData.total) || 0,
        successful: typeof rawInterviewData.successful === 'number' ? rawInterviewData.successful : parseInt(rawInterviewData.successful) || 0,
      }
    } catch (err) {
      console.warn("Failed to fetch interview data, using defaults:", err)
    }

    try {
      const companiesRes = await DatabaseService.query(
        `SELECT COUNT(DISTINCT id)::int as count FROM companies WHERE status IN ('active', 'trial')`
      )
      companiesCount = companiesRes[0]?.count || 0
    } catch (err) {
      console.warn("Failed to fetch companies count, using default:", err)
    }

    try {
      const jobsRes = await DatabaseService.query(
        `SELECT COUNT(DISTINCT id)::int as count FROM jobs WHERE status = 'open'`
      )
      jobsCount = jobsRes[0]?.count || 0
    } catch (err) {
      console.warn("Failed to fetch jobs count, using default:", err)
    }

    const spendChange = spendData.yesterday > 0 ? ((spendData.today - spendData.yesterday) / spendData.yesterday) * 100 : 0
    const successRate = interviewData.total > 0 ? (interviewData.successful / interviewData.total) * 100 : 0

    const kpis = {
      totalSpend: typeof spendData.total === 'string' ? parseFloat(spendData.total) : spendData.total || 0,
      spendToday: typeof spendData.today === 'string' ? parseFloat(spendData.today) : spendData.today || 0,
      spendYesterday: typeof spendData.yesterday === 'string' ? parseFloat(spendData.yesterday) : spendData.yesterday || 0,
      spendChange: parseFloat(spendChange.toFixed(1)),
      interviewsToday: typeof interviewData.total === 'string' ? parseInt(interviewData.total) : interviewData.total || 0,
      successRate: parseFloat(successRate.toFixed(1)),
      activeCompanies: companiesCount,
      activeJobs: jobsCount,
    }

    // Get 30-day spend trend
    let spendTrend: any[] = []
    try {
      const spendTrendRes = await DatabaseService.query(
        `SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(cost), 0)::float as spend
        FROM (
          SELECT cost, created_at FROM cv_parsing_usage WHERE created_at >= $1
          UNION ALL
          SELECT cost, created_at FROM question_generation_usage WHERE created_at >= $1
          UNION ALL
          SELECT cost, created_at FROM video_interview_usage WHERE created_at >= $1
        ) usage
        GROUP BY DATE(created_at)
        ORDER BY date ASC`,
        [thirtyDaysAgo]
      )
      spendTrend = (spendTrendRes || []).map((row: any) => ({
        date: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        spend: typeof row.spend === 'string' ? parseFloat(row.spend) : (typeof row.spend === 'number' ? row.spend : 0),
      }))
    } catch (err) {
      console.warn("Failed to fetch spend trend:", err)
    }

    // Get 30-day interview trend
    let interviewTrend: any[] = []
    try {
      const interviewTrendRes = await DatabaseService.query(
        `SELECT 
          DATE(completed_at) as date,
          COUNT(*)::int as count
        FROM interviews
        WHERE completed_at >= $1
        GROUP BY DATE(completed_at)
        ORDER BY date ASC`,
        [thirtyDaysAgo]
      )
      interviewTrend = (interviewTrendRes || []).map((row: any) => ({
        date: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: typeof row.count === 'string' ? parseInt(row.count) : (typeof row.count === 'number' ? row.count : 0),
      }))
    } catch (err) {
      console.warn("Failed to fetch interview trend:", err)
    }

    // Generate alerts
    const alerts: any[] = []

    // Alert: High spend companies
    try {
      const highSpendRes = await DatabaseService.query(
        `SELECT c.name, cb.monthly_spend_cap, 
          (SELECT COALESCE(SUM(cost), 0) FROM (
            SELECT cost FROM cv_parsing_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
            UNION ALL
            SELECT cost FROM question_generation_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
            UNION ALL
            SELECT cost FROM video_interview_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          ) m) as month_spent
        FROM companies c
        JOIN company_billing cb ON c.id = cb.company_id
        WHERE cb.monthly_spend_cap IS NOT NULL
        AND (SELECT COALESCE(SUM(cost), 0) FROM (
          SELECT cost FROM cv_parsing_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          UNION ALL
          SELECT cost FROM question_generation_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          UNION ALL
          SELECT cost FROM video_interview_usage WHERE company_id = c.id AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
        ) m) > cb.monthly_spend_cap * 0.8`
      )

      if (highSpendRes && highSpendRes.length > 0) {
        highSpendRes.forEach((row: any) => {
          alerts.push({
            title: "High Spend Alert",
            description: `${row.name} has spent $${typeof row.month_spent === 'string' ? parseFloat(row.month_spent).toFixed(2) : row.month_spent?.toFixed(2)} this month (cap: $${row.monthly_spend_cap})`,
            severity: "warning",
          })
        })
      }
    } catch (err) {
      console.warn("Failed to fetch high spend alerts:", err)
    }

    // Alert: Low wallet balance
    try {
      const lowWalletRes = await DatabaseService.query(
        `SELECT COUNT(*)::int as count FROM company_billing cb
        JOIN companies c ON cb.company_id = c.id
        WHERE cb.wallet_balance < 100 AND c.status = 'active'`
      )
      if (lowWalletRes[0]?.count > 0) {
        alerts.push({
          title: "Low Wallet Balance",
          description: `${lowWalletRes[0].count} companies have wallet balance below $100`,
          severity: "warning",
        })
      }
    } catch (err) {
      console.warn("Failed to fetch wallet alerts:", err)
    }

    // Alert: Failed interviews
    try {
      const failedRes = await DatabaseService.query(
        `SELECT COUNT(*)::int as count FROM interviews WHERE status = 'failed' AND DATE(completed_at) = CURRENT_DATE`
      )
      if (failedRes[0]?.count > 0) {
        alerts.push({
          title: "Failed Interviews",
          description: `${failedRes[0].count} interviews failed in the last 24 hours`,
          severity: "info",
        })
      }
    } catch (err) {
      console.warn("Failed to fetch failed interview alerts:", err)
    }

    return NextResponse.json({
      ok: true,
      kpis,
      spendTrend,
      interviewTrend,
      alerts,
    })
  } catch (error) {
    console.error("Failed to get overview:", error)
    return NextResponse.json({ ok: false, error: "Failed to load overview" }, { status: 500 })
  }
}
