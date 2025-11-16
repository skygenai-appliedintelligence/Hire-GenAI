import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Testing companies API...")

    // Test 1: Check database connection
    const isConfigured = DatabaseService.isDatabaseConfigured()
    console.log("✅ Database configured:", isConfigured)

    if (!isConfigured) {
      return NextResponse.json({
        ok: false,
        error: "Database not configured",
      })
    }

    // Test 2: Count companies
    console.log("📝 Counting companies...")
    const countRes = await DatabaseService.query(`SELECT COUNT(*)::text as count FROM companies`)
    const companyCount = parseInt(countRes[0]?.count || "0")
    console.log("📊 Total companies:", companyCount)

    if (companyCount === 0) {
      return NextResponse.json({
        ok: true,
        test: {
          configured: true,
          companyCount: 0,
          message: "No companies in database",
        },
      })
    }

    // Test 3: Get first company
    console.log("📝 Getting first company...")
    const firstCompanyRes = await DatabaseService.query(
      `SELECT id::text, name, status FROM companies LIMIT 1`
    )
    console.log("✅ First company:", firstCompanyRes[0])

    // Test 4: Get all companies (simple)
    console.log("📝 Getting all companies (simple)...")
    const allCompanies = await DatabaseService.query(
      `SELECT id::text, name, status FROM companies ORDER BY created_at DESC`
    )
    console.log("✅ All companies count:", allCompanies.length)

    // Test 5: Try with wallet_balance from company_billing
    console.log("📝 Getting companies with wallet_balance...")
    const withBalance = await DatabaseService.query(
      `SELECT c.id::text, c.name, c.status, COALESCE(cb.wallet_balance, 0)::text as walletBalance 
       FROM companies c 
       LEFT JOIN company_billing cb ON c.id = cb.company_id 
       LIMIT 1`
    )
    console.log("✅ Company with balance:", withBalance[0])

    return NextResponse.json({
      ok: true,
      test: {
        configured: isConfigured,
        companyCount,
        firstCompany: firstCompanyRes[0] || null,
        allCompaniesCount: allCompanies.length,
        sampleCompanies: allCompanies.slice(0, 3),
        withBalance: withBalance[0] || null,
      },
    })
  } catch (error) {
    console.error("❌ Test failed:", error)
    return NextResponse.json({
      ok: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
