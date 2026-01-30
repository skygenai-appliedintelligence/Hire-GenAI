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
      applicationId,
      jobLevel = 'mid' // Job level for adaptive evaluation
    } = body

    // Normalize jobLevel to lowercase
    const normalizedJobLevel = (jobLevel || 'mid').toLowerCase()

    console.log('\n' + '='.repeat(80))
    console.log('🎯 [REAL-TIME EVAL] Starting real-time answer evaluation')
    console.log('='.repeat(80))
    console.log('📝 Question:', question?.substring(0, 100))
    console.log('💬 Answer Length:', answer?.length || 0)
    console.log('🎯 Criterion:', criterion)
    console.log('📊 Job Level:', normalizedJobLevel)
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

    // Build level-specific expectations (inline, no separate helper)
    const levelExpectations = normalizedJobLevel === 'junior'
      ? `**JUNIOR LEVEL EXPECTATIONS:**
- Focus on thinking process, learning ability, and potential
- Look for clear communication and basic concept understanding
- Value enthusiasm, willingness to learn, and growth mindset
- Don't expect extensive production experience or deep expertise
- Evaluate on HOW they think, not just WHAT they know`
      : normalizedJobLevel === 'senior'
      ? `**SENIOR LEVEL EXPECTATIONS:**
- Expect ownership, specific contributions, and measurable impact
- Demand concrete examples: "I built", "I fixed", "I designed", "I led"
- Penalize vague "we worked on" or "team handled" answers - push for individual contribution
- Look for architectural thinking, technical leadership, and team influence
- Evaluate on OWNERSHIP and IMPACT, not just knowledge`
      : `**MID-LEVEL EXPECTATIONS:**
- Balance of technical skills and practical experience
- Look for solid contributions with reasonable ownership
- Expect production experience with some independence
- Evaluate on both knowledge AND application`

    const evaluationPrompt = `You are an expert interview evaluator.

**IMPORTANT ROLE SEPARATION (DO NOT VIOLATE):**
- "Strengths" and "Gaps" are ANALYTICAL INSIGHTS derived ONLY from the answer content.
- The "Score" is a SEPARATE evaluative outcome.
- Do NOT use the score to decide or justify strengths or gaps.
- Assume the score does NOT exist while writing strengths and gaps.

**Context:**
- Position: ${jobTitle || 'Not specified'}
- Company: ${companyName || 'Not specified'}
- Job Level: ${normalizedJobLevel.toUpperCase()}
- Question ${questionNumber || '?'} of ${totalQuestions || '10'}
- Criterion: ${mappedCriterion || 'General'}
- Evaluation Focus: ${evaluationFocus}

${levelExpectations}

**Question Asked:**
"${question}"

**Candidate's Full Answer:**
"${answer}"

**EVALUATION ORDER (STRICT):**

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
   - Assign a score from 0-100 based on how well the answer meets ${normalizedJobLevel} level expectations.
   - The score must be consistent with the strengths and gaps already listed.
   - Do NOT modify strengths or gaps after scoring.

**SCORING GUIDELINES (0-100 scale for ${normalizedJobLevel.toUpperCase()} level):**
- 90-100: EXCEPTIONAL - Goes beyond ${normalizedJobLevel} expectations
- 80-89: EXCELLENT - Strong answer meeting ${normalizedJobLevel} expectations with good examples
- 70-79: GOOD - Solid answer for a ${normalizedJobLevel} candidate
- 60-69: ADEQUATE - Basic but acceptable for ${normalizedJobLevel}
- 50-59: BELOW AVERAGE - Does not meet ${normalizedJobLevel} expectations
- 40-49: WEAK - Significantly below ${normalizedJobLevel} expectations
- Below 40: POOR - Unacceptable for any level

**Return JSON:**
{
  "matches_question": true/false,
  "completeness": "complete" | "partial" | "incomplete" | "off_topic",
  "strengths": [
    "Complete sentence describing specific strength with concrete detail from answer",
    "Another complete sentence with tool/concept/action mentioned by candidate"
  ],
  "gaps": [
    "What was missing + why it matters + what could have been added",
    "Another missing element with explanation"
  ],
  "score": 0-100,
  "reasoning": "Level-aware evaluation reasoning for ${normalizedJobLevel.toUpperCase()} candidate. Must reference job level and be consistent with strengths/gaps listed above.",
  "criterion_match": {
    "assigned_criterion": "${mappedCriterion || 'General'}",
    "matches_criterion": true/false
  },
  "recommendation": "proceed" | "needs_improvement" | "insufficient"
}

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
            content: `You are an expert interview evaluator. Follow STRICT role separation: analyze strengths and gaps FIRST from the answer content only, THEN assign a score. Never let the score influence strengths/gaps. You are evaluating a ${normalizedJobLevel.toUpperCase()} level candidate. Adapt expectations: juniors on thinking/learning, seniors on ownership/impact, mid on balanced skills. Provide JSON output only.`
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
        // New strict separation fields
        strengths: evaluation.strengths || [], // Extracted from answer content only
        gaps: evaluation.gaps || [], // Missing elements with explanations
        reasoning: evaluation.reasoning || '', // Level-aware reasoning
        criterion_match: evaluation.criterion_match || {
          assigned_criterion: mappedCriterion,
          matches_criterion: true
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
