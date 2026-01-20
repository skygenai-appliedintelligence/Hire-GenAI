import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Add verification photo columns to applications table
export async function POST() {
  try {
    console.log('🔧 Running migration: Adding verification photo columns to applications table...')
    
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'applications' 
      AND column_name IN ('verification_photo_url', 'photo_verified', 'photo_match_score', 'verified_at')
    `
    const existingColumns = await (DatabaseService as any).query(checkQuery, []) as any[]
    const existingColumnNames = existingColumns?.map((c: any) => c.column_name) || []
    
    console.log('📋 Existing columns:', existingColumnNames)
    
    const columnsToAdd = []
    
    if (!existingColumnNames.includes('verification_photo_url')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS verification_photo_url TEXT`)
    }
    if (!existingColumnNames.includes('photo_verified')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS photo_verified BOOLEAN DEFAULT FALSE`)
    }
    if (!existingColumnNames.includes('photo_match_score')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS photo_match_score DECIMAL(5,2)`)
    }
    if (!existingColumnNames.includes('verified_at')) {
      columnsToAdd.push(`ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE`)
    }
    
    if (columnsToAdd.length === 0) {
      console.log('✅ All columns already exist')
      return NextResponse.json({ 
        ok: true, 
        message: 'All verification photo columns already exist',
        columns: existingColumnNames
      })
    }
    
    const alterQuery = `ALTER TABLE applications ${columnsToAdd.join(', ')}`
    console.log('🔧 Running:', alterQuery)
    
    await (DatabaseService as any).query(alterQuery, [])
    
    console.log('✅ Migration completed successfully')
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Verification photo columns added successfully',
      addedColumns: columnsToAdd
    })
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Migration failed' 
    }, { status: 500 })
  }
}

// GET: Check if columns exist
export async function GET() {
  try {
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'applications' 
      AND column_name IN ('verification_photo_url', 'photo_verified', 'photo_match_score', 'verified_at')
    `
    const existingColumns = await (DatabaseService as any).query(checkQuery, []) as any[]
    const existingColumnNames = existingColumns?.map((c: any) => c.column_name) || []
    
    const allExist = existingColumnNames.length === 4
    
    return NextResponse.json({ 
      ok: true, 
      columnsExist: allExist,
      columns: existingColumnNames,
      missing: ['verification_photo_url', 'photo_verified', 'photo_match_score', 'verified_at']
        .filter(c => !existingColumnNames.includes(c))
    })
    
  } catch (error: any) {
    console.error('❌ Check failed:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Check failed' 
    }, { status: 500 })
  }
}
