import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Simple query to verify connectivity
    const now = await prisma.$queryRawUnsafe<{ now: Date }[]>('select now() as now')
    return NextResponse.json({ ok: true, now: now?.[0]?.now ?? null })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}


