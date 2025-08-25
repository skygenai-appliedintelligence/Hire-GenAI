import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Job Detail Page - Next.js App Router + Tailwind CSS
// Route example: /jobs/consulting/ec9036b2-a8a4-49ab-8f60-95c59ce7bacf
// This page is responsive and recruiter-friendly, with semantic structure and accessible buttons.

export default async function JobDetailPage(
  props:
    | { params: { companySlug: string; jobId: string } }
    | { params: Promise<{ companySlug: string; jobId: string }> }
) {
  const rawParams: any = (props as any).params;
  const { companySlug, jobId } = rawParams?.then ? await rawParams : rawParams;

  // 1) Detect which table to use (avoid regclass type)
  const rel = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'job_descriptions'
    ) AS exists
  `);
  const hasJobDescriptions = !!rel?.[0]?.exists;

  // 2) Fetch job by ID
  let job: any | null = null;
  if (hasJobDescriptions) {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.job_descriptions WHERE id = CAST(${jobId} AS uuid) LIMIT 1
    `);
    job = rows?.[0] || null;
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
    `);
    job = rows?.[0] || null;
  }

  if (!job) {
    return redirect(`/${companySlug}`);
  }

  // 3) Validate job status (allow only active/open)
  if (!['active', 'open'].includes(String(job.status || '').toLowerCase())) {
    return redirect(`/${companySlug}`);
  }

  // 4) Canonical slug using company_name
  const canonicalSlug = String(job.company_name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (canonicalSlug && canonicalSlug !== companySlug.toLowerCase()) {
    return redirect(`/jobs/${canonicalSlug}/${jobId}`);
  }

  const company = canonicalSlug || companySlug;
  const title = job.title as string;
  const location = job.location || 'Remote';
  const jobType = (job.employment_type || 'full_time').toString().replace('_', ' ');
  const experience = (job.experience_level || job.level || '').toString();

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,#eef2ff_0%,transparent_55%),linear-gradient(to_bottom,#f8fafc,white)]">
      {/* Header / Hero */}
      <header className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <div className="flex flex-col gap-5 md:gap-6">
            {/* Breadcrumb and top actions */}
            <div className="flex items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
                <ol className="flex items-center gap-2">
                  <li>
                    <Link
                      href={`/${company}`}
                      className="inline-flex items-center rounded-full border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white px-3 py-1 text-slate-700 shadow-sm hover:shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      aria-label={`Go to ${company} page`}
                    >
                      {company}
                    </Link>
                  </li>
                  <li className="text-slate-400">›</li>
                  <li className="text-slate-600 font-medium">jobs</li>
                </ol>
              </nav>

              {/* Always-visible header Apply */}
              <Link
                href={`/apply/${company}/${jobId}`}
                aria-label="Apply to this job"
                data-testid="apply-btn-header"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-3 font-semibold shadow-sm ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Apply Now
              </Link>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>

            {/* Inline Apply - always visible */}
            <div>
              <Link
                href={`/apply/${company}/${jobId}`}
                aria-label="Apply to this job"
                data-testid="apply-btn-inline"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold shadow-sm ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Apply Now
              </Link>
            </div>

            {/* Meta row under title */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600">
              <div className="inline-flex items-center gap-2">
                <span aria-hidden className="text-base">📍</span>
                <span className="text-sm md:text-base">{location}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span aria-hidden className="text-base">⏱️</span>
                <span className="text-sm md:text-base">{jobType}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span aria-hidden className="text-base">🎯</span>
                <span className="text-sm md:text-base">Experience: {experience}</span>
              </div>
            </div>

            {/* Tools/Tags under header (render only if available) */}
            {Array.isArray(job.tools) && job.tools.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {job.tools.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs md:text-sm text-slate-700 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sticky mobile Apply bar (below header) */}
      <div className="sm:hidden sticky top-0 z-30 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2.5">
          <Link
            href={`/apply/${company}/${jobId}`}
            aria-label="Apply to this job"
            data-testid="apply-btn-sticky"
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-3 font-semibold shadow-sm ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Apply Now
          </Link>
        </div>
      </div>

      {/* Content Grid */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:[grid-template-columns:1fr_380px] gap-6 lg:gap-8 isolate">
          {/* Right column first on mobile (summary), then content */
          }
          <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:z-20">
            {/* Summary Card */}
            <aside
              aria-labelledby="summary-heading"
              className="relative z-20 rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow"
            >
              <h2
                id="summary-heading"
                className="text-lg md:text-xl font-semibold text-slate-900 mb-5"
              >
                Job Summary
              </h2>

              <dl className="text-slate-600 text-sm md:text-base">
                <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-2 first:pt-0 last:pb-0">
                  <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                    <span className="w-5 shrink-0" aria-hidden></span>
                    <span>Position</span>
                  </dt>
                  <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                    {title}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-2 border-t border-slate-100">
                  <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                    <span className="w-5 shrink-0 text-lg" aria-hidden>📍</span>
                    <span>Location</span>
                  </dt>
                  <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                    {location}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-2 border-t border-slate-100">
                  <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                    <span className="w-5 shrink-0 text-lg" aria-hidden>⏱️</span>
                    <span>Job Type</span>
                  </dt>
                  <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                    {jobType}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-2 border-t border-slate-100">
                  <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                    <span className="w-5 shrink-0 text-lg" aria-hidden>🎯</span>
                    <span>Experience</span>
                  </dt>
                    <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                    {experience}
                  </dd>
                </div>

                {(job.salary_range || job.salary || (job.salary_min && job.salary_max)) && (
                  <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-2 border-t border-slate-100">
                    <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                      <span className="w-5 shrink-0 text-lg" aria-hidden>💰</span>
                      <span>Salary</span>
                    </dt>
                    <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                      {job.salary_range ?? (job.salary_min && job.salary_max
                        ? `${job.salary_min} - ${job.salary_max}`
                        : job.salary)}
                    </dd>
                  </div>
                )}

                {Array.isArray(job.tools) && job.tools.length > 0 && (
                  <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-2 border-t border-slate-100">
                    <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                      <span className="w-5 shrink-0 text-lg" aria-hidden>🏷️</span>
                      <span>Tools/Tags</span>
                    </dt>
                    <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                      {job.tools.join(' · ')}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-7 space-y-3">
                <Link
                  href={`/apply/${company}/${jobId}`}
                  aria-label="Apply to this job"
                  data-testid="apply-btn-summary"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-3 font-semibold shadow-sm ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Apply Now
                </Link>
                <button
                  type="button"
                  aria-label="Save this job"
                  className="w-full rounded-xl border border-slate-300 bg-white text-slate-700 px-5 py-3 font-semibold hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Save Job
                </button>
              </div>
            </aside>
          </aside>

          {/* Left Column - Content Cards */}
          <div className="order-2 lg:order-1 space-y-6">
            {/* About Company */}
            <section
              aria-labelledby="about-company"
              className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 md:p-8 shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 relative z-10 lg:z-0"
            >
              <h2
                id="about-company"
                className="text-lg md:text-xl font-semibold text-slate-900 mb-3"
              >
                About {job.company_name || company}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {job.company_name || company} is hiring talented professionals to join the team.
              </p>
            </section>

            {/* About the role */}
            <section
              aria-labelledby="about-role"
              className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 md:p-8 shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 relative z-10 lg:z-0"
            >
              <h2
                id="about-role"
                className="text-lg md:text-xl font-semibold text-slate-900 mb-3"
              >
                About the role
              </h2>
              <div className="prose max-w-none text-slate-700 text-sm whitespace-pre-line mb-4">
                {job.description || 'Role description coming soon.'}
              </div>
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                Key Responsibilities
              </h3>
              {job.requirements ? (
                <div className="prose max-w-none text-slate-700 text-sm whitespace-pre-line">
                  {job.requirements}
                </div>
              ) : (
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                  <li>Analyze business requirements and process workflows.</li>
                  <li>Design and develop solutions collaboratively with stakeholders.</li>
                  <li>Plan and execute testing across stages.</li>
                  <li>Provide production support and enhancements.</li>
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
