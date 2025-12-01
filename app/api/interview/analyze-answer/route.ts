import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Standard criteria with evaluation focus
const CRITERIA_EVALUATION_FOCUS: Record<string, string> = {
  "Technical": "technical accuracy, depth of knowledge, specific tools/technologies mentioned, practical experience",
  "Technical Skills": "technical accuracy, depth of knowledge, specific tools/technologies mentioned, practical experience",
  "Communication": "clarity of expression, logical structure, articulation, ability to explain concepts clearly",
  "Problem Solving": "analytical approach, step-by-step reasoning, creative solutions, handling of challenges",
  "Cultural Fit": "alignment with company values, motivation, career goals, enthusiasm for the role",
  "Team Player": "collaboration examples, teamwork experience, interpersonal skills, conflict resolution",
  "Teamwork": "collaboration examples, teamwork experience, interpersonal skills, conflict resolution",
  "Leadership": "leadership examples, decision-making, mentoring experience, taking initiative",
  "Experience": "relevant work history, specific project examples, domain expertise",
  "Behavioral": "past behavior examples, situational responses, work ethics, professionalism"
}

// Patterns that indicate candidate wants to move on - ALWAYS respect these
const MOVE_ON_PATTERNS = [
  /move (forward|on|ahead)/i,
  /next question/i,
  /that'?s (all|it|everything)/i,
  /i'?m (done|finished)/i,
  /(yes|yeah),?\s*(i'?m\s*)?(done|finished)/i,
  /everything is (done|finished|complete)/i,
  /nothing (more|else) to add/i,
  /please (continue|proceed|move)/i,
  /let'?s (move on|continue|proceed)/i
]

// Patterns for setup/confirmation responses - should NOT be analyzed
const SETUP_CONFIRMATION_PATTERNS = [
  /^(yes|yeah|yep|sure|okay|ok|fine|good|great|perfect|alright),?\s*(everything|audio|video|i can|it'?s)?\s*(is|are|works?)?\s*(fine|good|working|clear|okay)?\.?$/i,
  /i can (hear|see) you/i,
  /everything (is|looks) (fine|good|okay|great)/i,
  /audio and video (are|is) (fine|working|good)/i,
  /^(yes|yeah|yep|sure|okay|ok)\.?$/i
]

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
      isSetupPhase
    } = body

    if (!question || !answer) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing question or answer' 
      }, { status: 400 })
    }

    console.log('🔍 [ANALYZE] Analyzing answer...')
    console.log('📝 Question:', question.substring(0, 100))
    console.log('💬 Answer:', answer.substring(0, 100))
    console.log('🎯 Criterion:', criterion)

    // CRITICAL: If candidate explicitly says they want to move on, ALWAYS proceed
    const wantsToMoveOn = MOVE_ON_PATTERNS.some(p => p.test(answer.trim()))
    if (wantsToMoveOn) {
      console.log('✅ [ANALYZE] Candidate wants to move on - respecting their choice')
      return NextResponse.json({
        ok: true,
        analysis: {
          isRelevant: true,
          isComplete: true,
          matchesCriterion: true,
          confidenceScore: 100,
          recommendation: 'proceed',
          followUpPrompt: '',
          details: { reason: 'Candidate explicitly indicated completion' }
        }
      })
    }

    // Skip analysis for setup confirmations
    const isSetupConfirmation = SETUP_CONFIRMATION_PATTERNS.some(p => p.test(answer.trim()))
    if (isSetupConfirmation || isSetupPhase) {
      console.log('✅ [ANALYZE] Setup confirmation - skipping analysis')
      return NextResponse.json({
        ok: true,
        analysis: {
          isRelevant: true,
          isComplete: true,
          matchesCriterion: true,
          confidenceScore: 100,
          recommendation: 'proceed',
          followUpPrompt: '',
          details: { reason: 'Setup/confirmation response' }
        }
      })
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.log('⚠️ [ANALYZE] No OpenAI API key, using basic analysis')
      // Fallback: basic heuristic analysis
      return NextResponse.json({
        ok: true,
        analysis: performBasicAnalysis(question, answer)
      })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    const evaluationFocus = CRITERIA_EVALUATION_FOCUS[criterion] || 'general relevance and completeness'

    const analysisPrompt = `You are an expert interview evaluator. Analyze the candidate's answer in real-time.

**Context:**
- Position: ${jobTitle || 'Not specified'}
- Company: ${companyName || 'Not specified'}
- Question ${questionNumber || '?'} of ${totalQuestions || '10'}

**Question Asked:**
"${question}"

**Assigned Criterion:** ${criterion || 'General'}
- Evaluation Focus: ${evaluationFocus}

**Candidate's Answer:**
"${answer}"

**Analyze the answer and provide a JSON response:**

{
  "isRelevant": true/false,
  "isComplete": true/false,
  "matchesCriterion": true/false,
  "confidenceScore": 0-100,
  "analysis": {
    "relevanceReason": "Brief explanation of why answer is/isn't relevant to the question",
    "completenessReason": "Brief explanation of what's complete or missing",
    "criterionMatch": "How well does the answer demonstrate the ${criterion || 'expected'} criterion"
  },
  "recommendation": "proceed" | "elaborate" | "redirect",
  "followUpPrompt": "If recommendation is not 'proceed', provide a polite prompt for the AI to ask the candidate"
}

**Decision Rules - BE LENIENT, NOT STRICT:**
1. If answer addresses the question with ANY relevant content (even briefly) → "proceed"
2. ONLY ask to elaborate if the answer is TRULY empty, completely off-topic, or just "yes/no/I don't know"
3. If candidate mentions relevant experience, tools, or concepts → "proceed" (even if brief)
4. If candidate gives a reasonable answer of 20+ words → "proceed"
5. ONLY use "redirect" if answer is completely unrelated to the question

**CRITICAL - When to ALWAYS "proceed":**
- Answer mentions specific tools, technologies, or experiences relevant to the question
- Answer is 25+ words and on-topic
- Candidate provides ANY concrete example or detail
- Candidate says they're done, finished, or wants to move on

**When to ask for elaboration (BE CONSERVATIVE):**
- Answer is literally just "yes", "no", "I don't know", or similar single-word responses
- Answer is completely empty or inaudible
- Answer is less than 10 words AND doesn't mention any specifics

**Important:**
- Err on the side of "proceed" - don't be overly strict
- The interview should flow naturally, not feel like an interrogation
- If in doubt, choose "proceed"

Return ONLY the JSON object, no other text.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert interview evaluator. Respond only with valid JSON.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const responseText = completion.choices[0]?.message?.content || ''
    console.log('📊 [ANALYZE] Raw response:', responseText.substring(0, 200))

    // Parse the JSON response
    let analysis
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        analysis = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('❌ [ANALYZE] Failed to parse response:', parseError)
      // Fallback to basic analysis
      analysis = performBasicAnalysis(question, answer)
    }

    console.log('✅ [ANALYZE] Result:', analysis.recommendation)
    console.log('📊 [ANALYZE] Relevant:', analysis.isRelevant, '| Complete:', analysis.isComplete)

    return NextResponse.json({
      ok: true,
      analysis: {
        isRelevant: analysis.isRelevant ?? true,
        isComplete: analysis.isComplete ?? true,
        matchesCriterion: analysis.matchesCriterion ?? true,
        confidenceScore: analysis.confidenceScore ?? 70,
        recommendation: analysis.recommendation || 'proceed',
        followUpPrompt: analysis.followUpPrompt || '',
        details: analysis.analysis || {}
      }
    })

  } catch (error: any) {
    console.error('❌ [ANALYZE] Error:', error)
    return NextResponse.json({
      ok: true,
      analysis: {
        isRelevant: true,
        isComplete: true,
        matchesCriterion: true,
        confidenceScore: 50,
        recommendation: 'proceed',
        followUpPrompt: '',
        details: { error: 'Analysis failed, defaulting to proceed' }
      }
    })
  }
}

// Basic heuristic analysis when API is unavailable - BE LENIENT
function performBasicAnalysis(question: string, answer: string) {
  const answerWords = answer.trim().split(/\s+/).filter(w => w.length > 2)
  const answerLength = answerWords.length
  
  // Check if candidate wants to move on - ALWAYS respect
  const moveOnPatterns = [
    /move (forward|on|ahead)/i,
    /next question/i,
    /that'?s (all|it|everything)/i,
    /i'?m (done|finished)/i,
    /(yes|yeah),?\s*(i'?m\s*)?(done|finished)/i,
    /everything is (done|finished|complete)/i
  ]
  
  if (moveOnPatterns.some(p => p.test(answer.trim()))) {
    return {
      isRelevant: true,
      isComplete: true,
      matchesCriterion: true,
      confidenceScore: 100,
      recommendation: 'proceed',
      followUpPrompt: '',
      details: { reason: 'Candidate wants to proceed' }
    }
  }
  
  // Only these very short non-answers should trigger elaboration
  const nonAnswerPatterns = [
    /^(yes|no|maybe|ok|okay)\.?$/i,
    /^i don'?t know\.?$/i,
    /^no idea\.?$/i,
    /^skip\.?$/i,
    /^pass\.?$/i
  ]
  
  const isNonAnswer = nonAnswerPatterns.some(p => p.test(answer.trim()))
  
  // Determine recommendation - BE LENIENT
  let recommendation = 'proceed'
  let followUpPrompt = ''
  
  // Only ask for elaboration if answer is extremely short AND a non-answer
  if (isNonAnswer && answerLength < 5) {
    recommendation = 'elaborate'
    followUpPrompt = "Could you share a bit more about that?"
  }
  // Otherwise, always proceed - even brief answers are acceptable
  
  return {
    isRelevant: true,
    isComplete: answerLength >= 10 || !isNonAnswer,
    matchesCriterion: true,
    confidenceScore: answerLength >= 20 ? 90 : 70,
    recommendation,
    followUpPrompt,
    details: {
      method: 'heuristic',
      wordCount: answerLength,
      isNonAnswer
    }
  }
}
