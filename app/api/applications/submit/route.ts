import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper to probe column existence for flexible name storage
async function getCandidateNameMode() {
  const q = `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'candidates'
      AND column_name IN ('full_name','first_name','last_name')
  `
  const rows = (await (DatabaseService as any)["query"]?.call(DatabaseService, q, [])
    .catch(() => [])) as Array<{ column_name: string }>

  const cols = new Set((rows || []).map(r => r.column_name))
  return {
    hasFullName: cols.has('full_name'),
    hasFirst: cols.has('first_name'),
    hasLast: cols.has('last_name'),
  }
}

async function getApplicationsColumnMode() {
  const q = `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications'
      AND column_name IN ('first_name','last_name','email','phone')
  `
  const rows = (await (DatabaseService as any)["query"]?.call(DatabaseService, q, [])
    .catch(() => [])) as Array<{ column_name: string }>
  const cols = new Set((rows || []).map(r => r.column_name))
  return {
    hasFirst: cols.has('first_name'),
    hasLast: cols.has('last_name'),
    hasEmail: cols.has('email'),
    hasPhone: cols.has('phone'),
  }
}

async function getApplicationsTypes() {
  const q = `
    SELECT column_name, data_type, udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications'
      AND column_name IN ('candidate_id','job_id','resume_file_id','status','source','created_at')
  `
  const rows = (await (DatabaseService as any)["query"]?.call(DatabaseService, q, [])
    .catch(() => [])) as Array<{ column_name: string, data_type: string, udt_name: string }>
  const map: Record<string, { isUuid: boolean, exists: boolean }> = {}
  for (const r of rows) {
    map[r.column_name] = { exists: true, isUuid: (r.udt_name === 'uuid') }
  }
  return {
    candidateId: map['candidate_id'] || { exists: false, isUuid: false },
    jobId: map['job_id'] || { exists: false, isUuid: false },
    resumeFileId: map['resume_file_id'] || { exists: false, isUuid: false },
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const {
      jobId,
      candidate,
      resume, // { url, name, type, size }
      photoUrl, // Webcam captured photo URL
      source = 'direct_application',
      meta, // { timestamp, ip, userAgent }
    } = body || {}

    // Capture request metadata
    const submittedAt = meta?.timestamp || new Date().toISOString()
    const clientIp = meta?.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = meta?.userAgent || req.headers.get('user-agent') || 'unknown'

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    if (!candidate?.email) return NextResponse.json({ error: 'Missing candidate email' }, { status: 400 })

    const firstName = (candidate.firstName || '').trim()
    const lastName = (candidate.lastName || '').trim()
    const fullNameInput = (candidate.fullName || `${firstName} ${lastName}`.trim()).trim()

    // 1) Resolve resume file_id without creating duplicates
    // Prefer resume.fileId if provided; otherwise, try to reuse existing files row by storage_key
    let fileId: string | null = null
    if (resume?.fileId) {
      fileId = String(resume.fileId)
    } else if (resume?.url) {
      // Try to find existing files row
      const findFileQ = `SELECT id FROM files WHERE storage_key = $1 LIMIT 1`
      const existingFile = await (DatabaseService as any)["query"].call(DatabaseService, findFileQ, [String(resume.url)]) as any[]
      if (existingFile?.length) {
        fileId = existingFile[0].id
      } else {
        const insertFileQ = `
          INSERT INTO files (storage_key, content_type, size_bytes, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id
        `
        const fileRows = await (DatabaseService as any)["query"].call(DatabaseService, insertFileQ, [
          String(resume.url),
          resume.type ? String(resume.type) : null,
          resume.size != null ? Number(resume.size) : null,
        ]) as any[]
        fileId = fileRows?.[0]?.id || null
      }
    }

    // 2) Upsert candidate by email
    const mode = await getCandidateNameMode()
    // Probe for optional resume columns on candidates
    const candColsRows = await (DatabaseService as any)["query"].call(
      DatabaseService,
      `
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'candidates'
          AND column_name IN ('resume_file_id','resume_url','resume_name','resume_size','resume_type','location','phone','first_name','last_name','full_name')
      `,
      []
    ).catch(() => []) as Array<{ column_name: string }>
    const candCols = new Set((candColsRows || []).map(r => r.column_name))

    // Find existing candidate
    const findQ = `SELECT * FROM candidates WHERE email = $1 LIMIT 1`
    const existing = await (DatabaseService as any)["query"].call(DatabaseService, findQ, [String(candidate.email).toLowerCase()]) as any[]

    let candidateId: string

    if (existing?.length) {
      const id = existing[0].id as string
      const updates: string[] = []
      const params: any[] = []
      let i = 1

      // Name fields
      if (mode.hasFullName && fullNameInput) { updates.push(`full_name = $${i++}`); params.push(fullNameInput) }
      // Also set first/last if columns exist (even when full_name exists) to keep both populated
      if (mode.hasFirst) { updates.push(`first_name = $${i++}`); params.push(firstName || null) }
      if (mode.hasLast) { updates.push(`last_name = $${i++}`); params.push(lastName || null) }

      // Optional contact/location
      if (candidate.phone !== undefined) { updates.push(`phone = $${i++}`); params.push(candidate.phone || null) }
      if (candidate.location !== undefined) { updates.push(`location = $${i++}`); params.push(candidate.location || null) }
      if (fileId && candCols.has('resume_file_id')) { updates.push(`resume_file_id = $${i++}::uuid`); params.push(fileId) }
      if (candCols.has('resume_url') && resume?.url) { updates.push(`resume_url = $${i++}`); params.push(String(resume.url)) }
      if (candCols.has('resume_name') && (resume?.name || resume?.filename)) { updates.push(`resume_name = $${i++}`); params.push(String(resume.name || resume.filename)) }
      if (candCols.has('resume_size') && (resume?.size != null)) { updates.push(`resume_size = $${i++}`); params.push(String(Number(resume.size))) }
      if (candCols.has('resume_type') && resume?.type) { updates.push(`resume_type = $${i++}`); params.push(String(resume.type)) }

      if (updates.length > 0) {
        const updateQ = `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${i}::uuid RETURNING id`
        const rows = await (DatabaseService as any)["query"].call(DatabaseService, updateQ, [...params, id]) as any[]
        candidateId = rows?.[0]?.id || id
      } else {
        candidateId = id
      }
    } else {
      // Insert new
      const columns: string[] = ['email']
      const placeholders: string[] = ['$1']
      const values: any[] = [String(candidate.email).toLowerCase()]
      let p = 2

      if (mode.hasFullName) { columns.push('full_name'); placeholders.push(`$${p++}`); values.push(fullNameInput || null) }
      // Always try to set first/last if columns exist as well
      if (mode.hasFirst) { columns.push('first_name'); placeholders.push(`$${p++}`); values.push(firstName || null) }
      if (mode.hasLast) { columns.push('last_name'); placeholders.push(`$${p++}`); values.push(lastName || null) }
      if (candidate.phone !== undefined && candCols.has('phone')) { columns.push('phone'); placeholders.push(`$${p++}`); values.push(candidate.phone || null) }
      if (candidate.location !== undefined && candCols.has('location')) { columns.push('location'); placeholders.push(`$${p++}`); values.push(candidate.location || null) }
      if (fileId && candCols.has('resume_file_id')) { columns.push('resume_file_id'); placeholders.push(`$${p++}::uuid`); values.push(fileId) }
      if (candCols.has('resume_url') && resume?.url) { columns.push('resume_url'); placeholders.push(`$${p++}`); values.push(String(resume.url)) }
      if (candCols.has('resume_name') && (resume?.name || resume?.filename)) { columns.push('resume_name'); placeholders.push(`$${p++}`); values.push(String(resume.name || resume.filename)) }
      if (candCols.has('resume_size') && (resume?.size != null)) { columns.push('resume_size'); placeholders.push(`$${p++}`); values.push(String(Number(resume.size))) }
      if (candCols.has('resume_type') && resume?.type) { columns.push('resume_type'); placeholders.push(`$${p++}`); values.push(String(resume.type)) }

      const insertQ = `
        INSERT INTO candidates (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id
      `
      const rows = await (DatabaseService as any)["query"].call(DatabaseService, insertQ, values) as any[]
      candidateId = rows?.[0]?.id
    }

    if (!candidateId) {
      return NextResponse.json({ error: 'Failed to persist candidate' }, { status: 500 })
    }

    // 3) Create application row (idempotent on candidate_id+job_id)
    // Insert minimal fields that are present in our schema
    let applicationId: string | null = null
    try {
      // First, check if an application already exists for this candidate+job
      const existingAppQ = `SELECT id FROM applications WHERE candidate_id = $1::uuid AND job_id = $2::uuid LIMIT 1`
      const existingApp = await (DatabaseService as any)["query"].call(DatabaseService, existingAppQ, [candidateId, String(jobId)]) as any[]
      if (existingApp?.length) {
        applicationId = existingApp[0].id
      } else {
        const appCols = await getApplicationsColumnMode()
        const types = await getApplicationsTypes()

        const cols: string[] = []
        const vals: string[] = []
        const params: any[] = []
        let p = 1

        // candidate_id
        if (types.candidateId.exists) {
          cols.push('candidate_id')
          vals.push(types.candidateId.isUuid ? `$${p++}::uuid` : `$${p++}`)
          params.push(candidateId)
        }
        // job_id
        if (types.jobId.exists) {
          cols.push('job_id')
          vals.push(types.jobId.isUuid ? `$${p++}::uuid` : `$${p++}`)
          params.push(String(jobId))
        }
        // status/source/created_at
        cols.push('status'); vals.push(`'applied'`)
        if (typeof source !== 'undefined') { cols.push('source'); vals.push(`$${p++}`); params.push(source) }
        cols.push('created_at'); vals.push('NOW()')
        // Optional person/contact columns
        if (appCols.hasFirst) { cols.push('first_name'); vals.push(`$${p++}`); params.push(firstName || null) }
        if (appCols.hasLast) { cols.push('last_name'); vals.push(`$${p++}`); params.push(lastName || null) }
        if (appCols.hasEmail) { cols.push('email'); vals.push(`$${p++}`); params.push(String(candidate.email).toLowerCase()) }
        if (appCols.hasPhone) { cols.push('phone'); vals.push(`$${p++}`); params.push(candidate.phone || null) }
        // Optional resume_file_id if column exists and we have fileId
        if (types.resumeFileId.exists && fileId) {
          cols.push('resume_file_id')
          vals.push(types.resumeFileId.isUuid ? `$${p++}::uuid` : `$${p++}`)
          params.push(fileId)
        }

        // Additional application fields from form
        if (candidate.expectedSalary !== undefined && candidate.expectedSalary !== null && candidate.expectedSalary !== '') {
          cols.push('expected_salary'); vals.push(`$${p++}`); params.push(Number(candidate.expectedSalary))
        }
        if (candidate.salaryCurrency) {
          cols.push('salary_currency'); vals.push(`$${p++}`); params.push(String(candidate.salaryCurrency))
        }
        if (candidate.salaryPeriod) {
          cols.push('salary_period'); vals.push(`$${p++}`); params.push(String(candidate.salaryPeriod))
        }
        if (candidate.location) {
          cols.push('location'); vals.push(`$${p++}`); params.push(String(candidate.location))
        }
        if (candidate.linkedinUrl) {
          cols.push('linkedin_url'); vals.push(`$${p++}`); params.push(String(candidate.linkedinUrl))
        }
        if (candidate.portfolioUrl) {
          cols.push('portfolio_url'); vals.push(`$${p++}`); params.push(String(candidate.portfolioUrl))
        }
        if (candidate.availableStartDate) {
          cols.push('available_start_date'); vals.push(`$${p++}::date`); params.push(String(candidate.availableStartDate))
        }
        if (candidate.willingToRelocate !== undefined) {
          cols.push('willing_to_relocate'); vals.push(`$${p++}`); params.push(Boolean(candidate.willingToRelocate))
        }
        // Languages and proficiency levels
        if (candidate.languages && Array.isArray(candidate.languages) && candidate.languages.length > 0) {
          cols.push('languages'); vals.push(`$${p++}::jsonb`); params.push(JSON.stringify(candidate.languages))
        }
        // Photo URL (webcam captured)
        if (photoUrl) {
          cols.push('photo_url'); vals.push(`$${p++}`); params.push(String(photoUrl))
        }

      if (cols.length === 0) throw new Error('applications table not compatible')

        const insertAppQ = `
          INSERT INTO applications (${cols.join(',')})
          VALUES (${vals.join(',')})
          RETURNING id
        `
        const appRows = await (DatabaseService as any)["query"].call(DatabaseService, insertAppQ, params) as any[]
        applicationId = appRows?.[0]?.id || null
      }
    } catch (e: any) {
      console.error('Applications insert failed:', e?.message || e)
      applicationId = null
    }

    // 4) Optional: also log a candidate_documents record
    if (fileId) {
      try {
        const docQ = `
          INSERT INTO candidate_documents (candidate_id, file_id, doc_type, title)
          VALUES ($1::uuid, $2::uuid, 'resume', $3)
          ON CONFLICT DO NOTHING
        `
        await (DatabaseService as any)["query"].call(DatabaseService, docQ, [candidateId, fileId, resume?.name || 'Resume'])
      } catch {}
    }

    // 5) Fire analytics event
    try {
      await fetch(`${req.nextUrl.origin}/api/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'candidate_submitted',
          jobId,
          candidateId,
          applicationId,
          timestamp: submittedAt,
          metadata: {
            source,
            ip: clientIp,
            userAgent,
            hasResume: !!fileId,
          },
        }),
      }).catch(e => console.warn('Analytics event failed:', e))
    } catch {}

    // Log success
    console.log(`✅ Application submitted: candidate=${candidateId}, job=${jobId}, app=${applicationId}`)

    return NextResponse.json({ 
      ok: true, 
      candidateId, 
      applicationId, 
      fileId,
      message: 'Application submitted successfully'
    })
  } catch (err: any) {
    console.error('❌ Application submit error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to submit application' }, { status: 500 })
  }
}
