import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(req: Request) {
  try {
    const { companyId, name, website, industry, size } = (await req.json()) as {
      companyId?: string
      name?: string
      website?: string
      industry?: string
      size?: string
    }

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    const data: { name?: string; website?: string | null; industry?: string | null; size?: string | null } = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (typeof website === 'string') data.website = website.trim() || null
    if (typeof industry === 'string') data.industry = industry.trim() || null
    if (typeof size === 'string') data.size = size.trim() || null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: 'No updatable fields provided' }, { status: 400 })
    }

    const company = await prisma.companies.update({ where: { id: companyId }, data })
    return NextResponse.json({ ok: true, company })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
