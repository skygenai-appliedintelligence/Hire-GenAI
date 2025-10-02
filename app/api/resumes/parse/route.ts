import { NextRequest, NextResponse } from 'next/server'
import { parseResume } from '@/lib/resume-parser'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('[Resume Parse] Starting resume parse request')
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const candidateId = formData.get('candidateId') as string | null
    const applicationId = formData.get('applicationId') as string | null

    console.log('[Resume Parse] File received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      candidateId,
      applicationId
    })

    if (!file) {
      return NextResponse.json(
        { error: 'Resume file is required' },
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

    // Convert file to buffer
    console.log('[Resume Parse] Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[Resume Parse] Buffer created, size:', buffer.length)

    // Parse the resume
    console.log('[Resume Parse] Starting parseResume function...')
    let parsed
    try {
      parsed = await parseResume(buffer, file.type)
      console.log('[Resume Parse] Parse complete, skills found:', parsed.skills?.length || 0)
    } catch (parseError: any) {
      console.error('[Resume Parse] Parsing failed, using fallback:', parseError.message)
      // Fallback: Create basic parsed object without text extraction
      // Empty rawText will trigger frontend fallback to use form data
      parsed = {
        rawText: '',
        skills: [],
        experience: [],
        education: [],
      }
    }

    // Optionally save parsed data to database
    if (applicationId && parsed.rawText) {
      try {
        // Check if resume_text column exists in applications table
        const checkCol = await (DatabaseService as any)["query"]?.call(
          DatabaseService,
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'applications' 
              AND column_name = 'resume_text'
          ) as exists`,
          []
        )
        
        const hasResumeText = checkCol?.[0]?.exists === true

        if (hasResumeText) {
          // Clean text to remove null bytes and invalid UTF-8 sequences
          const cleanedText = parsed.rawText
            .replace(/\0/g, '') // Remove null bytes
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .trim()
          
          // Save parsed text to applications.resume_text
          // Check if updated_at column exists
          const checkUpdatedAt = await (DatabaseService as any)["query"]?.call(
            DatabaseService,
            `SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
                AND table_name = 'applications' 
                AND column_name = 'updated_at'
            ) as exists`,
            []
          )
          
          const hasUpdatedAt = checkUpdatedAt?.[0]?.exists === true
          
          if (hasUpdatedAt) {
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE applications 
               SET resume_text = $1, updated_at = NOW() 
               WHERE id = $2::uuid`,
              [cleanedText, applicationId]
            )
          } else {
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE applications 
               SET resume_text = $1 
               WHERE id = $2::uuid`,
              [cleanedText, applicationId]
            )
          }
          
          console.log('[Resume Parse] Successfully saved resume text to database')
        }
      } catch (err) {
        console.warn('Failed to save resume text to database:', err)
        // Non-fatal, continue
      }
    }

    // Optionally update candidate with parsed info
    if (candidateId && parsed.name) {
      try {
        // Validate that candidateId is a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(candidateId)) {
          console.warn('[Resume Parse] candidateId is not a valid UUID, skipping candidate update:', candidateId)
        } else {
          const updates: string[] = []
          const params: any[] = []
          let p = 1

          // Check which columns exist
          const colCheck = await (DatabaseService as any)["query"]?.call(
            DatabaseService,
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' 
               AND table_name = 'candidates'
               AND column_name IN ('full_name', 'phone', 'location')`,
            []
          )
          const cols = new Set((colCheck || []).map((r: any) => r.column_name))

          if (cols.has('full_name') && parsed.name) {
            updates.push(`full_name = $${p++}`)
            params.push(parsed.name)
          }
          if (cols.has('phone') && parsed.phone) {
            updates.push(`phone = $${p++}`)
            params.push(parsed.phone)
          }
          if (cols.has('location') && parsed.location) {
            updates.push(`location = $${p++}`)
            params.push(parsed.location)
          }

          if (updates.length > 0) {
            params.push(candidateId)
            await (DatabaseService as any)["query"]?.call(
              DatabaseService,
              `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${p}::uuid`,
              params
            )
          }
        }
      } catch (err) {
        console.warn('Failed to update candidate with parsed data:', err)
        // Non-fatal, continue
      }
    }

    return NextResponse.json({
      success: true,
      parsed: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        summary: parsed.summary,
        skills: parsed.skills,
        experience: parsed.experience,
        education: parsed.education,
        certifications: parsed.certifications,
        languages: parsed.languages,
        links: parsed.links,
        rawText: parsed.rawText.substring(0, 5000), // Truncate for response
      },
    })
  } catch (error: any) {
    console.error('[Resume Parse] ERROR:', error)
    console.error('[Resume Parse] Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to parse resume',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
