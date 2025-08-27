import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export default async function ApplySuccessPage({
  searchParams,
}: {
  searchParams: { jobId?: string };
}) {
  const jobId = searchParams?.jobId || "";

  // Try to load job from DB
  let job: any | null = null;
  if (jobId) {
    const rel = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'job_descriptions'
      ) AS exists
    `);
    const hasJobDescriptions = !!rel?.[0]?.exists;

    if (hasJobDescriptions) {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.job_descriptions WHERE id = CAST(${jobId} AS uuid) LIMIT 1
      `);
      job = rows?.[0] || null;
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
               c.name           AS company_name
          FROM public.jobs j
          JOIN public.companies c ON c.id = j.company_id
         WHERE j.id = CAST(${jobId} AS uuid)
         LIMIT 1
      `);
      job = rows?.[0] || null;
    }
  }

  const title = (job?.title as string) || "Your job";
  const canonicalSlug = String(job?.company_name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const backHref = job && canonicalSlug && jobId ? `/jobs/${canonicalSlug}/${encodeURIComponent(jobId)}` : "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40 px-4 sm:px-6 lg:px-8 py-12">
      <div
        role="status"
        aria-live="polite"
        className="mx-auto w-full max-w-xl rounded-2xl border bg-white p-8 shadow-sm ring-1 ring-emerald-100 motion-safe:transition-all motion-safe:duration-300 hover:shadow-md hover:-translate-y-0.5"
      >
        {/* Success badge */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
          {/* Check icon (SVG, Tailwind friendly) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 animate-pulse"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.29a.75.75 0 1 0-1.22-.92l-3.482 4.62-1.62-1.62a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.135-.09l4-5.25Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 text-center">Application submitted!</h1>
        <p className="mt-3 text-center text-slate-600">
          Thanks for applying to <span className="font-medium text-slate-900">{title}</span>.
          {jobId && (
            <>
              <br /> Job ID: <span className="font-mono text-slate-800">{jobId}</span>
            </>
          )}
        </p>

        <p className="mt-4 text-center text-slate-500 text-sm">
          A confirmation email has been sent.
        </p>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Link
            href="/dashboard"
            aria-label="View my applications"
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-3 font-semibold shadow-sm motion-safe:transition hover:bg-emerald-600/90 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            View My Applications
          </Link>
          <Link
            href={backHref}
            aria-label="Back to job"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 motion-safe:transition hover:bg-emerald-50 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Back to Job
          </Link>
        </div>
      </div>
    </div>
  );
}
