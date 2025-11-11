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
    console.log("🧪 Testing database connection...")

    // Test 1: Check if database is configured
    const isConfigured = DatabaseService.isDatabaseConfigured()
    console.log("✅ Database configured:", isConfigured)

    if (!isConfigured) {
      return NextResponse.json({
        ok: false,
        error: "Database not configured",
      })
    }

    // Test 2: Count tables
    const jobsCountRes = await DatabaseService.query(`SELECT COUNT(*)::text as count FROM jobs`)
    const jobsCount = parseInt(jobsCountRes[0]?.count || "0")
    console.log("📊 Jobs count:", jobsCount)

    const companiesCountRes = await DatabaseService.query(`SELECT COUNT(*)::text as count FROM companies`)
    const companiesCount = parseInt(companiesCountRes[0]?.count || "0")
    console.log("📊 Companies count:", companiesCount)

    // Test 3: Get sample job
    let sampleJob = null
    if (jobsCount > 0) {
      const sampleJobs = await DatabaseService.query(`SELECT id::text, title, company_name, status FROM jobs LIMIT 1`)
      sampleJob = convertBigInt(sampleJobs[0]) || null
      console.log("📋 Sample job:", sampleJob)
    }

    // Test 4: Get sample company
    let sampleCompany = null
    if (companiesCount > 0) {
      const sampleCompanies = await DatabaseService.query(`SELECT id::text, name, status FROM companies LIMIT 1`)
      sampleCompany = convertBigInt(sampleCompanies[0]) || null
      console.log("🏢 Sample company:", sampleCompany)
    }

    return NextResponse.json({
      ok: true,
      database: {
        configured: isConfigured,
        jobsCount,
        companiesCount,
        sampleJob,
        sampleCompany,
      },
    })
  } catch (error) {
    console.error("❌ Database test failed:", error)
    return NextResponse.json({
      ok: false,
      error: String(error),
    })
  }
}
