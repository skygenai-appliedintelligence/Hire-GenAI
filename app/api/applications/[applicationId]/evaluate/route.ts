import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dynamic criteria-based evaluation constants
const TOTAL_MARKS = 100
const DEFAULT_TOTAL_QUESTIONS = 10

// Build criteria descriptions from the centralized evaluation criteria
const CRITERIA_DESCRIPTIONS: Record<string, string> = {}
EVALUATION_CRITERIA.forEach(c => {
  CRITERIA_DESCRIPTIONS[c.name] = c.description
})
// Add legacy aliases for backward compatibility
CRITERIA_DESCRIPTIONS["Technical"] = CRITERIA_DESCRIPTIONS["Technical Skills"]
CRITERIA_DESCRIPTIONS["Cultural Fit"] = CRITERIA_DESCRIPTIONS["Culture Fit"]
CRITERIA_DESCRIPTIONS["Team Player"] = CRITERIA_DESCRIPTIONS["Teamwork / Collaboration"]
CRITERIA_DESCRIPTIONS["Teamwork"] = CRITERIA_DESCRIPTIONS["Teamwork / Collaboration"]
CRITERIA_DESCRIPTIONS["Adaptability"] = CRITERIA_DESCRIPTIONS["Adaptability / Learning"]
CRITERIA_DESCRIPTIONS["Work Ethic"] = CRITERIA_DESCRIPTIONS["Work Ethic / Reliability"]
CRITERIA_DESCRIPTIONS["Behavioral"] = "Past behavior examples, situational responses, work ethics"

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

    // Get application and job details for evaluation context (including job level)
    const applicationQuery = `
      SELECT a.id, a.job_id, j.title as job_title, j.level as job_level, c.name as company_name,
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
    const jobLevel = (application.job_level || 'mid').toLowerCase()
    console.log('📊 Job Level for evaluation:', jobLevel)

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

    // Extract criteria and actual questions from all rounds
    const allCriteria = new Set<string>()
    const dbQuestions: { text: string; criterion: string; questionNumber: number }[] = []
    let questionNumber = 1
    
    roundsRows.forEach(round => {
      try {
        if (round.configuration) {
          const config = typeof round.configuration === 'string' 
            ? JSON.parse(round.configuration) 
            : round.configuration
          const criteria = config.criteria || []
          criteria.forEach((c: string) => allCriteria.add(c))
          
          // Extract actual questions from configuration
          const questions = config.questions || []
          questions.forEach((q: any) => {
            dbQuestions.push({
              text: q.text || q.question || q,
              criterion: q.criterion || q.criteria || criteria[0] || 'General',
              questionNumber: questionNumber++
            })
          })
        }
      } catch (e) {
        console.error('Error parsing round configuration:', e)
      }
    })
    
    const totalConfiguredQuestions = dbQuestions.length

    const criteriaList = Array.from(allCriteria)
    // Use configured questions count, or default to 10 if not configured
    const totalInterviewQuestions = totalConfiguredQuestions > 0 ? totalConfiguredQuestions : DEFAULT_TOTAL_QUESTIONS
    
    console.log('📊 Evaluation criteria:', criteriaList)
    console.log('📊 Total configured questions:', totalInterviewQuestions)
    console.log('📊 DB Questions:', dbQuestions.map(q => q.text.substring(0, 50)))

    // DYNAMIC CRITERIA-BASED EVALUATION
    // Use DB questions directly - do NOT infer from transcript
    // This ensures closing messages are NOT evaluated as questions
    
    console.log('📊 Starting DB-question-based evaluation...')

    // Build the list of DB questions for the prompt
    const dbQuestionsForPrompt = dbQuestions.length > 0 
      ? dbQuestions.map(q => `Q${q.questionNumber}. [${q.criterion}] ${q.text}`).join('\n')
      : `Q1. [Technical] Tell me about yourself and your relevant experience.
Q2. [Technical] Why are you interested in this position?
Q3. [Communication] What motivates you in your work?
Q4. [Problem Solving] Describe a challenging situation you faced and how you handled it.
Q5. [Communication] How do you handle feedback and criticism?
Q6. [Team Player] Tell me about a time you worked in a team to achieve a goal.
Q7. [Technical] What technical skills do you bring to this role?
Q8. [Technical] How do you stay updated with the latest technologies in your field?
Q9. [Problem Solving] Describe a technical problem you solved recently.
Q10. [Culture Fit] What are your salary expectations?`

    // Build level-specific expectations for final evaluation
    const levelExpectationsForFinal = jobLevel === 'junior'
      ? `**JUNIOR LEVEL EXPECTATIONS:**
- Focus on thinking process, learning ability, and potential
- Look for clear communication and basic concept understanding
- Value enthusiasm, willingness to learn, and growth mindset
- Don't expect extensive production experience or deep expertise
- Evaluate on HOW they think, not just WHAT they know`
      : jobLevel === 'senior'
      ? `**SENIOR LEVEL EXPECTATIONS:**
- Expect ownership, specific contributions, and measurable impact
- Demand concrete examples: "I built", "I fixed", "I designed", "I led"
- Penalize vague "we worked on" or "team handled" answers
- Look for architectural thinking, technical leadership, and team influence
- Evaluate on OWNERSHIP and IMPACT, not just knowledge`
      : `**MID-LEVEL EXPECTATIONS:**
- Balance of technical skills and practical experience
- Look for solid contributions with reasonable ownership
- Expect production experience with some independence
- Evaluate on both knowledge AND application`

    // Call OpenAI API for evaluation with DB QUESTIONS
    const evaluationPrompt = `You are an expert interview evaluator.

**IMPORTANT ROLE SEPARATION (DO NOT VIOLATE):**
- "Strengths" and "Gaps" are ANALYTICAL INSIGHTS derived ONLY from the answer content.
- The "Score" is a SEPARATE evaluative outcome.
- Do NOT use the score to decide or justify strengths or gaps.
- Assume the score does NOT exist while writing strengths and gaps.

**Job Details:**
- Position: ${application.job_title}
- Company: ${application.company_name}
- Candidate: ${application.first_name} ${application.last_name}
- Job Level: ${jobLevel.toUpperCase()}

${levelExpectationsForFinal}

**CRITICAL: USE ONLY THE DATABASE QUESTIONS BELOW**
You MUST evaluate ONLY the ${totalInterviewQuestions} questions listed below.
- Do NOT evaluate closing messages like "Do you have any questions for me?"
- Do NOT evaluate thank-you messages or interview wrap-up
- ONLY evaluate answers to the specific questions listed below

**FIXED WEIGHTAGES:**
- Technical Skills: 50% (ALWAYS)
- Communication: 20% (ALWAYS)
- Other criteria: 30% (distributed equally among remaining criteria)

**THE ${totalInterviewQuestions} INTERVIEW QUESTIONS TO EVALUATE (from database):**
${dbQuestionsForPrompt}

**Interview Transcript:**
${transcript}

**EVALUATION ORDER (STRICT) - FOR EACH QUESTION:**

1. FIRST, analyze the candidate's answer in isolation.
   - Identify specific skills, tools, actions, concepts, or claims explicitly mentioned.
   - Identify what is explicitly missing based on the question.
   - Do NOT think about scoring yet.

2. SECOND, generate strengths and gaps:

   RULES FOR STRENGTHS:
   - Must be based ONLY on what the candidate actually said.
   - Each strength must be a complete sentence.
   - Each strength must reference a concrete detail (tool, concept, action, domain, or experience).
   - Do NOT write resume-style phrases.
   - Do NOT use generic terms like "good knowledge", "strong skills", "well explained".

   RULES FOR GAPS (Areas for Improvement):
   - Must clearly state WHAT was missing from the answer.
   - Must explain WHY that missing detail matters for this question.
   - Must be actionable (what could have been added).
   - Do NOT reference the score or evaluation labels.

3. ONLY AFTER strengths and gaps are written:
   - Assign a score from 0-100 based on how well the answer meets ${jobLevel} level expectations.
   - The score must be consistent with the strengths and gaps already listed.
   - Do NOT modify strengths or gaps after scoring.

**SCORING GUIDELINES (0-100 scale for ${jobLevel.toUpperCase()} level) - BE STRICT:**
- 90-100: EXCEPTIONAL - Reserve ONLY for outstanding answers with specific metrics, measurable impact, and industry best practices. Very rare.
- 80-89: EXCELLENT - Detailed answer with concrete examples, specific tools/technologies mentioned, and clear ownership. Should be uncommon.
- 70-79: GOOD - Solid answer but lacks depth, specifics, or measurable outcomes. Most answers fall here.
- 60-69: ADEQUATE - Generic answer without concrete examples. Missing key details expected for the role.
- 50-59: BELOW AVERAGE - Vague, incomplete, or off-topic. Does not demonstrate competency.
- 40-49: WEAK - Significantly lacks substance. Shows no real understanding.
- Below 40: POOR - Unacceptable. Did not answer the question or completely irrelevant.

**STRICT EVALUATION RULES:**
- Do NOT give 80+ unless the answer includes SPECIFIC metrics, tools, or measurable outcomes
- Do NOT give 70+ if the answer is generic without concrete examples
- Penalize answers that say "we did" instead of "I did" - look for individual ownership
- Penalize lack of specifics: numbers, percentages, team sizes, timelines
- If candidate doesn't mention the EXACT tools asked about in the question, penalize by 10-15 points
- Partial or incomplete answers should NEVER score above 65

**LEVEL-SPECIFIC EVALUATION RULES for ${jobLevel.toUpperCase()}:**
${jobLevel === 'junior' ? `
- Score higher on clear thinking and learning ability
- Don't penalize for lack of production experience
- Value enthusiasm and problem-solving approach
- Look for potential, not just current skills` 
: jobLevel === 'senior' ? `
- Score lower on vague "we worked on" answers without ownership
- Expect specific examples with measurable impact
- Penalize lack of leadership or architectural thinking
- Demand "I built/designed/led" statements, not just "was involved"
- Senior answers without metrics or business impact should score below 70`
: `
- MID-LEVEL candidates MUST show ownership and concrete examples
- Penalize heavily for "we did" without "I specifically did"
- Expect production experience with real examples
- Generic answers without specifics should score 60-65 max
- Only give 75+ if candidate shows initiative, problem-solving, and clear individual contribution`}

**Response Format (JSON):**
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Exact question from database",
      "criteria": "Technical Skills",
      "score": 65,
      "max_score": 100,
      "completeness": "complete" | "partial" | "incomplete",
      "answered": true,
      "candidate_response": "FULL exact text of candidate's answer from transcript",
      "strengths": [
        "Complete sentence describing specific strength with concrete detail from answer",
        "Another complete sentence with tool/concept/action mentioned by candidate"
      ],
      "gaps": [
        "What was missing + why it matters + what could have been added",
        "Another missing element with explanation"
      ],
      "evaluation_reasoning": "Level-aware reasoning for ${jobLevel.toUpperCase()} candidate. Must reference job level and be consistent with strengths/gaps listed above."
    }
  ],
  "criteria_breakdown": {
    "Technical Skills": {
      "question_count": 8,
      "average_score": 75,
      "weight_percentage": 50,
      "weighted_contribution": 37.5,
      "summary": "Strong technical foundation with good framework knowledge"
    },
    "Communication": {
      "question_count": 2,
      "average_score": 70,
      "weight_percentage": 20,
      "weighted_contribution": 14,
      "summary": "Clear communication but could elaborate more"
    },
    "Problem Solving": {
      "question_count": 0,
      "average_score": 0,
      "weight_percentage": 15,
      "weighted_contribution": 0,
      "summary": "No questions asked in this category"
    },
    "Cultural Fit": {
      "question_count": 0,
      "average_score": 0,
      "weight_percentage": 15,
      "weighted_contribution": 0,
      "summary": "No questions asked in this category"
    }
  },
  "categories_used": ["Technical Skills", "Communication"],
  "categories_not_used": ["Problem Solving", "Cultural Fit"],
  "final_score_calculation": {
    "formula": "(Technical: 75% × 50%) + (Communication: 70% × 20%) + (Problem Solving: 0% × 15%) + (Cultural Fit: 0% × 15%)",
    "breakdown": [
      { "criteria": "Technical Skills", "score": 75, "weight": 50, "contribution": 37.5 },
      { "criteria": "Communication", "score": 70, "weight": 20, "contribution": 14 },
      { "criteria": "Problem Solving", "score": 0, "weight": 15, "contribution": 0 },
      { "criteria": "Cultural Fit", "score": 0, "weight": 15, "contribution": 0 }
    ],
    "total": 51.5
  },
  "overall_score": 52,
  "recommendation": "Hire|Maybe|No Hire",
  "summary": "Overall assessment based ONLY on criteria evaluated",
  "strengths": [
    { "point": "Strong technical knowledge", "category": "Technical Skills", "evidence": ["Demonstrated deep React knowledge", "Explained hooks correctly"] }
  ],
  "areas_for_improvement": [
    { "point": "Could elaborate more", "category": "Communication", "evidence": ["Answers were brief"], "improvement_suggestion": "Practice expanding on technical explanations" }
  ],
  "scoring_explanation": "Final score calculated using FIXED weightages: Technical Skills (50% weight, 75% score = 37.5 points) + Communication (20% weight, 70% score = 14 points) + Problem Solving (15% weight, 0% score = 0 points) + Cultural Fit (15% weight, 0% score = 0 points) = 51.5 points total."
}

**CRITICAL STRICT EVALUATION RULES:**
1. BE EXTREMELY STRICT - This is a competitive hiring process, not a participation award
2. Most candidates should score 45-70, NOT 70-90
3. Score 80+ ONLY if answer has MULTIPLE specific examples and exceptional depth
4. Generic or vague answers without concrete examples: 40-60 maximum
5. Brief answers lacking detail: below 50
6. Answers without specific examples: automatically lose 20-30 points
7. FIXED WEIGHTAGES: Technical = 50%, Communication = 20%, Others = 30% (distributed equally)
8. ALWAYS include ALL criteria in breakdown, even if 0 questions asked (show as 0% score)
9. Each question must have detailed reasoning citing SPECIFIC evidence from answer
10. Reference EXACT words/phrases from transcript as evidence
11. Categories with 0 questions get 0% average score but still show their fixed weight
12. The sum of all weight_percentages must ALWAYS equal 100%
13. "I don't know" or skipped questions = 0 points
14. Off-topic or irrelevant answers: below 30 points
15. IMPORTANT: candidate_response MUST contain the COMPLETE answer - do NOT summarize, truncate, or shorten
16. Default mindset: Assume average performance (50-60) unless candidate proves exceptional ability
17. **CRITICAL: Return EXACTLY ${totalInterviewQuestions} questions in the response - no more, no less**
18. **Do NOT evaluate "Do you have any questions for me?" - this is a closing message, NOT a database question**
19. **Do NOT evaluate "Thank you for your time" or any thank-you messages**
20. **The questions array must contain ONLY the ${totalInterviewQuestions} database questions listed above**`

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

    // ALWAYS use batch OpenAI evaluation for complete and accurate results
    // Real-time evaluations are often incomplete (missing questions, truncated answers)
    // Batch evaluation parses the full transcript and evaluates ALL questions
    const forceFullBatchEvaluation = true // Always do full batch evaluation
    
    // Only use real-time evaluations if they cover ALL expected questions
    const realTimeEvalComplete = hasRealTimeEvaluations && 
      realTimeEvaluations.length >= totalInterviewQuestions
    
    // ALWAYS use batch evaluation - this ensures complete report like re-evaluate button
    // The condition will never be true because forceFullBatchEvaluation = true
    if (hasRealTimeEvaluations && realTimeEvalComplete && !forceFullBatchEvaluation) {
      console.log('✅ [INTERVIEW EVAL] Using real-time OpenAI evaluations (complete coverage)')
      console.log('📊 [INTERVIEW EVAL] Processing', realTimeEvaluations.length, 'real-time evaluations')
      console.log('📊 [INTERVIEW EVAL] DB question count:', totalInterviewQuestions)
      
      // CRITICAL: Filter out closing message evaluations and limit to DB question count
      // This prevents evaluating "Do you have any questions for me?" and thank-you messages
      const closingMessagePatterns = [
        'do you have any questions',
        'questions for me',
        'thank you for your time',
        'thank you for interviewing',
        'recruitment team will respond',
        'we will get back to you',
        'that concludes'
      ]
      
      const filteredEvaluations = realTimeEvaluations
        .filter((rtEval: any) => {
          const questionText = (rtEval.question_text || '').toLowerCase()
          const isClosingMessage = closingMessagePatterns.some(pattern => questionText.includes(pattern))
          if (isClosingMessage) {
            console.log('⚠️ [INTERVIEW EVAL] Filtered out closing message:', questionText.substring(0, 50))
          }
          return !isClosingMessage
        })
        .slice(0, totalInterviewQuestions) // Limit to DB question count
      
      console.log('📊 [INTERVIEW EVAL] After filtering:', filteredEvaluations.length, 'evaluations (limit:', totalInterviewQuestions, ')')
      
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

      // Convert FILTERED real-time evaluations to the expected format
      // Re-map any "General" criteria to correct configured criteria
      // CRITICAL: Use filteredEvaluations (not realTimeEvaluations) to exclude closing messages
      const questionsPromises = filteredEvaluations.map(async (rtEval: any, index: number) => {
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
          criteria_reasoning: rtEval.reasoning || rtEval.criterion_match?.criterion_reasoning || '',
          score: rtEval.score || 0,
          max_score: 100,
          answered: rtEval.matches_question !== false,
          candidate_response: rtEval.full_answer || '', // Store FULL answer
          evaluation_reasoning: rtEval.reasoning || '',
          strengths_in_answer: rtEval.strengths || rtEval.answer_analysis?.strengths || [],
          gaps_in_answer: rtEval.gaps || rtEval.answer_analysis?.weaknesses || [],
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
    
    // ALWAYS use batch OpenAI evaluation - this creates complete report like re-evaluate button
    console.log('🤖 [INTERVIEW EVAL] Running batch evaluation for complete report...')
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
            content: `You are a STRICT and CRITICAL interview evaluator. Be demanding - most answers should score 60-75, not 75-85. 

STRICT SCORING RULES:
- 80+ ONLY for exceptional answers with specific metrics, tools, and measurable outcomes
- 70-79 for good answers with concrete examples but lacking some depth
- 60-69 for generic answers without specifics
- Below 60 for vague or incomplete answers

PENALTIES:
- No mention of exact tools asked about: -15 points
- "We did" instead of "I did": -10 points  
- No specific metrics/numbers: -10 points
- Partial/incomplete answer: cap at 65 max

You are evaluating a ${jobLevel.toUpperCase()} level candidate. Be critical and look for gaps. Provide JSON output only.`
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000 // Increased for detailed strengths/gaps per question
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

// FIXED WEIGHTAGES: Technical = 50%, Communication = 20%, Others = 30% (dynamic)
const FIXED_WEIGHTAGES: Record<string, number> = {
  'Technical': 50,
  'Technical Skills': 50,
  'Communication': 20
}

// Helper function to calculate criteria-based weighted score with FIXED weightages
// SCHOOL EXAM STYLE: Total 100 marks distributed across totalInterviewQuestions
// Unanswered/not asked questions = 0 marks
function calculateCriteriaBasedScore(questions: any[], totalInterviewQuestions: number = DEFAULT_TOTAL_QUESTIONS): {
  overall_score: number,
  criteria_breakdown: Record<string, any>,
  categories_used: string[],
  categories_not_used: string[],
  final_score_calculation: any
} {
  const questionsAsked = questions.length
  const marksPerQuestion = Math.floor(100 / totalInterviewQuestions) // e.g., 10 questions = 10 marks each
  
  console.log('📊 [SCORING] SCHOOL EXAM STYLE: Total 100 marks')
  console.log('📊 [SCORING] Total interview questions configured:', totalInterviewQuestions)
  console.log('📊 [SCORING] Questions actually asked:', questionsAsked)
  console.log('📊 [SCORING] Marks per question:', marksPerQuestion)
  console.log('📊 [SCORING] Questions NOT asked:', totalInterviewQuestions - questionsAsked, '(will get 0 marks)')
  console.log('📊 [SCORING] Using FIXED weightages: Technical=50%, Communication=20%, Others=30%')
  
  // Step 1: Process questions and check if answered
  const processedQuestions = questions.map((q, index) => {
    const isUnanswered = q.answered === false || 
                         (q.candidate_response && (
                           q.candidate_response.toLowerCase().includes('no, sorry') ||
                           q.candidate_response.toLowerCase().includes('please ask the next') ||
                           q.candidate_response.toLowerCase().includes('skip') ||
                           q.candidate_response.toLowerCase().includes('i don\'t know') ||
                           q.candidate_response.toLowerCase().includes('not sure') ||
                           q.candidate_response.trim().length < 10
                         ))
    
    // Convert 0-100 score to marks for this question
    const scorePercent = isUnanswered ? 0 : ((q.score || 0) / 100)
    const marksObtained = Math.round(scorePercent * marksPerQuestion)
    
    return {
      ...q,
      score: isUnanswered ? 0 : (q.score || 0),
      marks_obtained: marksObtained,
      max_marks: marksPerQuestion,
      answered: !isUnanswered,
      // Map OpenAI response fields to report page expected fields
      strengths_in_answer: q.strengths_in_answer || q.strengths || [],
      gaps_in_answer: q.gaps_in_answer || q.gaps || [],
      criteria_reasoning: q.criteria_reasoning || q.evaluation_reasoning || ''
    }
  })
  
  // Step 2: Group questions by criteria
  const byCategory: Record<string, any[]> = {}
  processedQuestions.forEach((q: any) => {
    const criteria = q.criteria || q.category || 'General'
    if (!byCategory[criteria]) {
      byCategory[criteria] = []
    }
    byCategory[criteria].push(q)
  })
  
  // Step 3: Calculate average score for each criteria (0-100 scale for display)
  const criteriaScores: Record<string, { avgScore: number, questionCount: number, answeredCount: number, totalMarks: number, obtainedMarks: number }> = {}
  
  Object.entries(byCategory).forEach(([criteria, criteriaQuestions]) => {
    const answeredQuestions = criteriaQuestions.filter(q => q.answered)
    const totalScore = criteriaQuestions.reduce((sum, q) => sum + (q.score || 0), 0)
    const avgScore = criteriaQuestions.length > 0 ? totalScore / criteriaQuestions.length : 0
    const totalMarks = criteriaQuestions.reduce((sum, q) => sum + (q.max_marks || 0), 0)
    const obtainedMarks = criteriaQuestions.reduce((sum, q) => sum + (q.marks_obtained || 0), 0)
    
    criteriaScores[criteria] = {
      avgScore: Math.round(avgScore),
      questionCount: criteriaQuestions.length,
      answeredCount: answeredQuestions.length,
      totalMarks,
      obtainedMarks
    }
  })
  
  // Step 4: Apply FIXED weightages and calculate final score
  // Technical = 50%, Communication = 20%, Others = 30% (distributed)
  const TECHNICAL_WEIGHT = 50
  const COMMUNICATION_WEIGHT = 20
  const OTHERS_WEIGHT = 30
  
  // Get Technical and Communication scores (0 if no questions asked)
  const technicalCriteria = Object.keys(criteriaScores).find(c => 
    c === 'Technical' || c === 'Technical Skills'
  )
  const technicalScore = technicalCriteria ? criteriaScores[technicalCriteria].avgScore : 0
  
  const communicationScore = criteriaScores['Communication']?.avgScore || 0
  
  // Get other criteria (excluding Technical and Communication)
  const otherCriteria = Object.keys(criteriaScores).filter(c => 
    c !== 'Technical' && c !== 'Technical Skills' && c !== 'Communication'
  )
  
  // Calculate weighted score for others
  let othersWeightedScore = 0
  const otherCriteriaBreakdown: any[] = []
  
  if (otherCriteria.length > 0) {
    const weightPerOther = OTHERS_WEIGHT / otherCriteria.length
    otherCriteria.forEach(criteria => {
      const score = criteriaScores[criteria].avgScore
      const contribution = (score * weightPerOther) / 100
      othersWeightedScore += contribution
      otherCriteriaBreakdown.push({
        criteria,
        score,
        weight: weightPerOther,
        contribution
      })
    })
  }
  
  // Calculate final score (out of 100)
  const technicalContribution = (technicalScore * TECHNICAL_WEIGHT) / 100
  const communicationContribution = (communicationScore * COMMUNICATION_WEIGHT) / 100
  const finalScore = Math.round(technicalContribution + communicationContribution + othersWeightedScore)
  
  // Calculate total marks obtained (including unanswered questions as 0)
  const totalMarksObtained = processedQuestions.reduce((sum, q) => sum + (q.marks_obtained || 0), 0)
  const questionsNotAsked = totalInterviewQuestions - questionsAsked
  const marksLostFromNotAsked = questionsNotAsked * marksPerQuestion
  
  console.log('📊 [SCORING] Questions asked:', questionsAsked, '→ marks obtained:', totalMarksObtained)
  console.log('📊 [SCORING] Questions NOT asked:', questionsNotAsked, '→ marks lost:', marksLostFromNotAsked)
  console.log('📊 [SCORING] Total marks obtained:', totalMarksObtained, '/ 100')
  console.log('📊 [SCORING] Technical:', technicalScore, '× 50% =', technicalContribution.toFixed(2))
  console.log('📊 [SCORING] Communication:', communicationScore, '× 20% =', communicationContribution.toFixed(2))
  console.log('📊 [SCORING] Others contribution:', othersWeightedScore.toFixed(2))
  console.log('📊 [SCORING] Final score:', finalScore, '/ 100')
  
  // Step 5: Build criteria breakdown for ALL criteria (including those with 0 questions)
  const criteriaBreakdown: Record<string, any> = {}
  
  // Always include Technical
  const techKey = technicalCriteria || 'Technical'
  criteriaBreakdown[techKey] = {
    question_count: criteriaScores[techKey]?.questionCount || 0,
    questions_answered: criteriaScores[techKey]?.answeredCount || 0,
    average_score: technicalScore,
    weight_percentage: TECHNICAL_WEIGHT,
    weighted_contribution: technicalContribution,
    summary: criteriaScores[techKey] 
      ? `${criteriaScores[techKey].answeredCount}/${criteriaScores[techKey].questionCount} questions answered, avg score ${technicalScore}%`
      : 'No questions asked in this category'
  }
  
  // Always include Communication
  criteriaBreakdown['Communication'] = {
    question_count: criteriaScores['Communication']?.questionCount || 0,
    questions_answered: criteriaScores['Communication']?.answeredCount || 0,
    average_score: communicationScore,
    weight_percentage: COMMUNICATION_WEIGHT,
    weighted_contribution: communicationContribution,
    summary: criteriaScores['Communication']
      ? `${criteriaScores['Communication'].answeredCount}/${criteriaScores['Communication'].questionCount} questions answered, avg score ${communicationScore}%`
      : 'No questions asked in this category'
  }
  
  // Add other criteria
  otherCriteriaBreakdown.forEach(({ criteria, score, weight, contribution }) => {
    criteriaBreakdown[criteria] = {
      question_count: criteriaScores[criteria]?.questionCount || 0,
      questions_answered: criteriaScores[criteria]?.answeredCount || 0,
      average_score: score,
      weight_percentage: weight,
      weighted_contribution: contribution,
      summary: `${criteriaScores[criteria].answeredCount}/${criteriaScores[criteria].questionCount} questions answered, avg score ${score}%`
    }
  })
  
  // Build breakdown for formula
  const breakdown: any[] = [
    { criteria: techKey, score: technicalScore, weight: TECHNICAL_WEIGHT, contribution: technicalContribution },
    { criteria: 'Communication', score: communicationScore, weight: COMMUNICATION_WEIGHT, contribution: communicationContribution },
    ...otherCriteriaBreakdown
  ]
  
  const categoriesUsed = Object.keys(byCategory)
  const allPossibleCategories = [techKey, 'Communication', ...otherCriteria]
  const categoriesNotUsed = allPossibleCategories.filter(c => !categoriesUsed.includes(c))
  
  return {
    overall_score: finalScore,
    criteria_breakdown: criteriaBreakdown,
    categories_used: categoriesUsed,
    categories_not_used: categoriesNotUsed,
    final_score_calculation: {
      formula: breakdown.map(b => `${b.criteria}: ${b.score}% × ${b.weight}% = ${b.contribution.toFixed(2)}`).join(' + '),
      breakdown,
      total: finalScore,
      questions_with_marks: processedQuestions
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
