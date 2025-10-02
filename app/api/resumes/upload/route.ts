import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const candidateId = formData.get('candidateId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const fileName = `resumes/${candidateId || 'candidate'}-${timestamp}-${randomStr}-${file.name}`

    // Upload to Vercel Blob storage
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    // Save file metadata to database
    let fileId: string | null = null
    try {
      const fileRow = await DatabaseService.createFile({
        storage_key: blob.url,
        content_type: file.type,
        size_bytes: BigInt(file.size),
      })
      fileId = fileRow.id
    } catch (dbError) {
      console.warn('Failed to save file metadata to database:', dbError)
      // Continue without database record
    }

    // If candidateId provided, link file to candidate
    if (candidateId && fileId) {
      try {
        // Validate that candidateId is a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(candidateId)) {
          console.warn('[Resume Upload] candidateId is not a valid UUID, skipping link:', candidateId)
        } else {
          const linkQuery = `
            INSERT INTO candidate_documents (candidate_id, file_id, doc_type, title, created_at)
            VALUES ($1::uuid, $2::uuid, 'resume', $3, NOW())
            ON CONFLICT DO NOTHING
          `
          await (DatabaseService as any)["query"]?.call(
            DatabaseService,
            linkQuery,
            [candidateId, fileId, file.name]
          )
        }
      } catch (linkError) {
        console.warn('Failed to link file to candidate:', linkError)
        // Non-fatal, continue
      }
    }

    return NextResponse.json({
      success: true,
      fileId,
      fileUrl: blob.url,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      candidateId: candidateId || undefined,
    })
  } catch (error: any) {
    console.error('Resume upload error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload resume' },
      { status: 500 }
    )
  }
}
