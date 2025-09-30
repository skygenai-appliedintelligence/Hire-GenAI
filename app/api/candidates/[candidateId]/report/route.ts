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
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
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
      location: row.location || null,
      status: row.status || 'applied'
    }

    // Try to fetch evaluation data (if table exists)
    let evaluation = null
    try {
      const evalQuery = `
        SELECT 
          overall_score,
          decision,
          technical_score,
          communication_score,
          experience_score,
          cultural_fit_score,
          strengths,
          weaknesses,
          reviewer_comments,
          reviewed_at,
          reviewed_by
        FROM candidate_evaluations
        WHERE candidate_id = $1::uuid OR application_id = $1::uuid
        ORDER BY reviewed_at DESC
        LIMIT 1
      `
      const evalRows = await (DatabaseService as any)["query"]?.call(DatabaseService, evalQuery, [candidateId]) as any[]
      
      if (evalRows && evalRows.length > 0) {
        const evalRow = evalRows[0]
        evaluation = {
          overallScore: evalRow.overall_score || 0,
          decision: evalRow.decision || 'pending',
          scores: {
            technical: evalRow.technical_score || 0,
            communication: evalRow.communication_score || 0,
            experience: evalRow.experience_score || 0,
            cultural_fit: evalRow.cultural_fit_score || 0
          },
          strengths: Array.isArray(evalRow.strengths) ? evalRow.strengths : [],
          weaknesses: Array.isArray(evalRow.weaknesses) ? evalRow.weaknesses : [],
          reviewerComments: evalRow.reviewer_comments || '',
          reviewedAt: evalRow.reviewed_at || null,
          reviewedBy: evalRow.reviewed_by || null
        }
      }
    } catch (e) {
      console.log('Evaluation table not found or error:', e)
    }

    // Try to fetch transcript data (if table exists)
    let transcript = null
    try {
      const transcriptQuery = `
        SELECT 
          transcript_text,
          duration,
          interview_date,
          interviewer,
          rounds_data
        FROM interview_transcripts
        WHERE candidate_id = $1::uuid OR application_id = $1::uuid
        ORDER BY interview_date DESC
        LIMIT 1
      `
      const transcriptRows = await (DatabaseService as any)["query"]?.call(DatabaseService, transcriptQuery, [candidateId]) as any[]
      
      if (transcriptRows && transcriptRows.length > 0) {
        const transRow = transcriptRows[0]
        transcript = {
          text: transRow.transcript_text || '',
          duration: transRow.duration || null,
          interviewDate: transRow.interview_date || null,
          interviewer: transRow.interviewer || null,
          rounds: transRow.rounds_data || null
        }
      }
    } catch (e) {
      console.log('Transcript table not found or error:', e)
    }

    return NextResponse.json({
      ok: true,
      candidate,
      evaluation,
      transcript
    })
  } catch (e: any) {
    console.error('Failed to load candidate report:', e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load report" }, { status: 500 })
  }
}
