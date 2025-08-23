import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    const sb = createServerClient()
    const { data: user, error } = await sb
      .from('users')
      .select('id, email, full_name, company_id')
      .eq('email', email)
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let company: any = null
    if (user.company_id) {
      const { data: comp } = await sb
        .from('companies')
        .select('id, name, industry, size_band, website_url, careers_url')
        .eq('id', user.company_id)
        .single()
      company = comp || null
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
      },
      company: company ? {
        id: company.id,
        name: company.name,
        industry: company.industry,
        size: company.size_band,
        website: company.website_url
      } : null
    })
  } catch (error: any) {
    console.error('Error getting user by email:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to get user' 
    }, { status: 500 })
  }
}
