import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    // Return dummy data for successful hires (removed salary column, status shows Pass/Hired)
    const dummyHires = [
      {
        id: 'hire-001',
        jobId: 'job-001',
        candidateName: 'Sarah Johnson',
        appliedJD: 'Senior Frontend Developer',
        email: 'sarah.johnson@email.com',
        phone: '+1 (555) 123-4567',
        status: 'Pass'
      },
      {
        id: 'hire-002',
        jobId: 'job-002',
        candidateName: 'Michael Chen',
        appliedJD: 'Full Stack Engineer',
        email: 'michael.chen@email.com',
        phone: '+1 (555) 234-5678',
        status: 'Hired'
      },
      {
        id: 'hire-003',
        jobId: 'job-001',
        candidateName: 'Emily Rodriguez',
        appliedJD: 'Senior Frontend Developer',
        email: 'emily.rodriguez@email.com',
        phone: '+1 (555) 345-6789',
        status: 'Pass'
      },
      {
        id: 'hire-004',
        jobId: 'job-003',
        candidateName: 'David Kim',
        appliedJD: 'DevOps Engineer',
        email: 'david.kim@email.com',
        phone: '+1 (555) 456-7890',
        status: 'Hired'
      },
      {
        id: 'hire-005',
        jobId: 'job-002',
        candidateName: 'Jessica Williams',
        appliedJD: 'Full Stack Engineer',
        email: 'jessica.williams@email.com',
        phone: '+1 (555) 567-8901',
        status: 'Pass'
      },
      {
        id: 'hire-006',
        jobId: 'job-004',
        candidateName: 'Alex Thompson',
        appliedJD: 'Product Manager',
        email: 'alex.thompson@email.com',
        phone: '+1 (555) 678-9012',
        status: 'Hired'
      },
      {
        id: 'hire-007',
        jobId: 'job-001',
        candidateName: 'Maria Garcia',
        appliedJD: 'Senior Frontend Developer',
        email: 'maria.garcia@email.com',
        phone: '+1 (555) 789-0123',
        status: 'Pass'
      },
      {
        id: 'hire-008',
        jobId: 'job-005',
        candidateName: 'James Wilson',
        appliedJD: 'UX Designer',
        email: 'james.wilson@email.com',
        phone: '+1 (555) 890-1234',
        status: 'Hired'
      }
    ]

    // Filter by job if provided
    let filteredHires = dummyHires
    if (jobId && jobId !== 'all') {
      filteredHires = dummyHires.filter(hire => hire.jobId === jobId)
    }

    console.log(`Found ${filteredHires.length} successful hires (dummy data)`)
    console.log('Successful hires:', filteredHires.map(h => ({
      name: h.candidateName,
      position: h.appliedJD,
      status: h.status
    })))

    return NextResponse.json({
      ok: true,
      hires: filteredHires
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

// POST endpoint to update hire status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hireId, status } = body

    if (!hireId || !status) {
      return NextResponse.json(
        { ok: false, error: 'Missing hireId or status' },
        { status: 400 }
      )
    }

    if (!['Pass', 'Hired'].includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid status. Must be Pass or Hired' },
        { status: 400 }
      )
    }

    console.log(`Updating hire ${hireId} status to: ${status}`)
    
    // In a real app, you would update the database here
    // For now, just return success
    return NextResponse.json({
      ok: true,
      message: `Status updated to ${status}`,
      hireId,
      status
    })

  } catch (error) {
    console.error('Error updating hire status:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to update hire status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
