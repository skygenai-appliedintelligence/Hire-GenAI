import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// POST - Upload image for email template
export async function POST(request: NextRequest) {
  try {
    // Parse FormData which contains the image file
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const templateId = formData.get('templateId') as string | null;
    
    if (!file || !templateId) {
      return NextResponse.json(
        { error: 'Image file and template ID are required' },
        { status: 400 }
      );
    }
    
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    const blobData = Buffer.from(buffer);
    
    // Generate a unique filename to avoid duplicate constraint (template_id, filename)
    const uniqueFilename = `${Date.now()}-${file.name}`

    // Insert image into template_images table
    const query = `
      INSERT INTO template_images (template_id, filename, content_type, size, blob_data)
      VALUES ($1::uuid, $2, $3, $4, $5)
      RETURNING id, filename, content_type, size
    `;
    
    const result = await DatabaseService.query(query, [
      templateId,
      uniqueFilename,
      file.type,
      file.size,
      blobData
    ]);
    
    if (!result || !result[0]) {
      throw new Error('Failed to save image');
    }
    
    // Add image reference to the template's images JSON array
    const updateTemplateQuery = `
      UPDATE email_templates
      SET images = COALESCE(images, '[]'::jsonb) || jsonb_build_object(
        'id', $2::text,
        'filename', $3,
        'contentType', $4,
        'size', $5,
        'url', '/api/email-templates/image/' || $2
      )::jsonb
      WHERE id = $1::uuid
      RETURNING id
    `;
    
    await DatabaseService.query(updateTemplateQuery, [
      templateId,
      result[0].id,
      result[0].filename,
      result[0].content_type,
      result[0].size
    ]);
    
    // Return success with image data
    return NextResponse.json({
      success: true,
      image: {
        id: result[0].id,
        filename: result[0].filename,
        contentType: result[0].content_type,
        size: result[0].size,
        url: `/api/email-templates/image/${result[0].id}`
      }
    });
  } catch (error: any) {
    console.error('❌ [API] Failed to upload image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// GET - Get image by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get image ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const imageId = pathParts[pathParts.length - 1];
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }
    
    // Query the image data
    const query = `
      SELECT blob_data, content_type, filename
      FROM template_images
      WHERE id = $1
    `;
    
    const result = await DatabaseService.query(query, [imageId]);
    
    if (!result || !result[0]) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Return the image with correct content type
    return new NextResponse(result[0].blob_data, {
      headers: {
        'Content-Type': result[0].content_type,
        'Content-Disposition': `inline; filename="${result[0].filename}"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error: any) {
    console.error('❌ [API] Failed to get image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get image' },
      { status: 500 }
    );
  }
}

// DELETE - Remove image from template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');
    const templateId = searchParams.get('templateId');
    
    if (!imageId || !templateId) {
      return NextResponse.json(
        { error: 'Image ID and template ID are required' },
        { status: 400 }
      );
    }
    
    // First remove the image reference from the template
    const updateTemplateQuery = `
      UPDATE email_templates
      SET images = (
        SELECT jsonb_agg(img)
        FROM jsonb_array_elements(images) AS img
        WHERE (img->>'id') != $2
      )
      WHERE id = $1::uuid
      RETURNING id
    `;
    
    await DatabaseService.query(updateTemplateQuery, [templateId, imageId]);
    
    // Then delete the actual image data
    const deleteImageQuery = `
      DELETE FROM template_images
      WHERE id = $1::uuid
      RETURNING id
    `;
    
    const result = await DatabaseService.query(deleteImageQuery, [imageId]);
    
    if (!result || !result[0]) {
      return NextResponse.json(
        { error: 'Image not found or already deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ [API] Failed to delete image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}
