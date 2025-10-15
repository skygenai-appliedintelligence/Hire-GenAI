import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PUT /api/billing/settings
 * Update billing settings (auto-recharge, spend cap)
 * Body:
 *   - companyId: Company UUID (required)
 *   - autoRechargeEnabled: boolean (optional)
 *   - monthlySpendCap: number | null (optional)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, autoRechargeEnabled, monthlySpendCap } = body

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const settings: any = {}
    
    if (autoRechargeEnabled !== undefined) {
      settings.autoRechargeEnabled = autoRechargeEnabled
    }
    
    if (monthlySpendCap !== undefined) {
      settings.monthlySpendCap = monthlySpendCap
    }

    const updated = await DatabaseService.updateBillingSettings(companyId, settings)

    return NextResponse.json({
      ok: true,
      billing: {
        autoRechargeEnabled: updated.auto_recharge_enabled,
        monthlySpendCap: updated.monthly_spend_cap ? parseFloat(updated.monthly_spend_cap) : null
      }
    })
  } catch (error: any) {
    console.error('Error updating billing settings:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to update billing settings' },
      { status: 500 }
    )
  }
}
