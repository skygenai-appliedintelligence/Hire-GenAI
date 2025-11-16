import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { createOpenAIProject } from '@/lib/openai-projects'
import { createServiceAccount } from '@/lib/openai-service-accounts'
import { encrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

/**
 * Fix company credentials by creating fresh ones with current encryption key
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const companyId = body.companyId as string | undefined

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    console.log('\n' + '='.repeat(60))
    console.log('🔧 [FIX CREDENTIALS] Starting fix for company:', companyId)

    // Fetch company
    const rows = await DatabaseService.query(
      `SELECT id, name FROM companies WHERE id = $1::uuid LIMIT 1`,
      [companyId]
    ) as any[]

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const company = rows[0]
    console.log('✅ [FIX CREDENTIALS] Company found:', company.name)

    // Step 1: Create new OpenAI Project
    console.log('📋 [FIX CREDENTIALS] Creating new OpenAI project...')
    const project = await createOpenAIProject(company.name)
    
    if (!project?.id) {
      return NextResponse.json({ 
        error: 'Failed to create OpenAI Project. Check OPENAI_ADMIN_KEY in .env.local' 
      }, { status: 502 })
    }

    const projectId = project.id
    console.log('✅ [FIX CREDENTIALS] Project created:', projectId)

    // Step 2: Create Service Account
    console.log('🔑 [FIX CREDENTIALS] Creating service account...')
    const serviceAccount = await createServiceAccount(projectId)
    
    if (!serviceAccount?.api_key) {
      return NextResponse.json({ 
        error: 'Failed to create Service Account. Check OPENAI_ADMIN_KEY in .env.local' 
      }, { status: 502 })
    }

    console.log('✅ [FIX CREDENTIALS] Service account created')
    console.log('🔑 API Key preview:', serviceAccount.api_key.substring(0, 20) + '...')

    // Step 3: Store as JSON (with current encryption key)
    const serviceAccountData = {
      id: serviceAccount.id,
      name: serviceAccount.name || 'default',
      value: serviceAccount.api_key,
      object: 'organization.project.service_account.api_key',
      created_at: Math.floor(Date.now() / 1000)
    }

    const serviceAccountJson = JSON.stringify(serviceAccountData)
    
    console.log('🔐 [FIX CREDENTIALS] Encrypting with current ENCRYPTION_KEY...')
    const encryptedProjectId = encrypt(projectId)
    const encryptedServiceKey = encrypt(serviceAccountJson)

    console.log('💾 [FIX CREDENTIALS] Saving to database...')
    await DatabaseService.query(
      `UPDATE companies 
       SET openai_project_id = $2, 
           openai_service_account_key = $3
       WHERE id = $1::uuid`,
      [companyId, encryptedProjectId, encryptedServiceKey]
    )

    console.log('✅ [FIX CREDENTIALS] Credentials saved successfully!')
    console.log('='.repeat(60) + '\n')

    return NextResponse.json({
      success: true,
      message: 'Credentials fixed! Old credentials replaced with new ones encrypted with current key.',
      company: {
        id: company.id,
        name: company.name,
        projectId: projectId,
        apiKeyPreview: serviceAccount.api_key.substring(0, 20) + '...'
      }
    })

  } catch (error: any) {
    console.error('❌ [FIX CREDENTIALS] Error:', error)
    console.log('='.repeat(60) + '\n')
    return NextResponse.json({ 
      error: error.message || 'Fix failed' 
    }, { status: 500 })
  }
}
