import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/jobs/titles - fetch all job titles for filter dropdown
export async function GET(req: NextRequest) {
  try {
    // Get companyId from query parameters
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    
    if (!companyId) {
      return NextResponse.json({
        ok: false,
        error: 'companyId is required'
      }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, jobs: [] })
    }

    // Add timeout to prevent long-running queries
    const result = await Promise.race([
      (async () => {
        const query = `
          SELECT 
            id,
            title,
            status,
            created_at
          FROM jobs 
          WHERE company_id = $1::uuid
          ORDER BY created_at DESC
        `

        console.log('🔍 Fetching jobs for company:', companyId)
        const rows = await DatabaseService.query(query, [companyId]) as any[]
        console.log('🔍 Found jobs:', rows.map(r => ({ id: r.id, title: r.title, status: r.status })))

        const jobs = (rows || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          createdAt: r.created_at,
        }))

        return { ok: true, jobs }
      })(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      )
    ])

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=120', // Cache for 2 minutes
      }
    })
  } catch (e: any) {
    console.error('Jobs titles fetch error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load job titles' }, { status: 500 })
  }
}
