import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import React from 'react'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Building2, MapPin, Briefcase, BadgeDollarSign } from 'lucide-react'
import ApplyForm from './ApplyForm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Server component: fetch company and job, then render the client form
export default async function ApplyCompanyJobPage(props: { params: Promise<{ companySlug: string; jobId: string }> }) {
  const { companySlug, jobId } = await props.params

  // 1) Detect which table to use (avoid regclass type)
  const rel = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'job_descriptions'
    ) AS exists
  `)
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
             j.location_text,
             j.description_md AS description,
             NULL::text       AS requirements,
             NULL::text       AS salary_range,
             j.status,
             COALESCE(j.employment_type::text, 'full_time') AS employment_type,
             j.level::text AS experience_level,
             c.name           AS company_name,
             j.company_id     AS company_id
        FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
       WHERE j.id = CAST(${jobId} AS uuid)
       LIMIT 1
    `)
    job = rows?.[0] || null
  }

  // If no job found, redirect back to company page
  if (!job) {
    return redirect(`/${companySlug}`)
  }

  // 3) Get job status (allow viewing form regardless of status)
  const jobStatus = String(job.status || '').toLowerCase()
  const isJobOpen = ['active', 'open'].includes(jobStatus)

  // 4) Canonicalize slug using job.company_name
  const canonicalSlug = String(job.company_name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

  if (canonicalSlug && canonicalSlug !== companySlug.toLowerCase()) {
    // Only redirect when we actually have a canonical company name from DB
    // For fallback/mock, canonicalSlug will equal provided slug
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
    <div className="mx-auto max-w-6xl px-4 py-10 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      {/* Status Alert if job is not open */}
      {!isJobOpen && (
        <section className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 shadow-md overflow-hidden">
          <div className="px-6 py-4 md:px-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="font-semibold text-amber-900">Position {jobStatus}</h2>
                <p className="text-sm text-amber-800 mt-1">This position is currently <strong>{jobStatus}</strong> and is not accepting new applications at this time.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Green heading card */}
      <section className="mb-6 rounded-2xl bg-emerald-600/95 text-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-emerald-700/20 motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden emerald-glow relative z-10">
        <div className="px-6 py-6 md:px-8 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Apply for this position</h1>
          <p className="mt-2 text-emerald-50">Please fill out all required fields to submit your application.</p>
          <div className="mt-4 inline-flex items-center gap-3 text-emerald-100 text-sm">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.title}</span>
            {job.location && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{job.location}</span>
            )}
            {expLevel && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 transition-colors hover:bg-white/20">{expLevel[0].toUpperCase() + expLevel.slice(1)}</span>
            )}
          </div>
        </div>
      </section>

      {/* Form card with green accents */}
      <section className="mt-10 w-full rounded-2xl border border-emerald-200 bg-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden emerald-glow relative z-0">
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-4 md:px-8">
          <h2 className="font-semibold text-slate-900">Application Form</h2>
          <p className="text-sm text-emerald-700">Role: <span className="font-medium">{job.title}</span></p>
        </div>
        <div className="p-6 md:p-8">
          <ApplyForm job={job} isJobOpen={isJobOpen} />
        </div>
      </section>
    </div>
  )
}
