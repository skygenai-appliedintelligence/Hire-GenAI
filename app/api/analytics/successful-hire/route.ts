import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, hires: [] })
    }

    // Get company ID
    const companyRows = await DatabaseService.query(
      `SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`
    ) as any[]
    
    if (!companyRows?.length) {
      return NextResponse.json({ ok: true, hires: [] })
    }
    
    const companyId = companyRows[0].id

    // Fetch candidates who passed the interview (score >= 65)
    let query = `
      SELECT 
        a.id,
        a.job_id,
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        j.title as job_title,
        j.company_id,
        e.overall_score,
        e.status as evaluation_status,
        i.completed_at as hire_date
      FROM interviews i
      JOIN application_rounds ar ON i.application_round_id = ar.id
      JOIN applications a ON ar.application_id = a.id
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN evaluations e ON i.id = e.interview_id
      WHERE j.company_id = $1::uuid
        AND i.status = 'success'
        AND e.id IS NOT NULL
        AND (
          e.status = 'Pass' 
          OR (e.status IS NULL AND e.overall_score >= 65)
          OR (e.status != 'Fail' AND e.overall_score >= 65)
        )
    `

    const params: any[] = [companyId]
    let paramIndex = 2

    // Filter by job if provided
    if (jobId && jobId !== 'all') {
      query += ` AND a.job_id = $${paramIndex}::uuid`
      params.push(jobId)
      paramIndex++
    }

    query += ` ORDER BY i.completed_at DESC`

    const rows = await DatabaseService.query(query, params) as any[]
    
    // Transform the data
    const hires = rows.map(row => {
      const candidateName = row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}`.trim()
        : row.candidate_first_name && row.candidate_last_name 
        ? `${row.candidate_first_name} ${row.candidate_last_name}`.trim()
        : 'Unknown Candidate'

      const email = row.email || row.candidate_email || ''
      const phone = row.phone || row.candidate_phone || ''

      return {
        id: row.id,
        jobId: row.job_id,
        candidateName,
        appliedJD: row.job_title || 'Unknown Position',
        email,
        phone,
        hireDate: row.hire_date ? new Date(row.hire_date).toISOString() : new Date().toISOString(),
        salary: 'Not specified',
        department: 'Not specified',
        status: 'Hired'
      }
    })

    console.log(`Found ${hires.length} successful hires (Pass status or score >= 65)`)
    console.log('Successful hires details:', hires.map(h => ({
      name: h.candidateName,
      score: rows.find(r => r.id === h.id)?.overall_score,
      status: rows.find(r => r.id === h.id)?.evaluation_status
    })))

    return NextResponse.json({
      ok: true,
      hires: hires
    })

  } catch (error) {
    console.error('Error fetching successful hires:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch successful hires',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
