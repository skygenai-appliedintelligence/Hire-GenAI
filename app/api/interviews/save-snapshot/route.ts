import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { applicationId, snapshotData } = await request.json()

    console.log('📸 [SNAPSHOT API] Received request')
    console.log('📋 Application ID:', applicationId)
    console.log('📊 Snapshot data size:', snapshotData?.length || 0, 'bytes')

    if (!applicationId || !snapshotData) {
      console.error('❌ [SNAPSHOT API] Missing parameters')
      return NextResponse.json(
        { error: 'Missing applicationId or snapshotData' },
        { status: 400 }
      )
    }

    // Convert base64 data URL to buffer
    let buffer: Buffer
    try {
      if (snapshotData.startsWith('data:image')) {
        // Extract base64 part from data URL
        const base64Data = snapshotData.split(',')[1]
        buffer = Buffer.from(base64Data, 'base64')
      } else {
        buffer = Buffer.from(snapshotData, 'base64')
      }
      console.log('✅ [SNAPSHOT API] Buffer created, size:', buffer.length, 'bytes')
    } catch (bufferError) {
      console.error('❌ [SNAPSHOT API] Buffer conversion error:', bufferError)
      throw bufferError
    }

    // Get the interview record
    console.log('🔍 [SNAPSHOT API] Querying for interview...')
    const result = await DatabaseService.query(
      `SELECT i.id FROM interviews i
       JOIN application_rounds ar ON i.application_round_id = ar.id
       WHERE ar.application_id = $1::uuid
       ORDER BY ar.created_at DESC
       LIMIT 1`,
      [applicationId]
    ) as any

    if (!result || !Array.isArray(result) || result.length === 0) {
      console.error('❌ [SNAPSHOT API] Interview not found for applicationId:', applicationId)
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    const interviewId = result[0].id
    console.log('✅ [SNAPSHOT API] Found interview:', interviewId)

    // Save the snapshot to the database
    console.log('💾 [SNAPSHOT API] Saving snapshot to database...')
    await DatabaseService.query(
      `UPDATE interviews SET verification_snapshot = $1 WHERE id = $2::uuid`,
      [buffer, interviewId]
    )

    console.log(`✅ [SNAPSHOT API] Verification snapshot saved for interview: ${interviewId}`)

    return NextResponse.json({
      ok: true,
      message: 'Snapshot saved successfully',
      interviewId
    })
  } catch (error) {
    console.error('❌ [SNAPSHOT] Error saving snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to save snapshot', details: String(error) },
      { status: 500 }
    )
  }
}
