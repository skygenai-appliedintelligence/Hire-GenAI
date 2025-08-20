import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const [{ db }] = await prisma.$queryRawUnsafe<any[]>(`SELECT current_database() AS db`)
    const [{ schema }] = await prisma.$queryRawUnsafe<any[]>(`SELECT current_schema() AS schema`)
    const searchPathRes = await prisma.$queryRawUnsafe<any[]>(`SHOW search_path`)
    const columns = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'jds'
      ORDER BY ordinal_position
    `)
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE tablename IN ('jds','jd','job_descriptions')
      ORDER BY 1,2
    `)

    return NextResponse.json({
      ok: true,
      db,
      schema,
      search_path: searchPathRes?.[0]?.search_path ?? null,
      tables,
      jds_columns: columns,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
