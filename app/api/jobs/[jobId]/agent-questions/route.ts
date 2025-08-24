import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Persist selected questions for a specific agent (by index) under a job
// Body: { agentIndex: number; questions: Array<{ id?: string; text: string; type?: string; linkedSkills?: string[]; expectedAnswer?: string }> }
export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> } | { params: { jobId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const jobId = p.jobId
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 })

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json().catch(() => null) as any
    const agentIndex = Number(body?.agentIndex)
    const questions = Array.isArray(body?.questions) ? body.questions : []

    if (!Number.isFinite(agentIndex) || agentIndex < 1) {
      return NextResponse.json({ ok: false, error: 'Invalid agentIndex' }, { status: 400 })
    }
    if (!questions.length) {
      return NextResponse.json({ ok: false, error: 'No questions provided' }, { status: 400 })
    }

    // Load rounds with agents to locate the round_agent row for this index
    const rounds = await DatabaseService.listRoundsWithAgents(jobId)
    // Find agent with config.index === agentIndex (set when we created round agents)
    let targetRoundAgentId: string | null = null
    for (const r of rounds) {
      for (const a of (r.agents || [])) {
        const idx = Number(a?.config?.index)
        if (Number.isFinite(idx) && idx === agentIndex) {
          targetRoundAgentId = a.id
          break
        }
      }
      if (targetRoundAgentId) break
    }

    if (!targetRoundAgentId) {
      return NextResponse.json({ ok: false, error: `round_agent not found for agentIndex ${agentIndex}` }, { status: 404 })
    }

    // Determine company for question ownership
    const companyId = await DatabaseService.getJobCompanyId(jobId)
    // Persist questions into questions + agent_questions (authoritative)
    await DatabaseService.setAgentQuestions(targetRoundAgentId, companyId, questions)

    return NextResponse.json({ ok: true, round_agent_id: targetRoundAgentId })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
