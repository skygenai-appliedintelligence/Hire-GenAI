import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 })

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    const data = await DatabaseService.listRoundsWithAgents(jobId)
    return NextResponse.json({ ok: true, rounds: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
