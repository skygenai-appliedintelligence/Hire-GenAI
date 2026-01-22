import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/applications/[applicationId]/interview-screenshot
// Save a screenshot captured during the interview (silently, after all questions asked)
export async function POST(
  req: Request,
  ctx: { params: Promise<{ applicationId: string }> } | { params: { applicationId: string } }
) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
    const applicationId = p.applicationId
    const body = await req.json().catch(() => ({}))
    const { screenshot } = body

    console.log('📸 [API] Interview screenshot request received')
    console.log('📸 [API] Application ID:', applicationId)
    console.log('📸 [API] Screenshot size:', screenshot?.length || 0, 'bytes')

    if (!applicationId) {
      console.log('📸 [API] Error: Missing applicationId')
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    if (!screenshot) {
      console.log('📸 [API] Error: Missing screenshot data')
      return NextResponse.json({ error: 'Missing screenshot data' }, { status: 400 })
    }

    // Find the interview record for this application
    const findQuery = `
      SELECT i.id
      FROM interviews i
      JOIN application_rounds ar ON ar.id = i.application_round_id
      WHERE ar.application_id = $1::uuid
      ORDER BY i.started_at DESC NULLS LAST
      LIMIT 1
    `

    console.log('📸 [API] Finding interview for application...')
    const existingRows = await DatabaseService.query(
      findQuery,
      [applicationId]
    ) as any[]

    if (!existingRows || existingRows.length === 0) {
      console.log('📸 [API] Error: No interview found')
      return NextResponse.json({ error: 'No interview found for this application' }, { status: 404 })
    }

    const interviewId = existingRows[0].id
    console.log('📸 [API] Found interview:', interviewId)

    // Convert base64 to buffer for blob storage
    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename for blob storage
    const timestamp = Date.now()
    const filename = `during-interview-photos/${applicationId}/${timestamp}.jpg`

    let photoUrl: string

    // Try to upload to Vercel Blob if available
    try {
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/jpeg'
      })
      photoUrl = blob.url
      console.log(`📸 [API] Uploaded to Vercel Blob: ${photoUrl}`)
    } catch (blobError) {
      // Fallback: Store as base64 in database
      console.log('📸 [API] Vercel Blob not available, storing as base64')
      photoUrl = screenshot // Store the base64 data URL directly
    }

    // Update the interview with the during-interview screenshot URL
    const updateQuery = `
      UPDATE interviews
      SET 
        during_interview_screenshot = $2,
        during_interview_screenshot_captured_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, during_interview_screenshot IS NOT NULL as saved
    `

    console.log('📸 [API] Saving screenshot URL to database...')
    console.log('📸 [API] Interview ID for update:', interviewId)
    console.log('📸 [API] Photo URL:', photoUrl.substring(0, 100) + '...')
    
    const updateResult = await DatabaseService.query(
      updateQuery,
      [interviewId, photoUrl]
    ) as any[]

    console.log('📸 [API] Update result:', updateResult)
    console.log('📸 [API] Rows affected:', updateResult?.length || 0)

    if (!updateResult || updateResult.length === 0) {
      console.log('📸 [API] WARNING: Update did not return any rows!')
      // Try to verify the update
      const verifyQuery = `SELECT id, during_interview_screenshot IS NOT NULL as has_photo FROM interviews WHERE id = $1::uuid`
      const verifyResult = await DatabaseService.query(verifyQuery, [interviewId]) as any[]
      console.log('📸 [API] Verify result:', verifyResult)
    } else {
      console.log('📸 [API] Update successful, saved:', updateResult[0]?.saved)
    }

    console.log('📸 [API] Screenshot saved successfully!')
    return NextResponse.json({
      ok: true,
      interviewId,
      photoUrl
    })

  } catch (err: any) {
    console.error('📸 [API] Screenshot capture error:', err)
    console.error('📸 [API] Error message:', err?.message)
    console.error('📸 [API] Error stack:', err?.stack)
    return NextResponse.json({ 
      error: 'Failed to save screenshot',
      details: err?.message
    }, { status: 500 })
  }
}
