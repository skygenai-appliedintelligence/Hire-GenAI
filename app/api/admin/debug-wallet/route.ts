import { NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Debug wallet endpoint called")

    // Get all companies
    const companies = await DatabaseService.query(
      `SELECT id::text, name FROM companies LIMIT 10`
    )
    console.log("📊 Companies:", companies)

    // Get all company_billing records
    const billing = await DatabaseService.query(
      `SELECT company_id::text, wallet_balance FROM company_billing LIMIT 10`
    )
    console.log("💰 Company Billing:", billing)

    // Get companies with their billing info
    const companiesWithBilling = await DatabaseService.query(
      `SELECT 
        c.id::text, 
        c.name, 
        cb.company_id::text as billing_company_id,
        cb.wallet_balance::text as wallet_balance
      FROM companies c
      LEFT JOIN company_billing cb ON c.id = cb.company_id
      LIMIT 10`
    )
    console.log("🔗 Companies with Billing:", companiesWithBilling)

    return NextResponse.json({
      ok: true,
      debug: {
        companies: companies.length,
        billing: billing.length,
        companiesWithBilling: companiesWithBilling,
      },
    })
  } catch (error) {
    console.error("❌ Debug failed:", error)
    return NextResponse.json({
      ok: false,
      error: String(error),
    })
  }
}
