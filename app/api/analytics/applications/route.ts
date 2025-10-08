import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/analytics/applications - all applications with candidate data, optionally filtered by job
export async function GET(req: NextRequest) {
  try {
    // Resolve company_id
    const companyRows = await DatabaseService.query(
      `SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`
    ) as any[]
    if (!companyRows?.length) {
      return NextResponse.json({ ok: true, applications: [] })
    }
    const companyId = companyRows[0].id

    // Get jobId from query parameters
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    const isFiltered = jobId && jobId !== 'all'

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, applications: [] })
    }

    // Check if applications.is_qualified column exists
    const colCheck = await DatabaseService.query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'is_qualified'`
    ) as any[]
    const hasIsQualified = (colCheck || []).length > 0

    // Check which name columns exist in candidates table
    const nameColCheck = await DatabaseService.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'candidates' 
       AND column_name IN ('full_name', 'first_name', 'last_name')`
    ) as any[]
    const hasFullName = nameColCheck.some((r: any) => r.column_name === 'full_name')
    const hasFirstName = nameColCheck.some((r: any) => r.column_name === 'first_name')
    
    const nameColumn = hasFullName 
      ? 'c.full_name' 
      : hasFirstName 
        ? "CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))" 
        : "'Unknown'"

    const jobFilter = isFiltered ? 'AND j.id = $2::uuid' : ''
    const queryParams = isFiltered ? [companyId, jobId] : [companyId]

    const query = `
      SELECT 
        a.id,
        ${nameColumn} AS candidate_name,
        c.email,
        c.phone,
        j.title AS job_title,
        a.job_id AS job_id,
        a.status,
        ${hasIsQualified ? 'a.is_qualified,' : 'false AS is_qualified,'}
        f.storage_key AS resume_url,
        a.created_at
      FROM applications a
      JOIN candidates c ON c.id = a.candidate_id
      JOIN jobs j ON j.id = a.job_id
      LEFT JOIN files f ON f.id = c.resume_file_id
      WHERE j.company_id = $1::uuid ${jobFilter}
      ORDER BY a.created_at DESC
      LIMIT 100
    `

    const rows = await DatabaseService.query(query, queryParams) as any[]

    const applications = (rows || []).map((r: any) => ({
      id: r.id,
      jobId: r.job_id,
      candidateName: r.candidate_name || 'Unknown',
      appliedJD: r.job_title || 'N/A',
      email: r.email || '',
      phone: r.phone || '',
      cvUrl: r.resume_url || '',
      status: r.is_qualified ? 'CV Qualified' : 'CV Unqualified',
      createdAt: r.created_at,
    }))

    return NextResponse.json({ ok: true, applications })
  } catch (e: any) {
    console.error('Applications fetch error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load applications' }, { status: 500 })
  }
}
