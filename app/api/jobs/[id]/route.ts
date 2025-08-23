import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const companyName = searchParams.get('company')?.trim()
    const id = params.id

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing job id' }, { status: 400 })
    }

    if (!companyName) {
      // Tenant isolation: require company to avoid deleting other tenants' jobs
      return NextResponse.json({ ok: false, error: 'Missing company' }, { status: 400 })
    }

    const sb = createServerClient()
    // Resolve company id
    const { data: company } = await sb.from('companies').select('id').eq('name', companyName).single()
    if (!company?.id) {
      return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 })
    }

    // Delete job scoped to company
    const { data, error } = await sb
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('company_id', company.id)
      .select('id')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 })

    return NextResponse.json({ ok: true, deletedId: data.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
