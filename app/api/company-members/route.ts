import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 })

    const members = await prisma.users.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'asc' },
      select: { id: true, email: true, name: true, role: true },
    })

    return NextResponse.json({ ok: true, members })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, companyName, email, name, role } = (await req.json()) as {
      companyId: string
      companyName?: string
      email: string
      name?: string
      role?: 'company_admin' | 'user'
    }
    if (!companyId || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Enforce global unique emails
    const existing = await prisma.users.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'User email already exists' }, { status: 400 })
    }

    // Ensure company exists; if not, try to resolve by name or create
    let ensureCompanyId = companyId
    const company = await prisma.companies.findUnique({ where: { id: companyId } })
    if (!company) {
      if (companyName && companyName.trim().length > 0) {
        const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 40)
        const slug = slugify(companyName)
        const placeholderEmail = `${slug || 'company'}+${Date.now()}@example.com`
        const foundByName = await prisma.companies.findFirst({ where: { name: companyName } })
        if (foundByName) {
          ensureCompanyId = foundByName.id
        } else {
          const createdCompany = await prisma.companies.create({ data: { name: companyName, slug: slug || `company-${Date.now()}`, email: placeholderEmail } })
          ensureCompanyId = createdCompany.id
        }
      } else {
        return NextResponse.json({ error: 'Company not found and no companyName provided' }, { status: 400 })
      }
    }

    const created = await prisma.users.create({
      data: {
        company_id: ensureCompanyId,
        email,
        name: name && name.trim().length > 0 ? name : email.split('@')[0],
        role: role || 'user',
        status: 'invited',
      },
      select: { id: true },
    })

    return NextResponse.json({ ok: true, id: created.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { companyId, email, role } = (await req.json()) as {
      companyId: string
      email: string
      role: 'company_admin' | 'user'
    }
    if (!companyId || !email || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const user = await prisma.users.findUnique({ where: { email } })
    if (!user || user.company_id !== companyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await prisma.users.update({ where: { email }, data: { role } })
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
    if (!companyId || !email) return NextResponse.json({ error: 'Missing required params' }, { status: 400 })

    const user = await prisma.users.findUnique({ where: { email } })
    if (!user || user.company_id !== companyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await prisma.users.delete({ where: { email } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


