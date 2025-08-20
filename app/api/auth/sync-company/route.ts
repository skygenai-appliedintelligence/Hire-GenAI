import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { company } = await req.json()
    
    if (!company || !company.id || !company.name) {
      return NextResponse.json({ error: 'Invalid company data' }, { status: 400 })
    }

    // Check if company already exists
    const existingCompany = await prisma.companies.findFirst({
      where: {
        OR: [
          { id: company.id },
          { name: company.name },
          { slug: company.slug }
        ]
      }
    })

    if (existingCompany) {
      // Update existing company with any new data
      const updatedCompany = await prisma.companies.update({
        where: { id: existingCompany.id },
        data: {
          name: company.name,
          slug: company.slug || existingCompany.slug,
          industry: company.industry || existingCompany.industry,
          size: company.size || existingCompany.size,
          website: company.website || existingCompany.website,
          email: company.email || existingCompany.email,
        }
      })
      return NextResponse.json({ ok: true, company: updatedCompany })
    }

    // Create new company
    const newCompany = await prisma.companies.create({
      data: {
        id: company.id,
        name: company.name,
        slug: company.slug || `company-${Date.now()}`,
        industry: company.industry || "Technology",
        size: company.size || "1-10",
        website: company.website || "",
        email: company.email || `${company.slug || 'company'}@example.com`,
      }
    })

    return NextResponse.json({ ok: true, company: newCompany })
  } catch (error: any) {
    console.error('Error syncing company:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to sync company' 
    }, { status: 500 })
  }
}
