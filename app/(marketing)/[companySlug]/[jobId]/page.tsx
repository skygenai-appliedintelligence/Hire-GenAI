import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CompanyJobApplyRedirect(props: { params: Promise<{ companySlug: string; jobId: string }> }) {
  const { companySlug, jobId } = await props.params
  const company = await prisma.companies.findFirst({ where: { slug: companySlug } })
  if (!company) {
    return redirect('/')
  }

  const job = await prisma.job_descriptions.findFirst({ where: { id: jobId, company_id: company.id } })
  if (!job || !['active', 'open'].includes(job.status.toLowerCase())) {
    return redirect(`/${companySlug}`)
  }

  return redirect(`/apply/${jobId}`)
}


