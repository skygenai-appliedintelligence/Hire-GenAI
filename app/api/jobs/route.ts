import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  interviewRounds?: string[]
  interviewDuration?: string
  platforms?: string[]
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

    const postedPlatforms = Array.isArray(body.platforms) ? body.platforms : []
    const interviewRoundsCount = Array.isArray(body.interviewRounds) ? body.interviewRounds.length : undefined

    const jobSlugBase = slugify(body.jobTitle)
    const jobSlug = jobSlugBase ? `${jobSlugBase}-${Date.now().toString(36).slice(-5)}` : `job-${Date.now()}`

    const job = await prisma.job_descriptions.create({
      data: {
        company_id: company.id,
        title: body.jobTitle,
        slug: jobSlug,
        description: body.description,
        requirements: body.requirements || null,
        location: body.location || null,
        salary_range: body.salaryRange || null,
        employment_type: body.jobType || null,
        status: 'open',
        posted_platforms: JSON.stringify(postedPlatforms),
        platform_job_ids: '{}',
        posting_results: '[]',
        interview_rounds: interviewRoundsCount ?? 3,
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


