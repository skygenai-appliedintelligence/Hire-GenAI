import { NextRequest, NextResponse } from 'next/server'
import { createOpenAIProject } from '@/lib/openai-projects'
import { DatabaseService } from '@/lib/database'

/**
 * Test endpoint to verify OpenAI project creation and database storage
 * GET /api/test-openai-project?companyName=TestCorp&companyId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyName = searchParams.get('companyName') || 'Test Company'
    const companyId = searchParams.get('companyId')

    // Test 1: Create OpenAI project
    console.log(`\n🧪 [Test] Creating OpenAI project for: ${companyName}`)
    const project = await createOpenAIProject(
      companyName,
      `Test project for ${companyName} - Created via test endpoint`
    )

    if (!project) {
      return NextResponse.json({
        success: false,
        message: 'OpenAI project creation failed (check API key)',
        project: null,
        companyId: companyId || null,
        updated: false
      }, { status: 200 })
    }

    console.log(`✅ [Test] OpenAI project created: ${project.id}`)

    // Test 2: Update company if companyId provided
    let updated = false
    let companyData = null

    if (companyId) {
      console.log(`\n🧪 [Test] Updating company ${companyId} with project ID`)
      try {
        companyData = await DatabaseService.updateCompanyOpenAIProject(companyId, project.id)
        updated = true
        console.log(`✅ [Test] Company updated successfully`)
      } catch (error: any) {
        console.error(`❌ [Test] Failed to update company:`, error.message)
      }
    }

    // Test 3: Retrieve project ID from database
    let retrievedProjectId = null
    if (companyId && updated) {
      console.log(`\n🧪 [Test] Retrieving project ID from database`)
      try {
        retrievedProjectId = await DatabaseService.getCompanyOpenAIProject(companyId)
        console.log(`✅ [Test] Retrieved project ID: ${retrievedProjectId}`)
      } catch (error: any) {
        console.error(`❌ [Test] Failed to retrieve project ID:`, error.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OpenAI project created successfully',
      project: {
        id: project.id,
        name: project.name,
        created_at: project.created_at
      },
      companyId: companyId || null,
      updated,
      retrievedProjectId,
      verification: retrievedProjectId === project.id ? 'MATCH ✅' : 'MISMATCH ❌'
    })

  } catch (error: any) {
    console.error('❌ [Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
