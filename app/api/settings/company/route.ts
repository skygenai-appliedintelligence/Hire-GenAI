import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request) {
  try {
    const { companyId, name, website, industry, size, description, actorEmail } = await req.json()

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
      description_md: description?.trim() || null
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
