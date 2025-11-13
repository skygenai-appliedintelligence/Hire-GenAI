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

    // Enhanced evaluation system with weighted categories and question-wise scoring
    const evaluationCategories = {
      "Technical Skills": { weight: 0.40, maxQuestions: 5 },
      "Communication": { weight: 0.20, maxQuestions: 3 },
      "Problem Solving": { weight: 0.25, maxQuestions: 4 },
      "Cultural Fit": { weight: 0.15, maxQuestions: 2 }
    }

    const totalMarks = 100
    const marksPerQuestion = 10

    // Call OpenAI API for evaluation
    const evaluationPrompt = `You are an expert HR evaluator. Analyze this interview transcript and provide detailed question-wise scores with weighted categories.

**Job Details:**
- Position: ${application.job_title}
- Company: ${application.company_name}
- Candidate: ${application.first_name} ${application.last_name}

**Evaluation Framework:**
Total Marks: ${totalMarks} (Each question scored out of ${marksPerQuestion} marks)

**Weighted Categories:**
${Object.entries(evaluationCategories).map(([category, config]) => 
  `- **${category}**: ${(config.weight * 100)}% weight, ${config.maxQuestions} questions max`
).join('\n')}

**Original Criteria from Job:**
${criteriaList.map(c => `- ${c}`).join('\n')}

**Interview Transcript:**
${transcript}

**Instructions:**
1. Identify specific questions asked in each category from the transcript
2. Score each question out of ${marksPerQuestion} marks based on candidate's response quality
3. Calculate category scores using weighted average
4. Provide detailed feedback for each question and category
5. Calculate final weighted overall score out of ${totalMarks}

**Response Format (JSON):**
{
  "question_analysis": {
    "Technical Skills": {
      "questions": [
        {
          "question": "Actual question asked",
          "candidate_response": "Key points from response",
          "score": 8,
          "max_score": ${marksPerQuestion},
          "feedback": "Detailed feedback on this specific answer"
        }
      ],
      "category_score": 0,
      "category_max": 0,
      "weight": ${evaluationCategories["Technical Skills"].weight}
    },
    "Communication": {
      "questions": [
        {
          "question": "Actual question asked",
          "candidate_response": "Key points from response", 
          "score": 7,
          "max_score": ${marksPerQuestion},
          "feedback": "Detailed feedback on this specific answer"
        }
      ],
      "category_score": 0,
      "category_max": 0,
      "weight": ${evaluationCategories["Communication"].weight}
    },
    "Problem Solving": {
      "questions": [
        {
          "question": "Actual question asked",
          "candidate_response": "Key points from response",
          "score": 6,
          "max_score": ${marksPerQuestion},
          "feedback": "Detailed feedback on this specific answer"
        }
      ],
      "category_score": 0,
      "category_max": 0,
      "weight": ${evaluationCategories["Problem Solving"].weight}
    },
    "Cultural Fit": {
      "questions": [
        {
          "question": "Actual question asked",
          "candidate_response": "Key points from response",
          "score": 9,
          "max_score": ${marksPerQuestion},
          "feedback": "Detailed feedback on this specific answer"
        }
      ],
      "category_score": 0,
      "category_max": 0,
      "weight": ${evaluationCategories["Cultural Fit"].weight}
    }
  },
  "weighted_calculation": {
    "technical_weighted": 0,
    "communication_weighted": 0,
    "problem_solving_weighted": 0,
    "cultural_fit_weighted": 0,
    "total_weighted_score": 0
  },
  "overall_score": 0,
  "recommendation": "Hire|Maybe|No Hire",
  "summary": "Overall assessment summary with scoring breakdown",
  "strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1", "area 2"],
  "scoring_details": "Explanation of how the final score was calculated"
}

**Important Notes:**
- Score each individual question out of ${marksPerQuestion} marks
- Calculate category scores as sum of question scores in that category
- Apply weights: Technical (40%), Communication (20%), Problem Solving (25%), Cultural Fit (15%)
- Final score = (Technical×0.4 + Communication×0.2 + Problem Solving×0.25 + Cultural Fit×0.15)
- If fewer questions exist in a category, adjust scoring proportionally
- Provide specific examples from transcript in feedback`

    // 🔑 Fetch company's OpenAI service account key from database
    let companyOpenAIKey: string | undefined = undefined
    try {
      const companyData = await DatabaseService.query(
        `SELECT c.openai_service_account_key FROM companies c
         JOIN jobs j ON j.company_id = c.id
         WHERE j.id = $1::uuid LIMIT 1`,
        [jobId]
      ) as any[]
      
      if (companyData && companyData.length > 0 && companyData[0].openai_service_account_key) {
        try {
          const keyObj = JSON.parse(companyData[0].openai_service_account_key)
          companyOpenAIKey = keyObj.value
          console.log('🔑 [INTERVIEW EVALUATION] Using company service account key from database')
        } catch (parseErr) {
          console.warn('🔑 [INTERVIEW EVALUATION] Failed to parse company service account key:', parseErr)
        }
      }
    } catch (fetchErr) {
      console.warn('🔑 [INTERVIEW EVALUATION] Failed to fetch company service account key:', fetchErr)
    }

    // Determine which API key to use
    const apiKeyToUse = companyOpenAIKey || process.env.OPENAI_API_KEY
    
    // Check if OpenAI API key is configured
    if (!apiKeyToUse) {
      console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
      // Use enhanced mock evaluation data with question-wise scoring
      const mockEvaluation = {
        question_analysis: {
          "Technical Skills": {
            questions: [
              {
                question: "Can you explain your experience with React and state management?",
                candidate_response: "Discussed Redux and Context API usage in previous projects",
                score: 8,
                max_score: 10,
                feedback: "Good understanding of state management concepts, provided relevant examples"
              },
              {
                question: "How would you optimize a slow-loading web application?",
                candidate_response: "Mentioned code splitting, lazy loading, and performance monitoring",
                score: 7,
                max_score: 10,
                feedback: "Solid knowledge of optimization techniques, could elaborate more on implementation"
              }
            ],
            category_score: 15,
            category_max: 20,
            weight: 0.40
          },
          "Communication": {
            questions: [
              {
                question: "Tell me about a challenging project you worked on",
                candidate_response: "Clearly explained project scope, challenges, and solutions",
                score: 8,
                max_score: 10,
                feedback: "Excellent storytelling and clear communication of complex technical concepts"
              }
            ],
            category_score: 8,
            category_max: 10,
            weight: 0.20
          },
          "Problem Solving": {
            questions: [
              {
                question: "How would you approach debugging a production issue?",
                candidate_response: "Systematic approach: logs, monitoring, reproduction, fix, testing",
                score: 7,
                max_score: 10,
                feedback: "Good systematic approach, demonstrated logical thinking process"
              }
            ],
            category_score: 7,
            category_max: 10,
            weight: 0.25
          },
          "Cultural Fit": {
            questions: [
              {
                question: "How do you handle working in a team environment?",
                candidate_response: "Emphasized collaboration, communication, and shared responsibility",
                score: 9,
                max_score: 10,
                feedback: "Strong team player mentality, aligns well with company values"
              }
            ],
            category_score: 9,
            category_max: 10,
            weight: 0.15
          }
        },
        weighted_calculation: {
          technical_weighted: (15/20) * 0.40 * 100, // 30
          communication_weighted: (8/10) * 0.20 * 100, // 16
          problem_solving_weighted: (7/10) * 0.25 * 100, // 17.5
          cultural_fit_weighted: (9/10) * 0.15 * 100, // 13.5
          total_weighted_score: 77
        },
        overall_score: 77,
        recommendation: 'Hire',
        summary: 'Strong candidate with good technical skills and excellent cultural fit. Demonstrates solid problem-solving abilities and clear communication.',
        strengths: ['Strong technical foundation', 'Excellent communication skills', 'Good cultural alignment', 'Systematic problem-solving approach'],
        areas_for_improvement: ['Could deepen technical expertise in advanced topics', 'More specific examples in optimization techniques'],
        scoring_details: 'Technical Skills: 15/20 (75%) × 40% = 30 points, Communication: 8/10 (80%) × 20% = 16 points, Problem Solving: 7/10 (70%) × 25% = 17.5 points, Cultural Fit: 9/10 (90%) × 15% = 13.5 points. Total: 77/100'
      }
      
      // Skip to storing mock evaluation
      const evaluation = mockEvaluation
      
      // Jump to storage section (we'll refactor this into a function)
      const evaluationData = {
        application_id: applicationId,
        scores: evaluation.question_analysis || {},
        overall_score: evaluation.overall_score || 5,
        recommendation: evaluation.recommendation || 'Maybe',
        summary: evaluation.summary || '',
        strengths: evaluation.strengths || [],
        areas_for_improvement: evaluation.areas_for_improvement || [],
        evaluated_at: new Date().toISOString(),
        evaluation_criteria: criteriaList,
        weighted_calculation: evaluation.weighted_calculation || {},
        scoring_details: evaluation.scoring_details || ''
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

## Detailed Scores by Category
${Object.entries(evaluation.question_analysis || {}).map(([category, categoryData]: [string, any]) => {
  const questions = categoryData.questions || [];
  const categoryScore = questions.reduce((sum: number, q: any) => sum + (q.score || 0), 0);
  const categoryMax = questions.reduce((sum: number, q: any) => sum + (q.max_score || 10), 0);
  const percentage = categoryMax > 0 ? Math.round((categoryScore / categoryMax) * 100) : 0;
  
  return `### ${category} (${categoryScore}/${categoryMax} - ${percentage}%)
${questions.map((q: any) => `- **Q:** ${q.question}\n  **A:** ${q.candidate_response}\n  **Score:** ${q.score}/${q.max_score} - ${q.feedback}`).join('\n\n')}`;
}).join('\n\n')}
        `.trim()
        
        const evaluationResult = await DatabaseService.query(evaluationQuery, [
          interviewId,
          evaluation.overall_score,
          JSON.stringify(evaluation.question_analysis || {}),
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
        'Authorization': `Bearer ${apiKeyToUse}`,
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
      
      // Normalize the evaluation response to ensure it has the correct format
      evaluation = normalizeEvaluationResponse(evaluation)
      
    } catch (e) {
      console.error('Failed to parse evaluation JSON:', e)
      // Fallback evaluation structure in new format
      evaluation = {
        question_analysis: {
          "Technical Skills": {
            questions: [{
              question: "General technical assessment",
              candidate_response: "Unable to parse detailed response",
              score: 5,
              max_score: 10,
              feedback: "Evaluation parsing failed, using fallback score"
            }],
            category_score: 5,
            category_max: 10,
            weight: 0.40
          },
          "Communication": {
            questions: [{
              question: "General communication assessment", 
              candidate_response: "Unable to parse detailed response",
              score: 5,
              max_score: 10,
              feedback: "Evaluation parsing failed, using fallback score"
            }],
            category_score: 5,
            category_max: 10,
            weight: 0.20
          },
          "Problem Solving": {
            questions: [{
              question: "General problem solving assessment",
              candidate_response: "Unable to parse detailed response", 
              score: 5,
              max_score: 10,
              feedback: "Evaluation parsing failed, using fallback score"
            }],
            category_score: 5,
            category_max: 10,
            weight: 0.25
          },
          "Cultural Fit": {
            questions: [{
              question: "General cultural fit assessment",
              candidate_response: "Unable to parse detailed response",
              score: 5, 
              max_score: 10,
              feedback: "Evaluation parsing failed, using fallback score"
            }],
            category_score: 5,
            category_max: 10,
            weight: 0.15
          }
        },
        weighted_calculation: {
          technical_weighted: 20,
          communication_weighted: 10,
          problem_solving_weighted: 12.5,
          cultural_fit_weighted: 7.5,
          total_weighted_score: 50
        },
        overall_score: 50,
        recommendation: 'Maybe',
        summary: 'Evaluation completed but failed to parse detailed scores.',
        strengths: ['Participated in interview'],
        areas_for_improvement: ['Detailed evaluation unavailable'],
        scoring_details: 'Fallback scoring used due to parsing error'
      }
    }

    // Store evaluation in database
    const evaluationData = {
      application_id: applicationId,
      scores: evaluation.question_analysis || {},
      overall_score: evaluation.overall_score || 5,
      recommendation: evaluation.recommendation || 'Maybe',
      summary: evaluation.summary || '',
      strengths: evaluation.strengths || [],
      areas_for_improvement: evaluation.areas_for_improvement || [],
      evaluated_at: new Date().toISOString(),
      evaluation_criteria: criteriaList,
      weighted_calculation: evaluation.weighted_calculation || {},
      scoring_details: evaluation.scoring_details || ''
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

## Detailed Scores by Category
${Object.entries(evaluation.question_analysis || {}).map(([category, categoryData]: [string, any]) => {
  const questions = categoryData.questions || [];
  const categoryScore = questions.reduce((sum: number, q: any) => sum + (q.score || 0), 0);
  const categoryMax = questions.reduce((sum: number, q: any) => sum + (q.max_score || 10), 0);
  const percentage = categoryMax > 0 ? Math.round((categoryScore / categoryMax) * 100) : 0;
  
  return `### ${category} (${categoryScore}/${categoryMax} - ${percentage}%)
${questions.map((q: any) => `- **Q:** ${q.question}\n  **A:** ${q.candidate_response}\n  **Score:** ${q.score}/${q.max_score} - ${q.feedback}`).join('\n\n')}`;
}).join('\n\n')}

## Scoring Details
${evaluation.scoring_details || 'No detailed scoring breakdown available'}
      `.trim()
      
      const evaluationResult = await DatabaseService.query(evaluationQuery, [
        interviewId,
        evaluation.overall_score || 5,
        JSON.stringify(evaluation.question_analysis || {}),
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

// Helper function to calculate weighted scores from question analysis
function calculateWeightedScore(questionAnalysis: any): number {
  const categories = {
    "Technical Skills": 0.40,
    "Communication": 0.20,
    "Problem Solving": 0.25,
    "Cultural Fit": 0.15
  }

  let totalWeightedScore = 0
  let totalWeight = 0

  Object.entries(categories).forEach(([categoryName, weight]) => {
    const categoryData = questionAnalysis[categoryName]
    if (categoryData && categoryData.questions && categoryData.questions.length > 0) {
      const questions = categoryData.questions
      const categoryScore = questions.reduce((sum: number, q: any) => sum + (q.score || 0), 0)
      const categoryMax = questions.reduce((sum: number, q: any) => sum + (q.max_score || 10), 0)
      
      if (categoryMax > 0) {
        const categoryPercentage = (categoryScore / categoryMax) * 100
        totalWeightedScore += categoryPercentage * weight
        totalWeight += weight
      }
    }
  })

  // Normalize if not all categories are present
  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0
}

// Helper function to ensure evaluation response has the correct format
function normalizeEvaluationResponse(evaluation: any): any {
  // If it's already in the new format, return as is
  if (evaluation.question_analysis) {
    return evaluation
  }

  // If it's in the old format, convert it
  if (evaluation.scores) {
    const questionAnalysis: any = {
      "Technical Skills": { questions: [], category_score: 0, category_max: 0, weight: 0.40 },
      "Communication": { questions: [], category_score: 0, category_max: 0, weight: 0.20 },
      "Problem Solving": { questions: [], category_score: 0, category_max: 0, weight: 0.25 },
      "Cultural Fit": { questions: [], category_score: 0, category_max: 0, weight: 0.15 }
    }

    // Convert old scores to new format (best effort)
    Object.entries(evaluation.scores).forEach(([criterion, data]: [string, any]) => {
      const question = {
        question: `Assessment of ${criterion}`,
        candidate_response: "Based on overall interview performance",
        score: Math.round((data.score || 0) / 10), // Convert from 100 scale to 10 scale
        max_score: 10,
        feedback: data.feedback || "No specific feedback provided"
      }

      // Try to categorize the criterion
      const lowerCriterion = criterion.toLowerCase()
      if (lowerCriterion.includes('technical') || lowerCriterion.includes('coding') || lowerCriterion.includes('programming')) {
        questionAnalysis["Technical Skills"].questions.push(question)
      } else if (lowerCriterion.includes('communication') || lowerCriterion.includes('presentation')) {
        questionAnalysis["Communication"].questions.push(question)
      } else if (lowerCriterion.includes('problem') || lowerCriterion.includes('analytical')) {
        questionAnalysis["Problem Solving"].questions.push(question)
      } else {
        questionAnalysis["Cultural Fit"].questions.push(question)
      }
    })

    // Calculate category scores
    Object.keys(questionAnalysis).forEach(category => {
      const questions = questionAnalysis[category].questions
      questionAnalysis[category].category_score = questions.reduce((sum: number, q: any) => sum + q.score, 0)
      questionAnalysis[category].category_max = questions.reduce((sum: number, q: any) => sum + q.max_score, 0)
    })

    return {
      ...evaluation,
      question_analysis: questionAnalysis,
      weighted_calculation: {
        technical_weighted: 0,
        communication_weighted: 0,
        problem_solving_weighted: 0,
        cultural_fit_weighted: 0,
        total_weighted_score: calculateWeightedScore(questionAnalysis)
      },
      scoring_details: "Converted from legacy format to new weighted scoring system"
    }
  }

  return evaluation
}
