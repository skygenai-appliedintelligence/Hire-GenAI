import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const jobId = searchParams.get('jobId')
    
    if (!companyId) {
      return NextResponse.json({
        ok: false,
        error: 'companyId is required'
      }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ ok: true, hires: [] })
    }

    // Fetch all interviews for the company
    const interviews = await DatabaseService.getInterviews(companyId, jobId || undefined)
    
    // Filter only candidates who passed the interview
    const passedCandidates = interviews.filter(interview => interview.result === 'Pass')
    
    // Transform the data to match the expected format for successful hires
    const hires = passedCandidates.map(interview => ({
      id: interview.id,
      jobId: interview.jobId,
      candidateName: interview.candidateName,
      appliedJD: interview.appliedJD,
      email: interview.email,
      phone: interview.phone,
      status: 'Pass' // All passed candidates start with 'Pass' status
    }))

    console.log(`Found ${hires.length} successful hires (candidates who passed interviews)`)

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
