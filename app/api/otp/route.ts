import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import crypto from 'node:crypto'

// DEV endpoint to issue and verify OTPs against Supabase otp_challenges

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email: string }
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')

    const sb = createServerClient()
    // Remove previous pending login challenges for this email
    await sb.from('otp_challenges').delete().eq('email', email).eq('purpose', 'login')
    // Insert new challenge
    const { error } = await sb.from('otp_challenges').insert({
      email,
      principal_type: 'user',
      purpose: 'login',
      code_hash: codeHash,
      max_tries: 5,
      expires_at: expiresAt.toISOString(),
    })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    // DEV: return the OTP in response (do NOT do this in production)
    return NextResponse.json({ ok: true, code })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { email, code } = (await req.json()) as { email: string; code: string }
    if (!email || !code) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const sb = createServerClient()
    const { data: challenges, error: chErr } = await sb
      .from('otp_challenges')
      .select('id, code_hash, expires_at, tries_used, max_tries')
      .eq('email', email)
      .eq('purpose', 'login')
      .order('created_at', { ascending: false })
      .limit(1)
    if (chErr || !challenges || challenges.length === 0) {
      return NextResponse.json({ error: 'No OTP found for this email' }, { status: 400 })
    }
    const record = challenges[0]

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 })
    }

    const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex')
    if (record.code_hash !== codeHash) {
      await sb
        .from('otp_challenges')
        .update({ tries_used: (record.tries_used ?? 0) + 1 })
        .eq('id', record.id)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Consume OTP
    await sb.from('otp_challenges').delete().eq('id', record.id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


