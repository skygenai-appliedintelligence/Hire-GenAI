import { NextRequest, NextResponse } from 'next/server'
import { parseResume, cleanText } from '@/lib/resume-parser'
import { CVEvaluator } from '@/lib/cv-evaluator'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('[Resume Parse] Starting resume parse request')
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const candidateId = formData.get('candidateId') as string | null
    const applicationId = formData.get('applicationId') as string | null

    console.log('[Resume Parse] File received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      candidateId,
      applicationId
    })

    if (!file) {
      return NextResponse.json(
        { error: 'Resume file is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    console.log('[Resume Parse] Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[Resume Parse] Buffer created, size:', buffer.length)

    // Parse the resume
    console.log('[Resume Parse] Starting parseResume function...')
    let parsed
    try {
      parsed = await parseResume(buffer, file.type)
      console.log('[Resume Parse] Parse complete, skills found:', parsed.skills?.length || 0)
    } catch (parseError: any) {
      console.error('[Resume Parse] Parsing failed, using fallback:', parseError.message)
      // Fallback: Create basic parsed object without text extraction
      // Empty rawText will trigger frontend fallback to use form data
      parsed = {
        rawText: '',
        skills: [],
        experience: [],
        education: [],
      }
    }

    // Track company and job for billing
    let companyIdForBilling: string | null = null
    let jobIdForBilling: string | null = null

    // Optionally save parsed data to database
    if (applicationId && parsed.rawText) {
      try {
        // Get company_id and job_id from application for billing
        const appInfo = await (DatabaseService as any)["query"]?.call(
          DatabaseService,
          `SELECT a.job_id, j.company_id 
           FROM applications a
           JOIN jobs j ON a.job_id = j.id
           WHERE a.id = $1::uuid`,
          [applicationId]
        )
        if (appInfo && appInfo.length > 0) {
          companyIdForBilling = appInfo[0].company_id
          jobIdForBilling = appInfo[0].job_id
        }

        // Check if resume_text column exists in applications table
        const checkCol = await (DatabaseService as any)["query"]?.call(
          DatabaseService,
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'applications' 
              AND column_name = 'resume_text'
          ) as exists`,
          []
        )
        
        const hasResumeText = checkCol?.[0]?.exists === true

        if (hasResumeText) {
          // Clean text robustly using shared utility (removes control bytes and PDF artifacts)
          const cleanedText = cleanText(parsed.rawText)
          
          // Save parsed text to applications.resume_text
          // Check if updated_at column exists
          const checkUpdatedAt = await (DatabaseService as any)["query"]?.call(
            DatabaseService,
            `SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
                AND table_name = 'applications' 
                AND column_name = 'updated_at'
            ) as exists`,
            []
          )
          
          const hasUpdatedAt = checkUpdatedAt?.[0]?.exists === true
          
          if (hasUpdatedAt) {
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE applications 
               SET resume_text = $1, updated_at = NOW() 
               WHERE id = $2::uuid`,
              [cleanedText, applicationId]
            )
          } else {
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE applications 
               SET resume_text = $1 
               WHERE id = $2::uuid`,
              [cleanedText, applicationId]
            )
          }
          
          console.log('[Resume Parse] Successfully saved resume text to database')

          // ---- Auto-evaluate after saving resume text (Option A) -----------------
          try {
            // Fetch JD text for this application
            // 1) Get job_id from applications
            const appRows = await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `SELECT job_id FROM applications WHERE id = $1::uuid`,
              [applicationId]
            )
            const jobId = appRows?.[0]?.job_id

            if (jobId) {
              // 2) Determine which JD column exists in jobs
              const jdColsCheck = await (DatabaseService as any)["query"]?.call(
                DatabaseService,
                `SELECT column_name FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'jobs'
                   AND column_name IN ('description','job_description','jd_text','details','summary')`,
                []
              )
              const jdCols = (jdColsCheck || []).map((r: any) => r.column_name)
              const preferred = ['description','job_description','jd_text','details','summary']
              const chosenJdCol = preferred.find(c => jdCols.includes(c))

              if (chosenJdCol) {
                const jdRow = await (DatabaseService as any)["query"]?.call(
                  DatabaseService,
                  `SELECT ${chosenJdCol} as jd FROM jobs WHERE id = $1::uuid`,
                  [jobId]
                )
                const jdText: string | undefined = jdRow?.[0]?.jd || undefined

                if (jdText) {
                  // Prepare inputs
                  const resumeForEval = cleanedText.length > 15000
                    ? cleanedText.substring(0, 15000) + "\n\n[Resume truncated due to length...]"
                    : cleanedText
                  const jdForEval = String(jdText)
                  const passThreshold = 40

                  // Run evaluator
                  const evaluation = await CVEvaluator.evaluateCandidate(
                    resumeForEval,
                    jdForEval,
                    passThreshold
                  )

                  console.log('[Resume Parse] ✅ CV Evaluation completed:', {
                    score: evaluation.overall.score_percent,
                    qualified: evaluation.overall.qualified,
                    reason: evaluation.overall.reason_summary
                  })

                  // Save evaluation results to applications (mirror evaluate-cv route)
                  try {
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
                        const scoreToSave = Math.round(evaluation.overall.score_percent)
                        params.push(scoreToSave)
                        console.log('[Resume Parse] 💾 Saving qualification_score:', scoreToSave)
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
                        console.log('[Resume Parse] Auto-evaluation saved to database')
                      }
                    }

                    // Try to set a qualified-like status when candidate is qualified
                    try {
                      if (evaluation?.overall?.qualified) {
                        const enumRows = await (DatabaseService as any)["query"]?.call(
                          DatabaseService,
                          `SELECT e.enumlabel as enum_value
                           FROM pg_type t 
                           JOIN pg_enum e ON t.oid = e.enumtypid  
                           WHERE t.typname = 'status_application'`,
                          []
                        ) as any[]
                        const statuses = new Set((enumRows || []).map((r: any) => String(r.enum_value)))
                        const preferredStatus = ['cv_qualified', 'qualified', 'screening_passed']
                        const chosen = preferredStatus.find(s => statuses.has(s))
                        if (chosen) {
                          await (DatabaseService as any)["query"]?.call(
                            DatabaseService,
                            `UPDATE applications SET status = $1::status_application WHERE id = $2::uuid`,
                            [chosen, applicationId]
                          )
                          console.log(`[Resume Parse] Application status set to ${chosen}`)
                        }
                      }
                    } catch (setStatusErr) {
                      console.warn('[Resume Parse] Could not set qualified status:', setStatusErr)
                    }
                  } catch (saveErr) {
                    console.warn('[Resume Parse] Failed to save auto-evaluation:', saveErr)
                  }
                }
              }
            }
          } catch (autoEvalErr) {
            console.warn('[Resume Parse] Auto-evaluation failed:', autoEvalErr)
          }
          // --------------------------------------------------------------------
        }
      } catch (err) {
        console.warn('Failed to save resume text to database:', err)
        // Non-fatal, continue
      }
    }

    // Optionally update candidate with parsed info
    if (candidateId && parsed.name) {
      try {
        // Validate that candidateId is a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(candidateId)) {
          console.warn('[Resume Parse] candidateId is not a valid UUID, skipping candidate update:', candidateId)
        } else {
          const updates: string[] = []
          const params: any[] = []
          let p = 1

          // Check which columns exist
          const colCheck = await (DatabaseService as any)["query"]?.call(
            DatabaseService,
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' 
               AND table_name = 'candidates'
               AND column_name IN ('full_name', 'phone', 'location')`,
            []
          )
          const cols = new Set((colCheck || []).map((r: any) => r.column_name))

          if (cols.has('full_name') && parsed.name) {
            updates.push(`full_name = $${p++}`)
            params.push(parsed.name)
          }
          if (cols.has('phone') && parsed.phone) {
            updates.push(`phone = $${p++}`)
            params.push(parsed.phone)
          }
          if (cols.has('location') && parsed.location) {
            updates.push(`location = $${p++}`)
            params.push(parsed.location)
          }

          if (updates.length > 0) {
            params.push(candidateId)
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${p}::uuid`,
              params
            )
          }
        }
      } catch (err) {
        console.warn('Failed to update candidate with parsed data:', err)
        // Non-fatal, continue
      }
    }

    // Record CV parsing usage for billing
    if (companyIdForBilling && jobIdForBilling && parsed.rawText) {
      try {
        console.log('\n' + '='.repeat(60))
        console.log('💰 [CV PARSING] Starting billing tracking...')
        console.log('📋 Company ID:', companyIdForBilling)
        console.log('💼 Job ID:', jobIdForBilling)
        console.log('👤 Candidate ID:', candidateId || 'N/A')
        console.log('📄 File Size:', Math.round(file.size / 1024), 'KB')
        console.log('✅ Parse Successful: Yes')
        console.log('📊 Success Rate:', (parsed.skills && parsed.skills.length > 0 ? 95 : 80) + '%')
        console.log('📝 Resume Text Length:', parsed.rawText.length, 'characters')
        console.log('🔍 Skills Found:', parsed.skills?.length || 0)

        await DatabaseService.recordCVParsingUsage({
          companyId: companyIdForBilling,
          jobId: jobIdForBilling,
          candidateId: candidateId || undefined,
          fileSizeKb: Math.round(file.size / 1024),
          parseSuccessful: true,
          successRate: parsed.skills && parsed.skills.length > 0 ? 95 : 80
        })

        console.log('🎉 [CV PARSING] Billing tracking completed successfully!')
        console.log('='.repeat(60) + '\n')
      } catch (billingErr) {
        console.error('❌ [CV PARSING] ERROR: Failed to record billing usage:')
        console.error('🔥 Error Details:', billingErr)
        console.error('⚠️  Billing tracking failed, but CV parsing succeeded')
        // Non-fatal, don't block the response
      }
    }

    return NextResponse.json({
      success: true,
      parsed: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        summary: parsed.summary,
        skills: parsed.skills,
        experience: parsed.experience,
        education: parsed.education,
        certifications: parsed.certifications,
        languages: parsed.languages,
        links: parsed.links,
        rawText: parsed.rawText.substring(0, 5000), // Truncate for response
      },
    })
  } catch (error: any) {
    console.error('[Resume Parse] ERROR:', error)
    console.error('[Resume Parse] Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to parse resume',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
