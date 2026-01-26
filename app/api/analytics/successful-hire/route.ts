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
      return NextResponse.json({ 
        ok: true, 
        hires: [],
        bucketCounts: {
          total: 0,
          sentToManager: 0,
          offerExtended: 0,
          offerAccepted: 0,
          rejectedWithdraw: 0,
          hired: 0
        }
      })
    }

    // Fetch bucket counts for hiring pipeline
    const bucketCounts = await DatabaseService.getHiringBucketCounts(companyId, jobId || undefined)

    // Fetch all interviews for the company
    const interviews = await DatabaseService.getInterviews(companyId, jobId || undefined)
    
    // Filter only candidates who passed the interview
    const passedCandidates = interviews.filter(interview => interview.result === 'Pass')
    
    // Transform the data to match the expected format for successful hires
    const hires = passedCandidates.map(interview => ({
      id: interview.id,
      applicationId: interview.applicationId,
      jobId: interview.jobId,
      candidateName: interview.candidateName,
      appliedJD: interview.appliedJD,
      email: interview.email,
      phone: interview.phone,
      hiringStatus: 'sent_to_manager' // Default status for new recommendations
    }))

    console.log(`Found ${hires.length} recommended for hire (candidates who passed interviews)`)

    return NextResponse.json({
      ok: true,
      hires: hires,
      bucketCounts: bucketCounts
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

// POST endpoint to update hiring status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, hiringStatus } = body

    if (!applicationId || !hiringStatus) {
      return NextResponse.json(
        { ok: false, error: 'Missing applicationId or hiringStatus' },
        { status: 400 }
      )
    }

    const validStatuses = ['sent_to_manager', 'offer_extended', 'offer_accepted', 'rejected_withdraw', 'hired']
    if (!validStatuses.includes(hiringStatus)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`Updating application ${applicationId} hiring status to: ${hiringStatus}`)
    
    // Update the database
    const result = await DatabaseService.updateHiringStatus(applicationId, hiringStatus)
    
    if (!result) {
      return NextResponse.json(
        { ok: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: `Hiring status updated to ${hiringStatus}`,
      applicationId,
      hiringStatus
    })

  } catch (error) {
    console.error('Error updating hiring status:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to update hiring status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
