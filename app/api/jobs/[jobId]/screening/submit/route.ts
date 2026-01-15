import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CandidateDetails {
  first_name: string
  last_name: string
  email: string
  phone: string
}

interface ScreeningAnswers {
  overall_experience: number | null
  primary_skill_experience: string | null
  current_location: string | null
  nationality: string | null
  visa_required: boolean
  language_proficiency: string
  current_monthly_salary: number | null
}

interface ScreeningCriteria {
  enabled: boolean
  overall_experience: number | null
  primary_skill: string | null
  current_location: string | null
  nationality: string | null
  visa_required: boolean
  language_proficiency: string
  current_monthly_salary: number | null
}

// Language proficiency levels in order
const LANGUAGE_LEVELS = ['basic', 'intermediate', 'fluent', 'native']

function getLanguageLevel(level: string): number {
  return LANGUAGE_LEVELS.indexOf(level.toLowerCase())
}

function evaluateQualification(
  answers: ScreeningAnswers,
  criteria: ScreeningCriteria
): { qualified: boolean; reason: string } {
  const reasons: string[] = []

  // Check total career experience
  if (criteria.overall_experience !== null && criteria.overall_experience > 0) {
    if (answers.overall_experience === null || answers.overall_experience < criteria.overall_experience) {
      reasons.push(
        `Required ${criteria.overall_experience}+ years total experience, but you have ${answers.overall_experience || 0} years`
      )
    }
  }

  // Primary skill is now a text field - we just collect the answer, no automatic validation
  // Admin can review the primary_skill_experience answer manually

  // Check visa requirement
  // If job requires valid work authorization (visa_required = false) but candidate needs sponsorship
  if (!criteria.visa_required && answers.visa_required) {
    reasons.push('This position requires valid work authorization. Visa sponsorship is not available.')
  }

  // Check language proficiency
  if (criteria.language_proficiency) {
    const requiredLevel = getLanguageLevel(criteria.language_proficiency)
    const candidateLevel = getLanguageLevel(answers.language_proficiency || 'basic')
    
    if (candidateLevel < requiredLevel) {
      reasons.push(
        `Required ${criteria.language_proficiency} English proficiency, but you selected ${answers.language_proficiency}`
      )
    }
  }

  // Check nationality if specified
  if (criteria.nationality && criteria.nationality !== 'any' && criteria.nationality !== '') {
    if (answers.nationality && answers.nationality.toLowerCase() !== criteria.nationality.toLowerCase()) {
      // Only fail if it's a strict nationality requirement
      // For now, we'll be lenient and not fail on nationality mismatch
      // Uncomment below to enforce strict nationality matching:
      // reasons.push(`This position requires ${criteria.nationality} nationality`)
    }
  }

  // Check salary expectation (optional - company sets max they'd pay)
  if (criteria.current_monthly_salary !== null && criteria.current_monthly_salary > 0) {
    if (answers.current_monthly_salary !== null && answers.current_monthly_salary > criteria.current_monthly_salary) {
      reasons.push(
        `Your current salary expectation exceeds our budget for this role`
      )
    }
  }

  if (reasons.length > 0) {
    return {
      qualified: false,
      reason: reasons.join('. ') + '.'
    }
  }

  return {
    qualified: true,
    reason: 'You meet all the screening criteria for this position!'
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const body = await req.json()
    const { answers, candidate } = body as { answers: ScreeningAnswers; candidate: CandidateDetails }
    
    // Generate a unique candidate ID
    const candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    if (!jobId) {
      return NextResponse.json({ ok: false, error: 'Job ID is required' }, { status: 400 })
    }

    if (!answers) {
      return NextResponse.json({ ok: false, error: 'Answers are required' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Fetch job's screening criteria
    const query = `
      SELECT 
        j.id,
        j.screening_questions,
        j.status
      FROM jobs j
      WHERE j.id = $1::uuid
      LIMIT 1
    `

    const rows = await (DatabaseService as any).query(query, [jobId])

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })
    }

    const job = rows[0]

    // Check if job is open
    if (job.status !== 'open') {
      return NextResponse.json({ 
        ok: false, 
        error: 'This job is not accepting applications at this time' 
      }, { status: 400 })
    }

    const criteria = job.screening_questions as ScreeningCriteria | null

    // If no screening questions, candidate is automatically qualified
    if (!criteria || !criteria.enabled) {
      return NextResponse.json({
        ok: true,
        qualified: true,
        reason: 'No screening criteria for this position.'
      })
    }

    // Evaluate qualification
    const result = evaluateQualification(answers, criteria)

    // Store the screening answers and candidate details
    try {
      // First, store the candidate details in a separate JSON field
      const candidateDetails = {
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        created_at: new Date().toISOString()
      }
      
      const insertQuery = `
        INSERT INTO candidate_screening_answers (
          job_id, candidate_id, answers, qualified, qualification_reason, candidate_details
        )
        VALUES ($1::uuid, $2::text, $3::jsonb, $4, $5, $6::jsonb)
        ON CONFLICT (candidate_id, job_id) 
        DO UPDATE SET 
          answers = $3::jsonb,
          qualified = $4,
          qualification_reason = $5,
          candidate_details = $6::jsonb,
          updated_at = NOW()
        RETURNING id
      `
      await (DatabaseService as any).query(insertQuery, [
        jobId,
        candidateId,
        JSON.stringify(answers),
        result.qualified,
        result.reason,
        JSON.stringify(candidateDetails)
      ])
    } catch (err) {
      // Non-fatal - don't fail the request if we can't store the answers
      console.warn('[Screening Submit] Failed to store answers:', err)
    }

    console.log(`[Screening] Job ${jobId}: ${result.qualified ? 'QUALIFIED' : 'REJECTED'} - ${result.reason}`)

    return NextResponse.json({
      ok: true,
      qualified: result.qualified,
      reason: result.reason,
      candidateId: candidateId
    })
  } catch (error: any) {
    console.error('[Screening Submit] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
