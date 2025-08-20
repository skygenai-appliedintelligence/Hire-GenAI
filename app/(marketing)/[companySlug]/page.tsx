import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CompanyPublicPage({ params }: { params: { companySlug: string } }) {
  const company = await prisma.companies.findFirst({ where: { slug: params.companySlug } })
  if (!company) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-2xl font-semibold">Company not found</h1>
      </div>
    )
  }

  const jobs = await prisma.job_descriptions.findMany({
    where: { company_id: company.id, OR: [{ status: 'active' }, { status: 'open' }] },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{company.name}</h1>
        <p className="text-gray-600">Open roles</p>
      </div>

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <p className="text-gray-600">No open jobs at the moment.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.location}</p>
                </div>
                <Link href={`/apply/${job.id}`} className="text-emerald-700 hover:underline">
                  Apply
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


