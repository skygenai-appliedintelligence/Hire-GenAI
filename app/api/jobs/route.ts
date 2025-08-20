import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreateJobBody = {
  jobTitle: string
  company: string
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
    if (!body.company) missing.push('company')
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

    const insertResult = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO public.job_descriptions (
        title,
        company_name,
        location,
        employment_type,
        experience_level,
        summary,
        requirements,
        responsibilities,
        benefits,
        salary_label,
        interview_rounds,
        interview_duration,
        platforms,
        created_by
      ) VALUES (
        ${body.jobTitle},
        ${body.company},
        ${raw.location?.trim() || ''},
        CAST(${employment} AS job_type),
        CAST(${expLevel} AS experience_level),
        ${body.description},
        ${body.requirements},
        ${body.responsibilities || null},
        ${body.benefits || null},
        ${body.salaryRange || null},
        ${Array.isArray(body.interviewRounds) ? body.interviewRounds : []},
        ${body.interviewDuration || null},
        ${Array.isArray(body.platforms) ? body.platforms : []},
        ${body.createdBy || null}
      )
      RETURNING id;
    `)

    const newId = insertResult?.[0]?.id
    return NextResponse.json({ ok: true, jobId: newId })
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

    // Read only the requesting company's jobs
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id,
             title,
             company_name,
             location,
             employment_type::text AS employment_type,
             experience_level::text AS experience_level,
             summary,
             requirements,
             responsibilities,
             benefits,
             salary_label,
             interview_rounds,
             interview_duration,
             platforms,
             created_by,
             created_at,
             updated_at
        FROM public.job_descriptions
       WHERE company_name = ${companyName}
       ORDER BY created_at DESC
       LIMIT 200
    `)

    return NextResponse.json({ ok: true, jobs: rows })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


