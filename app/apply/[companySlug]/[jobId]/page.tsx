import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import React from 'react'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Building2, MapPin, Briefcase, BadgeDollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Server component: fetch company and job, then render the client form
export default async function ApplyCompanyJobPage(props: { params: Promise<{ companySlug: string; jobId: string }> }) {
  const { companySlug, jobId } = await props.params

  // 1) Detect which table to use
  const rel = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT (to_regclass('public.job_descriptions') IS NOT NULL) AS exists`)
  const hasJobDescriptions = !!rel?.[0]?.exists

  // 2) Fetch job by ID from the available schema
  let job: any | null = null
  if (hasJobDescriptions) {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.job_descriptions WHERE id = CAST(${jobId} AS uuid) LIMIT 1
    `)
    job = rows?.[0] || null
  } else {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT j.id,
             j.title,
             j.location,
             j.description_md AS description,
             NULL::text       AS requirements,
             NULL::text       AS salary_range,
             j.status,
             COALESCE(j.employment_type::text, 'full_time') AS employment_type,
             j.experience_level::text AS experience_level,
             c.name           AS company_name
        FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
       WHERE j.id = CAST(${jobId} AS uuid)
       LIMIT 1
    `)
    job = rows?.[0] || null
  }

  if (!job) {
    // No such job -> go back to company page (may show not found UX)
    return redirect(`/${companySlug}`)
  }

  // 3) Validate job status
  if (!['active', 'open'].includes(String(job.status || '').toLowerCase())) {
    return redirect(`/${companySlug}`)
  }

  // 4) Canonicalize slug using job.company_name
  const canonicalSlug = String(job.company_name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

  if (canonicalSlug && canonicalSlug !== companySlug.toLowerCase()) {
    return redirect(`/apply/${canonicalSlug}/${jobId}`)
  }

  // 5) Optional: ensure company exists; do not block render if not found
  try {
    await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 1 FROM public.companies WHERE LOWER(name) = LOWER(${job.company_name}) LIMIT 1
    `)
  } catch {}

  // 6) Render page layout matching the provided design
  const jobType = (job.employment_type || 'full_time').replace('_', ' ')
  const expLevel = (job.experience_level || job.level || '').toString()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{job.title}</h1>
        <div>
          <Link href={`/${companySlug}`} className="inline-flex items-center text-black underline underline-offset-4 hover:opacity-80">
            <Building2 className="w-4 h-4 mr-2" />
            {job.company_name}
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-700">
          <span className="inline-flex items-center"><MapPin className="w-4 h-4 mr-2" />{job.location || 'Remote'}</span>
          <span className="inline-flex items-center"><Briefcase className="w-4 h-4 mr-2" />{jobType ? jobType.replace(/\b\w/g, (m: string) => m.toUpperCase()) : 'Full Time'}</span>
          {expLevel && <span className="inline-flex items-center">Experience: {expLevel[0].toUpperCase() + expLevel.slice(1)}</span>}
          {job.salary_range && <span className="inline-flex items-center"><BadgeDollarSign className="w-4 h-4 mr-2" />{job.salary_range}</span>}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <section className="border rounded-md p-6">
            <h2 className="font-semibold mb-2">About {job.company_name}</h2>
            <p className="text-sm text-gray-700">{job.company_name} is hiring talented professionals to join the team.</p>
          </section>

          <section className="border rounded-md p-6">
            <h2 className="font-semibold mb-2">About the role</h2>
            <div className="prose max-w-none text-gray-800 text-sm whitespace-pre-line">{job.description || 'Role description coming soon.'}</div>
            {job.requirements && (
              <>
                <h3 className="font-semibold mt-4 mb-2">Requirements</h3>
                <div className="prose max-w-none text-gray-800 text-sm whitespace-pre-line">{job.requirements}</div>
              </>
            )}
          </section>

          {/* Application form removed as requested */}
        </div>

        {/* Right sidebar */}
        <aside className="border rounded-md p-6 h-fit sticky top-6">
          <h3 className="font-semibold mb-4">Job Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Position</span><span className="font-medium text-right">{job.title}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Location</span><span className="font-medium text-right">{job.location || 'Remote'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Job Type</span><span className="font-medium text-right">{jobType ? jobType.replace(/\b\w/g, (m: string) => m.toUpperCase()) : 'Full Time'}</span></div>
            {expLevel && <div className="flex justify-between"><span className="text-gray-600">Experience Level</span><span className="font-medium text-right">{expLevel[0].toUpperCase() + expLevel.slice(1)}</span></div>}
            {job.salary_range && <div className="flex justify-between"><span className="text-gray-600">Salary</span><span className="font-medium text-right">{job.salary_range}</span></div>}
          </div>
        </aside>
      </div>
    </div>
  )
}
