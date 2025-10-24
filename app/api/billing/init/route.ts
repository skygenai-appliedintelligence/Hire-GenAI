import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/init
 * Initialize billing system for a company (creates billing record if not exists)
 * Also inserts sample usage data for testing
 * Body:
 *   - companyId: Company UUID (required)
 *   - insertSampleData: boolean (optional, default false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, insertSampleData = false } = body

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Check if billing already exists
    let billing = await DatabaseService.getCompanyBilling(companyId)

    if (!billing) {
      // Initialize billing for company
      const initQuery = `
        INSERT INTO company_billing (
          company_id, billing_status, wallet_balance, 
          auto_recharge_enabled, current_month_start
        )
        VALUES ($1::uuid, 'trial', 0.00, true, NOW())
        RETURNING *
      `
      const result = await DatabaseService.query(initQuery, [companyId]) as any[]
      billing = result[0]
    }

    // Insert sample data if requested
    if (insertSampleData) {
      // Get a job from this company
      const jobQuery = `
        SELECT id FROM jobs 
        WHERE company_id = $1::uuid 
        LIMIT 1
      `
      const jobs = await DatabaseService.query(jobQuery, [companyId]) as any[]
      
      if (jobs.length > 0) {
        const jobId = jobs[0].id

        // Insert sample CV parsing usage
        await DatabaseService.recordCVParsingUsage({
          companyId,
          jobId,
          fileSizeKb: 150,
          parseSuccessful: true,
          successRate: 95.5
        })

        await DatabaseService.recordCVParsingUsage({
          companyId,
          jobId,
          fileSizeKb: 200,
          parseSuccessful: true,
          successRate: 98.2
        })

        // Insert sample question generation usage
        await DatabaseService.recordQuestionGenerationUsage({
          companyId,
          jobId,
          promptTokens: 500,
          completionTokens: 1500,
          questionCount: 10,
          modelUsed: 'gpt-4'
        })

        await DatabaseService.recordQuestionGenerationUsage({
          companyId,
          jobId,
          promptTokens: 600,
          completionTokens: 1800,
          questionCount: 12,
          modelUsed: 'gpt-4'
        })

        // Insert sample video interview usage
        await DatabaseService.recordVideoInterviewUsage({
          companyId,
          jobId,
          durationMinutes: 15.5,
          completedQuestions: 8,
          totalQuestions: 10,
          videoQuality: 'HD'
        })

        await DatabaseService.recordVideoInterviewUsage({
          companyId,
          jobId,
          durationMinutes: 22.3,
          completedQuestions: 10,
          totalQuestions: 10,
          videoQuality: 'HD'
        })
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Billing initialized successfully',
      billing: {
        status: billing.billing_status,
        walletBalance: parseFloat(billing.wallet_balance),
        autoRechargeEnabled: billing.auto_recharge_enabled
      },
      sampleDataInserted: insertSampleData
    })
  } catch (error: any) {
    console.error('Error initializing billing:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to initialize billing' },
      { status: 500 }
    )
  }
}
