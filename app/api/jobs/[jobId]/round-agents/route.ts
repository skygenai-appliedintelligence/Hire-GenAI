import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Body shape: { mappings: Array<{ roundSeq?: number; roundId?: string; agents: Array<{ agent_type: string; skill_weights?: any; config?: any }> }> }
export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 })

    const body = await _req.json().catch(() => null) as any
    if (!body || !Array.isArray(body.mappings)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload: expected mappings[]' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    const rounds = await DatabaseService.getJobRoundsByJobId(jobId)
    const bySeq = new Map<number, string>()
    rounds.forEach(r => bySeq.set(Number(r.seq), r.id))

    for (const m of body.mappings) {
      const rId: string | undefined = m.roundId || (m.roundSeq ? bySeq.get(Number(m.roundSeq)) : undefined)
      if (!rId) continue
      const agents = Array.isArray(m.agents) ? m.agents : []
      if (!agents.length) continue
      await DatabaseService.createRoundAgents(rId, agents)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
