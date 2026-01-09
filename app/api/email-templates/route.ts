import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

// GET - Fetch all email templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    let query = 'SELECT * FROM email_templates ORDER BY created_at DESC'
    const params: any[] = []
    
    if (category) {
      query = 'SELECT * FROM email_templates WHERE category = $1 ORDER BY created_at DESC'
      params.push(category)
    }
    
    const result = await DatabaseService.query(query, params)
    
    return NextResponse.json({
      success: true,
      templates: result
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to fetch email templates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new email template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, subject, body: templateBody, category, isDefault } = body
    
    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'Name, subject, and body are required' },
        { status: 400 }
      )
    }
    
    // If this is set as default, unset other defaults in same category
    if (isDefault) {
      await DatabaseService.query(
        'UPDATE email_templates SET is_default = FALSE WHERE category = $1',
        [category || 'general']
      )
    }
    
    const query = `
      INSERT INTO email_templates (name, subject, body, category, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    
    const result = await DatabaseService.query(query, [
      name,
      subject,
      templateBody,
      category || 'general',
      isDefault || false
    ])
    
    console.log('✅ [API] Email template created:', result[0]?.id)
    
    return NextResponse.json({
      success: true,
      template: result[0]
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to create email template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PATCH - Update an existing email template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, subject, body: templateBody, category, isDefault } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }
    
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    if (name) {
      updates.push(`name = $${paramIndex}`)
      params.push(name)
      paramIndex++
    }
    
    if (subject) {
      updates.push(`subject = $${paramIndex}`)
      params.push(subject)
      paramIndex++
    }
    
    if (templateBody) {
      updates.push(`body = $${paramIndex}`)
      params.push(templateBody)
      paramIndex++
    }
    
    if (category) {
      updates.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }
    
    if (isDefault !== undefined) {
      // If setting as default, unset other defaults first
      if (isDefault) {
        const currentTemplate = await DatabaseService.query(
          'SELECT category FROM email_templates WHERE id = $1::uuid',
          [id]
        )
        if (currentTemplate[0]) {
          await DatabaseService.query(
            'UPDATE email_templates SET is_default = FALSE WHERE category = $1',
            [currentTemplate[0].category]
          )
        }
      }
      updates.push(`is_default = $${paramIndex}`)
      params.push(isDefault)
      paramIndex++
    }
    
    updates.push(`updated_at = NOW()`)
    
    if (updates.length === 1) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }
    
    params.push(id)
    const query = `UPDATE email_templates SET ${updates.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`
    
    const result = await DatabaseService.query(query, params)
    
    if (!result[0]) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ [API] Email template updated:', id)
    
    return NextResponse.json({
      success: true,
      template: result[0]
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to update email template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an email template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }
    
    const result = await DatabaseService.query(
      'DELETE FROM email_templates WHERE id = $1::uuid RETURNING id',
      [id]
    )
    
    if (!result[0]) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ [API] Email template deleted:', id)
    
    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })
  } catch (error: any) {
    console.error('❌ [API] Failed to delete email template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}
