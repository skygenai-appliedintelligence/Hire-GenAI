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
        timePeriod: invoice.time_period,
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

/**
 * POST /api/billing/invoices
 * Generate an invoice for a company for a given time period based on recorded usage.
 * Body JSON:
 *   - companyId: string (required)
 *   - startDate: string ISO (optional, defaults to 30 days ago)
 *   - endDate: string ISO (optional, defaults to now)
 *   - taxRate: number (optional, e.g., 18 for 18%)
 *   - description: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const companyId: string | undefined = body.companyId
    const startDateIso: string | undefined = body.startDate
    const endDateIso: string | undefined = body.endDate
    const taxRate: number | undefined = typeof body.taxRate === 'number' ? body.taxRate : undefined
    const description: string | undefined = body.description

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'companyId is required' },
        { status: 400 }
      )
    }

    const endDate = endDateIso ? new Date(endDateIso) : new Date()
    const startDate = startDateIso ? new Date(startDateIso) : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)

    // Aggregate totals from recorded usage (costs already include profit margin)
    const totals = await DatabaseService.getCompanyUsage(companyId, { startDate, endDate })

    const lineItems = [
      { key: 'cvParsing', label: 'CV Parsing', amount: Number((totals.cvParsing || 0).toFixed(2)) },
      { key: 'jdQuestions', label: 'Question Generation', amount: Number((totals.jdQuestions || 0).toFixed(2)) },
      { key: 'videoInterview', label: 'Video Interviews', amount: Number((totals.video || 0).toFixed(2)) },
    ]

    const subtotal = Number((lineItems.reduce((s, li) => s + li.amount, 0)).toFixed(2))
    const computedTaxAmount = taxRate ? Number(((subtotal * taxRate) / 100).toFixed(2)) : 0
    const total = Number((subtotal + computedTaxAmount).toFixed(2))

    const invoice = await DatabaseService.createInvoice({
      companyId,
      subtotal,
      taxRate,
      taxAmount: computedTaxAmount,
      total,
      description: description || `Usage charges (${startDate.toISOString().slice(0,10)} to ${endDate.toISOString().slice(0,10)})`,
      lineItems,
      timePeriod: { start: startDate, end: endDate },
    })

    return NextResponse.json({
      ok: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        subtotal: parseFloat(invoice.subtotal),
        taxRate: invoice.tax_rate ? parseFloat(invoice.tax_rate) : null,
        taxAmount: invoice.tax_amount ? parseFloat(invoice.tax_amount) : 0,
        total: parseFloat(invoice.total),
        description: invoice.description,
        lineItems: invoice.line_items,
        timePeriod: invoice.time_period,
        createdAt: invoice.created_at,
      }
    })
  } catch (error: any) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
