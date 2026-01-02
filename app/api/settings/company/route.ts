import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { prisma } from '@/lib/prisma'

// Fixed database service import

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // Fetch company data from database
    const company = await DatabaseService.getCompany(companyId)

    // Debug logging
    console.log('🔍 Company data from database:', {
      id: company.id,
      name: company.name,
      size_band: company.size_band,
      industry: company.industry,
      street: company.street,
      street_address: company.street_address,
      city: company.city,
      state: company.state,
      state_province: company.state_province,
      postal_code: company.postal_code,
      country: company.country,
      primary_country: company.primary_country,
      phone_number: company.phone_number,
      phone: company.phone,
      legal_company_name: company.legal_company_name,
      tax_id_ein: company.tax_id_ein,
      business_registration_number: company.business_registration_number
    })
    
    console.log('🔍 Address fields specifically:', {
      street: company.street,
      city: company.city, 
      state: company.state,
      postalCode: company.postal_code,
      country: company.country
    })

    return NextResponse.json({ 
      ok: true, 
      company: {
        id: company.id,
        name: company.name,
        website: company.website_url,
        industry: company.industry,
        size: company.size_band,
        description: company.description_md,
        // Contact Information - Fixed field mapping
        street: company.street_address || company.street,
        city: company.city,
        state: company.state_province || company.state,
        postalCode: company.postal_code,
        country: company.country || company.primary_country,
        phone: company.phone_number || company.phone,
        // Legal Information
        legalCompanyName: company.legal_company_name,
        taxId: company.tax_id_ein,
        registrationNumber: company.business_registration_number,
        verified: company.verified,
        status: company.status
      }
    })
  } catch (err: any) {
    console.error('Error fetching company:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || 'Failed to fetch company' 
    }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { 
      companyId, 
      name, 
      website, 
      industry, 
      size, 
      description,
      street,
      city,
      state,
      postalCode,
      country,
      phone,
      legalCompanyName,
      taxId,
      registrationNumber,
      actorEmail 
    } = await req.json()

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    // If DB configured, verify the actor is an admin for this company
    if (DatabaseService.isDatabaseConfigured()) {
      if (!actorEmail) {
        return NextResponse.json({ ok: false, error: 'actorEmail is required' }, { status: 400 })
      }

      const adminCheckQuery = `
        SELECT 1
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.company_id = $1::uuid AND u.email = $2 AND ur.role = 'admin'::app_role
        LIMIT 1
      `
      const rows = await prisma.$queryRawUnsafe(adminCheckQuery, companyId, actorEmail) as any[]
      if (rows.length === 0) {
        return NextResponse.json({ ok: false, error: 'Forbidden: admin role required' }, { status: 403 })
      }
    }

    // Update company information in database
    const company = await DatabaseService.updateCompany(companyId, {
      name: name?.trim() || undefined,
      website_url: website?.trim() || null,
      industry: industry?.trim() || null,
      size_band: size?.trim() || null,
      description_md: description?.trim() || null,
      phone: phone?.trim() || null,
      legal_name: legalCompanyName?.trim() || null,
      tax_id: taxId?.trim() || null,
      registration_number: registrationNumber?.trim() || null
    }, {
      street: street?.trim() || undefined,
      city: city?.trim() || undefined,
      state: state?.trim() || undefined,
      postal_code: postalCode?.trim() || undefined,
      country: country?.trim() || undefined
    })

    return NextResponse.json({ 
      ok: true, 
      company: {
        id: company.id,
        name: company.name,
        website: company.website_url,
        industry: company.industry,
        size: company.size_band,
        description: company.description_md,
        verified: company.verified,
        status: company.status
      }
    })
  } catch (err: any) {
    console.error('Error updating company:', err)
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || 'Failed to update company' 
    }, { status: 500 })
  }
}
