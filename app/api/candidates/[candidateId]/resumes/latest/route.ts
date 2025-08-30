import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  try {
    const { candidateId } = params
    // Fetch the latest resume linked to the candidate via candidate_documents
    // We store files in `files` and links in `candidate_documents` with doc_type = 'resume'
    const q = `
      SELECT f.id, f.storage_key, f.content_type, f.size_bytes, cd.title, cd.created_at
      FROM candidate_documents cd
      JOIN files f ON f.id = cd.file_id
      WHERE cd.candidate_id = $1::uuid AND cd.doc_type = 'resume'
      ORDER BY cd.created_at DESC
      LIMIT 1
    `
    const rows = await (DatabaseService as any)["query"].call(DatabaseService, q, [candidateId]) as any[]
    const resume = rows?.[0]

    if (!resume) {
      return NextResponse.json({ error: 'No resume found' }, { status: 404 })
    }

    return NextResponse.json({
      resume: {
        id: resume.id,
        url: resume.storage_key,
        filename: resume.title || String(resume.storage_key).split('/').pop() || 'resume',
        mimeType: resume.content_type || 'application/octet-stream',
        createdAt: resume.created_at
      }
    })
  } catch (error: any) {
    console.error('Get latest resume error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
