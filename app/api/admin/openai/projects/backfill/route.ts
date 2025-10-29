import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { createOpenAIProject } from '@/lib/openai-projects'

export const dynamic = 'force-dynamic'

async function ensureColumn() {
  try { await DatabaseService.ensureOpenAIProjectIdColumn() } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const companyId = body.companyId as string | undefined
    const companyNameInput = body.companyName as string | undefined

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    if (!companyId && !companyNameInput) {
      return NextResponse.json({ ok: false, error: 'Provide companyId or companyName' }, { status: 400 })
    }

    await ensureColumn()

    // Locate company
    let company: any | null = null
    if (companyId) {
      const rows = await DatabaseService.query(
        `SELECT id, name, openai_project_id FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      ) as any[]
      company = rows[0] || null
    } else if (companyNameInput) {
      const rows = await DatabaseService.query(
        `SELECT id, name, openai_project_id FROM companies WHERE trim(name) ILIKE trim($1) LIMIT 1`,
        [companyNameInput]
      ) as any[]
      company = rows[0] || null
    }

    if (!company) {
      return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    }

    if (company.openai_project_id) {
      return NextResponse.json({ ok: true, message: 'Project already linked', company })
    }

    const project = await createOpenAIProject(company.name)
    if (!project?.id) {
      return NextResponse.json({ ok: false, error: 'Failed to create OpenAI Project (check OPENAI_API_KEY and scopes)' }, { status: 502 })
    }

    await DatabaseService.query(
      `UPDATE companies SET openai_project_id = $2 WHERE id = $1::uuid`,
      [company.id, project.id]
    )

    return NextResponse.json({ ok: true, company: { ...company, openai_project_id: project.id }, project })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Backfill failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })

    const rows = await DatabaseService.query(
      `SELECT id, name, openai_project_id FROM companies WHERE id = $1::uuid LIMIT 1`,
      [companyId]
    ) as any[]

    return NextResponse.json({ ok: true, company: rows[0] || null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch' }, { status: 500 })
  }
}
