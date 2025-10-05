import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/applications/[applicationId]/interview-status
// Check if interview has been completed for this application
export async function GET(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    // Check if there's a completed interview for this application
    const query = `
      SELECT 
        i.id,
        i.status,
        i.completed_at,
        i.started_at
      FROM interviews i
      JOIN application_rounds ar ON ar.id = i.application_round_id
      WHERE ar.application_id = $1::uuid
      ORDER BY i.started_at DESC NULLS LAST, i.completed_at DESC NULLS LAST
      LIMIT 1
    `

    const rows = await (DatabaseService as any)["query"].call(
      DatabaseService,
      query,
      [applicationId]
    ) as any[]

    if (!rows || rows.length === 0) {
      // No interview record found - allow interview
      return NextResponse.json({ 
        ok: true, 
        canInterview: true,
        status: 'not_started'
      })
    }

    const interview = rows[0]
    const isCompleted = interview.completed_at !== null || interview.status === 'success'

    return NextResponse.json({
      ok: true,
      canInterview: !isCompleted,
      status: interview.status,
      completedAt: interview.completed_at,
      startedAt: interview.started_at
    })

  } catch (err: any) {
    console.error('Error checking interview status:', err)
    return NextResponse.json({ 
      error: err?.message || 'Failed to check interview status' 
    }, { status: 500 })
  }
}

// POST /api/applications/[applicationId]/interview-status
// Mark interview as completed
export async function POST(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId
    const body = await req.json().catch(() => ({}))
    const { transcript } = body

    console.log('📝 Marking interview as completed:', applicationId)
    console.log('📝 Transcript length:', transcript?.length || 0)
    console.log('📝 Transcript preview:', transcript?.substring(0, 200))

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    // Find or create interview record
    const findQuery = `
      SELECT i.id
      FROM interviews i
      JOIN application_rounds ar ON ar.id = i.application_round_id
      WHERE ar.application_id = $1::uuid
      ORDER BY i.started_at DESC NULLS LAST, i.completed_at DESC NULLS LAST
      LIMIT 1
    `

    const existingRows = await (DatabaseService as any)["query"].call(
      DatabaseService,
      findQuery,
      [applicationId]
    ) as any[]

    let interviewId: string | null = null

    if (existingRows && existingRows.length > 0) {
      // Update existing interview
      interviewId = existingRows[0].id
      console.log('✅ Found existing interview:', interviewId)
      const updateQuery = `
        UPDATE interviews
        SET 
          status = 'success',
          completed_at = NOW(),
          raw_transcript = $2,
          started_at = COALESCE(started_at, NOW())
        WHERE id = $1::uuid
        RETURNING id
      `
      const result = await (DatabaseService as any)["query"].call(
        DatabaseService,
        updateQuery,
        [interviewId, transcript || null]
      )
      console.log('✅ Updated interview with transcript')
    } else {
      // Simply store transcript in applications table
      console.log('⚠️ No existing interview found, storing transcript in applications table')
      
      const updateAppQuery = `
        UPDATE applications 
        SET transcript = $2
        WHERE id = $1::uuid
        RETURNING id
      `
      
      const updateResult = await (DatabaseService as any)["query"].call(
        DatabaseService,
        updateAppQuery,
        [applicationId, transcript || null]
      ) as any[]
      
      if (updateResult && updateResult.length > 0) {
        console.log('✅ Stored transcript in applications table')
      }
    }

    console.log(`✅ Interview marked as completed for application ${applicationId}`)

    return NextResponse.json({
      ok: true,
      interviewId,
      message: 'Interview marked as completed'
    })

  } catch (err: any) {
    console.error('Error marking interview as completed:', err)
    return NextResponse.json({ 
      error: err?.message || 'Failed to mark interview as completed' 
    }, { status: 500 })
  }
}
