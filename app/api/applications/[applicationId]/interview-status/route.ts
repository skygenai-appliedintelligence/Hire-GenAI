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

    // Always allow interviews - users can retake interviews multiple times
    return NextResponse.json({
      ok: true,
      canInterview: true,
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
      // Create new interview record with proper structure (requires round_agent_id)
      console.log('⚠️ No existing interview found, creating new interview record')

      // 1) Find the first job_round for this application's job
      const findJobRoundQuery = `
        SELECT jr.id AS job_round_id
        FROM job_rounds jr
        JOIN applications a ON a.job_id = jr.job_id
        WHERE a.id = $1::uuid
        ORDER BY jr.seq ASC
        LIMIT 1
      `
      const jobRoundRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        findJobRoundQuery,
        [applicationId]
      ) as any[]

      if (!jobRoundRows || jobRoundRows.length === 0) {
        throw new Error('No job_round found for application')
      }
      const jobRoundId = jobRoundRows[0].job_round_id

      // 2) Upsert application_rounds for seq=1
      const upsertAppRoundQuery = `
        INSERT INTO application_rounds (application_id, job_round_id, seq, status)
        VALUES ($1::uuid, $2::uuid, 1, 'completed')
        ON CONFLICT (application_id, seq) DO UPDATE
          SET job_round_id = EXCLUDED.job_round_id,
              status = 'completed'
        RETURNING id
      `
      const appRoundRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        upsertAppRoundQuery,
        [applicationId, jobRoundId]
      ) as any[]

      const applicationRoundId = appRoundRows?.[0]?.id
      if (!applicationRoundId) {
        throw new Error('Failed to upsert application_rounds')
      }

      // 3) Get a round_agent for this job_round (required by interviews.round_agent_id)
      const findAgentQuery = `
        SELECT id AS round_agent_id
        FROM round_agents
        WHERE job_round_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 1
      `
      const agentRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        findAgentQuery,
        [jobRoundId]
      ) as any[]

      let roundAgentId: string | null = null
      if (!agentRows || agentRows.length === 0) {
        console.warn('⚠️ No round_agent configured for this job round — creating a default AI agent')
        const createAgentQuery = `
          INSERT INTO round_agents (job_round_id, agent_type, skill_weights, config)
          VALUES ($1::uuid, 'ai_interviewer', '{}'::jsonb, '{}'::jsonb)
          RETURNING id
        `
        const created = await (DatabaseService as any)["query"].call(
          DatabaseService,
          createAgentQuery,
          [jobRoundId]
        ) as any[]
        if (!created || created.length === 0) {
          throw new Error('Failed to create default round_agent for job round')
        }
        roundAgentId = created[0].id
      } else {
        roundAgentId = agentRows[0].round_agent_id
      }

      // 4) Create the interview with mandatory round_agent_id
      const createInterviewQuery = `
        INSERT INTO interviews (
          application_round_id,
          round_agent_id,
          started_at,
          completed_at,
          mode,
          status,
          raw_transcript
        )
        VALUES ($1::uuid, $2::uuid, NOW() - INTERVAL '30 minutes', NOW(), 'async_ai', 'success', $3)
        RETURNING id
      `
      const createResult = await (DatabaseService as any)["query"].call(
        DatabaseService,
        createInterviewQuery,
        [applicationRoundId, roundAgentId, transcript || null]
      ) as any[]

      interviewId = createResult?.[0]?.id || null
      console.log('✅ Created new interview record:', interviewId)
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
