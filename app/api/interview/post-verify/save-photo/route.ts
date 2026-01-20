import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { applicationId, photo } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    if (!photo) {
      return NextResponse.json({ ok: false, error: 'Photo is required' }, { status: 400 })
    }

    // Get interview ID from application
    const interviewQuery = `
      SELECT i.id as interview_id, a.email, a.first_name, a.last_name
      FROM interviews i
      JOIN application_rounds ar ON i.application_round_id = ar.id
      JOIN applications a ON ar.application_id = a.id
      WHERE a.id = $1::uuid
      ORDER BY i.id DESC
      LIMIT 1
    `
    const interviewResult = await (DatabaseService as any).query(interviewQuery, [applicationId])

    if (!interviewResult || interviewResult.length === 0) {
      return NextResponse.json({ ok: false, error: 'Interview not found' }, { status: 404 })
    }

    const interview = interviewResult[0]
    const interviewId = interview.interview_id

    // Convert base64 to buffer
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `post-interview-photos/${applicationId}/${timestamp}.jpg`

    let photoUrl: string

    // Try to upload to Vercel Blob if available
    try {
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/jpeg'
      })
      photoUrl = blob.url
      console.log(`[Post-Interview Photo] Uploaded to Vercel Blob: ${photoUrl}`)
    } catch (blobError) {
      // Fallback: Store as base64 in database
      console.log('[Post-Interview Photo] Vercel Blob not available, storing as base64')
      photoUrl = photo // Store the base64 data URL directly
    }

    // Store photo URL in database - update the interview record
    const updateQuery = `
      UPDATE interviews 
      SET 
        post_interview_photo_url = $1,
        post_interview_photo_captured_at = NOW()
      WHERE id = $2::uuid
      RETURNING id
    `
    
    try {
      await (DatabaseService as any).query(updateQuery, [photoUrl, interviewId])
      console.log(`[Post-Interview Photo] Saved photo for interview ${interviewId}`)
    } catch (dbError: any) {
      // If column doesn't exist, try to add it
      if (dbError.message?.includes('column') && dbError.message?.includes('does not exist')) {
        console.log('[Post-Interview Photo] Adding missing columns to interviews table...')
        
        await (DatabaseService as any).query(`
          ALTER TABLE interviews 
          ADD COLUMN IF NOT EXISTS post_interview_photo_url TEXT,
          ADD COLUMN IF NOT EXISTS post_interview_photo_captured_at TIMESTAMP WITH TIME ZONE
        `)
        
        // Retry the update
        await (DatabaseService as any).query(updateQuery, [photoUrl, interviewId])
        console.log(`[Post-Interview Photo] Saved photo for interview ${interviewId} (after adding columns)`)
      } else {
        throw dbError
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Photo saved successfully',
      interviewId
    })

  } catch (error: any) {
    console.error('[Post-Interview Photo] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to save photo' }, { status: 500 })
  }
}
