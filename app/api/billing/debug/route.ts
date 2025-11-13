import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/debug
 * Debug endpoint to check billing calculations
 * Query params:
 *   - companyId: Company UUID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 [Billing Debug] Checking billing for company: ${companyId}`)

    // Get billing info
    const billing = await DatabaseService.getCompanyBilling(companyId)

    if (!billing) {
      return NextResponse.json(
        { ok: false, error: 'Billing not initialized for this company' },
        { status: 404 }
      )
    }

    // Get raw usage data from each table
    const cvParsingQuery = `
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total_cost
      FROM cv_parsing_usage
      WHERE company_id = $1::uuid
    `
    const cvParsingResult = await (DatabaseService as any)["query"].call(
      DatabaseService,
      cvParsingQuery,
      [companyId]
    ) as any[]

    const questionGenQuery = `
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total_cost
      FROM question_generation_usage
      WHERE company_id = $1::uuid
    `
    const questionGenResult = await (DatabaseService as any)["query"].call(
      DatabaseService,
      questionGenQuery,
      [companyId]
    ) as any[]

    const videoInterviewQuery = `
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total_cost
      FROM video_interview_usage
      WHERE company_id = $1::uuid
    `
    const videoInterviewResult = await (DatabaseService as any)["query"].call(
      DatabaseService,
      videoInterviewQuery,
      [companyId]
    ) as any[]

    // Get current month usage
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)

    const currentMonthQuery = `
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total_cost
      FROM (
        SELECT cost FROM cv_parsing_usage
        WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
        UNION ALL
        SELECT cost FROM question_generation_usage
        WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
        UNION ALL
        SELECT cost FROM video_interview_usage
        WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
      ) as all_usage
    `
    const currentMonthResult = await (DatabaseService as any)["query"].call(
      DatabaseService,
      currentMonthQuery,
      [companyId, currentMonthStart.toISOString()]
    ) as any[]

    return NextResponse.json({
      ok: true,
      debug: {
        companyId,
        billingStatus: billing.billing_status,
        walletBalance: parseFloat(billing.wallet_balance),
        currentMonthSpent: billing.current_month_spent,
        totalSpent: billing.total_spent,
        monthlySpendCap: billing.monthly_spend_cap ? parseFloat(billing.monthly_spend_cap) : null,
        autoRechargeEnabled: billing.auto_recharge_enabled,
        usageBreakdown: {
          cvParsing: {
            count: parseInt(cvParsingResult[0]?.count || '0'),
            totalCost: parseFloat(cvParsingResult[0]?.total_cost || '0')
          },
          questionGeneration: {
            count: parseInt(questionGenResult[0]?.count || '0'),
            totalCost: parseFloat(questionGenResult[0]?.total_cost || '0')
          },
          videoInterview: {
            count: parseInt(videoInterviewResult[0]?.count || '0'),
            totalCost: parseFloat(videoInterviewResult[0]?.total_cost || '0')
          }
        },
        currentMonthUsage: {
          count: parseInt(currentMonthResult[0]?.count || '0'),
          totalCost: parseFloat(currentMonthResult[0]?.total_cost || '0')
        },
        currentMonthStart: currentMonthStart.toISOString()
      }
    })
  } catch (error: any) {
    console.error('Error in billing debug:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to debug billing' },
      { status: 500 }
    )
  }
}
