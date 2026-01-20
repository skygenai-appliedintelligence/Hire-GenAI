import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    console.log('🔄 Running migration: add_post_interview_photo_columns...')
    
    const sql = `
      ALTER TABLE interviews 
      ADD COLUMN IF NOT EXISTS post_interview_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS post_interview_photo_captured_at TIMESTAMP WITH TIME ZONE;
    `
    
    await (DatabaseService as any).query(sql)
    
    console.log('✅ Migration completed successfully!')
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Migration completed successfully',
      columns: [
        'post_interview_photo_url (TEXT)',
        'post_interview_photo_captured_at (TIMESTAMP WITH TIME ZONE)'
      ]
    })
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Migration failed' 
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    console.log('🔍 Checking if columns exist...')
    
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'interviews' 
      AND column_name IN ('post_interview_photo_url', 'post_interview_photo_captured_at')
    `
    
    const result = await (DatabaseService as any).query(checkQuery)
    
    const hasPhotoUrl = result.some((col: any) => col.column_name === 'post_interview_photo_url')
    const hasCapturedAt = result.some((col: any) => col.column_name === 'post_interview_photo_captured_at')
    
    if (hasPhotoUrl && hasCapturedAt) {
      return NextResponse.json({ 
        ok: true, 
        message: 'Columns already exist',
        columnsExist: true,
        columns: ['post_interview_photo_url', 'post_interview_photo_captured_at']
      })
    } else {
      return NextResponse.json({ 
        ok: true, 
        message: 'Columns do not exist yet',
        columnsExist: false,
        missingColumns: [
          !hasPhotoUrl && 'post_interview_photo_url',
          !hasCapturedAt && 'post_interview_photo_captured_at'
        ].filter(Boolean)
      })
    }
  } catch (error: any) {
    console.error('❌ Check failed:', error.message)
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Check failed' 
    }, { status: 500 })
  }
}
