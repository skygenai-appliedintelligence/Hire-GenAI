import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: fetch interview questions_json
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ ok: false, error: 'Missing interview id' }, { status: 400 })

    const rows = await prisma.$queryRaw<{ questions_json: string }[]>`
      SELECT questions_json
        FROM public.interviews
       WHERE id = CAST(${id} AS uuid)
       LIMIT 1
    `
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }

    const raw = rows[0]?.questions_json ?? '{}'
    let questions: unknown = {}
    try { questions = JSON.parse(raw) } catch { questions = {} }

    return NextResponse.json({ ok: true, questions })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

// POST: upsert interview questions_json
// Body: { questions: any }  (should be JSON-serializable)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ ok: false, error: 'Missing interview id' }, { status: 400 })

    const body = await req.json().catch(() => null) as { questions?: any } | null
    if (!body || typeof body.questions === 'undefined') {
      return NextResponse.json({ ok: false, error: 'Missing questions' }, { status: 400 })
    }

    const questions_json = JSON.stringify(body.questions)

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE public.interviews
         SET questions_json = ${questions_json}::text,
             updated_at = now()
       WHERE id = CAST(${id} AS uuid)
       RETURNING id
    `
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id: rows[0].id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
