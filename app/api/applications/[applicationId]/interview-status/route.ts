import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/applications/[applicationId]/interview-status
// Check if interview has been completed for this application
export async function GET(
  req: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = params

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
  { params }: { params: { applicationId: string } }
) {
  try {
    const { applicationId } = params
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

    let interviewId: string

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
      // Create new interview record
      console.log('⚠️ No existing interview found, creating new one')
      // First, get or create application_round
      const roundQuery = `
        INSERT INTO application_rounds (application_id, job_round_id, seq, status)
        SELECT 
          $1::uuid,
          jr.id,
          1,
          'in_progress'
        FROM job_rounds jr
        JOIN applications a ON a.job_id = jr.job_id
        WHERE a.id = $1::uuid
        LIMIT 1
        ON CONFLICT (application_id, seq) DO UPDATE SET status = 'in_progress'
        RETURNING id
      `
      
      const roundRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        roundQuery,
        [applicationId]
      ) as any[]

      if (!roundRows || roundRows.length === 0) {
        console.error('❌ Failed to create application round')
        throw new Error('Failed to create application round')
      }

      const roundId = roundRows[0].id
      console.log('✅ Created/found application round:', roundId)

      // Get a round_agent_id (use first available)
      const agentQuery = `SELECT id FROM round_agents LIMIT 1`
      const agentRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        agentQuery,
        []
      ) as any[]

      const agentId = agentRows?.[0]?.id || null
      if (!agentId) {
        console.error('❌ No round agent available')
        throw new Error('No round agent available')
      }
      console.log('✅ Found round agent:', agentId)

      // Create interview
      const createQuery = `
        INSERT INTO interviews (
          application_round_id,
          round_agent_id,
          started_at,
          completed_at,
          status,
          raw_transcript,
          mode
        )
        VALUES ($1::uuid, $2::uuid, NOW(), NOW(), 'success', $3, 'async_ai')
        RETURNING id
      `

      console.log('💾 Creating interview with transcript length:', transcript?.length || 0)
      const newRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        createQuery,
        [roundId, agentId, transcript || null]
      ) as any[]

      interviewId = newRows?.[0]?.id
      console.log('✅ Created new interview:', interviewId)
    }

    console.log(`✅ Interview marked as completed: ${interviewId} for application ${applicationId}`)

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
