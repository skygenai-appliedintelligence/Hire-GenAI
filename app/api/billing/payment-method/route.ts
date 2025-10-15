import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/payment-method
 * Update payment method for a company
 * Body:
 *   - companyId: Company UUID (required)
 *   - provider: 'stripe' | 'paypal' (required)
 *   - paymentMethodId: string (required)
 *   - last4: string (optional)
 *   - brand: string (optional)
 *   - exp: string (optional, MM/YY format)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, provider, paymentMethodId, last4, brand, exp } = body

    if (!companyId || !provider || !paymentMethodId) {
      return NextResponse.json(
        { ok: false, error: 'companyId, provider, and paymentMethodId are required' },
        { status: 400 }
      )
    }

    if (!['stripe', 'paypal'].includes(provider)) {
      return NextResponse.json(
        { ok: false, error: 'provider must be either "stripe" or "paypal"' },
        { status: 400 }
      )
    }

    const updated = await DatabaseService.updatePaymentMethod(companyId, {
      provider,
      paymentMethodId,
      last4,
      brand,
      exp
    })

    // If company was in trial, end trial and do initial charge
    const billing = await DatabaseService.getCompanyBilling(companyId)
    if (billing && billing.billing_status === 'trial') {
      // End trial
      await DatabaseService.endTrial(companyId)
      
      // Do initial $100 charge
      try {
        await DatabaseService.autoRecharge(companyId)
      } catch (chargeError: any) {
        console.error('Initial charge failed:', chargeError)
        return NextResponse.json(
          { ok: false, error: `Payment method added but initial charge failed: ${chargeError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      paymentMethod: {
        provider: updated.payment_provider,
        last4: updated.payment_method_last4,
        brand: updated.payment_method_brand,
        exp: updated.payment_method_exp
      }
    })
  } catch (error: any) {
    console.error('Error updating payment method:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to update payment method' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/billing/payment-method
 * Remove payment method for a company
 * Query params:
 *   - companyId: Company UUID (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Remove payment method by setting fields to null
    const query = `
      UPDATE company_billing
      SET 
        payment_provider = NULL,
        payment_method_id = NULL,
        payment_method_last4 = NULL,
        payment_method_brand = NULL,
        payment_method_exp = NULL,
        updated_at = NOW()
      WHERE company_id = $1::uuid
      RETURNING *
    `
    
    await DatabaseService.query(query, [companyId])

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error removing payment method:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to remove payment method' },
      { status: 500 }
    )
  }
}
