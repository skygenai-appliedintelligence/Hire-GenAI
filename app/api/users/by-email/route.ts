import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    const user = await prisma.users.findUnique({
      where: { email },
      include: { company: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      company: user.company ? {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        industry: user.company.industry,
        size: user.company.size,
        website: user.company.website
      } : null
    })
  } catch (error: any) {
    console.error('Error getting user by email:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to get user' 
    }, { status: 500 })
  }
}
