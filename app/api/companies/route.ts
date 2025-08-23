import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40)
}

export async function POST(req: Request) {
  try {
    const { name, description_md, website_url, careers_url } = (await req.json()) as {
      name: string
      description_md?: string
      website_url?: string
      careers_url?: string
    }
    if (!name) return NextResponse.json({ error: 'Missing required fields: name' }, { status: 400 })

    const sb = createServerClient()
    const { data, error } = await sb
      .from('companies')
      .insert({
        name,
        description_md: description_md ?? null,
        website_url: website_url ?? null,
        careers_url: careers_url ?? null,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, company: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const sb = createServerClient()
    const { data, error } = await sb.from('companies').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, companies: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


