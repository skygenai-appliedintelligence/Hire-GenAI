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
      source = 'direct_application',
    } = body || {}

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    if (!candidate?.email) return NextResponse.json({ error: 'Missing candidate email' }, { status: 400 })

    const firstName = (candidate.firstName || '').trim()
    const lastName = (candidate.lastName || '').trim()
    const fullNameInput = (candidate.fullName || `${firstName} ${lastName}`.trim()).trim()

    // 1) Save file (if provided) into files table and get file_id
    let fileId: string | null = null
    if (resume?.url) {
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

    // 2) Upsert candidate by email
    const mode = await getCandidateNameMode()

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
      if (!mode.hasFullName && mode.hasFirst) { updates.push(`first_name = $${i++}`); params.push(firstName || null) }
      if (!mode.hasFullName && mode.hasLast) { updates.push(`last_name = $${i++}`); params.push(lastName || null) }

      // Optional contact/location
      if (candidate.phone !== undefined) { updates.push(`phone = $${i++}`); params.push(candidate.phone || null) }
      if (candidate.location !== undefined) { updates.push(`location = $${i++}`); params.push(candidate.location || null) }
      if (fileId) { updates.push(`resume_file_id = $${i++}::uuid`); params.push(fileId) }

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
      else {
        if (mode.hasFirst) { columns.push('first_name'); placeholders.push(`$${p++}`); values.push(firstName || null) }
        if (mode.hasLast) { columns.push('last_name'); placeholders.push(`$${p++}`); values.push(lastName || null) }
      }
      if (candidate.phone !== undefined) { columns.push('phone'); placeholders.push(`$${p++}`); values.push(candidate.phone || null) }
      if (candidate.location !== undefined) { columns.push('location'); placeholders.push(`$${p++}`); values.push(candidate.location || null) }
      if (fileId) { columns.push('resume_file_id'); placeholders.push(`$${p++}::uuid`); values.push(fileId) }

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

    // 3) Create application row
    // Insert minimal fields that are present in our schema
    let applicationId: string | null = null
    try {
      const insertAppQ = `
        INSERT INTO applications (candidate_id, job_id, status, source, created_at)
        VALUES ($1::uuid, $2::uuid, 'applied', $3, NOW())
        RETURNING id
      `
      const appRows = await (DatabaseService as any)["query"].call(DatabaseService, insertAppQ, [candidateId, String(jobId), source]) as any[]
      applicationId = appRows?.[0]?.id || null
    } catch (e) {
      // If applications table shape differs, at least return the candidate
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

    return NextResponse.json({ ok: true, candidateId, applicationId, fileId })
  } catch (err: any) {
    console.error('Application submit error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to submit application' }, { status: 500 })
  }
}
