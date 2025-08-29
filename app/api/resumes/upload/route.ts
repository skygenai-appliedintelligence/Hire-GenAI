import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const candidateId = formData.get('candidateId') as string

    if (!file || !candidateId) {
      return NextResponse.json(
        { error: 'File and candidateId are required' },
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

    // Update or create candidate with resume file reference
    const candidate = await DatabaseService.upsertCandidate({
      email: candidateId, // Using candidateId as email for now
      first_name: 'Unknown',
      last_name: 'Candidate',
      resume_file_id: file_record.id,
      resume_url: blob.url,
      resume_name: file.name,
      resume_size: file.size.toString(),
      resume_type: file.type,
    })

    return NextResponse.json({
      id: file_record.id,
      candidateId: candidate.id,
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
