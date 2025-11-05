import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DatabaseService } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Map UI roles <-> DB enum roles
function mapUiRoleToDb(role: 'company_admin' | 'user' | 'member'): 'admin' | 'recruiter' {
  if (role === 'company_admin') return 'admin'
  return 'recruiter' // Both 'user' and 'member' map to 'recruiter' in DB
}
function mapDbRoleToUi(role?: string, companyName?: string): 'company_admin' | 'user' | 'member' {
  if (role === 'admin') return 'company_admin'
  // If it's the demo company (HireGenAI or HireGenAI Demo Company), show recruiter role as 'member'
  if (companyName === 'HireGenAI' || companyName === 'HireGenAI Demo Company') return 'member'
  return 'user' // Regular company users with recruiter role show as 'user'
}

// Reusable admin check
async function ensureAdmin(companyId: string, actorEmail?: string) {
  if (!DatabaseService.isDatabaseConfigured()) return true
  if (!actorEmail) {
    return NextResponse.json({ ok: false, error: 'actorEmail is required' }, { status: 400 }) as any
  }
  const adminCheckQuery = `
    SELECT 1
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.company_id = $1::uuid AND u.email = $2 AND ur.role = 'admin'::app_role
    LIMIT 1
  `
  const rows = await prisma.$queryRawUnsafe(adminCheckQuery, companyId, actorEmail) as any[]
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'Forbidden: admin role required' }, { status: 403 }) as any
  }
  return true
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 })

    // Check if database is configured, use fallback if not
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, returning mock company members')
      return NextResponse.json({ 
        ok: true, 
        members: [
          {
            id: companyId,
            email: 'demo@example.com',
            full_name: 'Demo User',
            role: 'admin'
          }
        ]
      })
    }

    // Use raw SQL query with retry-enabled DatabaseService
    const membersQuery = `
      SELECT u.id, u.email, u.full_name, ur.role, c.name as company_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      JOIN companies c ON u.company_id = c.id
      WHERE u.company_id = $1::uuid
      ORDER BY u.created_at ASC
    `
    const rawMembers = await DatabaseService.query(membersQuery, [companyId]) as any[]

    // Map to UI expected format
    const members = rawMembers.map(member => ({
      id: member.id,
      email: member.email,
      name: member.full_name, // Map full_name to name for UI
      role: mapDbRoleToUi(member.role, member.company_name)
    }))

    return NextResponse.json({ ok: true, members })
  } catch (err: any) {
    console.error('Error fetching company members:', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, companyName, email, name, role, actorEmail } = (await req.json()) as {
      companyId: string
      companyName?: string
      email: string
      name?: string
      role?: 'company_admin' | 'user' | 'member'
      actorEmail?: string
    }
    
    console.log('Adding member request:', { companyId, companyName, email, name, role })
    
    if (!companyId || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Check if database is configured, use fallback if not
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, returning mock success for add member')
      return NextResponse.json({ ok: true, id: `mock-${Date.now()}` })
    }

    // Enforce admin-only
    const adminOk = await ensureAdmin(companyId, actorEmail)
    if (adminOk !== true) return adminOk

    // Check if user already exists using DatabaseService
    const existingUserQuery = `SELECT id FROM users WHERE email = $1 LIMIT 1`
    const existingUsers = await DatabaseService.query(existingUserQuery, [email]) as any[]
    
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'User email already exists' }, { status: 400 })
    }

    // Check if company exists using DatabaseService
    const companyQuery = `SELECT id FROM companies WHERE id = $1::uuid LIMIT 1`
    const companies = await DatabaseService.query(companyQuery, [companyId]) as any[]
    
    if (companies.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    // Create user using DatabaseService
    const insertUserQuery = `
      INSERT INTO users (company_id, email, full_name, status, created_at)
      VALUES ($1::uuid, $2, $3, 'active', NOW())
      RETURNING id
    `
    const newUsers = await DatabaseService.query(insertUserQuery, [
      companyId, 
      email, 
      name && name.trim().length > 0 ? name : email.split('@')[0]
    ]) as any[]

    // Add user role if specified
    if (role && newUsers.length > 0) {
      const insertRoleQuery = `
        INSERT INTO user_roles (user_id, role)
        VALUES ($1::uuid, $2::app_role)
        ON CONFLICT DO NOTHING
      `
      const dbRole = mapUiRoleToDb(role)
      await DatabaseService.query(insertRoleQuery, [newUsers[0].id, dbRole])
    }

    return NextResponse.json({ ok: true, id: newUsers[0]?.id })
  } catch (err: any) {
    console.error('Error adding company member:', err)
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { companyId, email, role, actorEmail } = (await req.json()) as {
      companyId: string
      email: string
      role: 'company_admin' | 'user' | 'member'
      actorEmail?: string
    }
    if (!companyId || !email || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Fallback when DB isn't configured
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, returning mock success for update member role')
      return NextResponse.json({ ok: true })
    }

    // Enforce admin-only
    const adminOk = await ensureAdmin(companyId, actorEmail)
    if (adminOk !== true) return adminOk

    // Find user by email using DatabaseService
    const findUserQuery = `
      SELECT id, company_id
      FROM users
      WHERE email = $1
      LIMIT 1
    `
    const users = await DatabaseService.query(findUserQuery, [email]) as any[]
    const user = users[0]

    if (!user || user.company_id !== companyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Ensure only one role we manage per user: delete any existing roles, then insert new
    const deleteRolesQuery = `DELETE FROM user_roles WHERE user_id = $1::uuid`
    await DatabaseService.query(deleteRolesQuery, [user.id])

    const insertRoleQuery = `
      INSERT INTO user_roles (user_id, role)
      VALUES ($1::uuid, $2::app_role)
      ON CONFLICT DO NOTHING
    `
    const dbRole = mapUiRoleToDb(role)
    await DatabaseService.query(insertRoleQuery, [user.id, dbRole])

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const email = searchParams.get('email')
    const actorEmail = searchParams.get('actorEmail')
    if (!companyId || !email) return NextResponse.json({ error: 'Missing required params' }, { status: 400 })

    // Fallback when DB isn't configured
    if (!DatabaseService.isDatabaseConfigured()) {
      console.log('Database not configured, returning mock success for delete member')
      return NextResponse.json({ ok: true })
    }

    // Enforce admin-only
    const adminOk = await ensureAdmin(companyId, actorEmail || undefined)
    if (adminOk !== true) return adminOk

    // Find the user by email and company
    const findUserQuery = `
      SELECT id, company_id
      FROM users
      WHERE email = $1 AND company_id = $2::uuid
      LIMIT 1
    `
    const users = await DatabaseService.query(findUserQuery, [email, companyId]) as any[]
    const user = users[0]
    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Delete the user (will cascade delete roles due to FK ON DELETE CASCADE)
    const deleteUserQuery = `DELETE FROM users WHERE id = $1::uuid`
    await DatabaseService.query(deleteUserQuery, [user.id])
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


