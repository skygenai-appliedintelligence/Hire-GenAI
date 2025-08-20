import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40)
}

export async function POST(req: Request) {
  try {
    const { name, email, logo_url } = (await req.json()) as { name: string; email: string; logo_url?: string }
    if (!name || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const slug = slugify(name)
    const company = await prisma.companies.create({
      data: { name, slug, email, logo_url: logo_url ?? null, subscription_plan: 'basic' },
    })
    return NextResponse.json({ ok: true, company })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const companies = await prisma.companies.findMany({ orderBy: { created_at: 'desc' } })
    return NextResponse.json({ ok: true, companies })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


