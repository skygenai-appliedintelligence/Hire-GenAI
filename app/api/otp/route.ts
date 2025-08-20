import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DEV endpoint to issue and verify OTPs. In production, integrate with email service.

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email: string }
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.email_otps.create({ data: { email, code, expires_at: expiresAt } })

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

    const record = await prisma.email_otps.findFirst({ where: { email, code } })
    if (!record) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    if (new Date(record.expires_at) < new Date()) return NextResponse.json({ error: 'Code expired' }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


