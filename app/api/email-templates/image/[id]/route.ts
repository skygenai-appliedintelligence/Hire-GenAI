import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await context.params

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    const query = `
      SELECT blob_data, content_type, filename
      FROM template_images
      WHERE id = $1::uuid
    `

    const result = await DatabaseService.query(query, [imageId])

    if (!result || !result[0]) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    return new NextResponse(result[0].blob_data, {
      headers: {
        'Content-Type': result[0].content_type,
        'Content-Disposition': `inline; filename="${result[0].filename}"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to get image (dynamic route):', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get image' },
      { status: 500 }
    )
  }
}
