import { NextRequest, NextResponse } from 'next/server'
import { AIInterviewService, type CandidateApplication } from '@/lib/ai-interview-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const application = body?.application as CandidateApplication | undefined
    const jobDescription = String(body?.jobDescription || '')

    if (!application || !application.fullName || !application.email) {
      return NextResponse.json({ error: 'Invalid application payload' }, { status: 400 })
    }
    if (!jobDescription.trim()) {
      return NextResponse.json({ error: 'Missing job description' }, { status: 400 })
    }

    const result = await AIInterviewService.evaluateApplication(application, jobDescription)
    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Evaluation failed' }, { status: 500 })
  }
} 