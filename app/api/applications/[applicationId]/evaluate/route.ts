import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// School exam style evaluation constants
const TOTAL_MARKS = 100
const TOTAL_QUESTIONS = 10

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

    // Enhanced evaluation system with question-specific weightages
    // Total marks = 100, distributed across 10 questions based on criteria importance
    // Like school exams: Q1 may have 15 marks, Q2 may have 8 marks, etc.
    // Note: TOTAL_MARKS and TOTAL_QUESTIONS are defined at file top
    
    // Category weights for distributing marks
    const categoryWeights = {
      "Technical Skills": 0.40,      // 40 marks total
      "Communication": 0.20,         // 20 marks total
      "Problem Solving": 0.25,       // 25 marks total
      "Cultural Fit": 0.15           // 15 marks total
    }

    // Call OpenAI API for evaluation
    const evaluationPrompt = `You are an expert HR evaluator. Analyze this interview transcript and provide detailed question-wise scores.

**IMPORTANT: This is like a school exam where each question has different marks based on importance.**

**Job Details:**
- Position: ${application.job_title}
- Company: ${application.company_name}
- Candidate: ${application.first_name} ${application.last_name}

**EVALUATION FRAMEWORK (Like School Exam):**
- Total Marks: ${TOTAL_MARKS}
- Total Questions: ${TOTAL_QUESTIONS}
- Each question has DIFFERENT marks based on its importance (like Q1=15 marks, Q2=8 marks, etc.)

**MARKS DISTRIBUTION BY CATEGORY:**
- Technical Skills: 40 marks total (most important for this role)
- Problem Solving: 25 marks total
- Communication: 20 marks total  
- Cultural Fit: 15 marks total

**Original Evaluation Criteria from Job:**
${criteriaList.map(c => `- ${c}`).join('\n')}

**Interview Transcript:**
${transcript}

**CRITICAL INSTRUCTIONS - READ CAREFULLY:**

1. **IDENTIFY ALL 10 QUESTIONS** from the interview (whether asked or not)

2. **YOU MUST CATEGORIZE EACH QUESTION** - Analyze the question content and decide its category:
   - **Technical Skills**: Questions about coding, programming languages, frameworks, tools, databases, architecture, APIs, algorithms, data structures, system design, technical concepts specific to the job role
   - **Problem Solving**: Questions about debugging, troubleshooting, handling challenges, analytical thinking, decision making, approach to solving complex issues
   - **Communication**: Questions about explaining concepts, presenting ideas, storytelling about projects, describing experiences, how they communicate with team/stakeholders
   - **Cultural Fit**: Questions about teamwork, collaboration, handling conflicts, work style, values, motivation, career goals, company culture alignment

3. **ASSIGN MARKS TO EACH QUESTION** based on its category and importance:
   - Technical/Core skill questions: 8-15 marks each (total ~40 marks)
   - Problem solving questions: 8-12 marks each (total ~25 marks)
   - Communication questions: 5-10 marks each (total ~20 marks)
   - Cultural fit questions: 5-8 marks each (total ~15 marks)
   - Total of all question marks MUST equal exactly ${TOTAL_MARKS}

4. **SCORING RULES (Like School Exam):**
   - If question has 15 marks and candidate answered perfectly: Give 15/15
   - If question has 15 marks and candidate gave partial answer: Give 8-12/15
   - If question has 15 marks and candidate gave vague answer ("Hmm", "Yeah"): Give 0-3/15
   - If question was NOT ASKED or NOT ANSWERED: Give 0 marks (but question still counts!)
   
5. **FINAL SCORE CALCULATION:**
   - Add up all marks obtained by candidate
   - Divide by total marks (${TOTAL_MARKS})
   - Example: If candidate got 45 marks out of 100 = 45%
   - Even if only 2 questions were answered, calculate against FULL ${TOTAL_MARKS}

**Response Format (JSON):**
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Actual question from transcript",
      "category": "Technical Skills",
      "max_marks": 15,
      "marks_obtained": 12,
      "answered": true,
      "candidate_response": "Summary of what candidate said",
      "feedback": "Why this score was given"
    },
    {
      "question_number": 2,
      "question_text": "Question that was asked",
      "category": "Communication",
      "max_marks": 8,
      "marks_obtained": 0,
      "answered": false,
      "candidate_response": "Not answered / Vague response",
      "feedback": "Question not properly answered"
    }
  ],
  "marks_summary": {
    "total_max_marks": ${TOTAL_MARKS},
    "total_obtained": 0,
    "percentage": 0,
    "questions_asked": 0,
    "questions_answered": 0,
    "by_category": {
      "Technical Skills": { "max": 40, "obtained": 0 },
      "Communication": { "max": 20, "obtained": 0 },
      "Problem Solving": { "max": 25, "obtained": 0 },
      "Cultural Fit": { "max": 15, "obtained": 0 }
    }
  },
  "overall_score": 0,
  "recommendation": "Hire|Maybe|No Hire",
  "summary": "Overall assessment",
  "strengths": ["strength 1"],
  "areas_for_improvement": ["area 1"],
  "scoring_explanation": "Detailed explanation of how marks were assigned"
}

**IMPORTANT RULES:**
1. All ${TOTAL_QUESTIONS} questions MUST be listed (even if not asked)
2. Sum of all max_marks MUST equal exactly ${TOTAL_MARKS}
3. **YOU decide the category for each question** based on its content:
   - "What frameworks do you know?" → Technical Skills
   - "How did you debug that issue?" → Problem Solving
   - "Tell me about your project" → Communication
   - "How do you work in a team?" → Cultural Fit
4. **YOU decide the marks** for each question based on its importance (8-15 for technical, 5-8 for cultural fit, etc.)
5. If candidate only answered 2/10 questions, they can only score marks for those 2 questions
6. Final percentage = (total_obtained / ${TOTAL_MARKS}) × 100
7. Reference actual transcript content in feedback`

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
- **Questions Asked:** ${evaluation.marks_summary.questions_asked}/${TOTAL_QUESTIONS}
- **Questions Answered:** ${evaluation.marks_summary.questions_answered}/${TOTAL_QUESTIONS}

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

// Helper function to calculate score from questions array (school-exam style)
// Simply adds up all marks_obtained and divides by total_max_marks
function calculateSchoolExamScore(questions: any[]): { total_obtained: number, total_max: number, percentage: number } {
  const total_obtained = questions.reduce((sum: number, q: any) => sum + (q.marks_obtained || 0), 0)
  const total_max = questions.reduce((sum: number, q: any) => sum + (q.max_marks || 0), 0)
  const percentage = total_max > 0 ? Math.round((total_obtained / total_max) * 100) : 0
  return { total_obtained, total_max, percentage }
}

// Helper function to ensure evaluation response has the correct format (school-exam style)
function normalizeEvaluationResponse(evaluation: any): any {
  // If it's already in the new school-exam format with questions array, return as is
  if (evaluation.questions && Array.isArray(evaluation.questions)) {
    // Ensure marks_summary exists
    if (!evaluation.marks_summary) {
      const { total_obtained, total_max, percentage } = calculateSchoolExamScore(evaluation.questions)
      const byCategory: Record<string, { max: number, obtained: number }> = {}
      
      evaluation.questions.forEach((q: any) => {
        if (!byCategory[q.category]) {
          byCategory[q.category] = { max: 0, obtained: 0 }
        }
        byCategory[q.category].max += q.max_marks || 0
        byCategory[q.category].obtained += q.marks_obtained || 0
      })
      
      evaluation.marks_summary = {
        total_max_marks: total_max,
        total_obtained: total_obtained,
        percentage: percentage,
        questions_asked: evaluation.questions.filter((q: any) => q.answered).length,
        questions_answered: evaluation.questions.filter((q: any) => q.answered && q.marks_obtained > 0).length,
        by_category: byCategory
      }
      
      // Ensure overall_score matches percentage
      evaluation.overall_score = percentage
    }
    return evaluation
  }

  // If it's in the old question_analysis format, convert to new school-exam format
  if (evaluation.question_analysis) {
    const questions: any[] = []
    let questionNumber = 1
    
    Object.entries(evaluation.question_analysis).forEach(([category, categoryData]: [string, any]) => {
      const categoryQuestions = categoryData.questions || []
      categoryQuestions.forEach((q: any) => {
        questions.push({
          question_number: questionNumber++,
          question_text: q.question || 'Unknown question',
          category: category,
          max_marks: (q.max_score || 10) * (q.weightage || 1.0), // Convert to marks
          marks_obtained: (q.score || 0) * (q.weightage || 1.0),
          answered: q.answered !== false,
          candidate_response: q.candidate_response || '',
          feedback: q.feedback || ''
        })
      })
    })
    
    const { total_obtained, total_max, percentage } = calculateSchoolExamScore(questions)
    const byCategory: Record<string, { max: number, obtained: number }> = {}
    
    questions.forEach((q: any) => {
      if (!byCategory[q.category]) {
        byCategory[q.category] = { max: 0, obtained: 0 }
      }
      byCategory[q.category].max += q.max_marks || 0
      byCategory[q.category].obtained += q.marks_obtained || 0
    })
    
    return {
      questions: questions,
      marks_summary: {
        total_max_marks: total_max,
        total_obtained: total_obtained,
        percentage: percentage,
        questions_asked: questions.filter((q: any) => q.answered).length,
        questions_answered: questions.filter((q: any) => q.answered && q.marks_obtained > 0).length,
        by_category: byCategory
      },
      overall_score: percentage,
      recommendation: evaluation.recommendation || 'Maybe',
      summary: evaluation.summary || '',
      strengths: evaluation.strengths || [],
      areas_for_improvement: evaluation.areas_for_improvement || [],
      scoring_explanation: evaluation.scoring_details || 'Converted from legacy format'
    }
  }

  return evaluation
}
