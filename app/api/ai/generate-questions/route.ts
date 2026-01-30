import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai-service'
import { DatabaseService } from '@/lib/database'
import { EVALUATION_CRITERIA, validateCriteriaSelection } from '@/lib/evaluation-criteria'

// RULE-BASED WEIGHT MAPPING (DETERMINISTIC - NOT AI)
// This mapping is fixed and never changes
const CRITERION_WEIGHT_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  'Technical Skills': 'high',
  'Problem Solving': 'high',
  'Communication': 'medium',
  'Adaptability / Learning': 'medium',
  'Culture Fit': 'low',
  // Defaults for other criteria
  'Experience': 'medium',
  'Teamwork / Collaboration': 'medium',
  'Leadership': 'medium',
  'Work Ethic / Reliability': 'low'
}

// Get weight for a criterion - DETERMINISTIC, no AI
function getWeightForCriterion(criterion: string): 'high' | 'medium' | 'low' {
  return CRITERION_WEIGHT_MAP[criterion] || 'medium'
}

// Transform questions to new format with weight
interface QuestionWithWeight {
  id: number
  question: string
  criterion: string
  weight: 'high' | 'medium' | 'low'
}

function transformQuestionsToNewFormat(
  questionsWithCriteria: Array<{ id: number; question: string; criterion: string }>
): QuestionWithWeight[] {
  return questionsWithCriteria.map(q => ({
    id: q.id,
    question: q.question,
    criterion: q.criterion,
    weight: getWeightForCriterion(q.criterion) // RULE-BASED, not AI
  }))
}

export async function POST(request: NextRequest) {
  try {
    const { 
      jobDescription, 
      jobTitle,
      agentType, 
      numberOfQuestions, 
      skills, 
      existingQuestions, 
      agentName, 
      companyId, 
      jobId,
      // New criteria-based parameters
      selectedCriteria,
      useCriteriaBased
    } = await request.json()

    // ==================================================
    // PRE-CONDITION CHECK (MANDATORY)
    // ==================================================
    
    if (useCriteriaBased) {
      // Check 1: Job Title is present and non-empty
      if (!jobTitle || jobTitle.trim().length === 0) {
        return NextResponse.json({
          error: "Please complete the Job Description and select evaluation criteria before generating interview questions.",
          preConditionFailed: true
        }, { status: 400 })
      }

      // Check 2: Job Description is present and sufficiently detailed
      if (!jobDescription || jobDescription.trim().length < 50) {
        return NextResponse.json({
          error: "Please complete the Job Description and select evaluation criteria before generating interview questions.",
          preConditionFailed: true
        }, { status: 400 })
      }

      // Check 3: At least ONE evaluation criterion is selected
      if (!selectedCriteria || !Array.isArray(selectedCriteria) || selectedCriteria.length === 0) {
        return NextResponse.json({
          error: "Please complete the Job Description and select evaluation criteria before generating interview questions.",
          preConditionFailed: true
        }, { status: 400 })
      }
    }

    // Validate basic required fields for legacy mode
    if (!useCriteriaBased && !jobDescription) {
      return NextResponse.json(
        { error: 'Missing required field: jobDescription' },
        { status: 400 }
      )
    }

    // Fetch company's OpenAI credentials from database
    let apiKey: string | null = null
    let projectId: string | null = null

    if (companyId) {
      try {
        console.log('\n' + '='.repeat(60))
        console.log('🎯 [QUESTION GENERATION] Starting with company credentials...')
        console.log('📋 Company ID:', companyId)

        const company = await DatabaseService.getCompanyById(companyId)
        
        if (company) {
          console.log('🔍 [QUESTION GENERATION] Company fetched:', company.name)
          console.log('🔍 [QUESTION GENERATION] Has service key?', !!company.openai_service_account_key)
          console.log('🔍 [QUESTION GENERATION] Has project ID?', !!company.openai_project_id)
          
          if (company.openai_service_account_key && company.openai_project_id) {
            try {
              const keyData = typeof company.openai_service_account_key === "string"
                ? JSON.parse(company.openai_service_account_key)
                : company.openai_service_account_key
              
              apiKey = keyData?.value || keyData
              projectId = company.openai_project_id
              
              if (!apiKey || apiKey.length < 20) {
                throw new Error('Invalid API key format')
              }
              
              console.log('✅ [QUESTION GENERATION] Using company service account key from database')
              console.log('🔑 Project ID:', projectId)
              console.log('🔑 API Key preview:', apiKey?.substring(0, 20) + '...')
            } catch (parseError: any) {
              console.error('❌ [QUESTION GENERATION] Failed to parse service key:', parseError.message)
              apiKey = null
              projectId = null
            }
          } else {
            console.log('⚠️  [QUESTION GENERATION] Company has no credentials in database')
          }
        } else {
          console.log('❌ [QUESTION GENERATION] Company not found')
        }
      } catch (err) {
        console.error('❌ [QUESTION GENERATION] Failed to fetch company credentials:', err)
      }
    }

    // Fallback to environment variable if company key not found
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY || null
      if (apiKey) {
        console.log('⚠️  [QUESTION GENERATION] Using environment OPENAI_API_KEY (fallback)')
      }
    }

    console.log('🏷️  Credential Source:', projectId ? 'company-database' : 'environment-variable')
    console.log('='.repeat(60) + '\n')

    let result: { questions: string[], questionsWithCriteria?: Array<{ id: number; question: string; criterion: string }>, usage?: { promptTokens: number, completionTokens: number } }
    let questionsWithWeight: QuestionWithWeight[] | null = null

    // Check if using new criteria-based generation
    if (useCriteriaBased && selectedCriteria && Array.isArray(selectedCriteria)) {
      console.log('🎯 [QUESTION GENERATION] Using CRITERIA-BASED generation')
      console.log('📋 Selected Criteria:', selectedCriteria)
      
      // Validate criteria selection
      const validation = validateCriteriaSelection(selectedCriteria)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }

      result = await AIService.generateCriteriaBasedQuestions(
        jobDescription,
        selectedCriteria,
        Array.isArray(existingQuestions) ? existingQuestions : [],
        apiKey || undefined,
        projectId || undefined
      )

      // ==================================================
      // STEP 2: Apply RULE-BASED weight mapping (NO AI)
      // ==================================================
      if (result.questionsWithCriteria && result.questionsWithCriteria.length > 0) {
        console.log('🎯 [WEIGHT MAPPING] Applying RULE-BASED weight mapping (deterministic)...')
        
        // Transform to new format with weight
        questionsWithWeight = transformQuestionsToNewFormat(result.questionsWithCriteria)
        
        console.log('✅ [WEIGHT MAPPING] Successfully assigned weights to', questionsWithWeight.length, 'questions')
        
        // Log distribution by criterion and weight
        const criterionDist: Record<string, number> = {}
        const weightDist: Record<string, number> = { high: 0, medium: 0, low: 0 }
        questionsWithWeight.forEach(q => {
          criterionDist[q.criterion] = (criterionDist[q.criterion] || 0) + 1
          weightDist[q.weight]++
        })
        console.log('📊 [WEIGHT MAPPING] Criterion distribution:', criterionDist)
        console.log('⚖️  [WEIGHT MAPPING] Weight distribution:', weightDist)
      }
    } else {
      // Legacy: Use old agent-type based generation
      console.log('🎯 [QUESTION GENERATION] Using LEGACY agent-type generation')
      
      if (!agentType || !numberOfQuestions) {
        return NextResponse.json(
          { error: 'Missing required fields: agentType, numberOfQuestions (for legacy mode)' },
          { status: 400 }
        )
      }

      result = await AIService.generateStagedInterviewQuestions(
        jobDescription,
        agentType,
        numberOfQuestions,
        Array.isArray(skills) ? skills : [],
        Array.isArray(existingQuestions) ? existingQuestions : [],
        agentName,
        apiKey || undefined,
        projectId || undefined
      )
    }

    // Record billing usage for question generation
    if (companyId && result.questions.length > 0) {
      try {
        const promptTokens = result.usage?.promptTokens || Math.round(jobDescription.length / 4) + (result.questions.length * 100)
        const completionTokens = result.usage?.completionTokens || result.questions.length * 50

        // Check if jobId exists in database
        let isPersistedJob = false
        if (jobId) {
          try {
            const jobExists = await DatabaseService.jobExists(jobId)
            isPersistedJob = jobExists
          } catch (err) {
            console.log('🔍 [QUESTION GENERATION] Job existence check failed, treating as draft')
            isPersistedJob = false
          }
        }
        const isDraft = !isPersistedJob

        console.log('\n' + '='.repeat(60))
        console.log('💰 [QUESTION GENERATION] Starting billing tracking...')
        console.log('📋 Company ID:', companyId)
        console.log('💼 Job ID:', jobId || 'N/A')
        console.log('📝 Type:', isDraft ? 'DRAFT (not yet saved)' : 'PERSISTED')
        console.log('❓ Questions Generated:', result.questions.length)
        console.log('🎯 Generation Mode:', useCriteriaBased ? 'CRITERIA-BASED' : 'LEGACY')

        if (result.usage) {
          console.log('✅ [QUESTION GENERATION] Using REAL OpenAI token data!')
          console.log('🤖 Prompt Tokens:', promptTokens)
          console.log('✍️  Completion Tokens:', completionTokens)
          console.log('📝 Total Tokens:', promptTokens + completionTokens)
          console.log('🏷️  Source: OpenAI API (Real Usage)')
        } else {
          console.log('⚠️  [QUESTION GENERATION] Using ESTIMATED token data')
          console.log('🤖 Prompt Tokens (estimated):', promptTokens)
          console.log('✍️  Completion Tokens (estimated):', completionTokens)
        }

        console.log('💾 [QUESTION GENERATION] Saving to database...')
        
        const savedRecord = await DatabaseService.recordQuestionGenerationUsage({
          companyId,
          jobId: isDraft ? null : jobId,
          draftJobId: isDraft ? jobId : null,
          promptTokens,
          completionTokens,
          questionCount: result.questions.length,
          modelUsed: 'gpt-4o'
        })

        console.log('✅ [QUESTION GENERATION] Database insert successful!')
        console.log('🆔 Record ID:', savedRecord?.id || 'N/A')
        console.log('💰 Cost Saved:', savedRecord?.cost ? `$${savedRecord.cost}` : 'N/A')
        console.log('='.repeat(60) + '\n')
      } catch (billingErr) {
        console.error('❌ [QUESTION GENERATION] ERROR: Failed to record billing usage:', billingErr)
      }
    }

    return NextResponse.json({ 
      questions: result.questions,
      // NEW FORMAT: questions with id, question, criterion, weight
      questionsWithWeight: questionsWithWeight || null,
      // Legacy format for backward compatibility
      mappedQuestions: questionsWithWeight ? questionsWithWeight.map(q => ({
        question_text: q.question,
        criterion: q.criterion,
        importance: q.weight
      })) : null,
      usage: result.usage,
      mode: useCriteriaBased ? 'criteria-based' : 'legacy'
    })
  } catch (error) {
    console.error('AI question generation error (outer):', error)
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
