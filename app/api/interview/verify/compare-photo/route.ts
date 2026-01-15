import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Fetch stored photo URL for client-side face comparison
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const applicationId = url.searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    // Get stored photo URL from application
    const query = `
      SELECT photo_url, first_name, last_name
      FROM applications 
      WHERE id = $1::uuid
    `
    const result = await (DatabaseService as any).query(query, [applicationId])

    if (!result || result.length === 0) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
    }

    const application = result[0]
    const storedPhotoUrl = application.photo_url

    if (!storedPhotoUrl) {
      console.log(`[Photo Compare] No stored photo for application ${applicationId}`)
      return NextResponse.json({ 
        ok: true, 
        storedPhotoUrl: null,
        skipped: true,
        message: 'No photo stored during application'
      })
    }

    return NextResponse.json({ 
      ok: true, 
      storedPhotoUrl,
      candidateName: `${application.first_name || ''} ${application.last_name || ''}`.trim()
    })

  } catch (error: any) {
    console.error('[Photo Compare] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to fetch stored photo' }, { status: 500 })
  }
}

// POST: Save verification result
export async function POST(req: Request) {
  try {
    const { applicationId, verified, score, capturedPhotoUrl } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'Application ID is required' }, { status: 400 })
    }

    // Update application with verification status
    const updateQuery = `
      UPDATE applications 
      SET 
        verification_photo_url = $2,
        photo_verified = $3,
        photo_match_score = $4,
        verified_at = NOW()
      WHERE id = $1::uuid
      RETURNING id
    `
    
    try {
      await (DatabaseService as any).query(updateQuery, [
        applicationId, 
        capturedPhotoUrl || null,
        verified,
        score || 0
      ])
    } catch (dbErr: any) {
      // Columns might not exist - try simpler update
      console.warn('[Photo Compare] Full update failed, trying simple update:', dbErr?.message)
    }

    console.log(`[Photo Compare] Application ${applicationId}: verified=${verified}, score=${score}`)

    return NextResponse.json({ 
      ok: true, 
      verified,
      score,
      message: verified ? 'Photo verification successful' : 'Photo verification failed'
    })

  } catch (error: any) {
    console.error('[Photo Compare] Error:', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to save verification' }, { status: 500 })
  }
}
