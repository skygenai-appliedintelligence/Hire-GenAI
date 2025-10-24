import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/status
 * Get billing status and wallet information for a company
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

    // Get billing info
    const billing = await DatabaseService.getCompanyBilling(companyId)

    if (!billing) {
      return NextResponse.json(
        { ok: false, error: 'Billing not initialized for this company' },
        { status: 404 }
      )
    }

    // Get pricing info
    const pricing = await DatabaseService.getCurrentPricing()

    // Calculate trial usage if in trial
    let trialInfo = null
    if (billing.billing_status === 'trial') {
      trialInfo = {
        trialJdId: billing.trial_jd_id,
        trialInterviewCount: billing.trial_interview_count,
        trialActive: true,
        canCreateJD: !billing.trial_jd_id,
        canRunInterview: billing.trial_interview_count < 1
      }
    }

    return NextResponse.json({
      ok: true,
      billing: {
        status: billing.billing_status,
        walletBalance: parseFloat(billing.wallet_balance),
        autoRechargeEnabled: billing.auto_recharge_enabled,
        monthlySpendCap: billing.monthly_spend_cap ? parseFloat(billing.monthly_spend_cap) : null,
        currentMonthSpent: parseFloat(billing.current_month_spent),
        totalSpent: parseFloat(billing.total_spent),
        paymentMethod: billing.payment_method_id ? {
          provider: billing.payment_provider,
          last4: billing.payment_method_last4,
          brand: billing.payment_method_brand,
          exp: billing.payment_method_exp
        } : null,
        trialInfo
      },
      pricing
    })
  } catch (error: any) {
    console.error('Error fetching billing status:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch billing status' },
      { status: 500 }
    )
  }
}
