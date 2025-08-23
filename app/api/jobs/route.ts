import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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

function normalizeJobType(value?: string | null): 'full_time' | 'part_time' | 'contract' | 'freelance' | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[-\s]+/g, '_')
  if (['full_time', 'fulltime'].includes(v)) return 'full_time'
  if (['part_time', 'parttime'].includes(v)) return 'part_time'
  if (['contract', 'contractor'].includes(v)) return 'contract'
  if (['freelance', 'freelancer'].includes(v)) return 'freelance'
  return null
}

function normalizeExperience(value?: string | null): 'entry' | 'mid' | 'senior' | 'lead' | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[-\s]+/g, '_')
  if (['entry', 'junior', 'new_grad', 'newgrad', 'entry_level'].includes(v)) return 'entry'
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

    const sb = createServerClient()

    // Use companyId directly from the request
    if (!body.companyId) {
      return NextResponse.json({ ok: false, error: 'Company ID is missing' }, { status: 400 });
    }

    // Insert into jds (job_descriptions)
    const { data: job, error: jobErr } = await sb
      .from('jds')
      .insert({
        slug: slugify(body.jobTitle), // Generate slug from title
        company_id: body.companyId,
        title: body.jobTitle,
        location: raw.location?.trim() || null,
        description: body.description,
        status: 'open',
        visibility: 'public',
        employment_type: employment || 'full_time',
        responsibilities: body.responsibilities || null,
        benefits: body.benefits || null,
        salary_range: body.salaryRange || null,
        created_by: body.createdBy ?? null,
      })
      .select('id')
      .single()
    if (jobErr || !job) return NextResponse.json({ ok: false, error: jobErr?.message || 'Failed to create job' }, { status: 500 })

    // Optional: insert job_rounds based on interviewRounds + interviewDuration
    const rounds = Array.isArray(body.interviewRounds) ? body.interviewRounds : []
    const duration = (() => {
      const d = String(body.interviewDuration || '').trim()
      if (['15', '30', '60'].includes(d)) return Number(d)
      return 30
    })()
    if (rounds.length) {
      const rows = rounds.map((name, idx) => ({ job_id: job.id, seq: idx + 1, name, duration_minutes: duration }))
      await sb.from('job_rounds').insert(rows)
    }

    return NextResponse.json({ ok: true, jobId: job.id })
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

    const sb = createServerClient()
    // Resolve company id
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) return NextResponse.json({ ok: true, jobs: [] })

    // Read only the requesting company's jobs
    const { data, error } = await sb
      .from('jobs')
      .select('id, title, location, employment_type, experience_level, description_md, responsibilities_md, benefits_md, salary_level, created_by, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    // Return in a shape similar to previous response
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


