import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rawDb = (process.env.DATABASE_URL || '').trim()
  const rawDirect = (process.env.DIRECT_URL || '').trim()
  const startsWithPostgres = /^(postgresql?|POSTGRESQL?):\/\//.test(rawDb)
  const usedFallback = !rawDb && !!rawDirect

  return NextResponse.json({
    ok: true,
    hasDbUrl: !!rawDb,
    startsWithPostgres,
    usedFallback,
  })
}


