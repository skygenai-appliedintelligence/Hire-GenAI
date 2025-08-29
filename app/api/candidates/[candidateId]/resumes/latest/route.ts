import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { candidateId: string } }
) {
  try {
    const { candidateId } = params
    const resume = await prisma.resume.findFirst({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' }
    })

    if (!resume) {
      return NextResponse.json({ error: 'No resume found' }, { status: 404 })
    }

    return NextResponse.json({
      resume: {
        id: resume.id,
        url: resume.storage_url,
        filename: resume.original_name,
        mimeType: resume.mime_type,
        createdAt: resume.created_at
      }
    })
  } catch (error: any) {
    console.error('Get latest resume error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
