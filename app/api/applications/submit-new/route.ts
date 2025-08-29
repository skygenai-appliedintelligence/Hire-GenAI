import { NextRequest, NextResponse } from 'next/server'
import { CandidateService } from '@/lib/candidate-service'
import { ResumeService } from '@/lib/resume-service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract candidate data
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const location = formData.get('location') as string
    const jobId = formData.get('jobId') as string
    
    // Extract application data
    const coverLetter = formData.get('coverLetter') as string
    const expectedSalary = formData.get('expectedSalary') as string
    const currency = formData.get('currency') as string
    const availableDate = formData.get('availableDate') as string
    const linkedinUrl = formData.get('linkedinUrl') as string
    const portfolioUrl = formData.get('portfolioUrl') as string
    const willingRelocate = formData.get('willingRelocate') === 'true'
    
    // Extract resume file
    const resumeFile = formData.get('resume') as File

    // Validate required fields
    if (!firstName || !lastName || !email || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, jobId' },
        { status: 400 }
      )
    }

    if (!resumeFile) {
      return NextResponse.json(
        { error: 'Resume file is required' },
        { status: 400 }
      )
    }

    // Check if candidate exists or create new one
    let candidate = await CandidateService.getCandidateByEmail(email)
    
    if (!candidate) {
      candidate = await CandidateService.createCandidate({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        phone: phone || undefined,
        location: location || undefined
      })
    }

    // Upload resume
    const resume = await ResumeService.uploadResume(resumeFile, candidate.id)

    // Create application
    const application = await CandidateService.createApplication({
      candidateId: candidate.id,
      jobId,
      resumeId: resume.id,
      coverLetter: coverLetter || undefined,
      expectedSalary: expectedSalary || undefined,
      currency: currency || 'USD',
      availableDate: availableDate ? new Date(availableDate) : undefined,
      linkedinUrl: linkedinUrl || undefined,
      portfolioUrl: portfolioUrl || undefined,
      willingRelocate
    })

    return NextResponse.json({
      success: true,
      candidate,
      resume,
      application
    })
  } catch (error: any) {
    console.error('Application submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit application' },
      { status: 500 }
    )
  }
}
