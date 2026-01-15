import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, candidateId, applicationId } = body

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Validate base64 image data
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected base64 image data.' },
        { status: 400 }
      )
    }

    // Extract base64 content and mime type
    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid base64 image format' },
        { status: 400 }
      )
    }

    const imageType = matches[1] // jpeg, png, etc.
    const base64Data = matches[2]
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size (max 5MB for photos)
    const maxSize = 5 * 1024 * 1024
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: 'Photo too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const identifier = candidateId || applicationId || 'unknown'
    const fileName = `candidate-photos/${identifier}-${timestamp}-${randomStr}.${imageType}`

    // Upload to Vercel Blob storage
    const blob = await put(fileName, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: `image/${imageType}`,
    })

    console.log('📸 [Photo Upload] Successfully uploaded candidate photo:', {
      url: blob.url,
      candidateId,
      applicationId,
      size: buffer.length,
    })

    return NextResponse.json({
      success: true,
      photoUrl: blob.url,
      size: buffer.length,
      contentType: `image/${imageType}`,
    })
  } catch (error: any) {
    console.error('❌ [Photo Upload] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
