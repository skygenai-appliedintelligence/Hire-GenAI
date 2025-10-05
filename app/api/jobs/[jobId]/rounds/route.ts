import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> } | { params: { jobId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const jobId = p.jobId
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

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> } | { params: { jobId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const jobId = p.jobId
    if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 })

    const body = await req.json()
    const { roundsData } = body // Array of { roundName: string, questions: string[], criteria: string[] }

    console.log('📥 Received request to save questions for job:', jobId)
    console.log('📦 Rounds data:', JSON.stringify(roundsData, null, 2))

    if (!Array.isArray(roundsData)) {
      return NextResponse.json({ ok: false, error: 'roundsData must be an array' }, { status: 400 })
    }

    if (roundsData.length === 0) {
      console.warn('⚠️ No rounds data provided')
      return NextResponse.json({ ok: true, message: 'No rounds to update' })
    }

    // Store questions and criteria for each round in job_rounds table
    for (const round of roundsData) {
      const { roundName, questions, criteria } = round
      
      console.log(`🔄 Processing round: ${roundName}`)

      // Update job_rounds with questions and criteria using DatabaseService
      await DatabaseService.updateJobRoundConfiguration(jobId, roundName, questions || [], criteria || [])
    }

    console.log('✅ All rounds processed successfully')
    return NextResponse.json({ ok: true, message: 'Questions and criteria saved successfully' })
  } catch (err: any) {
    console.error('Error saving round questions:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
