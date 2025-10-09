import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    // For now, let's create mock data for successful hires
    const mockSuccessfulHires = [
      {
        id: '1',
        jobId: 'job-1',
        candidateName: 'Rajesh Kumar',
        appliedJD: 'Senior Software Engineer',
        email: 'rajesh.kumar@gmail.com',
        phone: '+91-9876543210',
        hireDate: '2024-01-15',
        salary: '₹12,00,000',
        department: 'Engineering',
        status: 'Onboarded'
      },
      {
        id: '2',
        jobId: 'job-1',
        candidateName: 'Priya Sharma',
        appliedJD: 'Frontend Developer',
        email: 'priya.sharma@gmail.com',
        phone: '+91-9876543211',
        hireDate: '2024-01-20',
        salary: '₹8,50,000',
        department: 'Engineering',
        status: 'Hired'
      },
      {
        id: '3',
        jobId: 'job-2',
        candidateName: 'Amit Patel',
        appliedJD: 'Data Scientist',
        email: 'amit.patel@gmail.com',
        phone: '+91-9876543212',
        hireDate: '2024-01-25',
        salary: '₹15,00,000',
        department: 'Data Science',
        status: 'Probation'
      },
      {
        id: '4',
        jobId: 'job-1',
        candidateName: 'Sneha Reddy',
        appliedJD: 'UI/UX Designer',
        email: 'sneha.reddy@gmail.com',
        phone: '+91-9876543213',
        hireDate: '2024-02-01',
        salary: '₹7,00,000',
        department: 'Design',
        status: 'Onboarded'
      },
      {
        id: '5',
        jobId: 'job-3',
        candidateName: 'Vikram Singh',
        appliedJD: 'DevOps Engineer',
        email: 'vikram.singh@gmail.com',
        phone: '+91-9876543214',
        hireDate: '2024-02-05',
        salary: '₹11,00,000',
        department: 'Infrastructure',
        status: 'Hired'
      }
    ]

    // Filter by jobId if provided
    let hires = mockSuccessfulHires
    if (jobId && jobId !== 'all') {
      hires = mockSuccessfulHires.filter(hire => hire.jobId === jobId)
    }

    console.log(`Found ${hires.length} successful hires`)

    return NextResponse.json({
      ok: true,
      hires: hires
    })

  } catch (error) {
    console.error('Error fetching successful hires:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch successful hires',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
