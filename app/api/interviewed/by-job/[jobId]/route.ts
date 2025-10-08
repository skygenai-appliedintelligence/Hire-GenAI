import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/interviewed/by-job/[jobId]
// Returns interviewed rows for a given job with shape expected by
// app/dashboard/analytics/[jdId]/interviewed/page.tsx
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const p = (ctx as any).params
  const { jobId } = (p && typeof (p as any).then === "function") ? await (p as Promise<{ jobId: string }>) : (p as { jobId: string })

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 })
  }

  try {
    console.log("[interviewed/by-job] jobId=", jobId)
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })
    }

    // Pull latest interview per application round for the given job
    // Join applications -> application_rounds -> interviews -> job_rounds -> candidates (+files)
    const query = `
      WITH latest_interviews AS (
        SELECT DISTINCT ON (i.application_round_id)
          i.id AS interview_id,
          i.application_round_id,
          i.started_at,
          i.completed_at,
          i.metadata
        FROM interviews i
        JOIN application_rounds ar ON ar.id = i.application_round_id
        JOIN applications a ON a.id = ar.application_id
        WHERE a.job_id = $1::uuid
        ORDER BY i.application_round_id, COALESCE(i.completed_at, i.started_at) DESC NULLS LAST
      )
      SELECT 
        a.id AS application_id,
        a.status AS application_status,
        a.evaluation AS application_evaluation,
        a.created_at AS app_created_at,
        c.first_name AS c_first_name,
        c.last_name AS c_last_name,
        COALESCE(a.email, c.email) AS email,
        COALESCE(a.phone, c.phone) AS phone,
        c.resume_url,
        f.storage_key AS resume_storage_key,
        ar.id AS application_round_id,
        jr.name AS round_name,
        li.interview_id,
        li.started_at,
        li.completed_at,
        li.metadata AS interview_metadata
      FROM applications a
      LEFT JOIN application_rounds ar ON ar.application_id = a.id
      LEFT JOIN latest_interviews li ON li.application_round_id = ar.id
      LEFT JOIN job_rounds jr ON jr.id = ar.job_round_id
      LEFT JOIN candidates c ON c.id = a.candidate_id
      LEFT JOIN files f ON f.id = c.resume_file_id
      WHERE a.job_id = $1::uuid
      ORDER BY COALESCE(li.completed_at, li.started_at, ar.created_at) DESC NULLS LAST
    `

    const rows = await DatabaseService.query(query, [jobId]) as any[]
    console.log("[interviewed/by-job] rows fetched:", rows.length)

    // Diagnostics: counts
    const [{ count: appsCount }] = await DatabaseService.query(
      `SELECT COUNT(*)::int AS count FROM applications WHERE job_id = $1::uuid`,
      [jobId]
    ) as any[]
    const [{ count: roundsCount }] = await DatabaseService.query(
      `SELECT COUNT(*)::int AS count
       FROM application_rounds ar JOIN applications a ON a.id = ar.application_id
       WHERE a.job_id = $1::uuid`,
      [jobId]
    ) as any[]
    const [{ count: interviewsCount }] = await DatabaseService.query(
      `SELECT COUNT(*)::int AS count
       FROM interviews i JOIN application_rounds ar ON ar.id = i.application_round_id
       JOIN applications a ON a.id = ar.application_id
       WHERE a.job_id = $1::uuid`,
      [jobId]
    ) as any[]
    console.log("[interviewed/by-job] counts:", { appsCount, roundsCount, interviewsCount })

    const interviewed = rows.map((r) => {
      const name = [r.c_first_name, r.c_last_name].filter(Boolean).join(" ") || (r.email?.split("@")[0] ?? "Unknown")
      const cvUrl = r.resume_url || r.resume_storage_key || "#"

      // Determine status
      const metadata = typeof r.interview_metadata === 'string' ? safeParse(r.interview_metadata) : (r.interview_metadata || null)
      const evalFromMeta = metadata?.evaluation
      const completed = !!r.completed_at
      const hasRound = !!r.application_round_id
      const status: "Interview Scheduled" | "Interview Completed" | "Awaiting Results" = completed
        ? (evalFromMeta ? "Interview Completed" : "Awaiting Results")
        : (hasRound ? "Interview Scheduled" : (appHasEvaluation(r.application_evaluation) ? "Awaiting Results" : "Interview Scheduled"))

      // Score extraction: prefer interviews.metadata->evaluation.overall_score, then applications.evaluation.overall_score
      const appEvalObj = typeof r.application_evaluation === 'string' ? safeParse(r.application_evaluation) : (r.application_evaluation || null)
      const overallFromMeta = normalizeTo100((evalFromMeta?.overall_score) ?? null)
      const overallFromApp = normalizeTo100((appEvalObj?.overall_score) ?? null)
      const score = overallFromMeta || overallFromApp || null

      return {
        id: String(r.application_id),
        candidateName: name,
        email: r.email || "",
        phone: r.phone || "",
        cvUrl,
        status,
        interviewRound: r.round_name || "Round",
        interviewDate: (r.completed_at || r.started_at || r.app_created_at || new Date().toISOString()),
        score: score ?? undefined,
      }
    })

    return NextResponse.json({ ok: true, interviewed, stats: { applications: appsCount, rounds: roundsCount, interviews: interviewsCount } })
  } catch (e: any) {
    console.error("Error fetching interviewed by job:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load interviewed candidates" }, { status: 500 })
  }
}

function safeParse(jsonLike: any): any | null {
  try {
    return typeof jsonLike === 'string' ? JSON.parse(jsonLike) : (jsonLike || null)
  } catch {
    return null
  }
}

function normalizeTo100(val: any): number {
  const n = Number(val ?? 0)
  if (!isFinite(n) || n <= 0) return 0
  if (n <= 10) return Math.max(0, Math.min(100, Math.round(n * 10)))
  return Math.max(0, Math.min(100, Math.round(n)))
}

function appHasEvaluation(appEval: any): boolean {
  const obj = typeof appEval === 'string' ? safeParse(appEval) : (appEval || null)
  if (!obj) return false
  if (obj.overall_score !== undefined && obj.overall_score !== null) return true
  const scores = obj.scores || {}
  return [
    scores.technical,
    scores.communication,
    scores.experience,
    scores.cultural_fit,
    scores.culture,
  ].some((v: any) => v !== undefined && v !== null && Number(v) !== 0)
}
