import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Standard criteria with evaluation focus
const CRITERIA_EVALUATION_FOCUS: Record<string, string> = {
  "Technical": "technical accuracy, depth of knowledge, specific tools/technologies mentioned, practical experience",
  "Technical Skills": "technical accuracy, depth of knowledge, specific tools/technologies mentioned, practical experience",
  "Communication": "clarity of expression, logical structure, articulation, ability to explain concepts clearly",
  "Problem Solving": "analytical approach, step-by-step reasoning, creative solutions, handling of challenges",
  "Cultural Fit": "alignment with company values, motivation, career goals, enthusiasm for the role",
  "Culture Fit": "alignment with company values, motivation, career goals, enthusiasm for the role",
  "Team Player": "collaboration examples, teamwork experience, interpersonal skills, conflict resolution",
  "Teamwork": "collaboration examples, teamwork experience, interpersonal skills, conflict resolution",
  "Leadership": "leadership examples, decision-making, mentoring experience, taking initiative",
  "Experience": "relevant work history, specific project examples, domain expertise",
  "Behavioral": "past behavior examples, situational responses, work ethics, professionalism",
  "Adaptability": "flexibility, learning new skills, handling change, resilience"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      question, 
      answer,
      criterion,
      questionNumber,
      totalQuestions,
      jobTitle,
      companyName,
      companyId,
      applicationId
    } = body

    console.log('\n' + '='.repeat(80))
    console.log('🎯 [REAL-TIME EVAL] Starting real-time answer evaluation')
    console.log('='.repeat(80))
    console.log('📝 Question:', question?.substring(0, 100))
    console.log('💬 Answer Length:', answer?.length || 0)
    console.log('🎯 Criterion:', criterion)
    console.log('🏢 Company ID:', companyId)

    // Validate required fields
    if (!question || !answer) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing question or answer' 
      }, { status: 400 })
    }

    if (!companyId) {
      console.error('❌ [REAL-TIME EVAL] Company ID is required - cannot evaluate without it')
      return NextResponse.json({ 
        ok: false, 
        error: 'Company ID is required for evaluation',
        message: 'Please connect OpenAI in Settings → Billing'
      }, { status: 400 })
    }

    // CRITICAL: Fetch company's OpenAI service account key from database
    // NO FALLBACK - if key is missing, return error
    let openaiApiKey: string | undefined
    let openaiProjectId: string | undefined

    try {
      const companyData = await DatabaseService.query(
        `SELECT openai_service_account_key, openai_project_id, name FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      ) as any[]

      if (!companyData || companyData.length === 0) {
        console.error('❌ [REAL-TIME EVAL] Company not found:', companyId)
        return NextResponse.json({ 
          ok: false, 
          error: 'Company not found',
          message: 'Invalid company ID'
        }, { status: 404 })
      }

      const company = companyData[0]

      if (!company.openai_service_account_key) {
        console.error('❌ [REAL-TIME EVAL] No OpenAI credentials configured for company:', company.name)
        return NextResponse.json({ 
          ok: false, 
          error: 'OpenAI credentials not configured',
          message: 'Please connect OpenAI in Settings → Billing to enable real-time evaluation'
        }, { status: 400 })
      }

      // Decrypt the encrypted key
      try {
        const encryptedKey = company.openai_service_account_key
        const decryptedKey = decrypt(encryptedKey)
        const trimmedKey = decryptedKey.trim()

        // Handle JSON format (service account key)
        if (trimmedKey.startsWith('{')) {
          try {
            const keyObj = JSON.parse(trimmedKey)
            openaiApiKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key
            console.log('✅ [REAL-TIME EVAL] Extracted API key from JSON object')
          } catch (jsonErr) {
            openaiApiKey = trimmedKey
          }
        } else {
          openaiApiKey = trimmedKey
        }

        // Get project ID for proper attribution
        if (company.openai_project_id) {
          try {
            openaiProjectId = decrypt(company.openai_project_id)
          } catch {
            openaiProjectId = company.openai_project_id
          }
        }

        console.log('✅ [REAL-TIME EVAL] Using company service account key from database')
        console.log('🏢 [REAL-TIME EVAL] Company:', company.name)

      } catch (decryptErr) {
        console.error('❌ [REAL-TIME EVAL] Failed to decrypt company credentials:', decryptErr)
        return NextResponse.json({ 
          ok: false, 
          error: 'Failed to decrypt OpenAI credentials',
          message: 'Please re-configure OpenAI in Settings → Billing'
        }, { status: 500 })
      }

    } catch (dbErr) {
      console.error('❌ [REAL-TIME EVAL] Database error fetching company:', dbErr)
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error',
        message: 'Failed to fetch company credentials'
      }, { status: 500 })
    }

    // Final check - if no API key, return error (NO FALLBACK)
    if (!openaiApiKey) {
      console.error('❌ [REAL-TIME EVAL] No OpenAI API key available after extraction')
      return NextResponse.json({ 
        ok: false, 
        error: 'OpenAI API key not available',
        message: 'Please ensure OpenAI is properly configured in Settings → Billing'
      }, { status: 400 })
    }

    // CRITICAL: Fetch configured criteria from job_rounds if criterion is missing or "General"
    let mappedCriterion = criterion
    let configuredCriteria: string[] = []
    
    if (!criterion || criterion === 'General' || criterion === '') {
      console.log('🔍 [REAL-TIME EVAL] Criterion is General/missing, fetching configured criteria...')
      
      try {
        // Get the application's job and fetch criteria from job_rounds
        const jobQuery = `
          SELECT jr.configuration
          FROM applications a
          JOIN job_rounds jr ON jr.job_id = a.job_id
          WHERE a.id = $1::uuid
        `
        const jobRows = await DatabaseService.query(jobQuery, [applicationId]) as any[]
        
        if (jobRows && jobRows.length > 0) {
          jobRows.forEach((row: any) => {
            try {
              const config = typeof row.configuration === 'string' 
                ? JSON.parse(row.configuration) 
                : row.configuration
              if (config?.criteria) {
                config.criteria.forEach((c: string) => {
                  if (!configuredCriteria.includes(c)) {
                    configuredCriteria.push(c)
                  }
                })
              }
            } catch (e) {
              console.error('Error parsing round configuration:', e)
            }
          })
        }
        
        console.log('📋 [REAL-TIME EVAL] Configured criteria:', configuredCriteria)
        
        // If we have configured criteria, use ChatGPT to map the question to the correct criterion
        if (configuredCriteria.length > 0) {
          console.log('🤖 [REAL-TIME EVAL] Using ChatGPT to map question to correct criterion...')
          
          const mappingPrompt = `Given this interview question and the available evaluation criteria, determine which criterion best matches the question.

**Question:** "${question}"

**Available Criteria:**
${configuredCriteria.map(c => `- ${c}`).join('\n')}

**MAPPING RULES:**
- If question asks about tools/technologies/coding/technical skills → Technical
- If question asks about teamwork/collaboration/working with others → Team Player
- If question asks about company/motivation/values/salary/location/role preferences → Culture Fit
- If question asks about explaining/presenting/communication skills → Communication
- If question asks about problem-solving/challenges/analytical thinking → Problem Solving
- If question asks about leadership/managing/mentoring → Leadership

**IMPORTANT:** You MUST choose from ONLY the available criteria listed above. Do not invent new criteria.

Respond with ONLY the criterion name, nothing else. Example response: "Technical"`

          const mappingHeaders: Record<string, string> = {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          }
          if (openaiProjectId) {
            mappingHeaders['OpenAI-Project'] = openaiProjectId
          }

          const mappingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: mappingHeaders,
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

          if (mappingResponse.ok) {
            const mappingData = await mappingResponse.json()
            const suggestedCriterion = mappingData.choices[0]?.message?.content?.trim()
            
            // Validate that the suggested criterion is in our configured list
            const matchedCriterion = configuredCriteria.find(c => 
              c.toLowerCase() === suggestedCriterion?.toLowerCase() ||
              c.toLowerCase().includes(suggestedCriterion?.toLowerCase()) ||
              suggestedCriterion?.toLowerCase().includes(c.toLowerCase())
            )
            
            if (matchedCriterion) {
              mappedCriterion = matchedCriterion
              console.log('✅ [REAL-TIME EVAL] Question mapped to criterion:', mappedCriterion)
            } else {
              console.log('⚠️ [REAL-TIME EVAL] ChatGPT suggested:', suggestedCriterion, '- not in configured list, using first criterion')
              mappedCriterion = configuredCriteria[0] // Default to first configured criterion
            }
          } else {
            console.log('⚠️ [REAL-TIME EVAL] Failed to map criterion, using first configured:', configuredCriteria[0])
            mappedCriterion = configuredCriteria[0]
          }
        }
      } catch (fetchErr) {
        console.error('⚠️ [REAL-TIME EVAL] Error fetching configured criteria:', fetchErr)
      }
    }

    // Build evaluation prompt with the mapped criterion
    const evaluationFocus = CRITERIA_EVALUATION_FOCUS[mappedCriterion] || 'general relevance and completeness'

    const evaluationPrompt = `You are an expert interview evaluator conducting real-time answer evaluation.

**Context:**
- Position: ${jobTitle || 'Not specified'}
- Company: ${companyName || 'Not specified'}
- Question ${questionNumber || '?'} of ${totalQuestions || '10'}

**Question Asked:**
"${question}"

**Assigned Criterion:** ${mappedCriterion || 'General'}
- Evaluation Focus: ${evaluationFocus}

**Candidate's Full Answer:**
"${answer}"

**EVALUATE THE ANSWER AND PROVIDE A DETAILED JSON RESPONSE:**

{
  "matches_question": true/false,
  "completeness": "complete" | "partial" | "incomplete" | "off_topic",
  "score": 0-100,
  "reasoning": "Detailed explanation of why this score was given, citing specific parts of the answer",
  "criterion_match": {
    "assigned_criterion": "${mappedCriterion || 'General'}",
    "matches_criterion": true/false,
    "criterion_reasoning": "How well the answer demonstrates the ${mappedCriterion || 'expected'} criterion"
  },
  "answer_analysis": {
    "key_points_covered": ["point1", "point2"],
    "missing_elements": ["what was not addressed"],
    "strengths": ["specific strength from answer"],
    "weaknesses": ["specific weakness or gap"]
  },
  "recommendation": "proceed" | "needs_improvement" | "insufficient"
}

**STRICT SCORING GUIDELINES - BE HIGHLY CRITICAL:**
- 90-100: EXCEPTIONAL - Comprehensive answer with multiple specific examples, deep technical/domain knowledge, goes beyond expectations. RARELY given.
- 80-89: EXCELLENT - Very strong answer with concrete examples, demonstrates clear expertise, covers all aspects thoroughly
- 70-79: GOOD - Solid answer with some examples, shows competence but lacks exceptional depth or detail
- 60-69: ADEQUATE - Basic answer that addresses the question but lacks examples, depth, or specificity
- 50-59: BELOW AVERAGE - Superficial answer with minimal detail, vague responses, lacks concrete examples
- 40-49: WEAK - Very brief or generic answer, missing key points, shows limited understanding
- 30-39: POOR - Mostly off-topic, incoherent, or demonstrates lack of knowledge
- 20-29: VERY POOR - Almost no relevant content, refused to answer properly, or completely off-topic
- 0-19: UNACCEPTABLE - No answer, inaudible, or completely irrelevant

**CRITICAL STRICT EVALUATION RULES:**
1. BE HIGHLY CRITICAL - Most answers should score 50-70, not 80-90
2. Score 80+ ONLY if answer has MULTIPLE specific examples and exceptional depth
3. Generic or vague answers without examples should score 40-60 maximum
4. Brief answers (< 30 words) should score below 50 unless perfectly targeted
5. Answers lacking concrete examples should lose 20-30 points
6. Off-topic or irrelevant content should score below 30
7. "I don't know" or skipped questions = 0 points
8. DO NOT be lenient - evaluate strictly as if this is a competitive hiring process
9. If answer doesn't demonstrate CLEAR expertise, score should be 60 or below
10. Default assumption: answers are average (50-60) unless they prove otherwise

Return ONLY the JSON object, no other text.`

    // Build headers with project ID for proper attribution
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    }
    if (openaiProjectId) {
      headers['OpenAI-Project'] = openaiProjectId
      console.log('🔑 [REAL-TIME EVAL] Using OpenAI-Project header:', openaiProjectId?.substring(0, 20) + '...')
    }

    console.log('🤖 [REAL-TIME EVAL] Calling OpenAI API...')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using faster model for real-time evaluation
        messages: [
          {
            role: 'system',
            content: 'You are a STRICT expert interview evaluator for a highly competitive hiring process. Be critical and demanding. Most answers should score 40-70. Only exceptional answers with multiple specific examples deserve 80+. Provide detailed, objective evaluations in JSON format only.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ [REAL-TIME EVAL] OpenAI API error:', errorText)
      return NextResponse.json({ 
        ok: false, 
        error: 'OpenAI API error',
        message: `Failed to evaluate answer: ${openaiResponse.status}`,
        details: errorText
      }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0]?.message?.content || ''

    console.log('📊 [REAL-TIME EVAL] Raw response length:', responseText.length)

    // Parse the JSON response
    let evaluation
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0])
      } else {
        evaluation = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('❌ [REAL-TIME EVAL] Failed to parse response:', parseError)
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to parse evaluation response',
        message: 'OpenAI returned invalid JSON'
      }, { status: 500 })
    }

    console.log('✅ [REAL-TIME EVAL] Evaluation completed successfully')
    console.log('📊 [REAL-TIME EVAL] Score:', evaluation.score)
    console.log('📊 [REAL-TIME EVAL] Completeness:', evaluation.completeness)
    console.log('📊 [REAL-TIME EVAL] Matches Question:', evaluation.matches_question)
    console.log('📊 [REAL-TIME EVAL] Mapped Criterion:', mappedCriterion)
    console.log('='.repeat(80))

    // Return the full evaluation result with the MAPPED criterion (not original)
    return NextResponse.json({
      ok: true,
      evaluation: {
        question_number: questionNumber,
        question_text: question,
        full_answer: answer, // Store the full answer
        criterion: mappedCriterion, // Use the ChatGPT-mapped criterion
        score: evaluation.score || 0,
        matches_question: evaluation.matches_question ?? true,
        completeness: evaluation.completeness || 'partial',
        reasoning: evaluation.reasoning || '',
        criterion_match: evaluation.criterion_match || {
          assigned_criterion: mappedCriterion,
          matches_criterion: true,
          criterion_reasoning: ''
        },
        answer_analysis: evaluation.answer_analysis || {
          key_points_covered: [],
          missing_elements: [],
          strengths: [],
          weaknesses: []
        },
        recommendation: evaluation.recommendation || 'proceed',
        evaluated_at: new Date().toISOString(),
        source: 'openai-realtime' // Mark as real OpenAI evaluation, not mock
      }
    })

  } catch (error: any) {
    console.error('❌ [REAL-TIME EVAL] Unexpected error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Unexpected error during evaluation',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
