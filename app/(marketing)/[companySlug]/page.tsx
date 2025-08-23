import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { DatabaseService } from '@/lib/database'

export const dynamic = 'force-dynamic'

export default async function CompanyPublicPage({ params }: { params: Promise<{ companySlug: string }> }) {
  try {
    const { companySlug } = await params
    
    // Use raw SQL query since we don't have generated Prisma models
    // Note: Using name instead of slug since companies table doesn't have slug column
    const companyQuery = `
      SELECT * FROM companies 
      WHERE LOWER(name) = LOWER($1) OR LOWER(REPLACE(name, ' ', '-')) = LOWER($1)
      LIMIT 1
    `
    const companies = await prisma.$queryRawUnsafe(companyQuery, companySlug) as any[]
    const company = companies[0]
    
    if (!company) {
      return (
        <div className="max-w-3xl mx-auto py-12">
          <h1 className="text-2xl font-semibold">Company not found</h1>
        </div>
      )
    }

    const jobs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, title, location
        FROM public.job_descriptions
       WHERE company_name = ${company.name}
       ORDER BY created_at DESC
       LIMIT 100
    `)

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
            jobs.map((job: any) => (
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
  } catch (error) {
    console.error('Error loading company page:', error)
    return (
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-2xl font-semibold">Error loading company</h1>
        <p className="text-gray-600 mt-2">Please try again later.</p>
      </div>
    )
  }
}


