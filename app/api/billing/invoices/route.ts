import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/invoices
 * Get invoices for a company
 * Query params:
 *   - companyId: Company UUID (required)
 *   - status: Filter by status (optional: pending, paid, failed, refunded)
 *   - limit: Limit results (optional, default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const invoices = await DatabaseService.getCompanyInvoices(companyId, limit)

    return NextResponse.json({
      ok: true,
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        subtotal: parseFloat(invoice.subtotal),
        taxRate: invoice.tax_rate ? parseFloat(invoice.tax_rate) : null,
        taxAmount: invoice.tax_amount ? parseFloat(invoice.tax_amount) : 0,
        total: parseFloat(invoice.total),
        paymentProvider: invoice.payment_provider,
        paymentMethodLast4: invoice.payment_method_last4,
        paidAt: invoice.paid_at,
        pdfUrl: invoice.pdf_url,
        description: invoice.description,
        lineItems: invoice.line_items,
        createdAt: invoice.created_at
      }))
    })
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
