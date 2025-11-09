import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { createOpenAIProject } from '@/lib/openai-projects'
import { createServiceAccount } from '@/lib/openai-service-accounts'
import { encrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

/**
 * Setup OpenAI credentials for a company
 * Creates project + service account and stores in database
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const companyId = body.companyId as string | undefined

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎯 [SETUP OPENAI] Starting setup for company:', companyId)

    // Fetch company
    const rows = await DatabaseService.query(
      `SELECT id, name, openai_project_id, openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
      [companyId]
    ) as any[]

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const company = rows[0]
    console.log('✅ [SETUP OPENAI] Company found:', company.name)

    let projectId = company.openai_project_id
    let serviceAccountKey = company.openai_service_account_key

    // Step 1: Create OpenAI Project if not exists
    if (!projectId) {
      console.log('📋 [SETUP OPENAI] Creating OpenAI project...')
      const project = await createOpenAIProject(company.name)
      
      if (!project?.id) {
        return NextResponse.json({ 
          error: 'Failed to create OpenAI Project. Check OPENAI_ADMIN_KEY and permissions.' 
        }, { status: 502 })
      }

      projectId = project.id
      console.log('✅ [SETUP OPENAI] Project created:', projectId)
    } else {
      console.log('ℹ️  [SETUP OPENAI] Project already exists:', projectId)
    }

    // Step 2: Create Service Account if not exists
    if (!serviceAccountKey) {
      console.log('🔑 [SETUP OPENAI] Creating service account...')
      const serviceAccount = await createServiceAccount(projectId)
      
      if (!serviceAccount?.api_key) {
        return NextResponse.json({ 
          error: 'Failed to create Service Account. Check OPENAI_ADMIN_KEY and permissions.' 
        }, { status: 502 })
      }

      // Store the full service account object as JSON
      const serviceAccountData = {
        id: serviceAccount.id,
        name: serviceAccount.name || 'default',
        value: serviceAccount.api_key,
        object: 'organization.project.service_account.api_key',
        created_at: Math.floor(Date.now() / 1000)
      }

      serviceAccountKey = JSON.stringify(serviceAccountData)
      console.log('✅ [SETUP OPENAI] Service account created')
      console.log('🔑 API Key preview:', serviceAccount.api_key.substring(0, 20) + '...')
    } else {
      console.log('ℹ️  [SETUP OPENAI] Service account already exists')
    }

    // Step 3: Encrypt and save to database
    console.log('💾 [SETUP OPENAI] Saving credentials to database...')
    
    const encryptedProjectId = encrypt(projectId)
    const encryptedServiceKey = encrypt(serviceAccountKey)

    await DatabaseService.query(
      `UPDATE companies 
       SET openai_project_id = $2, 
           openai_service_account_key = $3,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [companyId, encryptedProjectId, encryptedServiceKey]
    )

    console.log('✅ [SETUP OPENAI] Credentials saved successfully!')
    console.log('='.repeat(60) + '\n')

    return NextResponse.json({
      success: true,
      message: 'OpenAI credentials setup complete',
      company: {
        id: company.id,
        name: company.name,
        hasProjectId: true,
        hasServiceKey: true,
        projectId: projectId
      }
    })

  } catch (error: any) {
    console.error('❌ [SETUP OPENAI] Error:', error)
    console.log('='.repeat(60) + '\n')
    return NextResponse.json({ 
      error: error.message || 'Setup failed' 
    }, { status: 500 })
  }
}

/**
 * Check if company has OpenAI credentials
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const company = await DatabaseService.getCompanyById(companyId)

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      hasProjectId: !!company.openai_project_id,
      hasServiceKey: !!company.openai_service_account_key,
      projectId: company.openai_project_id || null
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
