import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dynamic criteria-based evaluation constants
const TOTAL_MARKS = 100
const DEFAULT_TOTAL_QUESTIONS = 10

// Standard evaluation criteria with descriptions for AI guidance
const CRITERIA_DESCRIPTIONS: Record<string, string> = {
  // Standard criteria
  "Technical": "Programming skills, frameworks, tools, databases, APIs, system design, technical accuracy and depth",
  "Technical Skills": "Programming skills, frameworks, tools, databases, APIs, system design, technical accuracy and depth",
  "Communication": "Clarity of expression, presenting ideas, explaining concepts, articulation, listening skills",
  "Problem Solving": "Debugging, troubleshooting, analytical thinking, approach to challenges, logical reasoning",
  "Cultural Fit": "Motivation, alignment with company values, work style preferences, career goals",
  "Culture Fit": "Motivation, alignment with company values, work style preferences, career goals",
  "Team Player": "Collaboration experience, working with cross-functional teams, teamwork, cooperation",
  "Teamwork": "Collaboration experience, working with cross-functional teams, teamwork, cooperation",
  "Leadership": "Leadership experience, mentoring, decision making, taking initiative",
  "Adaptability": "Flexibility, learning new skills, handling change, resilience",
  "Experience": "Relevant work experience, project examples, domain knowledge",
  "Behavioral": "Past behavior examples, situational responses, work ethics"
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
    const { transcript, realTimeEvaluations, companyId: bodyCompanyId } = body

    console.log('📝 Transcript length:', transcript?.length || 0)
    console.log('📝 Transcript preview:', transcript?.substring(0, 200))
    console.log('📊 Real-time evaluations received:', realTimeEvaluations?.length || 0)
    
    // Check if we have real-time evaluations from OpenAI
    const hasRealTimeEvaluations = Array.isArray(realTimeEvaluations) && 
      realTimeEvaluations.length > 0 && 
      realTimeEvaluations.every(e => e.source === 'openai-realtime' && typeof e.score === 'number')

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

    // Extract criteria and total questions from all rounds
    const allCriteria = new Set<string>()
    let totalConfiguredQuestions = 0
    
    roundsRows.forEach(round => {
      try {
        if (round.configuration) {
          const config = typeof round.configuration === 'string' 
            ? JSON.parse(round.configuration) 
            : round.configuration
          const criteria = config.criteria || []
          criteria.forEach((c: string) => allCriteria.add(c))
          
          // Count total questions from configuration
          const questions = config.questions || []
          totalConfiguredQuestions += questions.length
        }
      } catch (e) {
        console.error('Error parsing round configuration:', e)
      }
    })

    const criteriaList = Array.from(allCriteria)
    // Use configured questions count, or default to 10 if not configured
    const totalInterviewQuestions = totalConfiguredQuestions > 0 ? totalConfiguredQuestions : DEFAULT_TOTAL_QUESTIONS
    
    console.log('📊 Evaluation criteria:', criteriaList)
    console.log('📊 Total configured questions:', totalInterviewQuestions)

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
- Total Interview Questions Configured: ${totalInterviewQuestions}

**Original Evaluation Criteria from Job:**
${criteriaList.map(c => `- ${c}`).join('\n')}

**Interview Transcript:**
${transcript}

**STEP-BY-STEP EVALUATION PROCESS:**

**STEP 1: EXTRACT ALL QUESTIONS**
Identify EVERY question asked in the transcript. The interview was configured with ${totalInterviewQuestions} questions total.
- If fewer questions were asked than configured, the candidate loses marks for questions not asked.
- If a question was asked but not answered properly, score it as 0.

**STEP 2: CATEGORIZE EACH QUESTION - USE ONLY THESE CRITERIA:**
You MUST categorize each question into ONE of these criteria ONLY (as defined in the job configuration):
${criteriaList.length > 0 ? criteriaList.map(c => {
  const description = CRITERIA_DESCRIPTIONS[c] || `Questions related to ${c.toLowerCase()}`
  return `- **${c}**: ${description}`
}).join('\n') : `- **Technical**: Programming skills, frameworks, tools, technical accuracy
- **Communication**: Clarity of expression, presenting ideas
- **Cultural Fit**: Company values, motivation, career goals
- **Team Player**: Collaboration, teamwork experience`}

**IMPORTANT MAPPING RULES:**
- If a question asks about tools/technologies/coding → map to Technical (or Technical Skills)
- If a question asks about teamwork/collaboration → map to Team Player (or Teamwork)
- If a question asks about company/motivation/values → map to Cultural Fit (or Culture Fit)
- If a question asks about explaining/presenting → map to Communication
- If a question asks about salary/location/availability → map to Cultural Fit

**STEP 3: EVALUATE EACH ANSWER**
For each question-answer pair:
- Score from 0-100 based on answer quality
- Document WHY this score was given (specific evidence from transcript)
- Note if answer was complete, partial, or missing

**STEP 4: EVALUATE ANSWER QUALITY**
For each question, evaluate the candidate's answer based on the assigned criterion:
- **Technical**: Evaluate technical accuracy, depth of knowledge, practical experience
- **Communication**: Evaluate clarity, structure, articulation of ideas
- **Cultural Fit**: Evaluate motivation, alignment with company values, career goals
- **Team Player**: Evaluate collaboration experience, teamwork examples, interpersonal skills

**STEP 5: SCORING RULES**
- Total marks = 100, distributed equally across ALL ${totalInterviewQuestions} configured questions
- Each question is worth approximately ${Math.floor(100 / totalInterviewQuestions)} marks
- Score each answer from 0-100 based on quality, then we'll convert to marks
- If candidate didn't answer or gave poor answer → score = 0
- If candidate gave excellent answer → score = 90-100

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
      "candidate_response": "FULL exact text of candidate's answer - do NOT summarize or truncate",
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
7. Be specific in feedback - cite actual words/phrases from transcript
8. IMPORTANT: candidate_response MUST contain the COMPLETE answer - do NOT summarize, truncate, or shorten the candidate's response. Include EVERY word they said.`

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

    // CRITICAL: If we have real-time evaluations from OpenAI, use them directly
    // This ensures we never use mock scores
    if (hasRealTimeEvaluations) {
      console.log('✅ [INTERVIEW EVAL] Using real-time OpenAI evaluations (no mock scores)')
      console.log('📊 [INTERVIEW EVAL] Processing', realTimeEvaluations.length, 'real-time evaluations')
      
      // Helper function to map question to criterion using ChatGPT
      const mapQuestionToCriterion = async (questionText: string, availableCriteria: string[]): Promise<string> => {
        if (!openaiApiKey || availableCriteria.length === 0) return availableCriteria[0] || 'Technical'
        
        const mappingPrompt = `Given this interview question and the available evaluation criteria, determine which criterion best matches the question.

**Question:** "${questionText}"

**Available Criteria:**
${availableCriteria.map(c => `- ${c}`).join('\n')}

**MAPPING RULES:**
- If question asks about tools/technologies/coding/technical skills → Technical
- If question asks about teamwork/collaboration/working with others → Team Player
- If question asks about company/motivation/values/salary/location/role preferences → Culture Fit
- If question asks about explaining/presenting/communication skills → Communication

Respond with ONLY the criterion name.`

        try {
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          }
          if (openaiProjectId) headers['OpenAI-Project'] = openaiProjectId

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are an expert at categorizing interview questions. Respond with ONLY the criterion name.' },
                { role: 'user', content: mappingPrompt }
              ],
              temperature: 0.1,
              max_tokens: 50
            })
          })

          if (response.ok) {
            const data = await response.json()
            const suggested = data.choices[0]?.message?.content?.trim()
            const matched = availableCriteria.find(c => 
              c.toLowerCase() === suggested?.toLowerCase() ||
              c.toLowerCase().includes(suggested?.toLowerCase()) ||
              suggested?.toLowerCase().includes(c.toLowerCase())
            )
            return matched || availableCriteria[0]
          }
        } catch (e) {
          console.error('Error mapping criterion:', e)
        }
        return availableCriteria[0] || 'Technical'
      }

      // Convert real-time evaluations to the expected format
      // Re-map any "General" criteria to correct configured criteria
      const questionsPromises = realTimeEvaluations.map(async (rtEval: any, index: number) => {
        let criterion = rtEval.criterion || 'General'
        
        // If criterion is still "General", re-map it using ChatGPT
        if (criterion === 'General' || criterion === '' || !criterion) {
          console.log(`🔄 [INTERVIEW EVAL] Re-mapping criterion for Q${index + 1}: "${rtEval.question_text?.substring(0, 50)}..."`)
          criterion = await mapQuestionToCriterion(rtEval.question_text || '', criteriaList)
          console.log(`✅ [INTERVIEW EVAL] Q${index + 1} mapped to: ${criterion}`)
        }
        
        return {
          question_number: rtEval.question_number || index + 1,
          question_text: rtEval.question_text || '',
          criteria: criterion,
          criteria_reasoning: rtEval.criterion_match?.criterion_reasoning || '',
          score: rtEval.score || 0,
          max_score: 100,
          answered: rtEval.matches_question !== false,
          candidate_response: rtEval.full_answer || '', // Store FULL answer
          evaluation_reasoning: rtEval.reasoning || '',
          strengths_in_answer: rtEval.answer_analysis?.strengths || [],
          gaps_in_answer: rtEval.answer_analysis?.weaknesses || [],
          completeness: rtEval.completeness || 'partial',
          source: 'openai-realtime' // Mark as real OpenAI evaluation
        }
      })
      
      const questions = await Promise.all(questionsPromises)
      
      // Calculate overall score from real-time evaluations
      const calculated = calculateCriteriaBasedScore(questions, totalInterviewQuestions)
      
      const evaluation = {
        questions: calculated.final_score_calculation.questions_with_marks || questions,
        criteria_breakdown: calculated.criteria_breakdown,
        categories_used: calculated.categories_used,
        categories_not_used: calculated.categories_not_used,
        final_score_calculation: calculated.final_score_calculation,
        overall_score: calculated.overall_score,
        marks_summary: {
          total_max_marks: 100,
          total_obtained: calculated.overall_score,
          percentage: calculated.overall_score,
          total_interview_questions: totalInterviewQuestions,
          questions_asked: questions.length,
          questions_answered: questions.filter((q: any) => q.answered).length,
          by_category: {}
        },
        recommendation: calculated.overall_score >= 65 ? 'Hire' : (calculated.overall_score >= 40 ? 'Maybe' : 'No Hire'),
        summary: `Evaluation based on ${questions.length} real-time OpenAI evaluations. Score: ${calculated.overall_score}/100`,
        strengths: questions.flatMap((q: any) => q.strengths_in_answer || []).slice(0, 5),
        areas_for_improvement: questions.flatMap((q: any) => q.gaps_in_answer || []).slice(0, 5),
        scoring_explanation: `Real-time OpenAI evaluation: ${calculated.final_score_calculation.formula}`,
        source: 'openai-realtime'
      }
      
      // Store the real-time evaluation
      const evaluationData = {
        application_id: applicationId,
        scores: evaluation.questions,
        overall_score: evaluation.overall_score,
        recommendation: evaluation.recommendation,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        areas_for_improvement: evaluation.areas_for_improvement,
        evaluated_at: new Date().toISOString(),
        evaluation_criteria: criteriaList,
        marks_summary: evaluation.marks_summary,
        scoring_explanation: evaluation.scoring_explanation,
        source: 'openai-realtime'
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
        const status = evaluation.overall_score >= 65 ? 'Pass' : 'Fail'
        
        // Check if evaluation exists
        const checkEvaluationQuery = `SELECT id FROM evaluations WHERE interview_id = $1::uuid LIMIT 1`
        const existingEval = await DatabaseService.query(checkEvaluationQuery, [interviewId]) as any[]
        
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
        
        const recOutcome = evaluation.overall_score >= 65 ? 'next_round' : (evaluation.overall_score >= 40 ? 'on_hold' : 'unqualified')
        
        const rubricNotes = `
## Summary (Real-time OpenAI Evaluation)
${evaluation.summary}

## Detailed Scores by Question
${evaluation.questions.map((q: any) => 
  `### Q${q.question_number}: ${q.question_text}
- **Criterion:** ${q.criteria}
- **Score:** ${q.score}/100 (${q.marks_obtained || 0}/${q.max_marks || 10} marks)
- **Completeness:** ${q.completeness}
- **Full Answer:** ${q.candidate_response}
- **AI Reasoning:** ${q.evaluation_reasoning}
- **Strengths:** ${(q.strengths_in_answer || []).join(', ') || 'None noted'}
- **Gaps:** ${(q.gaps_in_answer || []).join(', ') || 'None noted'}`
).join('\n\n')}

## Scoring Explanation
${evaluation.scoring_explanation}

## Source
✅ Real-time OpenAI evaluation (not mock)
        `.trim()
        
        await DatabaseService.query(evaluationQuery, [
          interviewId,
          evaluation.overall_score,
          JSON.stringify({ questions: evaluation.questions, marks_summary: evaluation.marks_summary, source: 'openai-realtime' }),
          recOutcome,
          rubricNotes,
          status
        ])
        
        console.log('✅ [INTERVIEW EVAL] Real-time evaluation stored successfully')
        console.log(`📊 [INTERVIEW EVAL] Score: ${evaluation.overall_score}/100 - ${status}`)
      }
      
      return NextResponse.json({
        ok: true,
        evaluation: evaluationData,
        message: 'Evaluation completed using real-time OpenAI evaluations',
        source: 'openai-realtime'
      })
    }
    
    // Check if OpenAI API key is configured
    if (!openaiApiKey) {
      // NO FALLBACK TO MOCK - Return error if no OpenAI key
      console.error('❌ [INTERVIEW EVAL] No OpenAI API key configured and no real-time evaluations available')
      return NextResponse.json({
        ok: false,
        error: 'OpenAI credentials not configured',
        message: 'Please connect OpenAI in Settings → Billing to enable interview evaluation. No mock scores are used.'
      }, { status: 400 })
    }
    
    // Proceed with batch OpenAI evaluation (when no real-time evaluations available)
    console.log('🤖 [INTERVIEW EVAL] Proceeding with batch OpenAI evaluation...')
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
      // Pass the actual total questions from job configuration for accurate scoring
      evaluation = normalizeEvaluationResponse(evaluation, totalInterviewQuestions)
      
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

    // Store evaluation in database - include ALL evaluation data for report page
    const evaluationData = {
      application_id: applicationId,
      scores: evaluation.questions || [],
      questions: evaluation.questions || [], // Full question details for report
      overall_score: evaluation.overall_score || 0,
      recommendation: evaluation.recommendation || 'Maybe',
      summary: evaluation.summary || '',
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.areas_for_improvement || [], // Alias for report page
      areas_for_improvement: evaluation.areas_for_improvement || [],
      evaluated_at: new Date().toISOString(),
      evaluation_criteria: criteriaList,
      marks_summary: evaluation.marks_summary || {},
      scoring_explanation: evaluation.scoring_explanation || '',
      criteria_breakdown: evaluation.criteria_breakdown || {},
      categories_used: evaluation.categories_used || [],
      final_score_calculation: evaluation.final_score_calculation || {}
    }
    
    console.log('📦 [EVAL] Evaluation data to store:', JSON.stringify(evaluationData, null, 2).substring(0, 500))

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
      try {
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
        const metadataResult = await DatabaseService.query(updateInterviewEvalQuery, [
          interviewId,
          JSON.stringify(evaluationData)
        ]) as any[]
        
        if (metadataResult && metadataResult.length > 0) {
          console.log('✅ Evaluation stored in interviews.metadata for interview:', interviewId)
        } else {
          console.warn('⚠️ interviews.metadata update returned no rows for interview:', interviewId)
        }
      } catch (metadataErr: any) {
        console.error('❌ Failed to store in interviews.metadata:', metadataErr?.message)
        // Don't throw - evaluations table storage succeeded
      }
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
// SCHOOL EXAM STYLE: Total marks = 100, distributed across TOTAL INTERVIEW QUESTIONS (default 10)
// Questions not asked = 0 marks, Unanswered questions = 0 marks
function calculateCriteriaBasedScore(questions: any[], totalInterviewQuestions: number = DEFAULT_TOTAL_QUESTIONS): {
  overall_score: number,
  criteria_breakdown: Record<string, any>,
  categories_used: string[],
  categories_not_used: string[],
  final_score_calculation: any
} {
  const questionsAsked = questions.length
  // CRITICAL: Use TOTAL interview questions (e.g., 10), not just questions asked (e.g., 4)
  const marksPerQuestion = Math.floor(100 / totalInterviewQuestions) // 10 questions = 10 marks each
  const remainderMarks = 100 - (marksPerQuestion * totalInterviewQuestions) // distribute remainder to first questions
  
  console.log('📊 [SCORING] Total interview questions:', totalInterviewQuestions)
  console.log('📊 [SCORING] Questions actually asked:', questionsAsked)
  console.log('📊 [SCORING] Marks per question:', marksPerQuestion)
  console.log('📊 [SCORING] Questions NOT asked (will get 0 marks):', totalInterviewQuestions - questionsAsked)
  
  // First pass: Assign max marks to each question and calculate obtained marks
  // CRITICAL: Unanswered questions get 0 marks
  let totalObtained = 0
  const questionsWithMarks = questions.map((q, index) => {
    // First few questions get +1 mark to distribute remainder
    const maxMarks = marksPerQuestion + (index < remainderMarks ? 1 : 0)
    
    // CRITICAL FIX: If question is NOT answered, score = 0
    // Check multiple indicators of unanswered question
    const isUnanswered = q.answered === false || 
                         (q.candidate_response && (
                           q.candidate_response.toLowerCase().includes('no, sorry') ||
                           q.candidate_response.toLowerCase().includes('please ask the next') ||
                           q.candidate_response.toLowerCase().includes('skip') ||
                           q.candidate_response.toLowerCase().includes('i don\'t know') ||
                           q.candidate_response.toLowerCase().includes('not sure') ||
                           q.candidate_response.trim().length < 10 // Very short responses
                         ))
    
    // Calculate obtained marks: scale the 0-100 score to the question's max marks
    // BUT if unanswered, give 0 marks regardless of what OpenAI said
    let obtainedMarks = 0
    if (!isUnanswered) {
      const scorePercent = (q.score || 0) / 100
      obtainedMarks = Math.round(scorePercent * maxMarks)
    }
    
    totalObtained += obtainedMarks
    
    console.log(`📊 [SCORING] Q${index + 1}: ${isUnanswered ? 'UNANSWERED' : 'answered'} - ${obtainedMarks}/${maxMarks} marks`)
    
    return {
      ...q,
      max_marks: maxMarks,
      marks_obtained: obtainedMarks,
      answered: !isUnanswered
    }
  })
  
  // Group questions by criteria for breakdown
  const byCategory: Record<string, any[]> = {}
  questionsWithMarks.forEach((q: any) => {
    const criteria = q.criteria || q.category || 'General'
    if (!byCategory[criteria]) {
      byCategory[criteria] = []
    }
    byCategory[criteria].push(q)
  })
  
  // Calculate breakdown by category
  const criteriaBreakdown: Record<string, any> = {}
  const breakdown: any[] = []
  
  Object.entries(byCategory).forEach(([criteria, criteriaQuestions]) => {
    const questionCount = criteriaQuestions.length
    const maxMarks = criteriaQuestions.reduce((sum, q) => sum + (q.max_marks || 0), 0)
    const obtainedMarks = criteriaQuestions.reduce((sum, q) => sum + (q.marks_obtained || 0), 0)
    const answeredCount = criteriaQuestions.filter(q => q.answered).length
    const averagePercent = maxMarks > 0 ? Math.round((obtainedMarks / maxMarks) * 100) : 0
    
    criteriaBreakdown[criteria] = {
      question_count: questionCount,
      questions_answered: answeredCount,
      max_marks: maxMarks,
      obtained_marks: obtainedMarks,
      average_score: averagePercent,
      weight_percentage: maxMarks, // In school exam style, weight = max marks
      summary: `${answeredCount}/${questionCount} questions answered, scored ${obtainedMarks}/${maxMarks} marks`
    }
    
    breakdown.push({
      criteria,
      max_marks: maxMarks,
      obtained_marks: obtainedMarks,
      questions_answered: answeredCount,
      total_questions: questionCount
    })
  })
  
  // Final score is simply: total obtained out of 100
  // If only 4 questions asked out of 10, max possible is 40 marks (4 × 10)
  // The remaining 60 marks (6 questions not asked) are lost
  const finalScore = totalObtained
  
  console.log('📊 [SCORING] Final score:', finalScore, '/ 100')
  console.log('📊 [SCORING] Questions answered:', questionsWithMarks.filter(q => q.answered).length, '/', questionsAsked, '(asked) out of', totalInterviewQuestions, '(total)')
  
  // Determine used and unused categories (dynamic - based on what questions were actually categorized as)
  const categoriesUsed = Object.keys(byCategory)
  // Note: categories_not_used will be populated from the original criteriaList passed to the evaluation
  // For now, we only track what was actually used
  const categoriesNotUsed: string[] = [] // Will be populated during normalization if needed
  
  return {
    overall_score: finalScore,
    criteria_breakdown: criteriaBreakdown,
    categories_used: categoriesUsed,
    categories_not_used: categoriesNotUsed,
    final_score_calculation: {
      formula: breakdown.map(b => `${b.criteria}: ${b.obtained_marks}/${b.max_marks}`).join(' + '),
      breakdown,
      total: finalScore,
      questions_with_marks: questionsWithMarks
    }
  }
}

// Helper function to ensure evaluation response has the correct format (criteria-based)
// SCHOOL EXAM STYLE: 100 marks total for 10 questions, unanswered/not asked = 0 marks
function normalizeEvaluationResponse(evaluation: any, totalInterviewQuestions: number = DEFAULT_TOTAL_QUESTIONS): any {
  // If it's in the new criteria-based format, ensure all fields exist
  if (evaluation.questions && Array.isArray(evaluation.questions)) {
    const questionsAsked = evaluation.questions.length
    console.log('📊 [NORMALIZE] Processing', questionsAsked, 'questions out of', totalInterviewQuestions, 'total')
    
    // ALWAYS recalculate to ensure:
    // 1. Unanswered questions get 0 marks
    // 2. Questions not asked get 0 marks (counted in total)
    const calculated = calculateCriteriaBasedScore(evaluation.questions, totalInterviewQuestions)
    
    // Build marks_summary for backward compatibility using calculated values
    const byCategory: Record<string, { max: number, obtained: number }> = {}
    const questionsWithMarks = calculated.final_score_calculation.questions_with_marks || []
    
    questionsWithMarks.forEach((q: any) => {
      const criteria = q.criteria || q.category || 'General'
      if (!byCategory[criteria]) {
        byCategory[criteria] = { max: 0, obtained: 0 }
      }
      byCategory[criteria].max += q.max_marks || 0
      byCategory[criteria].obtained += q.marks_obtained || 0
    })
    
    evaluation.criteria_breakdown = calculated.criteria_breakdown
    evaluation.categories_used = calculated.categories_used
    evaluation.categories_not_used = calculated.categories_not_used
    evaluation.final_score_calculation = calculated.final_score_calculation
    evaluation.overall_score = calculated.overall_score
    
    // Update questions with correct marks
    evaluation.questions = questionsWithMarks
    
    // Backward compatible marks_summary with CORRECT values
    const answeredCount = questionsWithMarks.filter((q: any) => q.answered).length
    const questionsNotAsked = totalInterviewQuestions - questionsAsked
    evaluation.marks_summary = {
      total_max_marks: 100, // School exam style: always out of 100
      total_obtained: calculated.overall_score,
      percentage: calculated.overall_score,
      total_interview_questions: totalInterviewQuestions,
      questions_asked: questionsAsked,
      questions_not_asked: questionsNotAsked,
      questions_answered: answeredCount,
      by_category: byCategory
    }
    
    console.log('📊 [NORMALIZE] Final score:', calculated.overall_score, '/ 100')
    console.log('📊 [NORMALIZE] Questions asked:', questionsAsked, '/', totalInterviewQuestions)
    console.log('📊 [NORMALIZE] Questions answered:', answeredCount, '/', questionsAsked)
    console.log('📊 [NORMALIZE] Questions NOT asked (0 marks):', questionsNotAsked)
    
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
    
    // Use total interview questions (10) for scoring
    const calculated = calculateCriteriaBasedScore(questions, totalInterviewQuestions)
    
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
