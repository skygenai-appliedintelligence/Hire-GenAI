import { NextRequest, NextResponse } from 'next/server'
import { CVEvaluator } from '@/lib/cv-evaluator'
import { DatabaseService } from '@/lib/database'
import { checkOpenAIPermissions } from '@/lib/config'
import { decrypt } from '@/lib/encryption'
import { getAppUrl } from '@/lib/utils/url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, resumeText, jobDescription, passThreshold = 40, companyId } = body

    console.log('[CV Evaluator] Starting evaluation for application:', applicationId)
    console.log('[CV Evaluator] Received companyId:', companyId)
    console.log('[CV Evaluator] ResumeText length:', resumeText?.length || 0)
    console.log('[CV Evaluator] JobDescription length:', jobDescription?.length || 0)

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: 'resumeText and jobDescription are required' },
        { status: 400 }
      )
    }

    // Fetch company's OpenAI service account key if companyId provided
    let openaiApiKey: string | undefined = undefined
    if (companyId) {
      try {
        const companyData = await (DatabaseService as any)["query"]?.call(
          DatabaseService,
          `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
          [companyId]
        ) as any[]
        
        if (companyData && companyData.length > 0 && companyData[0].openai_service_account_key) {
          try {
            // Decrypt the encrypted key using ENCRYPTION_KEY from .env
            const encryptedKey = companyData[0].openai_service_account_key
            console.log('🔑 [CV EVALUATOR] Encrypted key format:', encryptedKey.substring(0, 50) + '...')
            
            const decryptedKey = decrypt(encryptedKey)
            const trimmedKey = decryptedKey.trim()
            
            console.log('🔑 [CV EVALUATOR] Decrypted key (first 100 chars):', trimmedKey.substring(0, 100))
            
            // Check if it's a JSON object (starts with {)
            if (trimmedKey.startsWith('{')) {
              try {
                const keyObj = JSON.parse(trimmedKey)
                console.log('🔑 [CV EVALUATOR] JSON keys available:', Object.keys(keyObj))
                
                // Extract the actual API key from the JSON object
                // Try multiple possible key names
                openaiApiKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || (typeof keyObj === 'string' ? keyObj : null)
                
                if (!openaiApiKey && keyObj.id) {
                  // If it's a service account JSON, the API key might be stored differently
                  openaiApiKey = keyObj.id
                }
                
                console.log('🔑 [CV EVALUATOR] Extracted API key from JSON object')
              } catch (jsonErr) {
                // If JSON parsing fails, use the whole thing
                openaiApiKey = trimmedKey
                console.log('🔑 [CV EVALUATOR] Could not parse JSON, using raw decrypted value')
              }
            } else {
              // It's a plain string API key
              openaiApiKey = trimmedKey
              console.log('🔑 [CV EVALUATOR] Using plain string API key')
            }
            
            console.log('🔑 [CV EVALUATOR] Using company service account key from database (decrypted)')
            if (openaiApiKey) {
              console.log('🔑 [CV EVALUATOR] API key length:', openaiApiKey.length)
              console.log('🔑 [CV EVALUATOR] Key starts with:', openaiApiKey.substring(0, 10))
            }
          } catch (decryptErr) {
            console.warn('🔑 [CV EVALUATOR] Failed to decrypt company service account key:', decryptErr)
          }
        }
      } catch (fetchErr) {
        console.warn('[CV Evaluator] Failed to fetch company service account key:', fetchErr)
      }
    }

    // Fallback to environment variable if no company key
    if (!openaiApiKey) {
      openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
      if (openaiApiKey) {
        console.log('[CV Evaluator] Using environment OPENAI_API_KEY for evaluation')
      } else {
        console.log('🔐 [CV EVALUATOR] No OpenAI API key configured (no company key, no env key)')
      }
    }

    // Truncate resume text if too long (max 15000 chars to stay under token limits)
    const truncatedResume = resumeText.length > 15000 
      ? resumeText.substring(0, 15000) + "\n\n[Resume truncated due to length...]"
      : resumeText

    // Truncate JD if too long
    const truncatedJD = jobDescription.length > 5000
      ? jobDescription.substring(0, 5000) + "\n\n[JD truncated...]"
      : jobDescription

    console.log('[CV Evaluator] Resume length:', truncatedResume.length, 'JD length:', truncatedJD.length)

    // Evaluate using strict rubric
    const evaluation = await CVEvaluator.evaluateCandidate(
      truncatedResume,
      truncatedJD,
      passThreshold,
      companyId,
      openaiApiKey ? { apiKey: openaiApiKey } : undefined
    )

    console.log('[CV Evaluator] Evaluation complete:', {
      score: evaluation.overall.score_percent,
      qualified: evaluation.overall.qualified
    })

    // Check if this is a mock evaluation (due to API key issues)
    if (evaluation.overall.reason_summary.includes('Mock evaluation') ||
        evaluation.overall.reason_summary.includes('OpenAI API unavailable')) {
      console.log('⚠️  [CV EVALUATOR] Using fallback evaluation due to OpenAI API key permissions')
      console.log('🔑 [CV EVALUATOR] OpenAI API key needs "api.responses.write" scope')
      console.log('📝 [CV EVALUATOR] Current evaluation is simulated data')
    } else {
      console.log('✅ [CV EVALUATOR] Real AI evaluation completed successfully')
    }

    // Save evaluation to database if applicationId provided
    if (applicationId) {
      try {
        // Check if columns exist
        const checkCols = await (DatabaseService as any)["query"]?.call(
          DatabaseService,
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' 
             AND table_name = 'applications'
             AND column_name IN ('qualification_score', 'is_qualified', 'qualification_explanations')`,
          []
        )
        const cols = new Set((checkCols || []).map((r: any) => r.column_name))

        if (cols.size > 0) {
          const updates: string[] = []
          const params: any[] = []
          let p = 1

          if (cols.has('qualification_score')) {
            updates.push(`qualification_score = $${p++}`)
            params.push(Math.round(evaluation.overall.score_percent))
          }
          if (cols.has('is_qualified')) {
            updates.push(`is_qualified = $${p++}`)
            params.push(evaluation.overall.qualified)
          }
          if (cols.has('qualification_explanations')) {
            updates.push(`qualification_explanations = $${p++}::jsonb`)
            params.push(JSON.stringify({
              // Core fields
              overall: evaluation.overall,
              extracted: evaluation.extracted,
              scores: evaluation.scores,
              reason_summary: evaluation.overall.reason_summary,
              // Domain-agnostic CV evaluation fields
              eligibility: evaluation.eligibility,
              risk_adjustments: evaluation.risk_adjustments,
              production_exposure: evaluation.production_exposure,
              tenure_analysis: evaluation.tenure_analysis,
              explainable_score: evaluation.explainable_score
            }))
          }

          if (updates.length > 0) {
            params.push(applicationId)
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE applications SET ${updates.join(', ')} WHERE id = $${p}::uuid`,
              params
            )
            console.log('[CV Evaluator] Saved evaluation to database')
          }
        }

        // Additionally, try to set a qualified-like status when candidate is qualified
        try {
          if (evaluation?.overall?.qualified) {
            // Find available application status enum values
            const enumRows = await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `SELECT e.enumlabel as enum_value
               FROM pg_type t 
               JOIN pg_enum e ON t.oid = e.enumtypid  
               WHERE t.typname = 'status_application'`,
              []
            ) as any[]
            const statuses = new Set((enumRows || []).map((r: any) => String(r.enum_value)))

            // Preferred qualified-like statuses in order
            const preferred = ['cv_qualified', 'qualified', 'screening_passed']
            const chosen = preferred.find(s => statuses.has(s))

            if (chosen) {
              await (DatabaseService as any)["query"]?.call(
                DatabaseService,
                `UPDATE applications SET status = $1::status_application WHERE id = $2::uuid`,
                [chosen, applicationId]
              )
              console.log(`[CV Evaluator] Application status set to ${chosen}`)
            }

            // Trigger auto-send interview email if candidate is qualified
            try {
              // Get the job_id for this application
              const jobQuery = `SELECT job_id FROM applications WHERE id = $1::uuid`
              const jobRows = await (DatabaseService as any)["query"]?.call(
                DatabaseService,
                jobQuery,
                [applicationId]
              ) as any[]
              
              const jobId = jobRows?.[0]?.job_id
              
              if (jobId) {
                console.log(`🎯 [CV EVALUATOR] Candidate qualified, triggering auto-email check...`)
                
                // Call the auto-send-interview-email API with 1 minute delay (60000ms)
                const baseUrl = getAppUrl()
                fetch(`${baseUrl}/api/applications/auto-send-interview-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    applicationId,
                    jobId,
                    delay: 60000 // 1 minute delay
                  })
                }).catch(err => {
                  console.error(`⚠️ [CV EVALUATOR] Failed to trigger auto-email:`, err)
                })
              }
            } catch (autoEmailErr) {
              // Don't fail the main request if auto-email scheduling fails
              console.error(`⚠️ [CV EVALUATOR] Auto-email scheduling error:`, autoEmailErr)
            }
          }
        } catch (setStatusErr) {
          console.warn('[CV Evaluator] Could not set qualified status:', setStatusErr)
        }
      } catch (dbError) {
        console.warn('[CV Evaluator] Failed to save to database:', dbError)
        // Non-fatal, continue
      }
    }

    return NextResponse.json({
      success: true,
      evaluation
    })
  } catch (error: any) {
    console.error('[CV Evaluator] Error:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to evaluate CV',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
