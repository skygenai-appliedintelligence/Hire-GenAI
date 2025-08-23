import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, { params }: { params: { id?: string; jobId?: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const id = (params as any).jobId || (params as any).id

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing job id' }, { status: 400 })
    }
    if (!companyName) {
      // Tenant isolation: require company to avoid deleting other tenants' jobs
      return NextResponse.json({ ok: false, error: 'Missing company' }, { status: 400 })
    }

    if (DatabaseService.isDatabaseConfigured()) {
      const companyId = await DatabaseService.getCompanyIdByName(companyName)
      if (!companyId) {
        return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
      }
      const deletedId = await DatabaseService.deleteJobForCompany(id, companyId)
      if (!deletedId) {
        return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, deletedId })
    }

    // Supabase fallback
    const sb = createServerClient()
    // Resolve company id
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) {
      return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    }

    // Delete job scoped to company
    const { data, error } = await sb
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id)
      .select('id')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })

    return NextResponse.json({ ok: true, deletedId: data.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: { id?: string; jobId?: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const id = (params as any).jobId || (params as any).id

    if (!id) return NextResponse.json({ ok: false, error: 'Missing job id' }, { status: 400 })
    if (!companyName) return NextResponse.json({ ok: false, error: 'Missing company' }, { status: 400 })

    if (DatabaseService.isDatabaseConfigured()) {
      const companyId = await DatabaseService.getCompanyIdByName(companyName)
      if (!companyId) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
      const row = await DatabaseService.getJobByIdForCompany(id, companyId)
      if (!row) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })
      const job = {
        id: row.id,
        company_id: row.company_id,
        title: row.title,
        location: row.location,
        employment_type: row.employment_type,
        experience_level: row.experience_level,
        description_md: row.description_md,
        responsibilities_md: row.responsibilities_md,
        benefits_md: row.benefits_md,
        salary_level: row.salary_level,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
      return NextResponse.json({ ok: true, job })
    }

    // Supabase fallback
    const sb = createServerClient()
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    const { data, error } = await sb
      .from('jobs')
      .select('id, company_id, title, location, employment_type, experience_level, description_md, responsibilities_md, benefits_md, salary_level, created_by, created_at, updated_at')
      .eq('id', id)
      .eq('company_id', company.id)
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ ok: true, job: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id?: string; jobId?: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const id = (params as any).jobId || (params as any).id
    if (!id) return NextResponse.json({ ok: false, error: 'Missing job id' }, { status: 400 })
    if (!companyName) return NextResponse.json({ ok: false, error: 'Missing company' }, { status: 400 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
    }

    const updates: any = {}
    if ('title' in body) updates.title = (body.title ?? null)
    if ('location' in body) updates.location = (body.location ?? null)
    if ('employment_type' in body) updates.employment_type = (body.employment_type ?? null)
    if ('experience_level' in body) updates.experience_level = (body.experience_level ?? null)
    if ('description_md' in body) updates.description_md = (body.description_md ?? null)
    if ('responsibilities_md' in body) updates.responsibilities_md = (body.responsibilities_md ?? null)
    if ('benefits_md' in body) updates.benefits_md = (body.benefits_md ?? null)
    if ('salary_level' in body) updates.salary_level = (body.salary_level ?? null)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'No updatable fields provided' }, { status: 400 })
    }

    if (DatabaseService.isDatabaseConfigured()) {
      const companyId = await DatabaseService.getCompanyIdByName(companyName)
      if (!companyId) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
      const updated = await DatabaseService.updateJobForCompany(id, companyId, updates)
      if (!updated) return NextResponse.json({ ok: false, error: 'Job not found or no changes' }, { status: 404 })
      return NextResponse.json({ ok: true, job: updated })
    }

    // Supabase fallback
    const sb = createServerClient()
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    const { data, error } = await sb
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('company_id', company.id)
      .select('id, company_id, title, location, employment_type, experience_level, description_md, responsibilities_md, benefits_md, salary_level, created_by, created_at, updated_at')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ ok: true, job: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
