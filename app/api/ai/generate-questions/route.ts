import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/ai-service'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, agentType, numberOfQuestions, skills, existingQuestions, agentName, companyId, jobId } = await request.json()

    if (!jobDescription || !agentType || !numberOfQuestions) {
      return NextResponse.json(
        { error: 'Missing required fields: jobDescription, agentType, numberOfQuestions' },
        { status: 400 }
      )
    }

    // Fetch company's OpenAI credentials from database (same pattern as session/route.ts)
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

    // Delegate to AIService which handles AI generation, normalization/dedup, and mock backfill
    // Pass the company credentials for per-company OpenAI usage
    const result = await AIService.generateStagedInterviewQuestions(
      jobDescription,
      agentType,
      numberOfQuestions,
      Array.isArray(skills) ? skills : [],
      Array.isArray(existingQuestions) ? existingQuestions : [],
      agentName,
      apiKey || undefined,
      projectId || undefined
    )

    // Record billing usage for question generation (supports draft jobs)
    if (companyId && result.questions.length > 0) {
      try {
        // Use real token counts from OpenAI API if available, otherwise estimate
        const promptTokens = result.usage?.promptTokens || Math.round(jobDescription.length / 4) + (numberOfQuestions * 100)
        const completionTokens = result.usage?.completionTokens || result.questions.length * 50

        // Check if jobId exists in database (real job) or is just a draft UUID
        let isPersistedJob = false
        if (jobId) {
          try {
            // Check if job exists in database
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

        if (result.usage) {
          console.log('✅ [QUESTION GENERATION] Using REAL OpenAI token data!')
          console.log('🤖 Prompt Tokens:', promptTokens)
          console.log('✍️  Completion Tokens:', completionTokens)
          console.log('📝 Total Tokens:', promptTokens + completionTokens)
          console.log('🏷️  Source: OpenAI API (Real Usage)')
        } else {
          console.log('⚠️  [QUESTION GENERATION] Using ESTIMATED token data (No OpenAI API key)')
          console.log('🤖 Prompt Tokens (estimated):', promptTokens)
          console.log('✍️  Completion Tokens (estimated):', completionTokens)
          console.log('📝 Total Tokens (estimated):', promptTokens + completionTokens)
          console.log('🏷️  Source: Estimation (No API key available)')
        }

        console.log('💾 [QUESTION GENERATION] Saving to database...')
        console.log('📊 Table: question_generation_usage')
        
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
        if (isDraft) {
          console.log('🔖 Draft will be reconciled when job is saved')
        }
        console.log('🎉 [QUESTION GENERATION] Billing tracking completed successfully!')
        console.log('='.repeat(60) + '\n')
      } catch (billingErr) {
        console.error('❌ [QUESTION GENERATION] ERROR: Failed to record billing usage:')
        console.error('🔥 Error Details:', billingErr)
        console.error('⚠️  Billing tracking failed, but question generation succeeded')
        // Non-fatal, don't block the response
      }
    }

    return NextResponse.json({ questions: result.questions, usage: result.usage })
  } catch (error) {
    // Final safety: if anything unexpected happens earlier (e.g., JSON parse of request), keep prior behavior
    console.error('AI question generation error (outer):', error)
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
