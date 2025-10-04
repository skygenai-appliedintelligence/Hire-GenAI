import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/applications/by-job/:jobId
// Returns applications for a given job from database
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> | { jobId: string } }) {
  const { jobId } = await (ctx.params as any)
  if (!jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 })

  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        jobId,
        applications: [],
        message: "Database not configured"
      })
    }

    // First, check which columns exist in candidates table
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name IN ('full_name', 'first_name', 'last_name', 'email', 'phone', 'resume_url', 'resume_file_id')
    `
    const columnRows = await (DatabaseService as any)["query"]?.call(DatabaseService, checkColumnsQuery, []) as any[]
    const availableColumns = new Set((columnRows || []).map((r: any) => r.column_name))

    // Build dynamic query based on available columns
    const candidateSelects: string[] = []
    if (availableColumns.has('full_name')) candidateSelects.push('c.full_name')
    if (availableColumns.has('first_name')) candidateSelects.push('c.first_name as c_first_name')
    if (availableColumns.has('last_name')) candidateSelects.push('c.last_name as c_last_name')
    if (availableColumns.has('email')) candidateSelects.push('c.email as candidate_email')
    if (availableColumns.has('phone')) candidateSelects.push('c.phone as candidate_phone')
    if (availableColumns.has('resume_url')) candidateSelects.push('c.resume_url')
    if (availableColumns.has('resume_file_id')) candidateSelects.push('c.resume_file_id')

    // Check if applications.is_qualified exists
    const appColsCheck = await (DatabaseService as any)["query"]?.call(
      DatabaseService,
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'applications' AND column_name IN ('is_qualified','qualification_score')`,
      []
    ) as any[]
    const appCols = new Set((appColsCheck || []).map((r: any) => r.column_name))
    const selectIsQualified = appCols.has('is_qualified') ? ', a.is_qualified' : ''
    const selectQualScore = appCols.has('qualification_score') ? ', a.qualification_score' : ''

    const query = `
      SELECT 
        a.id,
        a.status,
        a.created_at as applied_at,
        a.first_name,
        a.last_name,
        a.email,
        a.phone
        ${candidateSelects.length > 0 ? ',' + candidateSelects.join(',') : ''}
        ${availableColumns.has('resume_file_id') ? ',f.storage_key as resume_storage_key' : ''}
        ${selectIsQualified}
        ${selectQualScore}
      FROM applications a
      LEFT JOIN candidates c ON a.candidate_id = c.id
      ${availableColumns.has('resume_file_id') ? 'LEFT JOIN files f ON c.resume_file_id = f.id' : ''}
      WHERE a.job_id = $1::uuid
      ORDER BY a.created_at DESC
    `
    
    const rows = await (DatabaseService as any)["query"]?.call(DatabaseService, query, [jobId]) as any[]

    const applications = (rows || []).map((row: any) => {
      // Try multiple name sources
      const candidateName = row.full_name || 
                           row.c_first_name && row.c_last_name ? `${row.c_first_name} ${row.c_last_name}` : 
                           row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 
                           row.candidate_email?.split('@')[0] || 
                           row.email?.split('@')[0] ||
                           'Unknown'
      
      const email = row.email || row.candidate_email || ''
      const phone = row.phone || row.candidate_phone || ''
      const cvUrl = row.resume_url || row.resume_storage_key || '#'
      
      // Map database status to UI status; prefer is_qualified=true when available
      let uiStatus: "CV Unqualified" | "CV Qualified" = "CV Unqualified"
      const isQualifiedFlag = Object.prototype.hasOwnProperty.call(row, 'is_qualified') ? Boolean(row.is_qualified) : false
      const qualScoreOk = Object.prototype.hasOwnProperty.call(row, 'qualification_score') ? Number(row.qualification_score) >= 40 : false
      const qualifiedStatuses = new Set(['cv_qualified','qualified','screening_passed','shortlisted','interview_scheduled'])
      if (isQualifiedFlag || qualScoreOk || qualifiedStatuses.has(String(row.status))) {
        uiStatus = "CV Qualified"
      }

      return {
        id: row.id,
        candidateName,
        email,
        phone,
        cvUrl,
        status: uiStatus,
        appliedAt: row.applied_at,
      }
    })

    return NextResponse.json({
      ok: true,
      jobId,
      applications,
    })
  } catch (e: any) {
    console.error("Failed to load applications:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load applications" }, { status: 500 })
  }
}
