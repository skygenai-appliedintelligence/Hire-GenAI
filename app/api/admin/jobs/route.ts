import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

// Helper to convert BigInt to string
function convertBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "bigint") return obj.toString()
  if (Array.isArray(obj)) return obj.map(convertBigInt)
  if (typeof obj === "object") {
    const converted: any = {}
    for (const key in obj) {
      converted[key] = convertBigInt(obj[key])
    }
    return converted
  }
  return obj
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId") || ""
    const companyName = req.nextUrl.searchParams.get("company") || ""

    console.log("🔍 Jobs API called - companyId:", companyId, "companyName:", companyName)

    // First, check if jobs table has any data
    try {
      const countRes = await DatabaseService.query(`SELECT COUNT(*)::text as count FROM jobs`)
      const jobCount = parseInt(countRes[0]?.count || "0")
      console.log("📊 Total jobs in database:", jobCount)
    } catch (err) {
      console.warn("⚠️ Could not count jobs:", err)
    }

    // Simple query first - just get all jobs with basic info
    let query = `
      SELECT 
        j.id::text as id,
        j.title,
        COALESCE(c.name, j.company_name, 'Unknown') as company,
        j.status,
        j.created_at as createdAt,
        j.updated_at as updatedAt
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
    `

    const params: any[] = []

    if (companyId && companyId !== "all") {
      query += ` WHERE j.company_id = $${params.length + 1}::uuid`
      params.push(companyId)
      console.log("🔎 Filtering by companyId:", companyId)
    } else if (companyName && companyName !== "all") {
      query += ` WHERE (LOWER(c.name) LIKE LOWER($${params.length + 1}) OR LOWER(j.company_name) LIKE LOWER($${params.length + 1}))`
      params.push(`%${companyName}%`)
      console.log("🔎 Filtering by companyName:", companyName)
    }

    query += ` ORDER BY j.created_at DESC LIMIT 100`

    console.log("📝 Executing query:", query)
    console.log("📋 With params:", params)

    const jobs = await DatabaseService.query(query, params)
    console.log("✅ Query returned:", jobs.length, "jobs")

    // Now get costs for each job
    const jobsWithCosts = await Promise.all(
      jobs.map(async (job: any) => {
        try {
          // Get interview count
          const interviewRes = await DatabaseService.query(
            `SELECT COUNT(*)::text as count FROM interviews i 
             JOIN application_rounds ar ON ar.id = i.application_round_id
             JOIN applications a ON a.id = ar.application_id
             WHERE a.job_id = $1::uuid`,
            [job.id]
          )

          // Get CV parsing costs
          const cvRes = await DatabaseService.query(
            `SELECT 
              COUNT(*) as count,
              COALESCE(SUM(cost), 0)::text as total
            FROM cv_parsing_usage 
            WHERE job_id = $1::uuid`,
            [job.id]
          )
          const cvCount = parseInt(cvRes[0]?.count || "0")
          const cvCost = parseFloat(cvRes[0]?.total || "0")

          // Get question generation costs
          const questionRes = await DatabaseService.query(
            `SELECT 
              COUNT(*) as count,
              COALESCE(SUM(cost), 0)::text as total
            FROM question_generation_usage 
            WHERE job_id = $1::uuid`,
            [job.id]
          )
          const questionCount = parseInt(questionRes[0]?.count || "0")
          const questionsCost = parseFloat(questionRes[0]?.total || "0")

          // Get video interview costs
          const videoRes = await DatabaseService.query(
            `SELECT 
              COUNT(*) as count,
              COALESCE(SUM(duration_minutes), 0) as total_minutes,
              COALESCE(SUM(cost), 0)::text as total
            FROM video_interview_usage 
            WHERE job_id = $1::uuid`,
            [job.id]
          )
          const videoCount = parseInt(videoRes[0]?.count || "0")
          const videoMinutes = parseFloat(videoRes[0]?.total_minutes || "0")
          const videoCost = parseFloat(videoRes[0]?.total || "0")

          // Calculate total cost
          const totalCost = cvCost + questionsCost + videoCost

          console.log(`📊 Job ${job.title}: CVs=${cvCount} ($${cvCost.toFixed(2)}), Questions=${questionCount} ($${questionsCost.toFixed(2)}), Videos=${videoCount} (${videoMinutes.toFixed(1)}min, $${videoCost.toFixed(2)}), Total=$${totalCost.toFixed(2)}`)

          return {
            ...job,
            interviewCount: parseInt(interviewRes[0]?.count || "0"),
            cvCost,
            questionsCost,
            videoCost,
            totalCost,
          }
        } catch (err) {
          console.warn("⚠️ Error getting costs for job", job.id, ":", err)
          return {
            ...job,
            interviewCount: 0,
            cvCost: 0,
            questionsCost: 0,
            videoCost: 0,
            totalCost: 0,
          }
        }
      })
    )

    console.log("✅ Returning", jobsWithCosts.length, "jobs with costs")

    return NextResponse.json({
      ok: true,
      jobs: jobsWithCosts.map(convertBigInt),
    })
  } catch (error) {
    console.error("❌ Failed to get jobs:", error)
    return NextResponse.json({
      ok: true,
      jobs: [],
      error: String(error),
    })
  }
}
