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
             COALESCE(j.location_text, 'Remote') AS location,
             j.education AS description,
             array_to_string(j.duties_day_to_day, E'\n• ') AS requirements,
             NULL AS salary_range,
             CASE 
               WHEN j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL 
               THEN CONCAT(j.salary_min, ' - ', j.salary_max, ' ', COALESCE(j.salary_period::text, ''))
               WHEN j.salary_min IS NOT NULL 
               THEN CONCAT('From ', j.salary_min, ' ', COALESCE(j.salary_period::text, ''))
               WHEN j.salary_max IS NOT NULL 
               THEN CONCAT('Up to ', j.salary_max, ' ', COALESCE(j.salary_period::text, ''))
               ELSE NULL
             END AS salary_range,
             CASE 
               WHEN array_length(j.perks_benefits, 1) > 0 
               THEN array_to_string(j.perks_benefits, E'\n• ')
               ELSE j.bonus_incentives
             END AS benefits,
             j.status,
             j.is_public,
             j.created_at,
             COALESCE(j.employment_type::text, 'full_time') AS employment_type,
             COALESCE(j.level::text, 'mid') AS experience_level,
             j.technical_skills,
             j.must_have_skills,
             j.nice_to_have_skills,
             j.soft_skills,
             j.languages,
             j.duties_strategic,
             j.stakeholders,
             j.decision_scope,
             j.time_off_policy,
             j.joining_timeline,
             j.travel_requirements,
             j.visa_requirements,
             COALESCE(c.name, j.company_name) AS company_name,
             c.description_md AS company_description,
             c.website_url AS company_website,
             c.industry AS company_industry,
             c.size_band AS company_size
        FROM public.jobs j
        LEFT JOIN public.companies c ON c.id = j.company_id
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
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
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

              {/* Header right-side Apply removed per request */}
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
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white px-4 py-2 font-semibold shadow-md ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 motion-safe:transform motion-safe:transition-all motion-safe:duration-300 hover:scale-105 hover:shadow-2xl emerald-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
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
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs md:text-sm text-slate-700 shadow-sm transition-colors hover:bg-emerald-50 hover:border-emerald-200"
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
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-3 font-semibold shadow-md ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 motion-safe:transform motion-safe:transition-all motion-safe:duration-300 hover:scale-105 hover:shadow-2xl emerald-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Apply Now
          </Link>
        </div>
      </div>

      {/* Content Grid */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:[grid-template-columns:1fr_380px] gap-6 lg:gap-8 isolate">
          {/* Right column first on mobile (summary), then content */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-6 lg:z-20 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pb-6 lg:pt-1">
            {/* Summary Card */}
            <aside
              aria-labelledby="summary-heading"
              className="relative z-20 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transform motion-safe:transition-all motion-safe:duration-300 hover:scale-[1.02] emerald-glow lg:sticky lg:top-6 w-full transform-gpu will-change-transform"
            >
              <h2
                id="summary-heading"
                className="text-lg md:text-xl font-semibold text-slate-900 mb-3"
              >
                Job Summary
              </h2>

              <dl className="text-slate-600 text-sm md:text-base">
                <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-1.5 first:pt-0 last:pb-0">
                  <dt className="text-slate-500 leading-6 whitespace-nowrap flex items-start gap-2">
                    <span className="w-5 shrink-0" aria-hidden></span>
                    <span>Position</span>
                  </dt>
                  <dd className="font-medium text-slate-800 leading-6 min-w-0 break-words whitespace-pre-line">
                    {title}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-1.5 border-t border-slate-100">
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
                  <div className="grid grid-cols-[160px_1fr] items-start gap-x-6 py-1.5 border-t border-slate-100">
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
                  className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-2.5 font-semibold shadow-lg ring-1 ring-emerald-600/20 hover:bg-emerald-600/90 motion-safe:transform motion-safe:transition-all motion-safe:duration-300 hover:scale-105 hover:shadow-2xl emerald-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Apply Now
                </Link>
                <button
                  type="button"
                  aria-label="Save this job"
                  className="w-full rounded-xl border border-slate-300 bg-white text-slate-700 px-5 py-3 font-semibold hover:bg-slate-50 ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transform motion-safe:transition-all motion-safe:duration-300 hover:scale-105 hover:shadow-lg emerald-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Save Job
                </button>
              </div>
            </aside>
          </aside>

          {/* Left Column - Content Cards */}
          <div className="order-2 lg:order-1 space-y-6">
            {/* About the role */}
            <section
              aria-labelledby="about-role"
              className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 md:p-8 shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transform motion-safe:transition-all motion-safe:duration-300 hover:scale-105 emerald-glow relative z-10 lg:z-0"
            >
              <h2
                id="about-role"
                className="text-lg md:text-xl font-semibold text-slate-900 mb-3"
              >
                About the role
              </h2>
              
              {/* Job Description */}
              {job.description && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Education & Background
                  </h3>
                  <div className="prose max-w-none text-slate-700 text-sm whitespace-pre-line">
                    {job.description}
                  </div>
                </div>
              )}
              
              {/* Day-to-Day Responsibilities */}
              <div className="mb-6">
                <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                  Day-to-Day Responsibilities
                </h3>
                {job.requirements ? (
                  <div className="prose max-w-none text-slate-700 text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                      {job.requirements.split('\n').filter(Boolean).map((item: string, idx: number) => (
                        <li key={idx}>{item.replace(/^•\s*/, '')}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="list-disc pl-5 space-y-2 text-slate-600">
                    <li>Analyze business requirements and process workflows.</li>
                    <li>Design and develop solutions collaboratively with stakeholders.</li>
                    <li>Plan and execute testing across stages.</li>
                    <li>Provide production support and enhancements.</li>
                  </ul>
                )}
              </div>

              {/* Strategic Duties */}
              {job.duties_strategic && Array.isArray(job.duties_strategic) && job.duties_strategic.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Strategic Responsibilities
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                    {job.duties_strategic.map((duty: string, idx: number) => (
                      <li key={idx}>{duty}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Skills */}
              {((job.technical_skills && job.technical_skills.length > 0) || 
                (job.must_have_skills && job.must_have_skills.length > 0)) && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Required Skills
                  </h3>
                  <div className="space-y-3">
                    {job.technical_skills && job.technical_skills.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-800 mb-1">Technical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.technical_skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {job.must_have_skills && job.must_have_skills.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-800 mb-1">Must-Have Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.must_have_skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nice-to-Have Skills */}
              {job.nice_to_have_skills && job.nice_to_have_skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Nice-to-Have Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.nice_to_have_skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Soft Skills & Languages */}
              {((job.soft_skills && job.soft_skills.length > 0) || 
                (job.languages && job.languages.length > 0)) && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Additional Requirements
                  </h3>
                  <div className="space-y-3">
                    {job.soft_skills && job.soft_skills.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-800 mb-1">Soft Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.soft_skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {job.languages && job.languages.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-800 mb-1">Languages</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.languages.map((lang: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Benefits & Perks
                  </h3>
                  <div className="prose max-w-none text-slate-700 text-sm">
                    {job.benefits.includes('\n') ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {job.benefits.split('\n').filter(Boolean).map((benefit: string, idx: number) => (
                          <li key={idx}>{benefit.replace(/^•\s*/, '')}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="whitespace-pre-line">{job.benefits}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Stakeholders & Collaboration */}
              {job.stakeholders && Array.isArray(job.stakeholders) && job.stakeholders.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Collaboration & Stakeholders
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                    {job.stakeholders.map((stakeholder: string, idx: number) => (
                      <li key={idx}>{stakeholder}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Additional Job Details */}
              {(job.decision_scope || job.time_off_policy || job.joining_timeline || job.travel_requirements || job.visa_requirements) && (
                <div className="mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                    Additional Details
                  </h3>
                  <div className="space-y-2 text-slate-700 text-sm">
                    {job.decision_scope && (
                      <div>
                        <span className="font-medium">Decision Scope:</span> {job.decision_scope}
                      </div>
                    )}
                    {job.time_off_policy && (
                      <div>
                        <span className="font-medium">Time Off Policy:</span> {job.time_off_policy}
                      </div>
                    )}
                    {job.joining_timeline && (
                      <div>
                        <span className="font-medium">Joining Timeline:</span> {job.joining_timeline}
                      </div>
                    )}
                    {job.travel_requirements && (
                      <div>
                        <span className="font-medium">Travel Requirements:</span> {job.travel_requirements}
                      </div>
                    )}
                    {job.visa_requirements && (
                      <div>
                        <span className="font-medium">Visa Requirements:</span> {job.visa_requirements}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Job Posted Date */}
              {job.created_at && (
                <div className="text-xs text-slate-500 pt-4 border-t border-slate-100">
                  Posted on {new Date(job.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
