import { NextRequest, NextResponse } from 'next/server'
import { CVEvaluator } from '@/lib/cv-evaluator'
import { DatabaseService } from '@/lib/database'
import { checkOpenAIPermissions } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, resumeText, jobDescription, passThreshold = 40 } = body

    console.log('[CV Evaluator] Starting evaluation for application:', applicationId)

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: 'resumeText and jobDescription are required' },
        { status: 400 }
      )
    }

    // Check OpenAI permissions first
    const openAIStatus = await checkOpenAIPermissions()
    if (!openAIStatus.hasPermissions) {
      console.log('🔐 [CV EVALUATOR] OpenAI API key permissions issue detected')
      console.log('📝 Error:', openAIStatus.error)
      console.log('🏷️  Using fallback mock evaluation')
    } else {
      console.log('✅ [CV EVALUATOR] OpenAI API key has proper permissions')
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
      passThreshold
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
              breakdown: evaluation.breakdown,
              extracted: evaluation.extracted,
              gaps_and_notes: evaluation.gaps_and_notes,
              reason_summary: evaluation.overall.reason_summary
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
