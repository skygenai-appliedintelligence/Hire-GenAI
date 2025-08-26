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
  // New form fields (raw)
  education?: string
  years?: string
  technical?: string
  domain?: string
  soft?: string
  languages?: string
  mustHave?: string
  niceToHave?: string
  day?: string
  project?: string
  collaboration?: string
  scope?: string
  salaryMin?: string
  salaryMax?: string
  period?: string
  bonus?: string
  perks?: string
  timeOff?: string
  joining?: string
  travel?: string
  visa?: string
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
    // companyId not strictly required; we'll resolve by name if needed
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

    // Derivations for new columns
    const parseList = (s?: string | null): string[] => {
      if (!s) return []
      return s
        .split(/\r?\n|,/)
        .map(t => t.trim())
        .filter(Boolean)
    }
    const parseYears = (s?: string | null): { min: number | null; max: number | null } => {
      if (!s) return { min: null, max: null }
      const nums = (s.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
      if (nums.length === 1) return { min: nums[0], max: null }
      if (nums.length >= 2) return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) }
      return { min: null, max: null }
    }
    const salaryMinNum = raw.salaryMin ? Number(raw.salaryMin) : null
    const salaryMaxNum = raw.salaryMax ? Number(raw.salaryMax) : null
    const salaryPeriod = (raw.period || '').toLowerCase().includes('year') ? 'yearly' : (raw.period ? 'monthly' : null)

    // Try to split location into city, country
    const loc = (raw.location || '').split(',')
    const location_city = loc.length >= 1 ? loc[0].trim() || null : null
    const location_country = loc.length >= 2 ? loc[loc.length - 1].trim() || null : null

    // Map arrays
    const technical_must = parseList(raw.mustHave || raw.technical)
    const technical_nice = parseList(raw.niceToHave)
    const domain_knowledge = parseList(raw.domain)
    const soft_skills = parseList(raw.soft)
    const languages_required = parseList(raw.languages)

    const duties_day_to_day = parseList(raw.day)
    const duties_strategic = parseList(raw.project)
    const team_collaboration = parseList(raw.collaboration)
    const perks_benefits = parseList(raw.perks)

    // Resolve company: prefer companyId, but fall back to looking up by company name if needed
    if (!body.companyId && !body.company) {
      return NextResponse.json({ ok: false, error: 'Company is required' }, { status: 400 })
    }
    let effectiveCompanyId: string | null = body.companyId || null

    // Prefer Neon/Postgres via DatabaseService if configured
    if (DatabaseService.isDatabaseConfigured()) {
      // Validate company exists to avoid FK violation on jobs.company_id
      try {
        if (effectiveCompanyId) {
          const exists = await DatabaseService.companyExists(effectiveCompanyId)
          if (!exists) {
            // Try resolving by company name as a fallback; if missing, auto-create
            if (body.company) {
              let lookedUp = await DatabaseService.getCompanyIdByName(body.company)
              if (!lookedUp) {
                lookedUp = await DatabaseService.createCompanyByName(body.company)
              }
              effectiveCompanyId = lookedUp
            } else {
              return NextResponse.json({ ok: false, error: `Company not found for companyId=${body.companyId}` }, { status: 400 })
            }
          }
        } else if (body.company) {
          let lookedUp = await DatabaseService.getCompanyIdByName(body.company)
          if (!lookedUp) {
            lookedUp = await DatabaseService.createCompanyByName(body.company)
          }
          effectiveCompanyId = lookedUp
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
          company_id: effectiveCompanyId!,
          title: body.jobTitle,
          location: raw.location?.trim() || null,
          description_md: body.description,
          employment_type: employment || 'full_time',
          experience_level: expLevel,
          responsibilities_md: body.responsibilities || null,
          benefits_md: body.benefits || null,
          salary_level: body.salaryRange || null,
          created_by: createdBySafe,
          // New optional columns
          level: expLevel as any, // if you have a distinct job_level, this aligns with experience_level
          location_city,
          location_country,
          work_mode: null, // no distinct field in form yet
          education: raw.education || null,
          years_experience_min: parseYears(raw.years).min,
          years_experience_max: parseYears(raw.years).max,
          technical_must,
          technical_nice,
          domain_knowledge,
          soft_skills,
          languages_required,
          duties_day_to_day,
          duties_strategic,
          team_collaboration,
          decision_scope: raw.scope || null,
          salary_currency: null,
          salary_min: salaryMinNum,
          salary_max: salaryMaxNum,
          salary_period: salaryPeriod as any,
          bonus_incentives: raw.bonus || null,
          perks_benefits,
          time_off_policy: raw.timeOff || null,
          joining_timeline: raw.joining || null,
          travel_requirements: raw.travel || null,
          visa_work_auth: raw.visa || null,
        })
      } catch (e: any) {
        const msg = String(e?.message || '')
        const isFkViolation = msg.includes('23503') && msg.includes('jobs_created_by_fkey')
        if (!isFkViolation) {
          throw e
        }
        // Retry without created_by when foreign key violates (user id not in users table)
        created = await DatabaseService.createJob({
          company_id: effectiveCompanyId!,
          title: body.jobTitle,
          location: raw.location?.trim() || null,
          description_md: body.description,
          employment_type: employment || 'full_time',
          experience_level: expLevel,
          responsibilities_md: body.responsibilities || null,
          benefits_md: body.benefits || null,
          salary_level: body.salaryRange || null,
          created_by: null,
          // New optional columns (same as above)
          level: expLevel as any,
          location_city,
          location_country,
          work_mode: null,
          education: raw.education || null,
          years_experience_min: parseYears(raw.years).min,
          years_experience_max: parseYears(raw.years).max,
          technical_must,
          technical_nice,
          domain_knowledge,
          soft_skills,
          languages_required,
          duties_day_to_day,
          duties_strategic,
          team_collaboration,
          decision_scope: raw.scope || null,
          salary_currency: null,
          salary_min: salaryMinNum,
          salary_max: salaryMaxNum,
          salary_period: salaryPeriod as any,
          bonus_incentives: raw.bonus || null,
          perks_benefits,
          time_off_policy: raw.timeOff || null,
          joining_timeline: raw.joining || null,
          travel_requirements: raw.travel || null,
          visa_work_auth: raw.visa || null,
        })
      }

      const jobId = created.id

      // Optional: insert job_rounds
      const rounds = Array.isArray(body.interviewRounds) ? body.interviewRounds : []
      const minutesForRound = (name: string): number => {
        const key = (name || '').trim().toLowerCase()
        switch (key) {
          case 'phone screening':
            return 15
          case 'technical assessment':
            return 30
          case 'system design':
          case 'architecture':
          case 'architecture interview':
          case 'architecture round':
          case 'system architecture':
            return 30
          case 'behavioral interview':
            return 30
          case 'final round':
          case 'final interview':
            return 30
          default:
            // As a fallback, try to parse numeric labels e.g., "45min", "1hour"
            const raw = String(body.interviewDuration || '').trim().toLowerCase()
            if (/^\d+$/.test(raw)) return Number(raw)
            if (raw.includes('1.5')) return 90
            if (raw.includes('2')) return 120
            if (raw.includes('1') && raw.includes('hour')) return 60
            if (raw.includes('45')) return 45
            if (raw.includes('30')) return 30
            if (raw.includes('15')) return 15
            return 30
        }
      }
      if (rounds.length) {
        const rows = rounds.map((name, idx) => ({ seq: idx + 1, name, duration_minutes: minutesForRound(name) }))
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
    const minutesForRound = (name: string): number => {
      const key = (name || '').trim().toLowerCase()
      switch (key) {
        case 'phone screening':
          return 15
        case 'technical assessment':
          return 30
        case 'system design':
        case 'architecture':
        case 'architecture interview':
        case 'architecture round':
        case 'system architecture':
          return 30
        case 'behavioral interview':
          return 30
        case 'final round':
        case 'final interview':
          return 30
        default:
          const raw = String(body.interviewDuration || '').trim().toLowerCase()
          if (/^\d+$/.test(raw)) return Number(raw)
          if (raw.includes('1.5')) return 90
          if (raw.includes('2')) return 120
          if (raw.includes('1') && raw.includes('hour')) return 60
          if (raw.includes('45')) return 45
          if (raw.includes('30')) return 30
          if (raw.includes('15')) return 15
          return 30
      }
    }
    if (rounds.length) {
      const rows = rounds.map((name, idx) => ({ job_id: jobId, seq: idx + 1, name, duration_minutes: minutesForRound(name) }))
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

      // Attach per-job interview_rounds by fetching rounds for each job
      const jobsOut = [] as any[]
      for (const r of (data || [])) {
        let interviewRounds: string[] = []
        try {
          const rounds = await DatabaseService.getJobRoundsByJobId(r.id)
          interviewRounds = Array.isArray(rounds) ? rounds.map((x: any) => x.name) : []
        } catch {
          interviewRounds = []
        }
        jobsOut.push({
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
          interview_rounds: interviewRounds,
        })
      }
      return NextResponse.json({ ok: true, jobs: jobsOut })
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
    const jobs = (data || [])

    // Fetch job_rounds for these jobs in one query and group by job_id
    let roundsByJob = new Map<string, string[]>()
    try {
      const jobIds = jobs.map(j => j.id)
      if (jobIds.length > 0) {
        const { data: roundsData } = await sb
          .from('job_rounds')
          .select('job_id, name, seq')
          .in('job_id', jobIds)
          .order('seq', { ascending: true })
        if (Array.isArray(roundsData)) {
          roundsByJob = roundsData.reduce((acc, r: any) => {
            const arr = acc.get(r.job_id) || []
            arr.push(r.name)
            acc.set(r.job_id, arr)
            return acc
          }, new Map<string, string[]>())
        }
      }
    } catch {}

    const rows = jobs.map((r) => ({
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
      interview_rounds: roundsByJob.get(r.id) || [],
    }))
    return NextResponse.json({ ok: true, jobs: rows })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


