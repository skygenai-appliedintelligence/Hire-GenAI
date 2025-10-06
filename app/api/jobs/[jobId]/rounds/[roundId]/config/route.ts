import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string; roundId: string }> } | { params: { jobId: string; roundId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const { jobId, roundId } = p
    
    if (!jobId || !roundId) {
      return NextResponse.json({ ok: false, error: 'Missing jobId or roundId' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Get the round configuration from job_rounds table
    const query = `
      SELECT id, name, configuration 
      FROM job_rounds 
      WHERE job_id = $1::uuid AND id = $2::uuid
      LIMIT 1
    `
    
    const rows = await DatabaseService.query(query, [jobId, roundId]) as any[]
    
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Round not found' }, { status: 404 })
    }

    const round = rows[0]
    return NextResponse.json({ 
      ok: true, 
      roundId: round.id,
      name: round.name,
      configuration: round.configuration 
    })
  } catch (err: any) {
    console.error('Error fetching round configuration:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
