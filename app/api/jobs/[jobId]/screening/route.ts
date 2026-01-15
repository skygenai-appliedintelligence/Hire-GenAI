import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ ok: false, error: 'Job ID is required' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Fetch job with screening_questions
    const query = `
      SELECT 
        j.id,
        j.title,
        COALESCE(c.name, j.company_name) as company_name,
        j.location_text as location,
        j.screening_questions,
        j.status
      FROM jobs j
      LEFT JOIN companies c ON c.id = j.company_id
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

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        location: job.location,
        screening_questions: job.screening_questions,
      }
    })
  } catch (error: any) {
    console.error('[Screening API] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
