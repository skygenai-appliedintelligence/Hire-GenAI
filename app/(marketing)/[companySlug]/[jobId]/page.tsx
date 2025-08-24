import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CompanyJobApplyRedirect(props: { params: Promise<{ companySlug: string; jobId: string }> }) {
  const { companySlug, jobId } = await props.params

  // Resolve company by normalized name (no slug column in schema)
  const companyRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM companies 
     WHERE LOWER(name) = LOWER(${companySlug}) 
        OR LOWER(REPLACE(name, ' ', '-')) = LOWER(${companySlug})
     LIMIT 1
  `)
  const company = companyRows?.[0]
  if (!company) return redirect(`/${companySlug}`)

  // Detect if legacy table exists; else fallback to jobs JOIN companies
  const rel = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT (to_regclass('public.job_descriptions') IS NOT NULL) AS exists`)
  const hasJobDescriptions = !!rel?.[0]?.exists

  let jobs: any[] = []
  if (hasJobDescriptions) {
    jobs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.job_descriptions 
       WHERE id = CAST(${jobId} AS uuid) AND company_name = ${company.name}
       LIMIT 1
    `)
  } else {
    jobs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT j.id,
             j.status,
             c.name AS company_name
        FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
       WHERE j.id = CAST(${jobId} AS uuid) AND c.name = ${company.name}
       LIMIT 1
    `)
  }
  const job = jobs?.[0]
  if (!job || !['active', 'open'].includes(String(job.status).toLowerCase())) return redirect(`/${companySlug}`)

  return redirect(`/apply/${companySlug}/${jobId}`)
}
