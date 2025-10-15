import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: 'Missing companyId parameter' },
        { status: 400 }
      )
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    const users = await DatabaseService.getUsersByCompanyId(companyId)

    return NextResponse.json({
      ok: true,
      users: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        roles: u.roles || [],
        createdAt: u.created_at,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching users by company:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
