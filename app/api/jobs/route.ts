import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreateJobBody = {
  jobTitle: string
  company: string
  companyId?: string
  location?: string
  jobType?: string
  experienceLevel?: string
  description: string
  requirements: string
  responsibilities?: string
  benefits?: string
  salaryRange?: string
  department?: string
  isRemote?: boolean
  visaSponsorship?: boolean
  mustHaveSkills?: string[]
  niceToHaveSkills?: string[]
  // From form
  interviewRounds?: string[]
  interviewDuration?: string
  platforms?: string[]
  createdBy?: string | null
}

function normalizeJobType(value?: string | null): 'full_time' | 'part_time' | 'contract' | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[-\s]+/g, '_')
  if (['full_time', 'fulltime'].includes(v)) return 'full_time'
  if (['part_time', 'parttime'].includes(v)) return 'part_time'
  if (['contract', 'contractor'].includes(v)) return 'contract'
  // Map freelance to contract since the DB enum doesn't include 'freelance'
  if (['freelance', 'freelancer'].includes(v)) return 'contract'
  return null
}

function normalizeExperience(value?: string | null): 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[-\s]+/g, '_')
  // Map UI "entry" to valid enum 'junior'
  if (['entry', 'junior', 'new_grad', 'newgrad', 'entry_level'].includes(v)) return 'junior'
  if (['mid', 'mid_level', 'intermediate'].includes(v)) return 'mid'
  if (['senior', 'sr', 'senior_level'].includes(v)) return 'senior'
  if (['lead', 'staff', 'principal'].includes(v)) return 'lead'
  return null
}

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40)
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as CreateJobBody | null
    if (!raw) return NextResponse.json({ error: 'Missing request body' }, { status: 400 })

    // Trim key fields to avoid whitespace-only inputs passing checks
    const body: CreateJobBody = {
      ...raw,
      jobTitle: (raw.jobTitle || '').trim(),
      company: (raw.company || '').trim(),
      description: (raw.description || '').trim(),
      requirements: (raw.requirements || '').trim(),
      experienceLevel: (raw.experienceLevel || '').trim(),
    }

    const missing: string[] = []
    if (!body.jobTitle) missing.push('jobTitle')
    if (!body.companyId) missing.push('companyId')
    if (!raw.location || !raw.location.trim()) missing.push('location')
    if (!raw.jobType || !raw.jobType.trim()) missing.push('jobType')
    if (!body.experienceLevel) missing.push('experienceLevel')
    if (!body.description) missing.push('description')
    if (!body.requirements) missing.push('requirements')
    if (missing.length) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    // Map form values to match enum types
    const employment = normalizeJobType(raw.jobType)
    const expLevel = normalizeExperience(body.experienceLevel)

    // Use companyId directly from the request
    if (!body.companyId) {
      return NextResponse.json({ ok: false, error: 'Company ID is missing' }, { status: 400 })
    }

    // Prefer Neon/Postgres via DatabaseService if configured
    if (DatabaseService.isDatabaseConfigured()) {
      // Validate company exists to avoid FK violation on jobs.company_id
      try {
        const exists = await DatabaseService.companyExists(body.companyId)
        if (!exists) {
          return NextResponse.json({ ok: false, error: `Company not found for companyId=${body.companyId}` }, { status: 400 })
        }
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || 'Company validation failed' }, { status: 500 })
      }
      // Validate createdBy against users table to avoid FK violation
      let createdBySafe: string | null = body.createdBy ?? null
      try {
        if (createdBySafe) {
          // lightweight existence check
          // We cannot access DatabaseService.query directly, so we rely on a helper method (userExists)
          // If not available, the catch/retry below will still handle FK violations.
          // @ts-ignore - optional helper may not exist in older versions
          if (typeof (DatabaseService as any).userExists === 'function') {
            const exists = await (DatabaseService as any).userExists(createdBySafe)
            if (!exists) createdBySafe = null
          }
        }
      } catch {
        // Ignore pre-check failures; fallback to try/catch insert path
      }
      let created: { id: string }
      try {
        created = await DatabaseService.createJob({
          company_id: body.companyId,
          title: body.jobTitle,
          location: raw.location?.trim() || null,
          description_md: body.description,
          employment_type: employment || 'full_time',
          experience_level: expLevel,
          responsibilities_md: body.responsibilities || null,
          benefits_md: body.benefits || null,
          salary_level: body.salaryRange || null,
          created_by: createdBySafe,
        })
      } catch (e: any) {
        const msg = String(e?.message || '')
        const isFkViolation = msg.includes('23503') && msg.includes('jobs_created_by_fkey')
        if (!isFkViolation) {
          throw e
        }
        // Retry without created_by when foreign key violates (user id not in users table)
        created = await DatabaseService.createJob({
          company_id: body.companyId,
          title: body.jobTitle,
          location: raw.location?.trim() || null,
          description_md: body.description,
          employment_type: employment || 'full_time',
          experience_level: expLevel,
          responsibilities_md: body.responsibilities || null,
          benefits_md: body.benefits || null,
          salary_level: body.salaryRange || null,
          created_by: null,
        })
      }

      const jobId = created.id

      // Optional: insert job_rounds
      const rounds = Array.isArray(body.interviewRounds) ? body.interviewRounds : []
      const duration = (() => {
        const d = String(body.interviewDuration || '').trim()
        if (['15', '30', '60'].includes(d)) return Number(d)
        return 30
      })()
      if (rounds.length) {
        const rows = rounds.map((name, idx) => ({ seq: idx + 1, name, duration_minutes: duration }))
        try {
          await DatabaseService.createJobRounds(jobId, rows)
        } catch (e) {
          // Do not fail whole request on optional rounds insert
          console.warn('job_rounds insert failed (non-fatal):', (e as any)?.message)
        }
      }

      return NextResponse.json({ ok: true, jobId })
    }

    // Fallback to Supabase (mock or real) when DB not configured
    const sb = createServerClient()
    const { data: job, error: jobErr } = await sb
      .from('jobs')
      .insert({
        company_id: body.companyId,
        title: body.jobTitle,
        location: raw.location?.trim() || null,
        description_md: body.description,
        status: 'open',
        is_public: true,
        employment_type: employment || 'full_time',
        experience_level: expLevel,
        responsibilities_md: body.responsibilities || null,
        benefits_md: body.benefits || null,
        salary_level: body.salaryRange || null,
        created_by: body.createdBy ?? null,
      })
      .select('id')
      .single()
    if (jobErr || !job) return NextResponse.json({ ok: false, error: jobErr?.message || 'Failed to create job (insert failed)' }, { status: 500 })

    // Some mock clients may not return id despite successful insert. Fallback: look up the latest job for this company + title
    let jobId = (job as any)?.id as string | undefined
    if (!jobId) {
      const { data: fetched, error: fetchErr } = await sb
        .from('jobs')
        .select('id')
        .eq('company_id', body.companyId)
        .eq('title', body.jobTitle)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!fetchErr && fetched?.id) {
        jobId = fetched.id
      } else {
        return NextResponse.json({ ok: false, error: fetchErr?.message || 'Failed to create job (no id returned)' }, { status: 500 })
      }
    }

    const rounds = Array.isArray(body.interviewRounds) ? body.interviewRounds : []
    const duration = (() => {
      const d = String(body.interviewDuration || '').trim()
      if (['15', '30', '60'].includes(d)) return Number(d)
      return 30
    })()
    if (rounds.length) {
      const rows = rounds.map((name, idx) => ({ job_id: jobId, seq: idx + 1, name, duration_minutes: duration }))
      await sb.from('job_rounds').insert(rows)
    }

    return NextResponse.json({ ok: true, jobId })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()

    // Require company for tenant isolation: no company => no data
    if (!companyName) {
      return NextResponse.json({ ok: true, jobs: [] })
    }

    // Prefer Neon/Postgres
    if (DatabaseService.isDatabaseConfigured()) {
      const companyId = await DatabaseService.getCompanyIdByName(companyName)
      if (!companyId) return NextResponse.json({ ok: true, jobs: [] })
      const data = await DatabaseService.listJobsByCompanyId(companyId, 200)
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        company_name: companyName,
        location: r.location,
        employment_type: r.employment_type,
        experience_level: r.experience_level,
        summary: r.description_md,
        responsibilities: r.responsibilities_md,
        benefits: r.benefits_md,
        salary_label: r.salary_level,
        created_by: r.created_by,
        created_at: r.created_at,
      }))
      return NextResponse.json({ ok: true, jobs: rows })
    }

    // Fallback to Supabase for preview/mock
    const sb = createServerClient()
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) return NextResponse.json({ ok: true, jobs: [] })
    const { data, error } = await sb
      .from('jobs')
      .select('id, title, location, employment_type, experience_level, description_md, responsibilities_md, benefits_md, salary_level, created_by, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    const rows = (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      company_name: companyName,
      location: r.location,
      employment_type: r.employment_type,
      experience_level: r.experience_level,
      summary: r.description_md,
      responsibilities: r.responsibilities_md,
      benefits: r.benefits_md,
      salary_label: r.salary_level,
      created_by: r.created_by,
      created_at: r.created_at,
    }))
    return NextResponse.json({ ok: true, jobs: rows })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


