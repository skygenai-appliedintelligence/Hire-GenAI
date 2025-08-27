import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  ctx: { params: { jobId: string } } | { params: Promise<{ jobId: string }> }
) {
  try {
    const raw = (ctx as any).params
    const { jobId } = raw?.then ? await raw : raw
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    // Validate UUID to avoid enum/uuid cast errors
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)
    if (!isUuid) {
      return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 })
    }

    // Check if legacy table exists using information_schema (avoid regclass type)
    const rel = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'job_descriptions'
      ) AS exists
    `)
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
