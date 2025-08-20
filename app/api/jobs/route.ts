import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CreateJobBody = {
  jobTitle: string
  company: string
  location?: string
  jobType?: string
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
    const body = (await req.json()) as CreateJobBody
    if (!body || !body.jobTitle || !body.company || !body.description || !body.requirements) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure company exists (create if missing)
    const companyName = body.company.trim()
    const companySlug = slugify(companyName) || `company-${Date.now()}`
    const placeholderEmail = `${companySlug}+${Date.now()}@example.com`

    let company = await prisma.companies.findFirst({ where: { name: companyName } })
    if (!company) {
      company = await prisma.companies.create({
        data: {
          name: companyName,
          slug: companySlug,
          email: placeholderEmail,
          logo_url: null,
          subscription_plan: 'basic',
        },
      })
    }

    // Defaults for required JSON columns in DB
    const screeningQuestions = {}
    const hiringTeam = {}
    const targetDates = {}

    const jobSlugBase = slugify(body.jobTitle)
    const jobSlug = jobSlugBase ? `${jobSlugBase}-${Date.now().toString(36).slice(-5)}` : `job-${Date.now()}`

    const job = await prisma.job_descriptions.create({
      data: {
        company_id: company.id,
        title: body.jobTitle,
        slug: jobSlug,
        description: body.description,
        requirements: body.requirements || null,
        responsibilities: body.responsibilities || null,
        benefits: body.benefits || null,
        location: body.location || null,
        salary_range: body.salaryRange || null,
        employment_type: body.jobType || null,
        status: 'open',
        visibility: 'public',
        department: body.department || null,
        is_remote: body.isRemote ?? false,
        visa_sponsorship: body.visaSponsorship ?? false,
        must_have_skills: Array.isArray(body.mustHaveSkills) ? body.mustHaveSkills : undefined,
        nice_to_have_skills: Array.isArray(body.niceToHaveSkills) ? body.niceToHaveSkills : undefined,
        screening_questions: screeningQuestions as any,
        hiring_team: hiringTeam as any,
        target_dates: targetDates as any,
        created_by: null,
      },
    })

    return NextResponse.json({ ok: true, jobId: job.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()

    let companyId: string | null = null
    if (companyName) {
      const company = await prisma.companies.findFirst({ where: { name: companyName } })
      companyId = company?.id ?? null
    }

    const jobs = await prisma.job_descriptions.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ ok: true, jobs })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


