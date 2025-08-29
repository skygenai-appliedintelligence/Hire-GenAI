import { NextRequest, NextResponse } from 'next/server'
import { ResumeService } from '@/lib/resume-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { resumeId: string } }
) {
  try {
    const resume = await ResumeService.getResumeById(params.resumeId)

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ resume })
  } catch (error: any) {
    console.error('Get resume error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get resume' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { resumeId: string } }
) {
  try {
    await ResumeService.deleteResume(params.resumeId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete resume error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete resume' },
      { status: 500 }
    )
  }
}
