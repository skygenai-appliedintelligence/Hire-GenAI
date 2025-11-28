import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dynamic criteria-based evaluation constants
const TOTAL_MARKS = 100
const DEFAULT_TOTAL_QUESTIONS = 10

// All possible evaluation criteria with default weights
const ALL_CRITERIA = {
  "Technical Skills": { weight: 0.40, description: "Technical knowledge, coding, frameworks, tools" },
  "Communication": { weight: 0.25, description: "Clarity, articulation, listening skills" },
  "Problem Solving": { weight: 0.20, description: "Analytical thinking, debugging, approach" },
  "Cultural Fit": { weight: 0.15, description: "Teamwork, values, collaboration" }
}

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

    // Log transcript info (no validation - evaluate regardless of question count)
    console.log('📊 Transcript received, proceeding with evaluation...')
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

    // Get company ID for fetching service account key
    const companyQuery = `SELECT company_id FROM jobs WHERE id = $1::uuid`
    const companyRows = await DatabaseService.query(companyQuery, [jobId]) as any[]
    const companyId = companyRows[0]?.company_id

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

    // DYNAMIC CRITERIA-BASED EVALUATION
    // The system identifies the correct criteria for EACH question
    // Final score is calculated ONLY from criteria actually used
    // No unused criteria (like Cultural Fit) if no questions asked for it
    
    console.log('📊 Starting dynamic criteria-based evaluation...')

    // Call OpenAI API for evaluation with DYNAMIC CRITERIA
    const evaluationPrompt = `You are an expert HR evaluator. Analyze this interview transcript and provide detailed, criteria-based scoring.

**CRITICAL EVALUATION PRINCIPLE:**
You must ONLY evaluate based on criteria that have actual questions in the interview.
If there are 8 Technical questions and 2 Communication questions, the final score should ONLY consider Technical and Communication - NOT Cultural Fit or any other criteria that had no questions.

**Job Details:**
- Position: ${application.job_title}
- Company: ${application.company_name}
- Candidate: ${application.first_name} ${application.last_name}

**Original Evaluation Criteria from Job:**
${criteriaList.map(c => `- ${c}`).join('\n')}

**Interview Transcript:**
${transcript}

**STEP-BY-STEP EVALUATION PROCESS:**

**STEP 1: EXTRACT ALL QUESTIONS**
Identify EVERY question asked in the transcript (may be more or less than 10).

**STEP 2: CATEGORIZE EACH QUESTION**
For EACH question, determine its criteria based on content:
- **Technical Skills**: Coding, programming, frameworks, tools, databases, architecture, APIs, algorithms, system design
- **Communication**: Explaining concepts, presenting ideas, describing experiences, clarity of expression
- **Problem Solving**: Debugging, troubleshooting, analytical thinking, approach to challenges
- **Cultural Fit**: Teamwork, collaboration, values, work style, motivation

**STEP 3: EVALUATE EACH ANSWER**
For each question-answer pair:
- Score from 0-100 based on answer quality
- Document WHY this score was given (specific evidence from transcript)
- Note if answer was complete, partial, or missing

**STEP 4: CALCULATE CATEGORY SCORES**
For each criteria that has questions:
- Average the scores of all questions in that criteria
- This becomes the criteria score (0-100)

**STEP 5: CALCULATE FINAL WEIGHTED SCORE**
**IMPORTANT:** Only include criteria that actually have questions!
- If 8 questions are Technical and 2 are Communication: 
  - Technical weight: 8/10 = 80%
  - Communication weight: 2/10 = 20%
  - Cultural Fit weight: 0% (no questions)
- Final Score = (Technical_Score × 0.80) + (Communication_Score × 0.20)

**Response Format (JSON):**
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Exact question from transcript",
      "criteria": "Technical Skills",
      "criteria_reasoning": "Why this question falls under Technical Skills",
      "score": 85,
      "max_score": 100,
      "answered": true,
      "candidate_response": "Summary of candidate's answer",
      "evaluation_reasoning": "Detailed explanation of why this score was given, citing specific parts of the answer",
      "strengths_in_answer": ["Specific strength 1", "Specific strength 2"],
      "gaps_in_answer": ["What was missing or could be improved"]
    }
  ],
  "criteria_breakdown": {
    "Technical Skills": {
      "question_count": 8,
      "average_score": 75,
      "weight_percentage": 80,
      "weighted_contribution": 60,
      "summary": "Strong technical foundation with good framework knowledge"
    },
    "Communication": {
      "question_count": 2,
      "average_score": 70,
      "weight_percentage": 20,
      "weighted_contribution": 14,
      "summary": "Clear communication but could elaborate more"
    }
  },
  "categories_used": ["Technical Skills", "Communication"],
  "categories_not_used": ["Cultural Fit", "Problem Solving"],
  "final_score_calculation": {
    "formula": "(Technical: 75 × 80%) + (Communication: 70 × 20%)",
    "breakdown": [
      { "criteria": "Technical Skills", "score": 75, "weight": 0.80, "contribution": 60 },
      { "criteria": "Communication", "score": 70, "weight": 0.20, "contribution": 14 }
    ],
    "total": 74
  },
  "overall_score": 74,
  "recommendation": "Hire|Maybe|No Hire",
  "summary": "Overall assessment based ONLY on criteria evaluated",
  "strengths": [
    { "point": "Strong technical knowledge", "category": "Technical Skills", "evidence": ["Demonstrated deep React knowledge", "Explained hooks correctly"] }
  ],
  "areas_for_improvement": [
    { "point": "Could elaborate more", "category": "Communication", "evidence": ["Answers were brief"], "improvement_suggestion": "Practice expanding on technical explanations" }
  ],
  "scoring_explanation": "Final score of 74% calculated from Technical Skills (80% weight, 75 score) and Communication (20% weight, 70 score). Cultural Fit and Problem Solving were not evaluated as no questions were asked in these categories."
}

**CRITICAL RULES:**
1. ONLY include criteria in final score that have actual questions
2. Weight each criteria by (number of questions in that criteria / total questions)
3. Each question must have detailed reasoning for its score
4. Reference SPECIFIC parts of candidate's answers as evidence
5. Do NOT assume or invent categories that had no questions
6. The sum of all weight_percentages must equal 100%
7. Be specific in feedback - cite actual words/phrases from transcript`

    // Fetch company's OpenAI service account key from database (like CV parsing and video interviews)
    let openaiApiKey: string | undefined = undefined
    let openaiProjectId: string | undefined = undefined
    
    if (companyId) {
      try {
        const companyData = await DatabaseService.query(
          `SELECT openai_service_account_key, openai_project_id FROM companies WHERE id = $1::uuid LIMIT 1`,
          [companyId]
        ) as any[]
        
        if (companyData && companyData.length > 0 && companyData[0].openai_service_account_key) {
          try {
            // Decrypt the encrypted key using ENCRYPTION_KEY from .env
            const encryptedKey = companyData[0].openai_service_account_key
            console.log('🔑 [INTERVIEW EVAL] Encrypted key format:', encryptedKey.substring(0, 50) + '...')
            
            const decryptedKey = decrypt(encryptedKey)
            const trimmedKey = decryptedKey.trim()
            
            // Check if it's a JSON object (starts with {)
            if (trimmedKey.startsWith('{')) {
              try {
                const keyObj = JSON.parse(trimmedKey)
                console.log('🔑 [INTERVIEW EVAL] JSON keys available:', Object.keys(keyObj))
                
                // Extract the actual API key from the JSON object
                openaiApiKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || (typeof keyObj === 'string' ? keyObj : null)
                
                if (!openaiApiKey && keyObj.id) {
                  openaiApiKey = keyObj.id
                }
                
                console.log('🔑 [INTERVIEW EVAL] Extracted API key from JSON object')
              } catch (jsonErr) {
                openaiApiKey = trimmedKey
                console.log('🔑 [INTERVIEW EVAL] Could not parse JSON, using raw decrypted value')
              }
            } else {
              openaiApiKey = trimmedKey
              console.log('🔑 [INTERVIEW EVAL] Using plain string API key')
            }
            
            // Get project ID if available
            if (companyData[0].openai_project_id) {
              try {
                openaiProjectId = decrypt(companyData[0].openai_project_id)
                console.log('🔑 [INTERVIEW EVAL] Using company project ID:', openaiProjectId?.substring(0, 20) + '...')
              } catch (e) {
                openaiProjectId = companyData[0].openai_project_id
              }
            }
            
            console.log('✅ [INTERVIEW EVAL] Using company service account key from database')
            if (openaiApiKey) {
              console.log('🔑 [INTERVIEW EVAL] API key length:', openaiApiKey.length)
              console.log('🔑 [INTERVIEW EVAL] Key starts with:', openaiApiKey.substring(0, 10))
            }
          } catch (decryptErr) {
            console.warn('⚠️ [INTERVIEW EVAL] Failed to decrypt company service account key:', decryptErr)
          }
        }
      } catch (fetchErr) {
        console.warn('⚠️ [INTERVIEW EVAL] Failed to fetch company service account key:', fetchErr)
      }
    }

    // Fallback to environment variable if no company key
    if (!openaiApiKey) {
      openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
      if (openaiApiKey) {
        console.log('🔑 [INTERVIEW EVAL] Using environment OPENAI_API_KEY for evaluation')
      }
    }

    // Check if OpenAI API key is configured
    if (!openaiApiKey) {
      console.warn('⚠️ [INTERVIEW EVAL] No OpenAI API key configured (no company key, no env key), using mock evaluation')
      // Use school-exam style scoring: each question has different marks based on importance
      const mockEvaluation = {
        questions: [
          // Technical Skills - 40 marks total (4 questions)
          { question_number: 1, question_text: "Can you explain your experience with React and state management?", category: "Technical Skills", max_marks: 15, marks_obtained: 12, answered: true, candidate_response: "Discussed Redux and Context API usage in previous projects", feedback: "Good understanding of state management. Lost 3 marks for not mentioning newer solutions." },
          { question_number: 2, question_text: "How would you optimize a slow-loading web application?", category: "Technical Skills", max_marks: 12, marks_obtained: 9, answered: true, candidate_response: "Mentioned code splitting, lazy loading, and performance monitoring", feedback: "Solid knowledge of optimization techniques." },
          { question_number: 3, question_text: "What is your experience with serverless architecture?", category: "Technical Skills", max_marks: 8, marks_obtained: 0, answered: false, candidate_response: "Vague response: 'Hmm'", feedback: "No substantive answer provided. 0 marks." },
          { question_number: 4, question_text: "Explain the difference between SQL and NoSQL databases", category: "Technical Skills", max_marks: 5, marks_obtained: 0, answered: false, candidate_response: "Not asked", feedback: "Question not asked during interview." },
          // Problem Solving - 25 marks total (2 questions)
          { question_number: 5, question_text: "How would you approach debugging a production issue?", category: "Problem Solving", max_marks: 15, marks_obtained: 11, answered: true, candidate_response: "Systematic approach: logs, monitoring, reproduction, fix, testing", feedback: "Good systematic approach. Could improve on rollback strategies." },
          { question_number: 6, question_text: "Describe a time when you solved a complex technical problem", category: "Problem Solving", max_marks: 10, marks_obtained: 0, answered: false, candidate_response: "Not asked", feedback: "Question not asked during interview." },
          // Communication - 20 marks total (2 questions)
          { question_number: 7, question_text: "Tell me about a challenging project you worked on", category: "Communication", max_marks: 12, marks_obtained: 10, answered: true, candidate_response: "Clearly explained project scope, challenges, and solutions", feedback: "Excellent storytelling and clear communication." },
          { question_number: 8, question_text: "How do you explain technical concepts to non-technical stakeholders?", category: "Communication", max_marks: 8, marks_obtained: 0, answered: false, candidate_response: "Not asked", feedback: "Question not asked during interview." },
          // Cultural Fit - 15 marks total (2 questions)
          { question_number: 9, question_text: "How do you handle working in a team environment?", category: "Cultural Fit", max_marks: 8, marks_obtained: 7, answered: true, candidate_response: "Emphasized collaboration and shared responsibility", feedback: "Strong team player mentality." },
          { question_number: 10, question_text: "Tell me about a time you had a conflict with a team member", category: "Cultural Fit", max_marks: 7, marks_obtained: 0, answered: false, candidate_response: "Not asked", feedback: "Question not asked during interview." }
        ],
        marks_summary: {
          total_max_marks: 100,
          total_obtained: 49, // 12+9+0+0+11+0+10+0+7+0 = 49
          percentage: 49,
          questions_asked: 6,
          questions_answered: 5,
          by_category: {
            "Technical Skills": { max: 40, obtained: 21 },
            "Problem Solving": { max: 25, obtained: 11 },
            "Communication": { max: 20, obtained: 10 },
            "Cultural Fit": { max: 15, obtained: 7 }
          }
        },
        overall_score: 49,
        recommendation: 'Maybe',
        summary: 'Candidate scored 49/100. Only 5 out of 10 questions were properly answered. Technical skills decent (21/40) but many questions unanswered.',
        strengths: ['Good React/state management knowledge', 'Clear communication skills', 'Systematic debugging approach'],
        areas_for_improvement: ['Many questions unanswered', 'Needs to elaborate more on technical topics'],
        scoring_explanation: 'Score calculated like school exam: Q1(12/15) + Q2(9/12) + Q3(0/8) + Q4(0/5) + Q5(11/15) + Q6(0/10) + Q7(10/12) + Q8(0/8) + Q9(7/8) + Q10(0/7) = 49/100 = 49%'
      }
      
      // Skip to storing mock evaluation
      const evaluation = mockEvaluation
      
      // Convert new format to storage format
      const evaluationData = {
        application_id: applicationId,
        scores: evaluation.questions || [],
        overall_score: evaluation.overall_score || 0,
        recommendation: evaluation.recommendation || 'Maybe',
        summary: evaluation.summary || '',
        strengths: evaluation.strengths || [],
        areas_for_improvement: evaluation.areas_for_improvement || [],
        evaluated_at: new Date().toISOString(),
        evaluation_criteria: criteriaList,
        marks_summary: evaluation.marks_summary || {},
        scoring_explanation: evaluation.scoring_explanation || ''
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
        
        // Group questions by category for display
        const questionsByCategory: Record<string, any[]> = {}
        evaluation.questions.forEach((q: any) => {
          if (!questionsByCategory[q.category]) {
            questionsByCategory[q.category] = []
          }
          questionsByCategory[q.category].push(q)
        })
        
        const rubricNotes = `
## Summary
${evaluation.summary}

## Marks Summary
- **Total Marks:** ${evaluation.marks_summary.total_obtained}/${evaluation.marks_summary.total_max_marks} (${evaluation.marks_summary.percentage}%)
- **Questions Asked:** ${evaluation.marks_summary.questions_asked}/${evaluation.questions?.length || DEFAULT_TOTAL_QUESTIONS}
- **Questions Answered:** ${evaluation.marks_summary.questions_answered}/${evaluation.questions?.length || DEFAULT_TOTAL_QUESTIONS}

## Strengths
${evaluation.strengths.map((s: string) => `- ${s}`).join('\n')}

## Areas for Improvement
${evaluation.areas_for_improvement.map((a: string) => `- ${a}`).join('\n')}

## Detailed Scores by Question (School Exam Style)
${evaluation.questions.map((q: any) => 
  `### Q${q.question_number}: ${q.question_text}
- **Category:** ${q.category}
- **Marks:** ${q.marks_obtained}/${q.max_marks} ${q.answered ? '✓' : '✗ (Not answered)'}
- **Response:** ${q.candidate_response}
- **Feedback:** ${q.feedback}`
).join('\n\n')}

## Category Breakdown
${Object.entries(evaluation.marks_summary.by_category).map(([cat, data]: [string, any]) => 
  `- **${cat}:** ${data.obtained}/${data.max} marks`
).join('\n')}

## Scoring Explanation
${evaluation.scoring_explanation}
        `.trim()
        
        const evaluationResult = await DatabaseService.query(evaluationQuery, [
          interviewId,
          evaluation.overall_score,
          JSON.stringify({ questions: evaluation.questions, marks_summary: evaluation.marks_summary }),
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

    console.log('🤖 [INTERVIEW EVAL] Calling OpenAI API for evaluation...')
    console.log('🔑 [INTERVIEW EVAL] Using API key:', openaiApiKey.substring(0, 15) + '...')
    
    // Build headers with project ID if available (for proper attribution)
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    }
    if (openaiProjectId) {
      headers['OpenAI-Project'] = openaiProjectId
      console.log('🔑 [INTERVIEW EVAL] Using OpenAI-Project header:', openaiProjectId)
    }
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
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
      // Fallback evaluation structure in new school-exam format
      evaluation = {
        questions: [
          { question_number: 1, question_text: "General assessment", category: "Technical Skills", max_marks: 40, marks_obtained: 20, answered: true, candidate_response: "Unable to parse", feedback: "Fallback score" },
          { question_number: 2, question_text: "General assessment", category: "Problem Solving", max_marks: 25, marks_obtained: 12, answered: true, candidate_response: "Unable to parse", feedback: "Fallback score" },
          { question_number: 3, question_text: "General assessment", category: "Communication", max_marks: 20, marks_obtained: 10, answered: true, candidate_response: "Unable to parse", feedback: "Fallback score" },
          { question_number: 4, question_text: "General assessment", category: "Cultural Fit", max_marks: 15, marks_obtained: 8, answered: true, candidate_response: "Unable to parse", feedback: "Fallback score" }
        ],
        marks_summary: {
          total_max_marks: 100,
          total_obtained: 50,
          percentage: 50,
          questions_asked: 4,
          questions_answered: 4,
          by_category: {
            "Technical Skills": { max: 40, obtained: 20 },
            "Problem Solving": { max: 25, obtained: 12 },
            "Communication": { max: 20, obtained: 10 },
            "Cultural Fit": { max: 15, obtained: 8 }
          }
        },
        overall_score: 50,
        recommendation: 'Maybe',
        summary: 'Evaluation completed but failed to parse detailed scores.',
        strengths: ['Participated in interview'],
        areas_for_improvement: ['Detailed evaluation unavailable'],
        scoring_explanation: 'Fallback scoring used due to parsing error'
      }
    }

    // Store evaluation in database
    const evaluationData = {
      application_id: applicationId,
      scores: evaluation.questions || [],
      overall_score: evaluation.overall_score || 0,
      recommendation: evaluation.recommendation || 'Maybe',
      summary: evaluation.summary || '',
      strengths: evaluation.strengths || [],
      areas_for_improvement: evaluation.areas_for_improvement || [],
      evaluated_at: new Date().toISOString(),
      evaluation_criteria: criteriaList,
      marks_summary: evaluation.marks_summary || {},
      scoring_explanation: evaluation.scoring_explanation || ''
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
      
      // Create rubric notes from summary, strengths, and areas for improvement (new school-exam format)
      const marksSummary = evaluation.marks_summary || { total_max_marks: 100, total_obtained: 0, percentage: 0, questions_asked: 0, questions_answered: 0, by_category: {} }
      const rubricNotes = `
## Summary
${evaluation.summary || 'No summary provided'}

## Marks Summary
- **Total Marks:** ${marksSummary.total_obtained}/${marksSummary.total_max_marks} (${marksSummary.percentage}%)
- **Questions Asked:** ${marksSummary.questions_asked}/10
- **Questions Answered:** ${marksSummary.questions_answered}/10

## Strengths
${(evaluation.strengths || []).map((s: string) => `- ${s}`).join('\n')}

## Areas for Improvement
${(evaluation.areas_for_improvement || []).map((a: string) => `- ${a}`).join('\n')}

## Detailed Scores by Question (School Exam Style)
${(evaluation.questions || []).map((q: any) => 
  `### Q${q.question_number}: ${q.question_text}
- **Category:** ${q.category}
- **Marks:** ${q.marks_obtained}/${q.max_marks} ${q.answered ? '✓' : '✗ (Not answered)'}
- **Response:** ${q.candidate_response}
- **Feedback:** ${q.feedback}`
).join('\n\n')}

## Category Breakdown
${Object.entries(marksSummary.by_category || {}).map(([cat, data]: [string, any]) => 
  `- **${cat}:** ${data.obtained}/${data.max} marks`
).join('\n')}

## Scoring Explanation
${evaluation.scoring_explanation || 'No detailed scoring breakdown available'}
      `.trim()
      
      const evaluationResult = await DatabaseService.query(evaluationQuery, [
        interviewId,
        evaluation.overall_score || 0,
        JSON.stringify({ questions: evaluation.questions || [], marks_summary: marksSummary }),
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

// Helper function to calculate criteria-based weighted score
// Only considers criteria that have actual questions
function calculateCriteriaBasedScore(questions: any[]): {
  overall_score: number,
  criteria_breakdown: Record<string, any>,
  categories_used: string[],
  categories_not_used: string[],
  final_score_calculation: any
} {
  // Group questions by criteria
  const byCategory: Record<string, any[]> = {}
  questions.forEach((q: any) => {
    const criteria = q.criteria || q.category || 'General'
    if (!byCategory[criteria]) {
      byCategory[criteria] = []
    }
    byCategory[criteria].push(q)
  })
  
  // Calculate scores for each criteria that has questions
  const totalQuestions = questions.length
  const criteriaBreakdown: Record<string, any> = {}
  const breakdown: any[] = []
  let finalScore = 0
  
  Object.entries(byCategory).forEach(([criteria, criteriaQuestions]) => {
    const questionCount = criteriaQuestions.length
    const weightPercentage = Math.round((questionCount / totalQuestions) * 100)
    const weight = questionCount / totalQuestions
    
    // Calculate average score for this criteria
    const totalScore = criteriaQuestions.reduce((sum, q) => sum + (q.score || 0), 0)
    const averageScore = Math.round(totalScore / questionCount)
    const weightedContribution = Math.round(averageScore * weight)
    
    criteriaBreakdown[criteria] = {
      question_count: questionCount,
      average_score: averageScore,
      weight_percentage: weightPercentage,
      weighted_contribution: weightedContribution,
      summary: `${questionCount} question(s) evaluated with average score of ${averageScore}%`
    }
    
    breakdown.push({
      criteria,
      score: averageScore,
      weight: weight,
      contribution: weightedContribution
    })
    
    finalScore += weightedContribution
  })
  
  // Determine used and unused categories
  const allPossibleCategories = ['Technical Skills', 'Communication', 'Problem Solving', 'Cultural Fit']
  const categoriesUsed = Object.keys(byCategory)
  const categoriesNotUsed = allPossibleCategories.filter(c => !categoriesUsed.includes(c))
  
  return {
    overall_score: finalScore,
    criteria_breakdown: criteriaBreakdown,
    categories_used: categoriesUsed,
    categories_not_used: categoriesNotUsed,
    final_score_calculation: {
      formula: breakdown.map(b => `(${b.criteria}: ${b.score} × ${Math.round(b.weight * 100)}%)`).join(' + '),
      breakdown,
      total: finalScore
    }
  }
}

// Helper function to ensure evaluation response has the correct format (criteria-based)
function normalizeEvaluationResponse(evaluation: any): any {
  // If it's in the new criteria-based format, ensure all fields exist
  if (evaluation.questions && Array.isArray(evaluation.questions)) {
    // Check if it already has criteria_breakdown (new format)
    if (evaluation.criteria_breakdown) {
      // Ensure overall_score is set
      if (!evaluation.overall_score && evaluation.final_score_calculation) {
        evaluation.overall_score = evaluation.final_score_calculation.total
      }
      return evaluation
    }
    
    // Calculate criteria-based scores from questions
    const calculated = calculateCriteriaBasedScore(evaluation.questions)
    
    // Build marks_summary for backward compatibility
    const byCategory: Record<string, { max: number, obtained: number }> = {}
    evaluation.questions.forEach((q: any) => {
      const criteria = q.criteria || q.category || 'General'
      if (!byCategory[criteria]) {
        byCategory[criteria] = { max: 0, obtained: 0 }
      }
      byCategory[criteria].max += q.max_score || 100
      byCategory[criteria].obtained += q.score || 0
    })
    
    evaluation.criteria_breakdown = calculated.criteria_breakdown
    evaluation.categories_used = calculated.categories_used
    evaluation.categories_not_used = calculated.categories_not_used
    evaluation.final_score_calculation = calculated.final_score_calculation
    evaluation.overall_score = calculated.overall_score
    
    // Backward compatible marks_summary
    evaluation.marks_summary = {
      total_max_marks: evaluation.questions.length * 100,
      total_obtained: evaluation.questions.reduce((sum: number, q: any) => sum + (q.score || 0), 0),
      percentage: calculated.overall_score,
      questions_asked: evaluation.questions.length,
      questions_answered: evaluation.questions.filter((q: any) => q.answered).length,
      by_category: byCategory
    }
    
    return evaluation
  }

  // If it's in the old question_analysis format, convert to new criteria-based format
  if (evaluation.question_analysis) {
    const questions: any[] = []
    let questionNumber = 1
    
    Object.entries(evaluation.question_analysis).forEach(([category, categoryData]: [string, any]) => {
      const categoryQuestions = categoryData.questions || []
      categoryQuestions.forEach((q: any) => {
        questions.push({
          question_number: questionNumber++,
          question_text: q.question || 'Unknown question',
          criteria: category,
          criteria_reasoning: `Question categorized as ${category}`,
          score: q.score || 0,
          max_score: 100,
          answered: q.answered !== false,
          candidate_response: q.candidate_response || '',
          evaluation_reasoning: q.feedback || '',
          strengths_in_answer: [],
          gaps_in_answer: []
        })
      })
    })
    
    const calculated = calculateCriteriaBasedScore(questions)
    
    return {
      questions,
      criteria_breakdown: calculated.criteria_breakdown,
      categories_used: calculated.categories_used,
      categories_not_used: calculated.categories_not_used,
      final_score_calculation: calculated.final_score_calculation,
      overall_score: calculated.overall_score,
      recommendation: evaluation.recommendation || 'Maybe',
      summary: evaluation.summary || '',
      strengths: evaluation.strengths || [],
      areas_for_improvement: evaluation.areas_for_improvement || [],
      scoring_explanation: `Criteria-based evaluation: ${calculated.final_score_calculation.formula}`
    }
  }

  return evaluation
}
