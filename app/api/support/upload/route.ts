import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type - images only
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (1MB max for screenshots)
    const maxSize = 1 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 1MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `support-screenshots/${timestamp}-${randomStr}.${ext}`

    // Upload to Vercel Blob storage
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: file.name,
      size: file.size,
    })
  } catch (error: any) {
    console.error('Screenshot upload error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to upload screenshot' },
      { status: 500 }
    )
  }
}
