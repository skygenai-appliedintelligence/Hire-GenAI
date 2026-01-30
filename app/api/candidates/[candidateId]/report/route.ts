import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/candidates/:candidateId/report?jobId=...
// Returns comprehensive candidate report with evaluation and transcript
export async function GET(req: Request, ctx: { params: Promise<{ candidateId: string }> | { candidateId: string } }) {
  const { candidateId } = await (ctx.params as any)
  const url = new URL(req.url)
  const jobId = url.searchParams.get("jobId")

  if (!candidateId) {
    return NextResponse.json({ ok: false, error: "Missing candidateId" }, { status: 400 })
  }

  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })
    }

    // Fetch candidate info from applications table
    const candidateQuery = `
      SELECT 
        a.id,
        a.status,
        a.created_at as applied_at,
        a.resume_text,
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
        a.qualification_score,
        a.is_qualified,
        a.qualification_explanations,
        a.evaluation,
        a.expected_salary,
        a.salary_currency,
        a.salary_period,
        a.location as app_location,
        a.linkedin_url,
        a.portfolio_url,
        a.available_start_date,
        a.willing_to_relocate,
        a.languages,
        a.photo_url,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.first_name as c_first_name,
        c.last_name as c_last_name,
        c.location,
        c.resume_url,
        f.storage_key as resume_storage_key,
        j.title as job_title
      FROM applications a
      LEFT JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN files f ON c.resume_file_id = f.id
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1::uuid
      ${jobId ? 'AND a.job_id = $2::uuid' : ''}
      LIMIT 1
    `

    const params = jobId ? [candidateId, jobId] : [candidateId]
    const candidateRows = await (DatabaseService as any)["query"]?.call(DatabaseService, candidateQuery, params) as any[]

    if (!candidateRows || candidateRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 })
    }

    const row = candidateRows[0]
    const jobTitle = row.job_title || 'Position'
    const candidateName = row.c_first_name && row.c_last_name 
      ? `${row.c_first_name} ${row.c_last_name}`
      : row.first_name && row.last_name 
      ? `${row.first_name} ${row.last_name}`
      : row.candidate_email?.split('@')[0] || row.email?.split('@')[0] || 'Unknown'

    // Parse languages from JSON if stored as string
    let parsedLanguages = []
    try {
      if (row.languages) {
        parsedLanguages = typeof row.languages === 'string' ? JSON.parse(row.languages) : row.languages
      }
    } catch (e) {
      console.warn('Failed to parse languages:', e)
    }

    const candidate = {
      id: row.id,
      name: candidateName,
      email: row.email || row.candidate_email || '',
      phone: row.phone || row.candidate_phone || '',
      resumeUrl: row.resume_url || row.resume_storage_key || '#',
      appliedAt: row.applied_at || new Date().toISOString(),
      location: row.app_location || row.location || null,
      status: row.status || 'applied',
      expectedSalary: row.expected_salary || null,
      salaryCurrency: row.salary_currency || 'USD',
      salaryPeriod: row.salary_period || 'month',
      linkedinUrl: row.linkedin_url || null,
      portfolioUrl: row.portfolio_url || null,
      availableStartDate: row.available_start_date || null,
      willingToRelocate: row.willing_to_relocate || false,
      languages: parsedLanguages,
      photoUrl: row.photo_url || null
    }

    // Primary source: evaluation from interviews.metadata->evaluation
    let evaluation = null
    try {
      const evalFromInterviewQuery = `
        SELECT (i.metadata -> 'evaluation') AS evaluation_json
        FROM interviews i
        JOIN application_rounds ar ON ar.id = i.application_round_id
        WHERE ar.application_id = $1::uuid
        ORDER BY i.completed_at DESC NULLS LAST, i.started_at DESC NULLS LAST
        LIMIT 1
      `
      const evalIntRows = await (DatabaseService as any)["query"]?.call(DatabaseService, evalFromInterviewQuery, [candidateId]) as any[]
      const evalJson = evalIntRows?.[0]?.evaluation_json
      console.log('🔍 Raw evaluation JSON from interviews:', JSON.stringify(evalJson, null, 2))
      
      if (evalJson) {
        const evalObj = typeof evalJson === 'string' ? JSON.parse(evalJson) : evalJson
        const scores = evalObj.scores || {}
        console.log('📊 Extracted scores object:', JSON.stringify(scores, null, 2))
        
        const strengths = evalObj.strengths || []
        const weaknesses = evalObj.weaknesses || evalObj.areas_for_improvement || []
        const decision = evalObj.decision || evalObj.recommendation || 'pending'
        // Enhanced score extraction with multiple fallback patterns
        const extractScore = (scoreData: any, fieldName: string): number => {
          if (!scoreData) return 0
          
          // Try different possible score formats
          if (typeof scoreData === 'number') return scoreData
          if (scoreData.score !== undefined) return Number(scoreData.score) || 0
          if (scoreData.rating !== undefined) return Number(scoreData.rating) || 0
          if (scoreData.value !== undefined) return Number(scoreData.value) || 0
          
          // Try nested field access
          if (scoreData[fieldName]) {
            const nested = scoreData[fieldName]
            if (typeof nested === 'number') return nested
            if (nested.score !== undefined) return Number(nested.score) || 0
            if (nested.rating !== undefined) return Number(nested.rating) || 0
          }
          
          return 0
        }

        // Extract criteria-based evaluation data (new format)
        const criteriaBreakdown = evalObj.criteria_breakdown || null
        const categoriesUsed = evalObj.categories_used || []
        const categoriesNotUsed = evalObj.categories_not_used || []
        const finalScoreCalculation = evalObj.final_score_calculation || null
        const questionDetails = evalObj.scores || evalObj.questions || []
        
        // Build scores from criteria_breakdown if available (new format)
        let computedScores = {
          technical: 0,
          communication: 0,
          experience: 0,
          cultural_fit: 0
        }
        
        if (criteriaBreakdown) {
          computedScores = {
            technical: criteriaBreakdown['Technical Skills']?.average_score || 0,
            communication: criteriaBreakdown['Communication']?.average_score || 0,
            experience: criteriaBreakdown['Problem Solving']?.average_score || 0,
            cultural_fit: criteriaBreakdown['Cultural Fit']?.average_score || 0
          }
        } else {
          // Fallback to old score extraction
          computedScores = {
            technical: extractScore(scores.technical || scores, 'technical'),
            communication: extractScore(scores.communication || scores, 'communication'),
            experience: extractScore(scores.experience || scores, 'experience'),
            cultural_fit: extractScore(scores.cultural_fit || scores.culture || scores, 'cultural_fit')
          }
        }

        evaluation = {
          overallScore: evalObj.overall_score || 0,
          decision,
          scores: computedScores,
          strengths: Array.isArray(strengths) ? strengths : [],
          weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
          reviewerComments: evalObj.summary || evalObj.reviewer_comments || '',
          reviewedAt: evalObj.evaluated_at || evalObj.reviewed_at || null,
          reviewedBy: evalObj.reviewed_by || 'AI Evaluator',
          // New criteria-based fields
          criteriaBreakdown,
          categoriesUsed,
          categoriesNotUsed,
          finalScoreCalculation,
          questions: questionDetails,
          scoringExplanation: evalObj.scoring_explanation || ''
        }
        console.log('✅ Evaluation loaded from interviews.metadata:', JSON.stringify(evaluation, null, 2))
      }
    } catch (e) {
      console.log('Evaluation from interviews.metadata parse error:', e)
    }

    // Fallback 1: applications.evaluation JSONB
    if (!evaluation) {
      try {
        const rawEval = row.evaluation
        console.log('🔍 Raw evaluation from applications table:', JSON.stringify(rawEval, null, 2))
        
        // Check if rawEval has meaningful data (not empty object)
        const hasData = rawEval && typeof rawEval === 'object' && 
          (rawEval.overall_score || rawEval.scores || rawEval.questions || rawEval.strengths?.length)
        
        if (!hasData) {
          console.log('⚠️ applications.evaluation is empty, will try evaluations table')
        }
        
        if (rawEval && hasData) {
          const evalObj = typeof rawEval === 'string' ? JSON.parse(rawEval) : rawEval
          const scores = evalObj.scores || {}
          console.log('📊 Extracted scores from applications:', JSON.stringify(scores, null, 2))
          
          const strengths = evalObj.strengths || []
          const weaknesses = evalObj.weaknesses || evalObj.areas_for_improvement || []
          const decision = evalObj.decision || evalObj.recommendation || 'pending'
          
          // Enhanced score extraction with multiple fallback patterns
          const extractScore = (scoreData: any, fieldName: string): number => {
            if (!scoreData) return 0
            
            // Try different possible score formats
            if (typeof scoreData === 'number') return scoreData
            if (scoreData.score !== undefined) return Number(scoreData.score) || 0
            if (scoreData.rating !== undefined) return Number(scoreData.rating) || 0
            if (scoreData.value !== undefined) return Number(scoreData.value) || 0
            
            // Try nested field access
            if (scoreData[fieldName]) {
              const nested = scoreData[fieldName]
              if (typeof nested === 'number') return nested
              if (nested.score !== undefined) return Number(nested.score) || 0
              if (nested.rating !== undefined) return Number(nested.rating) || 0
            }
            
            return 0
          }
          
          evaluation = {
            overallScore: evalObj.overall_score || 0,
            decision,
            scores: {
              technical: extractScore(scores.technical || scores, 'technical'),
              communication: extractScore(scores.communication || scores, 'communication'),
              experience: extractScore(scores.experience || scores, 'experience'),
              cultural_fit: extractScore(scores.cultural_fit || scores.culture || scores, 'cultural_fit')
            },
            strengths: Array.isArray(strengths) ? strengths : [],
            weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
            reviewerComments: evalObj.summary || evalObj.reviewer_comments || '',
            reviewedAt: evalObj.evaluated_at || evalObj.reviewed_at || null,
            reviewedBy: evalObj.reviewed_by || 'AI Evaluator'
          }
          console.log('✅ Evaluation loaded from applications table:', JSON.stringify(evaluation, null, 2))
        }
      } catch (e) {
        console.log('Evaluation JSON parse error (applications.evaluation):', e)
      }
    }

    // Fetch configured criteria from job_rounds.configuration
    let configuredCriteriaFromJobRounds: string[] = []
    try {
      const jobRoundsQuery = `
        SELECT jr.configuration
        FROM job_rounds jr
        JOIN jobs j ON jr.job_id = j.id
        JOIN applications a ON a.job_id = j.id
        WHERE a.id = $1::uuid
        LIMIT 1
      `
      const jobRoundsRows = await (DatabaseService as any)["query"]?.call(DatabaseService, jobRoundsQuery, [candidateId]) as any[]
      if (jobRoundsRows && jobRoundsRows.length > 0) {
        const config = typeof jobRoundsRows[0].configuration === 'string' 
          ? JSON.parse(jobRoundsRows[0].configuration) 
          : jobRoundsRows[0].configuration || {}
        configuredCriteriaFromJobRounds = config.criteria || []
        console.log('🎯 Configured criteria from job_rounds:', configuredCriteriaFromJobRounds)
      }
    } catch (e) {
      console.log('Failed to fetch job_rounds configuration:', e)
    }

    // Fallback 2: evaluations table (contains full evaluation data in skill_scores JSONB)
    if (!evaluation) {
      try {
        const interviewEvalQuery = `
          SELECT 
            e.overall_score,
            e.skill_scores,
            e.recommendation,
            e.rubric_notes_md,
            e.created_at as evaluated_at,
            i.id as interview_id
          FROM evaluations e
          JOIN interviews i ON e.interview_id = i.id
          JOIN application_rounds ar ON ar.id = i.application_round_id
          WHERE ar.application_id = $1::uuid
          ORDER BY e.created_at DESC
          LIMIT 1
        `
        const evalRows = await (DatabaseService as any)["query"]?.call(DatabaseService, interviewEvalQuery, [candidateId]) as any[]
        console.log('🔍 Evaluations table query result:', evalRows?.length || 0, 'rows')
        
        if (evalRows && evalRows.length > 0) {
          const evalRow = evalRows[0]
          const skillScores = typeof evalRow.skill_scores === 'string' ? JSON.parse(evalRow.skill_scores) : evalRow.skill_scores || {}
          console.log('🔍 skill_scores from evaluations table:', JSON.stringify(skillScores, null, 2).substring(0, 500))
          
          const notes = evalRow.rubric_notes_md || ''
          const strengthsMatch = notes.match(/## Strengths\n((?:- .+\n?)*)/i)
          const weaknessesMatch = notes.match(/## Areas for Improvement\n((?:- .+\n?)*)/i)
          const strengths = strengthsMatch ? strengthsMatch[1].split('\n').filter((s: string) => s.trim().startsWith('-')).map((s: string) => s.replace(/^- /, '').trim()) : []
          const weaknesses = weaknessesMatch ? weaknessesMatch[1].split('\n').filter((s: string) => s.trim().startsWith('-')).map((s: string) => s.replace(/^- /, '').trim()) : []
          
          // Extract questions array from skill_scores (stored as {questions: [...], marks_summary: {...}})
          const questionDetails = skillScores.questions || []
          const marksSummary = skillScores.marks_summary || {}
          
          // Build criteria breakdown from questions
          const criteriaBreakdown: Record<string, any> = {}
          questionDetails.forEach((q: any) => {
            const criteria = q.criteria || q.category || 'General'
            if (!criteriaBreakdown[criteria]) {
              criteriaBreakdown[criteria] = {
                question_count: 0,
                questions_answered: 0,
                total_score: 0,
                average_score: 0
              }
            }
            criteriaBreakdown[criteria].question_count++
            if (q.answered !== false) {
              criteriaBreakdown[criteria].questions_answered++
              criteriaBreakdown[criteria].total_score += (q.score || 0)
            }
          })
          
          // Calculate average scores per criteria
          Object.keys(criteriaBreakdown).forEach(key => {
            const cb = criteriaBreakdown[key]
            cb.average_score = cb.questions_answered > 0 
              ? Math.round(cb.total_score / cb.questions_answered) 
              : 0
          })
          
          // Use configured criteria from job_rounds (all criteria should be shown)
          // If job_rounds criteria not available, fall back to criteria from questions
          const criteriaFromQuestions = [...new Set(
            questionDetails
              .map((q: any) => q.criteria || q.category || '')
              .filter((c: string) => c && c !== 'General')
          )]
          
          // Priority: job_rounds configured criteria > criteria from questions
          const evaluation_criteria = configuredCriteriaFromJobRounds.length > 0 
            ? configuredCriteriaFromJobRounds.filter((c: string) => c !== 'General')
            : criteriaFromQuestions
          
          evaluation = {
            overallScore: parseFloat(evalRow.overall_score) || 0,
            decision: evalRow.recommendation || 'pending',
            scores: {
              technical: criteriaBreakdown['Technical']?.average_score || criteriaBreakdown['Technical Skills']?.average_score || 0,
              communication: criteriaBreakdown['Communication']?.average_score || 0,
              experience: criteriaBreakdown['Problem Solving']?.average_score || 0,
              cultural_fit: criteriaBreakdown['Culture fit']?.average_score || criteriaBreakdown['Cultural Fit']?.average_score || 0
            },
            strengths,
            weaknesses,
            reviewerComments: notes.replace(/## Strengths[\s\S]*?## Areas for Improvement[\s\S]*?$/i, '').trim() || '',
            reviewedAt: evalRow.evaluated_at || null,
            reviewedBy: 'AI Evaluator',
            // Include full question details for report page
            questions: questionDetails,
            criteriaBreakdown,
            marksSummary,
            // Include ALL configured criteria from job_rounds for frontend display
            evaluation_criteria,
            // Also include the raw configured criteria for reference
            configured_criteria: configuredCriteriaFromJobRounds
          }
          console.log('🎯 Configured criteria from job_rounds:', configuredCriteriaFromJobRounds)
          console.log('🎯 Evaluation criteria (final):', evaluation_criteria)
          console.log('✅ Evaluation loaded from evaluations table with', questionDetails.length, 'questions')
          console.log('📊 Overall score:', evalRow.overall_score)
        }
      } catch (e) {
        console.log('Failed to fetch from evaluations table:', e)
      }
    }

    // Fetch all 4 photos: applied photo, pre-interview, during-interview (silent), post-interview
    let verificationPhotos = { 
      appliedPhoto: null as string | null, 
      preInterviewPhoto: null as string | null,
      duringInterviewPhoto: null as string | null,
      postInterviewPhoto: null as string | null 
    }
    try {
      const photosQuery = `
        SELECT 
          a.photo_url as applied_photo,
          a.verification_photo_url as pre_interview_photo,
          i.during_interview_screenshot as during_interview_photo,
          i.post_interview_photo_url as post_interview_photo
        FROM applications a
        LEFT JOIN application_rounds ar ON ar.application_id = a.id
        LEFT JOIN interviews i ON i.application_round_id = ar.id
        WHERE a.id = $1::uuid
        ORDER BY i.id DESC
        LIMIT 1
      `
      const photoRows = await DatabaseService.query(photosQuery, [candidateId]) as any[]
      if (photoRows && photoRows.length > 0) {
        verificationPhotos.appliedPhoto = photoRows[0].applied_photo || null
        verificationPhotos.preInterviewPhoto = photoRows[0].pre_interview_photo || null
        verificationPhotos.duringInterviewPhoto = photoRows[0].during_interview_photo || null
        verificationPhotos.postInterviewPhoto = photoRows[0].post_interview_photo || null
        console.log('📸 Verification photos loaded:', {
          applied: verificationPhotos.appliedPhoto ? 'Present' : 'None',
          preInterview: verificationPhotos.preInterviewPhoto ? 'Present' : 'None',
          duringInterview: verificationPhotos.duringInterviewPhoto ? 'Present' : 'None',
          postInterview: verificationPhotos.postInterviewPhoto ? 'Present' : 'None'
        })
      }
    } catch (e) {
      console.log('Failed to fetch verification photos:', e)
    }

    // Try to fetch transcript data from interviews table
    let transcript = null
    try {
      console.log('📝 Fetching transcript for application:', candidateId)
      
      // First check if application_rounds exist
      const checkRoundsQuery = `SELECT id FROM application_rounds WHERE application_id = $1::uuid`
      const roundsCheck = await (DatabaseService as any)["query"]?.call(DatabaseService, checkRoundsQuery, [candidateId]) as any[]
      console.log('📝 Application rounds found:', roundsCheck?.length || 0)
      if (roundsCheck && roundsCheck.length > 0) {
        console.log('📝 Round ID:', roundsCheck[0].id)
      }
      
      const transcriptQuery = `
        SELECT 
          i.id as interview_id,
          i.raw_transcript,
          i.started_at,
          i.completed_at,
          i.status,
          ra.agent_type,
          ar.id as round_id
        FROM interviews i
        JOIN application_rounds ar ON ar.id = i.application_round_id
        LEFT JOIN round_agents ra ON ra.id = i.round_agent_id
        WHERE ar.application_id = $1::uuid
        ORDER BY i.completed_at DESC NULLS LAST, i.started_at DESC NULLS LAST
        LIMIT 1
      `
      const transcriptRows = await (DatabaseService as any)["query"]?.call(DatabaseService, transcriptQuery, [candidateId]) as any[]
      console.log('📝 Transcript rows found:', transcriptRows?.length || 0)
      if (transcriptRows && transcriptRows.length > 0) {
        console.log('📝 Interview ID:', transcriptRows[0].interview_id)
        console.log('📝 Transcript length:', transcriptRows[0].raw_transcript?.length || 0)
      }
      
      if (transcriptRows && transcriptRows.length > 0) {
        const transRow = transcriptRows[0]
        
        // Calculate duration if we have both timestamps
        let duration = null
        if (transRow.started_at && transRow.completed_at) {
          const start = new Date(transRow.started_at)
          const end = new Date(transRow.completed_at)
          const diffMs = end.getTime() - start.getTime()
          const diffMins = Math.floor(diffMs / 60000)
          duration = `${diffMins} minutes`
        }
        
        transcript = {
          text: transRow.raw_transcript || 'No transcript available',
          duration: duration,
          interviewDate: transRow.completed_at || transRow.started_at || null,
          interviewer: transRow.agent_type || 'AI Agent',
          status: transRow.status
        }
        console.log('✅ Transcript loaded, length:', transRow.raw_transcript?.length || 0)
      } else {
        console.log('⚠️ No transcript found for application:', candidateId)
      }
    } catch (e) {
      console.error('❌ Failed to fetch transcript:', e)
    }

    // Parse qualification_explanations if available
    let qualificationDetails = null
    if (row.qualification_explanations) {
      try {
        qualificationDetails = typeof row.qualification_explanations === 'string' 
          ? JSON.parse(row.qualification_explanations)
          : row.qualification_explanations
      } catch (e) {
        console.warn('Failed to parse qualification_explanations:', e)
      }
    }

    // Compute section pointer scores (0-100) and short summaries for Technical and Cultural
    const normalizeTo100 = (val: any): number => {
      const n = Number(val ?? 0)
      if (!isFinite(n)) return 0
      // If the score looks like 0-10, scale up; otherwise clamp to 0-100
      if (n <= 10) return Math.max(0, Math.min(100, Math.round(n * 10)))
      return Math.max(0, Math.min(100, Math.round(n)))
    }
    const pickLine = (arr: any[], fallback: string) => {
      if (Array.isArray(arr) && arr.length > 0) return String(arr[0])
      return fallback
    }
    const safeEval = evaluation || { scores: {}, strengths: [], weaknesses: [], reviewerComments: '', criteriaBreakdown: null }
    
    // PRIORITY: Use criteria_breakdown if available (new school exam style)
    // This has accurate scores based on actual answered questions
    const criteriaBreakdown = safeEval.criteriaBreakdown || (safeEval as any).criteria_breakdown
    
    let techScoreRaw = 0
    let commScoreRaw = 0
    let expScoreRaw = 0
    let cultScoreRaw = 0
    
    if (criteriaBreakdown) {
      // Use the accurate scores from criteria breakdown
      // These are calculated as: (obtained_marks / max_marks) * 100
      techScoreRaw = criteriaBreakdown['Technical Skills']?.average_score || 0
      commScoreRaw = criteriaBreakdown['Communication']?.average_score || 0
      expScoreRaw = criteriaBreakdown['Problem Solving']?.average_score || 0
      cultScoreRaw = criteriaBreakdown['Cultural Fit']?.average_score || 0
      console.log('📊 Using criteria_breakdown scores:', { techScoreRaw, commScoreRaw, expScoreRaw, cultScoreRaw })
    } else {
      // Fallback to old scores format
      techScoreRaw = (safeEval.scores as any)?.technical ?? (safeEval.scores as any)?.tech ?? 0
      commScoreRaw = (safeEval.scores as any)?.communication ?? 0
      expScoreRaw = (safeEval.scores as any)?.experience ?? 0
      cultScoreRaw = (safeEval.scores as any)?.cultural_fit ?? (safeEval.scores as any)?.culture ?? 0
      console.log('📊 Using fallback scores:', { techScoreRaw, commScoreRaw, expScoreRaw, cultScoreRaw })
    }
    
    // If all individual scores are 0 but we have an overall score, use overall score for all
    const hasIndividualScores = techScoreRaw || commScoreRaw || expScoreRaw || cultScoreRaw
    if (!hasIndividualScores && safeEval.overallScore) {
      const baseScore = safeEval.overallScore
      console.log('📊 No individual scores found, using overall score:', baseScore)
      // Use overall score directly (no random variation - that was wrong)
      techScoreRaw = baseScore
      commScoreRaw = baseScore
      expScoreRaw = baseScore
      cultScoreRaw = baseScore
    }
    
    const techScore = normalizeTo100(techScoreRaw)
    const commScore = normalizeTo100(commScoreRaw)
    const expScore = normalizeTo100(expScoreRaw)
    // Cultural pointer: prioritize cultural_fit, otherwise approximate via communication
    const culturalScore = normalizeTo100(cultScoreRaw ?? commScoreRaw)
    const strengthLine = pickLine(safeEval.strengths as any[], 'Shows notable strengths relevant to the role.')
    const weaknessLine = pickLine(safeEval.weaknesses as any[], 'Some areas need improvement.')
    const sectionPointers = {
      technical: {
        score: techScore,
        label: `${techScore}/100`,
        summary: techScore >= 75
          ? `Strong technical proficiency. ${strengthLine}`
          : techScore >= 50
          ? `Moderate technical proficiency with room to grow. ${weaknessLine}`
          : `Below expectations on technical depth. ${weaknessLine}`
      },
      communication: {
        score: commScore,
        label: `${commScore}/100`,
        summary: commScore >= 75
          ? `Excellent communication skills and clear articulation. ${strengthLine}`
          : commScore >= 50
          ? `Adequate communication with room for improvement. ${weaknessLine}`
          : `Communication skills need significant development. ${weaknessLine}`
      },
      experience: {
        score: expScore,
        label: `${expScore}/100`,
        summary: expScore >= 75
          ? `Extensive relevant experience matching job requirements. ${strengthLine}`
          : expScore >= 50
          ? `Moderate experience with some gaps to address. ${weaknessLine}`
          : `Limited experience for this role level. ${weaknessLine}`
      },
      cultural: {
        score: culturalScore,
        label: `${culturalScore}/100`,
        summary: culturalScore >= 75
          ? `Good alignment with team communication and values. ${strengthLine}`
          : culturalScore >= 50
          ? `Partial cultural fit; communication or collaboration can improve. ${weaknessLine}`
          : `Low cultural alignment observed; may face collaboration challenges. ${weaknessLine}`
      }
    }

    console.log('📤 Final evaluation object being sent:', JSON.stringify(evaluation, null, 2))
    console.log('📤 Final sectionPointers being sent:', JSON.stringify(sectionPointers, null, 2))

    // CHANGE 2: Classification logic - PROFILE-ONLY (NO SCORES)
    const candidateProfile = qualificationDetails?.candidateProfile
    const breakdown = qualificationDetails?.breakdown
    const university = candidateProfile?.university || 'non-targeted' // Default to non-targeted
    const employer = candidateProfile?.employer || 'non-targeted' // Default to non-targeted
    const hasRelevantEducation = breakdown?.education_qualification?.field_match === true || qualificationDetails?.scores?.education_and_certs?.field_match === true

    // Base match decision matrix (NO SCORE INVOLVEMENT)
    let baseMatch: string
    if (university === 'targeted' || employer === 'targeted') {
      baseMatch = "Strong Match"
    } else if (university === 'non-targeted' && hasRelevantEducation) {
      baseMatch = "Good Match"
    } else if (university === 'non-targeted') {
      baseMatch = "Partial Match"
    } else {
      baseMatch = "Weak Match"
    }

    // Build details array for parentheses
    const classificationDetails: string[] = []
    if (university === 'targeted') classificationDetails.push("Targeted institute")
    if (university === 'non-targeted') classificationDetails.push("Non-targeted institute")
    if (employer === 'targeted') classificationDetails.push("Tier-1 employer")
    if (hasRelevantEducation) classificationDetails.push("Relevant education")

    // Grammar fix: "but" instead of comma for non-targeted + relevant education
    let detailText = classificationDetails.join(", ")
    if (classificationDetails.includes("Non-targeted institute") && classificationDetails.includes("Relevant education")) {
      detailText = "Non-targeted institute but Relevant education"
    }

    const classification = detailText.length > 0 ? `${baseMatch} (${detailText})` : baseMatch

    // CHANGE 3: Show ALL education degrees
    const education = qualificationDetails?.extracted?.education || []
    const educationText = education.length > 0
      ? education.map((e: any) => `${e.degree || 'Degree'} from ${e.institution || 'Institution'}`).join(", ")
      : "Not specified"

    // CHANGE 5: Extract projects from work_experience
    const extractedProjects = qualificationDetails?.extracted?.work_experience?.flatMap((exp: any) => 
      (exp.projects || []).map((project: any) => ({
        title: project.name || project.title || "Project",
        company: exp.company || exp.employer || "Company",
        year: project.year || exp.end_date || exp.duration || "Recent",
        description: project.description || "",
        technologies: project.technologies || project.tech_stack || []
      }))
    ).slice(0, 3) || []

    // CHANGE 5: Process certifications (support string and object formats)
    const rawCertifications = qualificationDetails?.extracted?.certifications || []
    const processedCertifications = rawCertifications.map((c: any) => 
      typeof c === 'string' ? c : c.name || c.title || 'Certification'
    )

    // CHANGE 4: Skills alignment with real values - use qualificationDetails.scores structure
    // Support both new format (scores.skill_match) and old format (breakdown.skill_set_match)
    const scoresData = qualificationDetails?.scores || {}
    const breakdownData = qualificationDetails?.breakdown || {}
    
    // Skill Match - try scores.skill_match first, fallback to breakdown.skill_set_match
    const skillMatch = scoresData.skill_match || breakdownData.skill_set_match || {}
    // Project Relevance - try scores.project_relevance first, fallback to breakdown.project_relevance
    const projectRelevance = scoresData.project_relevance || breakdownData.project_relevance || {}
    // Experience Match - try scores.experience_match first, fallback to breakdown.experience_match
    const experienceMatch = scoresData.experience_match || breakdownData.experience_match || {}
    // Education & Certs - try scores.education_and_certs first, fallback to breakdown.education_qualification
    const educationAndCerts = scoresData.education_and_certs || breakdownData.education_qualification || {}
    // Location & Availability - try scores.location_and_availability first, fallback to breakdown.location_availability
    const locationAndAvailability = scoresData.location_and_availability || breakdownData.location_availability || {}
    // Resume Quality - try scores.resume_quality first, fallback to breakdown.resume_quality
    const resumeQuality = scoresData.resume_quality || breakdownData.resume_quality || {}
    // Explainable Score - contains the contribution points for each category
    const explainableScore = qualificationDetails?.explainable_score || {}
    
    // Debug: Log the actual data structure being used
    console.log('📊 [SKILLS ALIGNMENT] Raw scores:', JSON.stringify(scoresData, null, 2).substring(0, 500))
    console.log('📊 [SKILLS ALIGNMENT] Raw breakdown:', JSON.stringify(breakdownData, null, 2).substring(0, 500))
    console.log('📊 [SKILLS ALIGNMENT] explainable_score:', JSON.stringify(explainableScore, null, 2))

    // Support both naming conventions: matched_critical (new) vs matched_skills (old)
    const matchedSkills = skillMatch.matched_critical || skillMatch.matched_skills || []
    const missingSkills = skillMatch.missing_critical || skillMatch.missing_skills || []
    const matchedImportant = skillMatch.matched_important || []
    const totalSkills = matchedSkills.length + missingSkills.length || skillMatch.total_skills || 8

    // Build last role info for experience details
    const lastExp = qualificationDetails?.extracted?.work_experience?.[0]
    const lastRole = lastExp ? `${lastExp.title || lastExp.role || 'Role'} at ${lastExp.company || lastExp.employer || 'Company'} (${lastExp.duration || 'N/A'})` : 'Not specified'

    // Get recent projects from extracted.recent_projects
    const recentProjects = qualificationDetails?.extracted?.recent_projects || []

    // Create structured report data for new UI layout
    const reportData = {
      header: {
        candidateName: candidate.name || 'Candidate',
        position: jobTitle || 'Position',
        recommendation: row.is_qualified ? "RECOMMENDED: PROCEED TO NEXT ROUND" : "NOT RECOMMENDED",
        overallScore: row.qualification_score || 0,
        reportDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        expectedSalary: row.expected_salary ? `${row.salary_currency || 'USD'} ${row.expected_salary}` : "Not specified",
        experience: `${qualificationDetails?.extracted?.total_experience_years_estimate || 0}+ years relevant`
      },
      
      profileSnapshot: {
        name: candidate.name,
        expectedSalary: row.expected_salary ? `${row.salary_currency || 'USD'} ${row.expected_salary}` : "Not specified",
        availability: row.available_start_date || "Immediately",
        classification: classification,
        education: educationText,
        employerHistory: qualificationDetails?.extracted?.work_experience?.map((exp: any) => 
          `${exp.company || exp.employer} (${exp.duration || 'N/A'})`).join(' & ') || "Not specified",
        locationPreference: row.app_location || row.location || "Not specified"
      },
      
      skillsAlignment: [
        {
          area: "Skills Match",
          score: `${skillMatch.score || skillMatch.overall_score || 0}/100`,
          points: `+${explainableScore.skill_contribution ?? 0}`,
          details: `${matchedSkills.length}/${totalSkills || 1} required skills matched\n✓ Strong in: ${matchedSkills.slice(0, 3).join(', ') || 'None'}\n✗ Missing: ${missingSkills.slice(0, 2).join(', ') || 'None'}`
        },
        {
          area: "Project Relevance",
          score: `${projectRelevance.score || projectRelevance.overall_score || 0}/100`,
          points: `+${explainableScore.project_contribution ?? 0}`,
          details: `${projectRelevance.relevant_projects || recentProjects.length || 0} relevant projects analyzed\nRecent: ${lastExp?.company || lastExp?.employer || 'Not specified'}`
        },
        {
          area: "Experience Match",
          score: `${experienceMatch.score || experienceMatch.overall_score || 0}/100`,
          points: `+${explainableScore.experience_contribution ?? 0}`,
          details: `${qualificationDetails?.extracted?.total_experience_years_estimate || 0}+ years in relevant domain\nLast role: ${lastRole}\nVerified in ${recentProjects.length || 0} recent projects`
        },
        {
          area: "Education & Certifications",
          score: `${educationAndCerts.score || educationAndCerts.overall_score || 0}/100`,
          points: `+${explainableScore.edu_certs_contribution ?? 0}`,
          details: `${education[0]?.degree || 'Degree'} from ${education[0]?.institution || 'Institution'}\n${processedCertifications[0] || 'No certifications'}`
        },
        {
          area: "Location & Availability",
          score: `${locationAndAvailability.score || locationAndAvailability.overall_score || 0}/100`,
          points: `+${explainableScore.location_contribution ?? 0}`,
          details: `${locationAndAvailability.candidate_location || row.app_location || row.location || 'Not specified'}\nAvailable: ${row.available_start_date ? new Date(row.available_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Immediate'}`
        },
        {
          area: "Resume Quality",
          score: `${resumeQuality.score || resumeQuality.overall_score || 0}/100`,
          points: `+${explainableScore.quality_contribution ?? 0}`,
          details: `${resumeQuality.completeness || resumeQuality.clarity || 'Well formatted'}`
        }
      ],
      
      certificationsAndProjects: {
        certifications: processedCertifications,
        projects: recentProjects.map((p: any) => ({
          title: p.title || p.name || "Project",
          company: lastExp?.company || lastExp?.employer || "Company",
          year: p.duration || p.year || "Recent",
          description: p.description || "",
          technologies: p.technologies || []
        }))
      },
      
      recommendation: {
        decision: row.is_qualified ? "PROCEED TO TECHNICAL INTERVIEW" : "NOT RECOMMENDED",
        strengths: matchedSkills.slice(0, 3).join(', ') || "None identified",
        gaps: missingSkills.slice(0, 2).join(', ') || "None identified",
        nextSteps: row.is_qualified ? [
          "Technical interview to verify claimed skills",
          "Validate work experience with references",
          "Assess problem-solving and communication abilities"
        ] : [
          "Consider for junior roles if skill gaps can be addressed",
          "Recommend additional training or certifications"
        ]
      }
    }

    // CHANGE 4: Add debugging logs
    console.log("📊 reportData.skillsAlignment", JSON.stringify(reportData.skillsAlignment, null, 2))
    console.log("📊 Classification:", classification)

    return NextResponse.json({
      ok: true,
      candidate,
      resumeText: row.resume_text || null,
      evaluation,
      transcript,
      qualificationScore: row.qualification_score || null,
      isQualified: row.is_qualified || null,
      qualificationDetails,
      sectionPointers,
      verificationPhotos,
      reportData,
      jobTitle
    })
  } catch (e: any) {
    console.error('Failed to load candidate report:', e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load report" }, { status: 500 })
  }
}
