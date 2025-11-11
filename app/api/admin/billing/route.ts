import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    // Get usage summaries
    let usage = {
      cvParsing: 0,
      cvCount: 0,
      questions: 0,
      tokenCount: 0,
      video: 0,
      videoMinutes: 0,
    }

    try {
      const cvRes = await DatabaseService.query(
        `SELECT COALESCE(SUM(cost), 0) as total, COUNT(*) as count FROM cv_parsing_usage`
      )
      usage.cvParsing = typeof cvRes[0]?.total === 'string' ? parseFloat(cvRes[0].total) : cvRes[0]?.total || 0
      usage.cvCount = typeof cvRes[0]?.count === 'string' ? parseInt(cvRes[0].count) : cvRes[0]?.count || 0
    } catch (err) {
      console.warn("Failed to fetch CV usage:", err)
    }

    try {
      const qRes = await DatabaseService.query(
        `SELECT COALESCE(SUM(tokens_used), 0) as tokens, COALESCE(SUM(cost), 0) as total FROM question_generation_usage`
      )
      usage.questions = typeof qRes[0]?.total === 'string' ? parseFloat(qRes[0].total) : qRes[0]?.total || 0
      usage.tokenCount = typeof qRes[0]?.tokens === 'string' ? parseInt(qRes[0].tokens) : qRes[0]?.tokens || 0
    } catch (err) {
      console.warn("Failed to fetch question usage:", err)
    }

    try {
      const vRes = await DatabaseService.query(
        `SELECT COALESCE(SUM(cost), 0) as total, COALESCE(SUM(duration_minutes), 0) as minutes FROM video_interview_usage`
      )
      usage.video = typeof vRes[0]?.total === 'string' ? parseFloat(vRes[0].total) : vRes[0]?.total || 0
      usage.videoMinutes = typeof vRes[0]?.minutes === 'string' ? parseInt(vRes[0].minutes) : vRes[0]?.minutes || 0
    } catch (err) {
      console.warn("Failed to fetch video usage:", err)
    }

    // Get ledger (last 50 entries)
    let ledger: any[] = []
    try {
      const ledgerRes = await DatabaseService.query(
        `SELECT 
          created_at as timestamp,
          'cv_parsing' as category,
          c.name as company,
          NULL as job,
          base_cost as baseCost,
          profit_margin as margin,
          cost as finalCost
        FROM cv_parsing_usage cvu
        LEFT JOIN companies c ON cvu.company_id = c.id
        UNION ALL
        SELECT 
          created_at,
          'question_generation',
          c.name,
          j.title,
          base_cost,
          profit_margin,
          cost
        FROM question_generation_usage qgu
        LEFT JOIN companies c ON qgu.company_id = c.id
        LEFT JOIN jobs j ON qgu.job_id = j.id
        UNION ALL
        SELECT 
          created_at,
          'video_interview',
          c.name,
          j.title,
          base_cost,
          profit_margin,
          cost
        FROM video_interview_usage viu
        LEFT JOIN companies c ON viu.company_id = c.id
        LEFT JOIN jobs j ON viu.job_id = j.id
        ORDER BY timestamp DESC
        LIMIT 50`
      )
      ledger = ledgerRes.map((l: any) => ({
        ...l,
        baseCost: typeof l.baseCost === 'string' ? parseFloat(l.baseCost) : l.baseCost,
        margin: typeof l.margin === 'string' ? parseFloat(l.margin) : l.margin,
        finalCost: typeof l.finalCost === 'string' ? parseFloat(l.finalCost) : l.finalCost,
      }))
    } catch (err) {
      console.warn("Failed to fetch ledger:", err)
    }

    return NextResponse.json({
      ok: true,
      usage,
      ledger,
    })
  } catch (error) {
    console.error("Failed to get billing:", error)
    return NextResponse.json({
      ok: true,
      usage: { cvParsing: 0, cvCount: 0, questions: 0, tokenCount: 0, video: 0, videoMinutes: 0 },
      ledger: [],
    })
  }
}
