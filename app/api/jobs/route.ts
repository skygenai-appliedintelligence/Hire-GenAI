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
  draftJobId?: string | null // Temporary UUID for draft job billing reconciliation
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
  // Screening questions
  screeningEnabled?: boolean
  screeningOverallExp?: string
  screeningPrimarySkill?: string
  screeningCurrentLocation?: string
  screeningNationality?: string
  screeningVisaRequired?: string
  screeningLanguageProficiency?: string
  screeningCurrentSalary?: string
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
  if (['lead'].includes(v)) return 'lead'
  if (['staff'].includes(v)) return 'senior'
  if (['principal', 'principal_engineer'].includes(v)) return 'principal'
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
    // experience level is optional in new schema (level is nullable)
    if (missing.length) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    // Check free trial limits if wallet balance is $0
    if (body.companyId && DatabaseService.isDatabaseConfigured()) {
      try {
        const billing = await DatabaseService.getCompanyBilling(body.companyId)
        if (billing && billing.wallet_balance <= 0 && billing.billing_status === 'trial') {
          // Check if user already has a JD created (count from jobs table)
          const countQuery = `SELECT COUNT(*) as count FROM jobs WHERE company_id = $1::uuid`
          const countResult = await (DatabaseService as any)["query"].call(
            DatabaseService,
            countQuery,
            [body.companyId]
          ) as any[]
          const jobCount = parseInt(countResult[0]?.count || '0')
          
          if (jobCount >= 1) {
            return NextResponse.json(
              { 
                ok: false, 
                error: 'Free trial ended. You have already created 1 JD during your free trial. Please recharge your wallet to create more JDs.',
                code: 'TRIAL_JD_LIMIT_REACHED'
              }, 
              { status: 403 }
            )
          }
        }
      } catch (err) {
        console.warn('⚠️  [JOB CREATION] Failed to check trial status:', err)
        // Continue anyway - don't block on trial check failure
      }
    }

    // Map form values to match enum types
    const employment = normalizeJobType(raw.jobType)
    const expLevel = normalizeExperience(body.experienceLevel)

    // Derivations for new columns
    const parseList = (s?: string | string[] | null): string[] => {
      if (!s) return []
      const rawStr = Array.isArray(s) ? s.join(',') : s
      return rawStr
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
    // Ensure salary_period is always a valid enum value
    const salaryPeriod = (() => {
      const period = (raw.period || '').toLowerCase()
      if (period.includes('year')) return 'yearly'
      if (period.includes('month')) return 'monthly'
      if (period.includes('week')) return 'weekly'
      if (period.includes('day')) return 'daily'
      if (period.includes('hour')) return 'hourly'
      // Default to 'monthly' if no valid period is found
      return 'monthly'
    })()

    // Try to split location into city, country
    const loc = (raw.location || '').split(',')
    const location_city = loc.length >= 1 ? loc[0].trim() || null : null
    const location_country = loc.length >= 2 ? loc[loc.length - 1].trim() || null : null

    // Map arrays - using correct form field names
    const technical_skills = parseList(raw.technical)
    const must_have_skills = parseList(raw.mustHave)
    const nice_to_have_skills = parseList(raw.niceToHave)
    const domain_knowledge = parseList(raw.domain)
    const soft_skills = parseList(raw.soft)
    const languages_list = parseList(raw.languages)

    const duties_day_to_day = parseList(raw.day)
    const duties_strategic = parseList(raw.project)
    const stakeholders = parseList(raw.collaboration)
    const perks_benefits = parseList(raw.perks)

    // Generate job description in new structured format
    const generateJobDescription = () => {
      const locationText = raw.location?.trim() || 'Remote'
      const empType = (employment || 'full_time').replace('_', '-')
      const level = expLevel || 'As per experience'
      const salaryRange = salaryMinNum && salaryMaxNum 
        ? `₹${salaryMinNum.toLocaleString()} – ₹${salaryMaxNum.toLocaleString()} per ${salaryPeriod || 'month'}`
        : 'Competitive salary'
      
      return `// Basic Information
Job Title* → ${body.jobTitle || 'Position Title'}
Company* → ${body.company || 'Company'}
Location* → ${locationText}
Work Arrangement* → ${empType}, ${locationText.toLowerCase().includes('remote') ? 'Remote' : 'Onsite'}
Job Level / Seniority → ${level}

About the Role
We are seeking a ${body.jobTitle || 'professional'} to join ${body.company || 'our team'}. This role involves ${duties_day_to_day.length > 0 ? duties_day_to_day[0] : 'contributing to our team\'s success'} while collaborating with ${stakeholders.length > 0 ? stakeholders.slice(0,2).join(' and ') : 'cross-functional teams'} to deliver business impact.

🔹 Key Responsibilities
${duties_day_to_day.length > 0 ? duties_day_to_day.map(duty => `${duty.charAt(0).toUpperCase() + duty.slice(1)}.`).join('\n') : 'Develop and maintain solutions as per business requirements.'}
${duties_strategic.length > 0 ? duties_strategic.map(duty => `${duty.charAt(0).toUpperCase() + duty.slice(1)}.`).join('\n') : 'Drive strategic initiatives and process improvements.'}
${stakeholders.length > 0 ? `Collaborate with ${stakeholders.join(', ')}.` : 'Collaborate with cross-functional teams.'}
Provide technical guidance and mentorship.

🔹 Requirements
Education & Certifications
${raw.education || 'Bachelor\'s degree in relevant field or equivalent experience.'}

Experience
${parseYears(raw.years).min && parseYears(raw.years).max ? `${parseYears(raw.years).min}–${parseYears(raw.years).max} years total experience` : parseYears(raw.years).min ? `${parseYears(raw.years).min}+ years experience` : 'Experience as per role requirements'}

Technical Skills (Must-Have)
${[...must_have_skills, ...technical_skills].length > 0 ? [...must_have_skills, ...technical_skills].join('\n') : 'Technical skills as per job requirements'}

Nice-to-Have Skills
${nice_to_have_skills.length > 0 ? nice_to_have_skills.join('\n') : 'Additional skills welcome'}

Soft Skills
Strong communication and stakeholder management
Problem-solving and adaptability
Leadership and team collaboration

🔹 Compensation & Benefits
💰 Salary Range: ${salaryRange}
🎁 Bonus: Performance-based incentives
✨ Perks: ${perks_benefits.length > 0 ? perks_benefits.join(', ') : 'Health insurance, flexible working hours, wellness programs'}
🌴 Time Off Policy: Competitive leave policy

🔹 Logistics
Joining Timeline: ${raw.joining || 'Within 30 days'}
${raw.travel ? `Travel Requirements: ${raw.travel}` : 'Travel Requirements: Minimal travel as per project needs'}
Work Authorization: ${raw.visa || 'Work authorization required'}`
    }

    const generatedDescription = generateJobDescription()

    // Build screening_questions JSON if enabled
    // Field mapping:
    // - overall_experience = Total years of experience
    // - primary_skill = Primary skill requirement text (e.g., "3 years in UI Path")
    const screeningQuestions = raw.screeningEnabled ? {
      enabled: true,
      overall_experience: raw.screeningOverallExp ? Number(raw.screeningOverallExp) : null,
      primary_skill: raw.screeningPrimarySkill || null,
      current_location: raw.screeningCurrentLocation || null,
      nationality: raw.screeningNationality || null,
      visa_required: raw.screeningVisaRequired === 'yes',
      language_proficiency: raw.screeningLanguageProficiency || 'intermediate',
      current_monthly_salary: raw.screeningCurrentSalary ? Number(raw.screeningCurrentSalary) : null,
    } : null

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
          company_name: body.company || null,
          title: body.jobTitle,
          description_md: generatedDescription,
          location_text: raw.location!.trim(),
          employment_type: (employment || 'full_time') as any,
          level: expLevel || 'mid',
          education: raw.education || null,
          years_experience_min: parseYears(raw.years).min,
          years_experience_max: parseYears(raw.years).max,
          technical_skills: parseList(raw.technical),
          domain_knowledge,
          soft_skills,
          languages: languages_list,
          must_have_skills,
          nice_to_have_skills,
          duties_day_to_day,
          duties_strategic,
          stakeholders,
          decision_scope: raw.scope || null,
          salary_min: salaryMinNum,
          salary_max: salaryMaxNum,
          salary_period: salaryPeriod as any,
          bonus_incentives: raw.bonus || null,
          perks_benefits,
          time_off_policy: raw.timeOff || null,
          joining_timeline: raw.joining || null,
          travel_requirements: raw.travel || null,
          visa_requirements: raw.visa || null,
          is_public: true,
          created_by_email: body.createdBy || null,
          screening_questions: screeningQuestions,
        })
      } catch (e: any) {
        const msg = String(e?.message || '')
        const isFkViolation = msg.includes('23503') && msg.includes('jobs_created_by_fkey')
        if (!isFkViolation) {
          throw e
        }
        // Retry without created_by_email when there's an error
        created = await DatabaseService.createJob({
          company_id: effectiveCompanyId!,
          company_name: body.company || null,
          title: body.jobTitle,
          description_md: generatedDescription,
          location_text: raw.location!.trim(),
          employment_type: (employment || 'full_time') as any,
          level: expLevel || 'mid',
          education: raw.education || null,
          years_experience_min: parseYears(raw.years).min,
          years_experience_max: parseYears(raw.years).max,
          technical_skills: parseList(raw.technical),
          domain_knowledge,
          soft_skills,
          languages: languages_list,
          must_have_skills,
          nice_to_have_skills,
          duties_day_to_day,
          duties_strategic,
          stakeholders,
          decision_scope: raw.scope || null,
          salary_min: salaryMinNum,
          salary_max: salaryMaxNum,
          salary_period: salaryPeriod as any,
          bonus_incentives: raw.bonus || null,
          perks_benefits,
          time_off_policy: raw.timeOff || null,
          joining_timeline: raw.joining || null,
          travel_requirements: raw.travel || null,
          visa_requirements: raw.visa || null,
          is_public: true,
          created_by_email: null,
          screening_questions: screeningQuestions,
        })
      }

      const jobId = created.id

      // Reconcile draft question usage if draftJobId is provided
      if (raw.draftJobId) {
        try {
          console.log('🔄 [JOB CREATION] Reconciling draft usage for job:', jobId)
          await DatabaseService.reconcileDraftQuestionUsage(raw.draftJobId, jobId)
        } catch (draftErr) {
          console.warn('⚠️  Failed to reconcile draft usage (non-fatal):', draftErr)
        }
      }

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
      
      // Debug: Log raw data from database
      console.log('📋 [JOBS API] Raw data from DB:', data?.map((r: any) => ({ id: r.id, title: r.title, auto_schedule_interview: r.auto_schedule_interview })))

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
        const salary_label = (r.salary_min || r.salary_max) ? `${r.salary_min ?? ''}${r.salary_min && r.salary_max ? ' - ' : ''}${r.salary_max ?? ''} ${r.salary_period || ''}`.trim() : null
        jobsOut.push({
          id: r.id,
          title: r.title,
          company_name: companyName,
          location: r.location_text,
          employment_type: r.employment_type,
          experience_level: r.level,
          status: r.status || 'open',
          summary: null,
          responsibilities: null,
          benefits: null,
          salary_label,
          created_by: r.created_by,
          created_by_email: r.created_by_email,
          created_at: r.created_at,
          interview_rounds: interviewRounds,
          auto_schedule_interview: r.auto_schedule_interview ?? false,
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


