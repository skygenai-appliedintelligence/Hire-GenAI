import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    // For now, let's create a simple query that returns mock data to test the endpoint
    // We'll return some sample interview data to see if the page loads
    const mockInterviews = [
      {
        id: '1',
        jobId: 'job-1',
        candidateName: 'John Doe',
        appliedJD: 'Software Engineer',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'Completed',
        interviewScore: 8,
        feedback: 'Good technical skills'
      },
      {
        id: '2',
        jobId: 'job-1',
        candidateName: 'Jane Smith',
        appliedJD: 'Frontend Developer',
        email: 'jane@example.com',
        phone: '+1234567891',
        status: 'Scheduled',
        interviewScore: null,
        feedback: null
      },
      {
        id: '3',
        jobId: 'job-2',
        candidateName: 'Mike Johnson',
        appliedJD: 'Backend Developer',
        email: 'mike@example.com',
        phone: '+1234567892',
        status: 'Pending',
        interviewScore: null,
        feedback: null
      }
    ]

    // Filter by jobId if provided
    let interviews = mockInterviews
    if (jobId && jobId !== 'all') {
      interviews = mockInterviews.filter(interview => interview.jobId === jobId)
    }

    console.log('Returning mock interviews:', interviews)

    console.log(`Found ${interviews.length} interviews`)

    return NextResponse.json({
      ok: true,
      interviews: interviews
    })

  } catch (error) {
    console.error('Error fetching interviews:', error)
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Failed to fetch interviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
