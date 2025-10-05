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
      // Return mock data if database not configured
      return NextResponse.json({
        ok: true,
        candidate: {
          id: candidateId,
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "+1 234 567 8900",
          resumeUrl: "#",
          appliedAt: new Date().toISOString(),
          location: "New York, USA",
          status: "CV Qualified"
        },
        evaluation: {
          overallScore: 85,
          decision: "qualified",
          scores: {
            technical: 88,
            communication: 82,
            experience: 85,
            cultural_fit: 85
          },
          strengths: [
            "Strong technical background in React and Node.js",
            "Excellent problem-solving skills",
            "Good communication and teamwork"
          ],
          weaknesses: [
            "Limited experience with cloud platforms",
            "Could improve system design knowledge"
          ],
          reviewerComments: "Strong candidate with solid technical skills. Recommended for next round.",
          reviewedAt: new Date().toISOString(),
          reviewedBy: "AI Recruiter"
        },
        transcript: {
          text: "This is a sample transcript of the interview conversation...",
          duration: "45 minutes",
          interviewDate: new Date().toISOString(),
          interviewer: "AI Agent",
          rounds: [
            {
              round: "Technical Round",
              questions: [
                {
                  question: "Explain the difference between var, let, and const in JavaScript",
                  answer: "var is function-scoped, let and const are block-scoped. const cannot be reassigned.",
                  score: 90
                },
                {
                  question: "What is the virtual DOM in React?",
                  answer: "The virtual DOM is a lightweight copy of the actual DOM that React uses for efficient updates.",
                  score: 85
                }
              ]
            }
          ]
        }
      })
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
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.first_name as c_first_name,
        c.last_name as c_last_name,
        c.location,
        c.resume_url,
        f.storage_key as resume_storage_key
      FROM applications a
      LEFT JOIN candidates c ON a.candidate_id = c.id
      LEFT JOIN files f ON c.resume_file_id = f.id
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
    const candidateName = row.c_first_name && row.c_last_name 
      ? `${row.c_first_name} ${row.c_last_name}`
      : row.first_name && row.last_name 
      ? `${row.first_name} ${row.last_name}`
      : row.candidate_email?.split('@')[0] || row.email?.split('@')[0] || 'Unknown'

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
      willingToRelocate: row.willing_to_relocate || false
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
      if (evalJson) {
        const evalObj = typeof evalJson === 'string' ? JSON.parse(evalJson) : evalJson
        const scores = evalObj.scores || {}
        const strengths = evalObj.strengths || []
        const weaknesses = evalObj.weaknesses || evalObj.areas_for_improvement || []
        const decision = evalObj.decision || evalObj.recommendation || 'pending'
        evaluation = {
          overallScore: evalObj.overall_score || 0,
          decision,
          scores: {
            technical: scores.technical?.score ?? scores.technical ?? 0,
            communication: scores.communication?.score ?? scores.communication ?? 0,
            experience: scores.experience?.score ?? scores.experience ?? 0,
            cultural_fit: scores.cultural_fit?.score ?? scores.cultural_fit ?? 0
          },
          strengths: Array.isArray(strengths) ? strengths : [],
          weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
          reviewerComments: evalObj.summary || evalObj.reviewer_comments || '',
          reviewedAt: evalObj.evaluated_at || evalObj.reviewed_at || null,
          reviewedBy: evalObj.reviewed_by || 'AI Evaluator'
        }
        console.log('✅ Evaluation loaded from interviews.metadata')
      }
    } catch (e) {
      console.log('Evaluation from interviews.metadata parse error:', e)
    }

    // Fallback 1: applications.evaluation JSONB
    if (!evaluation) {
      try {
        const rawEval = row.evaluation
        if (rawEval) {
          const evalObj = typeof rawEval === 'string' ? JSON.parse(rawEval) : rawEval
          const scores = evalObj.scores || {}
          const strengths = evalObj.strengths || []
          const weaknesses = evalObj.weaknesses || evalObj.areas_for_improvement || []
          const decision = evalObj.decision || evalObj.recommendation || 'pending'
          evaluation = {
            overallScore: evalObj.overall_score || 0,
            decision,
            scores: {
              technical: scores.technical?.score ?? scores.technical ?? 0,
              communication: scores.communication?.score ?? scores.communication ?? 0,
              experience: scores.experience?.score ?? scores.experience ?? 0,
              cultural_fit: scores.cultural_fit?.score ?? scores.cultural_fit ?? 0
            },
            strengths: Array.isArray(strengths) ? strengths : [],
            weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
            reviewerComments: evalObj.summary || evalObj.reviewer_comments || '',
            reviewedAt: evalObj.evaluated_at || evalObj.reviewed_at || null,
            reviewedBy: evalObj.reviewed_by || 'AI Evaluator'
          }
        }
      } catch (e) {
        console.log('Evaluation JSON parse error (applications.evaluation):', e)
      }
    }

    // Fallback 2: evaluations table
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
        if (evalRows && evalRows.length > 0) {
          const evalRow = evalRows[0]
          const skillScores = typeof evalRow.skill_scores === 'string' ? JSON.parse(evalRow.skill_scores) : evalRow.skill_scores || {}
          const notes = evalRow.rubric_notes_md || ''
          const strengthsMatch = notes.match(/\*\*Strengths:\*\*\n((?:- .+\n?)*)/i)
          const weaknessesMatch = notes.match(/\*\*Areas for Improvement:\*\*\n((?:- .+\n?)*)/i)
          const strengths = strengthsMatch ? strengthsMatch[1].split('\n').filter((s: string) => s.trim().startsWith('-')).map((s: string) => s.replace(/^- /, '').trim()) : []
          const weaknesses = weaknessesMatch ? weaknessesMatch[1].split('\n').filter((s: string) => s.trim().startsWith('-')).map((s: string) => s.replace(/^- /, '').trim()) : []
          evaluation = {
            overallScore: parseFloat(evalRow.overall_score) || 0,
            decision: evalRow.recommendation || 'pending',
            scores: {
              technical: skillScores.technical?.score ?? skillScores.technical ?? 0,
              communication: skillScores.communication?.score ?? skillScores.communication ?? 0,
              experience: skillScores.experience?.score ?? skillScores.experience ?? 0,
              cultural_fit: skillScores.cultural_fit?.score ?? skillScores.cultural_fit ?? 0
            },
            strengths,
            weaknesses,
            reviewerComments: notes.replace(/\*\*Strengths:\*\*[\s\S]*?\*\*Areas for Improvement:\*\*[\s\S]*?$/i, '').trim() || '',
            reviewedAt: evalRow.evaluated_at || null,
            reviewedBy: 'AI Evaluator'
          }
          console.log('✅ Evaluation loaded from evaluations table')
        }
      } catch (e) {
        console.log('Failed to fetch from evaluations table:', e)
      }
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

    return NextResponse.json({
      ok: true,
      candidate,
      resumeText: row.resume_text || null,
      evaluation,
      transcript,
      qualificationScore: row.qualification_score || null,
      isQualified: row.is_qualified || null,
      qualificationDetails
    })
  } catch (e: any) {
    console.error('Failed to load candidate report:', e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load report" }, { status: 500 })
  }
}
