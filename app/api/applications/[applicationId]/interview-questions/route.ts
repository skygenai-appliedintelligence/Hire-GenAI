import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId
    
    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Get application details to find the job
    const applicationQuery = `
      SELECT a.job_id, j.title as job_title, c.name as company_name,
             cand.first_name, cand.last_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN candidates cand ON a.candidate_id = cand.id
      WHERE a.id = $1::uuid
    `
    const applicationRows = await DatabaseService.query(applicationQuery, [applicationId]) as any[]
    
    if (applicationRows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
    }

    const application = applicationRows[0]
    const jobId = application.job_id

    // Get job rounds with questions
    const roundsQuery = `
      SELECT jr.id, jr.name, jr.duration_minutes, jr.configuration
      FROM job_rounds jr
      WHERE jr.job_id = $1::uuid
      ORDER BY jr.seq ASC
    `
    const roundsRows = await DatabaseService.query(roundsQuery, [jobId]) as any[]

    // Extract questions from configuration
    const rounds = roundsRows.map(round => {
      let questions = []
      let criteria = []
      
      try {
        if (round.configuration) {
          const config = typeof round.configuration === 'string' 
            ? JSON.parse(round.configuration) 
            : round.configuration
          questions = config.questions || []
          criteria = config.criteria || []
        }
      } catch (e) {
        console.error('Error parsing round configuration:', e)
      }

      return {
        id: round.id,
        name: round.name,
        duration_minutes: round.duration_minutes,
        questions,
        criteria
      }
    })

    return NextResponse.json({
      ok: true,
      application: {
        id: applicationId,
        jobId: jobId,
        jobTitle: application.job_title,
        companyName: application.company_name,
        candidateName: `${application.first_name || ''} ${application.last_name || ''}`.trim() || 'Candidate'
      },
      rounds
    })

  } catch (err: any) {
    console.error('Error fetching interview questions:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
