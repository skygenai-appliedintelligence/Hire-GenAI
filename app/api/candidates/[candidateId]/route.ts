import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params

    if (!candidateId) {
      return NextResponse.json({ ok: false, error: 'Candidate ID is required' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Fetch candidate details from screening answers
    const query = `
      SELECT 
        candidate_details
      FROM candidate_screening_answers
      WHERE candidate_id = $1::text
      LIMIT 1
    `

    const rows = await (DatabaseService as any).query(query, [candidateId])

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Candidate not found' }, { status: 404 })
    }

    const candidateDetails = rows[0].candidate_details

    return NextResponse.json({
      ok: true,
      candidate: candidateDetails
    })
  } catch (error: any) {
    console.error('[Candidate API] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
