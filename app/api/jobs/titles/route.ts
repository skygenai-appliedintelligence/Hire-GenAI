import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/jobs/titles - fetch all job titles for filter dropdown
export async function GET(_req: NextRequest) {
  try {
    // Resolve company_id
    const companyRows = await DatabaseService.query(
      `SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`
    ) as any[]
    if (!companyRows?.length) {
      return NextResponse.json({ ok: true, jobs: [] })
    }
    const companyId = companyRows[0].id

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, jobs: [] })
    }

    const query = `
      SELECT 
        id,
        title,
        status,
        created_at
      FROM jobs 
      WHERE company_id = $1::uuid
        AND status = 'open'
      ORDER BY created_at DESC
    `

    const rows = await DatabaseService.query(query, [companyId]) as any[]

    const jobs = (rows || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.created_at,
    }))

    return NextResponse.json({ ok: true, jobs })
  } catch (e: any) {
    console.error('Jobs titles fetch error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load job titles' }, { status: 500 })
  }
}
