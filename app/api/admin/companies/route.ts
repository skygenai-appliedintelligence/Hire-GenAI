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
    // Get date range from query params
    const searchParams = req.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    console.log('📊 [Admin Companies] Date range:', startDate.toLocaleDateString(), 'to', endDate.toLocaleDateString())
    console.log("🔍 Companies API called")

    // First check if companies table has data
    try {
      console.log("📝 Attempting to count companies...")
      const countRes = await DatabaseService.query(`SELECT COUNT(*)::text as count FROM companies`)
      console.log("📊 Count query result:", countRes)
      const companyCount = parseInt(countRes[0]?.count || "0")
      console.log("📊 Total companies in database:", companyCount)
    } catch (err) {
      console.error("❌ Could not count companies:", err)
    }

    // First get basic company data with wallet balance from company_billing
    const basicQuery = `
      SELECT 
        c.id::text as id,
        c.name,
        c.status,
        COALESCE(cb.wallet_balance, 0) as "walletBalance",
        c.created_at
      FROM companies c
      LEFT JOIN company_billing cb ON c.id = cb.company_id
      ORDER BY c.created_at DESC
    `

    console.log("📝 Executing basic query...")
    console.log("📝 Query:", basicQuery)
    const companies = await DatabaseService.query(basicQuery)
    console.log("✅ Query returned:", companies.length, "companies")
    console.log("📋 Companies data:", companies)
    if (companies.length > 0) {
      console.log("🔍 First company raw data:", companies[0])
      console.log("🔍 First company walletBalance:", {
        value: companies[0].walletBalance,
        type: typeof companies[0].walletBalance,
      })
    }

    // Now get costs and interview counts for each company
    const result = await Promise.all(
      companies.map(async (c: any) => {
        try {
          // Get spend for selected date range
          const monthRes = await DatabaseService.query(
            `SELECT COALESCE(SUM(cost), 0) as total FROM (
              SELECT cost FROM cv_parsing_usage WHERE company_id = $1::uuid AND created_at >= $2 AND created_at <= $3
              UNION ALL
              SELECT cost FROM question_generation_usage WHERE company_id = $1::uuid AND created_at >= $2 AND created_at <= $3
              UNION ALL
              SELECT cost FROM video_interview_usage WHERE company_id = $1::uuid AND created_at >= $2 AND created_at <= $3
            ) m`,
            [c.id, startDate, endDate]
          )

          // Get total spend
          const totalRes = await DatabaseService.query(
            `SELECT COALESCE(SUM(cost), 0) as total FROM (
              SELECT cost FROM cv_parsing_usage WHERE company_id = $1::uuid
              UNION ALL
              SELECT cost FROM question_generation_usage WHERE company_id = $1::uuid
              UNION ALL
              SELECT cost FROM video_interview_usage WHERE company_id = $1::uuid
            ) t`,
            [c.id]
          )

          // Get interview count
          const interviewRes = await DatabaseService.query(
            `SELECT COUNT(*)::text as count FROM interviews i 
             JOIN application_rounds ar ON ar.id = i.application_round_id
             JOIN applications a ON a.id = ar.application_id
             JOIN jobs j ON j.id = a.job_id 
             WHERE j.company_id = $1::uuid`,
            [c.id]
          )

          console.log(`🔍 Processing company ${c.name}:`, {
            walletBalance: c.walletBalance,
            walletBalanceType: typeof c.walletBalance,
            monthTotal: monthRes[0]?.total,
            totalTotal: totalRes[0]?.total,
          })

          const walletBal = parseFloat(String(c.walletBalance || 0))
          const monthSpent = parseFloat(String(monthRes[0]?.total || 0))
          const totalSpent = parseFloat(String(totalRes[0]?.total || 0))

          console.log(`💰 Company ${c.name}: wallet=${walletBal}, month=${monthSpent}, total=${totalSpent}`)

          return {
            ...c,
            walletBalance: walletBal,
            monthSpent: monthSpent,
            totalSpent: totalSpent,
            interviewCount: parseInt(String(interviewRes[0]?.count || 0)),
          }
        } catch (err) {
          console.warn("⚠️ Error getting details for company", c.id, ":", err)
          const walletBal = parseFloat(String(c.walletBalance || 0))
          return {
            ...c,
            walletBalance: walletBal,
            monthSpent: 0,
            totalSpent: 0,
            interviewCount: 0,
          }
        }
      })
    )

    console.log("✅ Returning", result.length, "companies")
    console.log("📦 Final result:", JSON.stringify(result, null, 2))

    return NextResponse.json({
      ok: true,
      companies: result,
    })
  } catch (error) {
    console.error("❌ Failed to get companies:", error)
    return NextResponse.json({
      ok: true,
      companies: [],
      error: String(error),
    })
  }
}
