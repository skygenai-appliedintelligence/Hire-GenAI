import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      name,
      email,
      company,
      phone,
      answers,
      efficiencyScore,
    } = body || {}

    // Validate required fields
    if (!name || !email || !company) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, email, and company are required' 
      }, { status: 400 })
    }

    // Capture request metadata
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null
    const userAgent = req.headers.get('user-agent') || null

    // Insert assessment data into database
    const insertQuery = `
      INSERT INTO recruitment_assessments (
        name,
        email,
        company,
        phone,
        answers,
        efficiency_score,
        ip_address,
        user_agent,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::inet, $8, NOW())
      RETURNING id, created_at
    `

    const values = [
      String(name).trim(),
      String(email).toLowerCase().trim(),
      String(company).trim(),
      phone ? String(phone).trim() : null,
      JSON.stringify(answers || {}),
      efficiencyScore ? Number(efficiencyScore) : null,
      clientIp,
      userAgent,
    ]

    const result = await (DatabaseService as any)["query"].call(
      DatabaseService,
      insertQuery,
      values
    ) as any[]

    const assessmentId = result?.[0]?.id
    const createdAt = result?.[0]?.created_at

    if (!assessmentId) {
      return NextResponse.json({ 
        error: 'Failed to store assessment data' 
      }, { status: 500 })
    }

    console.log(`✅ Assessment submitted: id=${assessmentId}, email=${email}, company=${company}`)

    return NextResponse.json({ 
      ok: true, 
      assessmentId,
      createdAt,
      message: 'Assessment submitted successfully'
    })
  } catch (err: any) {
    console.error('❌ Assessment submit error:', err)
    return NextResponse.json({ 
      error: err?.message || 'Failed to submit assessment' 
    }, { status: 500 })
  }
}
