import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, ctx: { params: { id?: string; jobId?: string } | Promise<{ id?: string; jobId?: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const p = await (ctx as any).params
    const id = (p as any)?.jobId || (p as any)?.id

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

export async function GET(req: Request, ctx: { params: { id?: string; jobId?: string } | Promise<{ id?: string; jobId?: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const p = await (ctx as any).params
    const id = (p as any)?.jobId || (p as any)?.id

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
        description: row.description_md,
        location_text: row.location_text,
        status: (row as any).status ?? 'open',
        employment_type: row.employment_type,
        level: row.level,
        education: row.education,
        years_experience_min: row.years_experience_min,
        years_experience_max: row.years_experience_max,
        technical_skills: row.technical_skills,
        domain_knowledge: row.domain_knowledge,
        soft_skills: row.soft_skills,
        languages: row.languages,
        must_have_skills: row.must_have_skills,
        nice_to_have_skills: row.nice_to_have_skills,
        duties_day_to_day: row.duties_day_to_day,
        duties_strategic: row.duties_strategic,
        stakeholders: row.stakeholders,
        decision_scope: row.decision_scope,
        salary_min: row.salary_min,
        salary_max: row.salary_max,
        salary_period: row.salary_period,
        bonus_incentives: row.bonus_incentives,
        perks_benefits: row.perks_benefits,
        time_off_policy: row.time_off_policy,
        joining_timeline: row.joining_timeline,
        travel_requirements: row.travel_requirements,
        visa_requirements: row.visa_requirements,
        auto_schedule_interview: row.auto_schedule_interview ?? false,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: (row as any).updated_at ?? null,
      }
      return NextResponse.json({ ok: true, job })
    }

    // Supabase fallback
    const sb = createServerClient()
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    const { data, error } = await sb
      .from('jobs')
      .select('id, company_id, title, location, status, employment_type, experience_level, description_md, responsibilities_md, benefits_md, salary_level, created_by, created_at, updated_at')
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

export async function PATCH(req: Request, ctx: { params: { id?: string; jobId?: string } | Promise<{ id?: string; jobId?: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const p = await (ctx as any).params
    const id = (p as any)?.jobId || (p as any)?.id
    if (!id) return NextResponse.json({ ok: false, error: 'Missing job id' }, { status: 400 })
    if (!companyName) return NextResponse.json({ ok: false, error: 'Missing company' }, { status: 400 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
    }

    // Helper to parse comma-separated strings into arrays
    const parseArray = (str: string): string[] => {
      if (!str || typeof str !== 'string') return []
      return str.split(',').map(s => s.trim()).filter(Boolean)
    }

    const updates: any = {}
    if ('title' in body) updates.title = (body.title ?? null)
    if ('description' in body) updates.description_md = (body.description ?? null)
    if ('location_text' in body) updates.location_text = (body.location_text ?? null)
    if ('employment_type' in body) updates.employment_type = (body.employment_type ?? null)
    if ('status' in body) updates.status = (body.status ?? null)
    if ('level' in body) updates.level = (body.level ?? null)
    if ('education' in body) updates.education = (body.education ?? null)
    if ('years_experience_min' in body) updates.years_experience_min = body.years_experience_min ? parseInt(body.years_experience_min) : null
    if ('years_experience_max' in body) updates.years_experience_max = body.years_experience_max ? parseInt(body.years_experience_max) : null
    if ('technical_skills' in body) updates.technical_skills = parseArray(body.technical_skills)
    if ('domain_knowledge' in body) updates.domain_knowledge = parseArray(body.domain_knowledge)
    if ('soft_skills' in body) updates.soft_skills = parseArray(body.soft_skills)
    if ('languages' in body) updates.languages = parseArray(body.languages)
    if ('must_have_skills' in body) updates.must_have_skills = parseArray(body.must_have_skills)
    if ('nice_to_have_skills' in body) updates.nice_to_have_skills = parseArray(body.nice_to_have_skills)
    if ('duties_day_to_day' in body) updates.duties_day_to_day = parseArray(body.duties_day_to_day)
    if ('duties_strategic' in body) updates.duties_strategic = parseArray(body.duties_strategic)
    if ('stakeholders' in body) updates.stakeholders = parseArray(body.stakeholders)
    if ('decision_scope' in body) updates.decision_scope = (body.decision_scope ?? null)
    if ('salary_min' in body) updates.salary_min = body.salary_min ? parseFloat(body.salary_min) : null
    if ('salary_max' in body) updates.salary_max = body.salary_max ? parseFloat(body.salary_max) : null
    if ('salary_period' in body) updates.salary_period = (body.salary_period ?? null)
    if ('bonus_incentives' in body) updates.bonus_incentives = (body.bonus_incentives ?? null)
    if ('perks_benefits' in body) updates.perks_benefits = parseArray(body.perks_benefits)
    if ('time_off_policy' in body) updates.time_off_policy = (body.time_off_policy ?? null)
    if ('joining_timeline' in body) updates.joining_timeline = (body.joining_timeline ?? null)
    if ('travel_requirements' in body) updates.travel_requirements = (body.travel_requirements ?? null)
    if ('visa_requirements' in body) updates.visa_requirements = (body.visa_requirements ?? null)
    if ('auto_schedule_interview' in body) updates.auto_schedule_interview = body.auto_schedule_interview === true

    console.log('🔧 [JOB PATCH] Updates to apply:', updates)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'No updatable fields provided' }, { status: 400 })
    }

    if (DatabaseService.isDatabaseConfigured()) {
      const companyId = await DatabaseService.getCompanyIdByName(companyName)
      if (!companyId) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
      const updated = await DatabaseService.updateJobForCompany(id, companyId, updates)
      console.log('✅ [JOB PATCH] Updated job result:', { id: updated?.id, auto_schedule_interview: updated?.auto_schedule_interview })
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
      .select('id, company_id, title, location, status, employment_type, experience_level, description_md, responsibilities_md, benefits_md, salary_level, created_by, created_at, updated_at')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ ok: true, job: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
