import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/company
 * Get company information by ID
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

    const company = await DatabaseService.getCompany(companyId)

    if (!company) {
      return NextResponse.json(
        { ok: false, error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        street: company.street,
        city: company.city,
        state: company.state,
        zipCode: company.zip_code,
        country: company.country,
      }
    })
  } catch (error: any) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch company' },
      { status: 500 }
    )
  }
}
