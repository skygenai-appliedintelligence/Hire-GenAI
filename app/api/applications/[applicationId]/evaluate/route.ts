import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId
    
    console.log('\n' + '='.repeat(80))
    console.log('🔍 EVALUATION API CALLED')
    console.log('='.repeat(80))
    console.log('📝 Application ID:', applicationId)
    
    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 })
    }

    const body = await req.json()
    const { transcript } = body

    console.log('📝 Transcript length:', transcript?.length || 0)
    console.log('📝 Transcript preview:', transcript?.substring(0, 200))

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
1. Evaluate the candidate on each criterion using a scale of 0-100 (100 being excellent)
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
}

Note: All scores should be on a scale of 0-100.`

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
      // Use mock evaluation data (scores out of 100)
      const mockEvaluation = {
        scores: criteriaList.reduce((acc, criterion) => {
          acc[criterion] = { score: 70, feedback: 'Good performance in this area based on interview responses.' }
          return acc
        }, {} as any),
        overall_score: 70,
        recommendation: 'Maybe',
        summary: 'Candidate showed good understanding of the role requirements and demonstrated relevant experience.',
        strengths: ['Good communication skills', 'Relevant technical knowledge', 'Professional demeanor'],
        areas_for_improvement: ['Could provide more specific examples', 'Deeper technical expertise needed']
      }
      
      // Skip to storing mock evaluation
      const evaluation = mockEvaluation
      
      // Jump to storage section (we'll refactor this into a function)
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

      // Find interview and store evaluation
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
        
        // Status column exists in evaluations table (added via migration)

        // Check if evaluation exists
        const checkEvaluationQuery = `SELECT id FROM evaluations WHERE interview_id = $1::uuid LIMIT 1`
        const existingEval = await DatabaseService.query(checkEvaluationQuery, [interviewId]) as any[]
        
        // Calculate Pass/Fail status for mock data
        const mockStatus = evaluation.overall_score >= 65 ? 'Pass' : 'Fail'
        
        let evaluationQuery: string
        if (existingEval && existingEval.length > 0) {
          evaluationQuery = `
            UPDATE evaluations
            SET overall_score = $2::decimal, skill_scores = $3::jsonb, recommendation = $4::rec_outcome, rubric_notes_md = $5, status = $6, created_at = NOW()
            WHERE interview_id = $1::uuid
            RETURNING id
          `
        } else {
          evaluationQuery = `
            INSERT INTO evaluations (interview_id, overall_score, skill_scores, recommendation, rubric_notes_md, status, created_at)
            VALUES ($1::uuid, $2::decimal, $3::jsonb, $4::rec_outcome, $5, $6, NOW())
            RETURNING id
          `
        }
        
        const recOutcome = 'on_hold'
        const rubricNotes = `
## Summary
${evaluation.summary}

## Strengths
${evaluation.strengths.map((s: string) => `- ${s}`).join('\n')}

## Areas for Improvement
${evaluation.areas_for_improvement.map((a: string) => `- ${a}`).join('\n')}

## Detailed Scores
${Object.entries(evaluation.scores).map(([criterion, data]: [string, any]) => 
  `- **${criterion}**: ${data.score}/100 - ${data.feedback}`
).join('\n')}
        `.trim()
        
        const evaluationResult = await DatabaseService.query(evaluationQuery, [
          interviewId,
          evaluation.overall_score,
          JSON.stringify(evaluation.scores),
          recOutcome,
          rubricNotes,
          mockStatus
        ]) as any[]
        
        console.log('✅ Mock evaluation stored in evaluations table:', evaluationResult[0]?.id)
        console.log(`📊 Mock candidate result: ${mockStatus} (Score: ${evaluation.overall_score}/100)`)
        if (mockStatus === 'Pass') {
          console.log('🎉 Mock candidate PASSED - will appear in Successful Hire tab!')
        } else {
          console.log('❌ Mock candidate FAILED - will NOT appear in Successful Hire tab')
        }
      }

      return NextResponse.json({
        ok: true,
        evaluation: evaluationData,
        message: 'Mock evaluation completed (OpenAI API key not configured)'
      })
    }

    console.log('🤖 Calling OpenAI API for evaluation...')
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
      const errorText = await openaiResponse.text()
      console.error('❌ OpenAI API error:', errorText)
      throw new Error(`Failed to get evaluation from OpenAI: ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    const evaluationText = openaiData.choices[0]?.message?.content

    if (!evaluationText) {
      throw new Error('No evaluation received from OpenAI')
    }
    
    console.log('✅ Received evaluation from OpenAI')

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
      
      // Status column now exists in evaluations table (added via migration)

      // Check if evaluation already exists for this interview
      const checkEvaluationQuery = `
        SELECT id FROM evaluations WHERE interview_id = $1::uuid LIMIT 1
      `
      const existingEval = await DatabaseService.query(checkEvaluationQuery, [interviewId]) as any[]
      
      // Calculate Pass/Fail status
      const status = (evaluation.overall_score || 0) >= 65 ? 'Pass' : 'Fail'
      
      let evaluationQuery: string
      
      if (existingEval && existingEval.length > 0) {
        // Update existing evaluation
        evaluationQuery = `
          UPDATE evaluations
          SET overall_score = $2::decimal,
              skill_scores = $3::jsonb,
              recommendation = $4::rec_outcome,
              rubric_notes_md = $5,
              status = $6,
              created_at = NOW()
          WHERE interview_id = $1::uuid
          RETURNING id
        `
      } else {
        // Insert new evaluation
        evaluationQuery = `
          INSERT INTO evaluations (
            interview_id,
            overall_score,
            skill_scores,
            recommendation,
            rubric_notes_md,
            status,
            created_at
          )
          VALUES ($1::uuid, $2::decimal, $3::jsonb, $4::rec_outcome, $5, $6, NOW())
          RETURNING id
        `
      }
      
      // Map recommendation to rec_outcome enum
      let recOutcome: string
      switch (evaluation.recommendation?.toLowerCase()) {
        case 'hire':
          recOutcome = 'next_round'
          break
        case 'no hire':
        case 'no_hire':
          recOutcome = 'unqualified'
          break
        case 'maybe':
        default:
          recOutcome = 'on_hold'
          break
      }
      
      // Create rubric notes from summary, strengths, and areas for improvement
      const rubricNotes = `
## Summary
${evaluation.summary || 'No summary provided'}

## Strengths
${(evaluation.strengths || []).map((s: string) => `- ${s}`).join('\n')}

## Areas for Improvement
${(evaluation.areas_for_improvement || []).map((a: string) => `- ${a}`).join('\n')}

## Detailed Scores
${Object.entries(evaluation.scores || {}).map(([criterion, data]: [string, any]) => 
  `- **${criterion}**: ${data.score}/100 - ${data.feedback}`
).join('\n')}
      `.trim()
      
      const evaluationResult = await DatabaseService.query(evaluationQuery, [
        interviewId,
        evaluation.overall_score || 5,
        JSON.stringify(evaluation.scores || {}),
        recOutcome,
        rubricNotes,
        status
      ]) as any[]
      
      console.log('✅ Evaluation stored in evaluations table:', evaluationResult[0]?.id)
      console.log(`📊 Candidate result: ${status} (Score: ${evaluation.overall_score || 5}/100)`)
      if (status === 'Pass') {
        console.log('🎉 Candidate PASSED - will appear in Successful Hire tab!')
      } else {
        console.log('❌ Candidate FAILED - will NOT appear in Successful Hire tab')
      }
      
      // Also store in interviews.metadata for backward compatibility
      const updateInterviewEvalQuery = `
        UPDATE interviews
        SET metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{evaluation}',
              $2::jsonb,
              true
            )
        WHERE id = $1::uuid
        RETURNING id
      `
      await DatabaseService.query(updateInterviewEvalQuery, [
        interviewId,
        JSON.stringify(evaluationData)
      ])
      console.log('✅ Evaluation also stored in interviews.metadata for interview:', interviewId)
    } else {
      console.log('⚠️ No interview found for application:', applicationId)
      throw new Error('No interview found for this application')
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
