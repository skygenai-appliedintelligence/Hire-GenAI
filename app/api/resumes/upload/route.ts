import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const candidateId = (formData.get('candidateId') as string) || ''

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file size and type
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed' },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const filename = `${candidateId}-${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: 'public',
    })

    // Save file to files table using DatabaseService
    const file_record = await DatabaseService.createFile({
      storage_key: blob.url,
      content_type: file.type,
      size_bytes: BigInt(file.size),
    })

    // Link candidate to this file via candidate_documents IF candidateId is a valid UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (candidateId && uuidRegex.test(candidateId)) {
      const linkQ = `
        INSERT INTO candidate_documents (candidate_id, file_id, doc_type, title, created_at)
        VALUES ($1::uuid, $2::uuid, 'resume', $3, NOW())
        ON CONFLICT DO NOTHING
      `
      await (DatabaseService as any)["query"].call(DatabaseService, linkQ, [candidateId, file_record.id, file.name])

      // Optionally update candidate resume_* columns if they exist
      try {
        const colsQ = `
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'candidates'
            AND column_name IN ('resume_file_id','resume_url','resume_name','resume_size','resume_type')
        `
        const rows = await (DatabaseService as any)["query"].call(DatabaseService, colsQ, []) as Array<{ column_name: string }>
        const setParts: string[] = []
        const params: any[] = []
        let p = 1
        const have = new Set(rows.map(r => r.column_name))
        if (have.has('resume_file_id')) { setParts.push(`resume_file_id = $${p++}::uuid`); params.push(file_record.id) }
        if (have.has('resume_url')) { setParts.push(`resume_url = $${p++}`); params.push(blob.url) }
        if (have.has('resume_name')) { setParts.push(`resume_name = $${p++}`); params.push(file.name) }
        if (have.has('resume_size')) { setParts.push(`resume_size = $${p++}`); params.push(String(file.size)) }
        if (have.has('resume_type')) { setParts.push(`resume_type = $${p++}`); params.push(file.type) }
        if (setParts.length) {
          const updQ = `UPDATE candidates SET ${setParts.join(', ')} WHERE id = $${p}::uuid`
          await (DatabaseService as any)["query"].call(DatabaseService, updQ, [...params, candidateId])
        }
      } catch {}
    }

    return NextResponse.json({
      id: file_record.id,
      candidateId: candidateId && uuidRegex.test(candidateId) ? candidateId : null,
      fileUrl: blob.url,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: file_record.created_at
    })
  } catch (error: any) {
    console.error('Resume upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload resume' },
      { status: 500 }
    )
  }
}
