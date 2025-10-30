import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { createOpenAIProject } from '@/lib/openai-projects'

export const dynamic = 'force-dynamic'

/**
 * Bulk backfill OpenAI projects for all companies without projects
 * POST /api/admin/openai/projects/backfill-all
 * 
 * Body (optional):
 * {
 *   "limit": 10,        // Max companies to process (default: 100)
 *   "dryRun": true      // Preview without creating projects
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const limit = body.limit || 100
    const dryRun = body.dryRun === true

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Database not configured' 
      }, { status: 500 })
    }

    // Ensure column exists
    try {
      await DatabaseService.ensureOpenAIProjectIdColumn()
    } catch (error: any) {
      console.warn('[Backfill] Column check warning:', error.message)
    }

    // Get companies without projects
    console.log(`\n🔍 [Backfill] Fetching companies without OpenAI projects (limit: ${limit})...`)
    const companies = await DatabaseService.getCompaniesWithoutProjects(limit)

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'All companies already have OpenAI projects',
        processed: 0,
        total: 0
      })
    }

    console.log(`📋 [Backfill] Found ${companies.length} companies without projects`)

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        message: 'Dry run - no projects created',
        dryRun: true,
        companies: companies.map((c: any) => ({
          id: c.id,
          name: c.name,
          industry: c.industry
        })),
        total: companies.length
      })
    }

    // Process each company
    const results = []
    let successCount = 0
    let failCount = 0

    for (const company of companies) {
      try {
        console.log(`\n🔨 [Backfill] Processing: ${company.name} (${company.id})`)

        // Create OpenAI project
        const projectDescription = `Project for ${company.name}${company.industry ? ` - ${company.industry}` : ''}`
        const project = await createOpenAIProject(company.name, projectDescription)

        if (!project?.id) {
          console.error(`❌ [Backfill] Failed to create project for ${company.name}`)
          failCount++
          results.push({
            companyId: company.id,
            companyName: company.name,
            success: false,
            error: 'Failed to create OpenAI project'
          })
          continue
        }

        console.log(`✅ [Backfill] Created project: ${project.id} for ${company.name}`)

        // Update database
        await DatabaseService.updateCompanyOpenAIProject(company.id, project.id)
        console.log(`💾 [Backfill] Updated database for ${company.name}`)

        successCount++
        results.push({
          companyId: company.id,
          companyName: company.name,
          success: true,
          projectId: project.id
        })

        // Rate limiting: wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`❌ [Backfill] Error processing ${company.name}:`, error.message)
        failCount++
        results.push({
          companyId: company.id,
          companyName: company.name,
          success: false,
          error: error.message
        })
      }
    }

    console.log(`\n📊 [Backfill] Complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      ok: true,
      message: `Backfill complete: ${successCount} projects created, ${failCount} failed`,
      summary: {
        total: companies.length,
        success: successCount,
        failed: failCount
      },
      results
    })

  } catch (error: any) {
    console.error('❌ [Backfill] Fatal error:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Backfill failed' 
    }, { status: 500 })
  }
}

/**
 * Get list of companies without OpenAI projects
 * GET /api/admin/openai/projects/backfill-all?limit=10
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Database not configured' 
      }, { status: 500 })
    }

    const companies = await DatabaseService.getCompaniesWithoutProjects(limit)

    return NextResponse.json({
      ok: true,
      total: companies.length,
      companies: companies.map((c: any) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        description: c.description_md
      }))
    })

  } catch (error: any) {
    console.error('❌ [Backfill] Error fetching companies:', error)
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Failed to fetch companies' 
    }, { status: 500 })
  }
}
