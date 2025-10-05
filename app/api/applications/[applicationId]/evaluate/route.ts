import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId
    
    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 })
    }

    const body = await req.json()
    const { transcript } = body

    if (!transcript) {
      return NextResponse.json({ ok: false, error: 'Missing transcript' }, { status: 400 })
    }

    console.log('🔍 Starting evaluation for application:', applicationId)

    // Get application and job details for evaluation context
    const applicationQuery = `
      SELECT a.id, a.job_id, j.title as job_title, c.name as company_name,
             cand.first_name, cand.last_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN candidates cand ON a.candidate_id = cand.id
      WHERE a.id = $1::uuid
    `
    const applicationRows = await DatabaseService.query(applicationQuery, [applicationId]) as any[]
    
    if (applicationRows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
    }

    const application = applicationRows[0]
    const jobId = application.job_id

    // Get evaluation criteria from job rounds
    const roundsQuery = `
      SELECT jr.name, jr.configuration
      FROM job_rounds jr
      WHERE jr.job_id = $1::uuid
      ORDER BY jr.seq ASC
    `
    const roundsRows = await DatabaseService.query(roundsQuery, [jobId]) as any[]

    // Extract criteria from all rounds
    const allCriteria = new Set<string>()
    roundsRows.forEach(round => {
      try {
        if (round.configuration) {
          const config = typeof round.configuration === 'string' 
            ? JSON.parse(round.configuration) 
            : round.configuration
          const criteria = config.criteria || []
          criteria.forEach((c: string) => allCriteria.add(c))
        }
      } catch (e) {
        console.error('Error parsing round configuration:', e)
      }
    })

    const criteriaList = Array.from(allCriteria)
    console.log('📊 Evaluation criteria:', criteriaList)

    // Call OpenAI API for evaluation
    const evaluationPrompt = `You are an expert HR evaluator. Analyze this interview transcript and provide scores for each criterion.

**Job Details:**
- Position: ${application.job_title}
- Company: ${application.company_name}
- Candidate: ${application.first_name} ${application.last_name}

**Evaluation Criteria:**
${criteriaList.map(c => `- ${c}`).join('\n')}

**Interview Transcript:**
${transcript}

**Instructions:**
1. Evaluate the candidate on each criterion using a scale of 1-10 (10 being excellent)
2. Provide specific feedback and examples from the transcript
3. Give an overall recommendation (Hire, Maybe, No Hire)

**Response Format (JSON):**
{
  "scores": {
    ${criteriaList.map(c => `"${c}": { "score": 0, "feedback": "specific feedback with examples" }`).join(',\n    ')}
  },
  "overall_score": 0,
  "recommendation": "Hire|Maybe|No Hire",
  "summary": "Overall assessment summary",
  "strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1", "area 2"]
}`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR evaluator. Analyze interview transcripts and provide detailed, objective evaluations.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('Failed to get evaluation from OpenAI')
    }

    const openaiData = await openaiResponse.json()
    const evaluationText = openaiData.choices[0]?.message?.content

    if (!evaluationText) {
      throw new Error('No evaluation received from OpenAI')
    }

    // Parse the JSON response
    let evaluation
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0])
      } else {
        evaluation = JSON.parse(evaluationText)
      }
    } catch (e) {
      console.error('Failed to parse evaluation JSON:', e)
      // Fallback evaluation structure
      evaluation = {
        scores: {},
        overall_score: 5,
        recommendation: 'Maybe',
        summary: 'Evaluation completed but failed to parse detailed scores.',
        strengths: ['Participated in interview'],
        areas_for_improvement: ['Detailed evaluation unavailable']
      }
    }

    // Store evaluation in database
    const evaluationData = {
      application_id: applicationId,
      scores: evaluation.scores || {},
      overall_score: evaluation.overall_score || 5,
      recommendation: evaluation.recommendation || 'Maybe',
      summary: evaluation.summary || '',
      strengths: evaluation.strengths || [],
      areas_for_improvement: evaluation.areas_for_improvement || [],
      evaluated_at: new Date().toISOString(),
      evaluation_criteria: criteriaList
    }

    // Update application with evaluation
    const updateQuery = `
      UPDATE applications 
      SET evaluation = $2::jsonb
      WHERE id = $1::uuid
      RETURNING id
    `
    
    await DatabaseService.query(updateQuery, [applicationId, JSON.stringify(evaluationData)])

    // Also store in the evaluations table linked to interview
    try {
      // Find the interview for this application
      const findInterviewQuery = `
        SELECT i.id as interview_id
        FROM interviews i
        JOIN application_rounds ar ON ar.id = i.application_round_id
        WHERE ar.application_id = $1::uuid
        ORDER BY i.completed_at DESC NULLS LAST, i.started_at DESC NULLS LAST
        LIMIT 1
      `
      const interviewRows = await DatabaseService.query(findInterviewQuery, [applicationId]) as any[]
      
      if (interviewRows && interviewRows.length > 0) {
        const interviewId = interviewRows[0].interview_id
        
        // Insert into evaluations table
        const insertEvaluationQuery = `
          INSERT INTO evaluations (
            interview_id,
            overall_score,
            skill_scores,
            recommendation,
            rubric_notes_md,
            created_at
          )
          VALUES ($1::uuid, $2::numeric, $3::jsonb, $4::rec_outcome, $5, NOW())
          ON CONFLICT (interview_id) DO UPDATE SET
            overall_score = EXCLUDED.overall_score,
            skill_scores = EXCLUDED.skill_scores,
            recommendation = EXCLUDED.recommendation,
            rubric_notes_md = EXCLUDED.rubric_notes_md,
            created_at = NOW()
          RETURNING id
        `
        
        // Map recommendation to enum values (hire, maybe, no_hire)
        let recOutcome = 'maybe'
        if (evaluation.recommendation) {
          const rec = evaluation.recommendation.toLowerCase()
          if (rec.includes('hire') && !rec.includes('no')) {
            recOutcome = 'hire'
          } else if (rec.includes('no') || rec.includes('reject')) {
            recOutcome = 'no_hire'
          }
        }
        
        const rubricNotes = [
          evaluation.summary || '',
          evaluation.strengths?.length ? `**Strengths:**\n${evaluation.strengths.map((s: string) => `- ${s}`).join('\n')}` : '',
          evaluation.areas_for_improvement?.length ? `**Areas for Improvement:**\n${evaluation.areas_for_improvement.map((a: string) => `- ${a}`).join('\n')}` : ''
        ].filter(Boolean).join('\n\n')
        
        await DatabaseService.query(insertEvaluationQuery, [
          interviewId,
          evaluation.overall_score || 5,
          JSON.stringify(evaluation.scores || {}),
          recOutcome,
          rubricNotes
        ])
        
        console.log('✅ Evaluation also stored in evaluations table for interview:', interviewId)
      } else {
        console.log('⚠️ No interview found for application, skipping evaluations table insert')
      }
    } catch (evalError) {
      console.error('❌ Failed to store in evaluations table:', evalError)
      // Don't fail the whole request if this fails
    }

    console.log('✅ Evaluation completed and stored for application:', applicationId)
    console.log('📊 Overall score:', evaluation.overall_score)
    console.log('🎯 Recommendation:', evaluation.recommendation)

    return NextResponse.json({
      ok: true,
      evaluation: evaluationData,
      message: 'Evaluation completed successfully'
    })

  } catch (err: any) {
    console.error('Error during evaluation:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 })
  }
}
