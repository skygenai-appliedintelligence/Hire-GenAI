import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    // Check if legacy table exists (boolean result to avoid regclass type)
    const rel = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT (to_regclass('public.job_descriptions') IS NOT NULL) AS exists`)
    const hasJobDescriptions = !!rel?.[0]?.exists

    let rows: any[] = []
    if (hasJobDescriptions) {
      rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, company_name
          FROM public.job_descriptions
         WHERE id = CAST(${jobId} AS uuid)
         LIMIT 1
      `)
    } else {
      rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT j.id, c.name AS company_name
          FROM public.jobs j
          JOIN public.companies c ON c.id = j.company_id
         WHERE j.id = CAST(${jobId} AS uuid)
         LIMIT 1
      `)
    }

    const job = rows?.[0]
    if (!job || !job.company_name) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const companySlug = String(job.company_name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')

    return NextResponse.json({ companySlug, jobId })
  } catch (err: any) {
    console.error('canonical GET error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
