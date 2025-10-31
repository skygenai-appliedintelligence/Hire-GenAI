import { NextResponse } from 'next/server'
import { createOpenAIProject } from '@/lib/openai-projects'
import { createServiceAccount } from '@/lib/openai-service-accounts'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyName = searchParams.get('name') || 'Test Company'
  
  const apiKey = process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY
  const orgId = process.env.OPENAI_ORG_ID

  console.log('🧪 [TEST] Starting OpenAI project creation test...')
  console.log('🧪 [TEST] Company name:', companyName)
  console.log('🧪 [TEST] Using key prefix:', apiKey?.substring(0, 15) + '…')
  console.log('🧪 [TEST] Organization ID:', orgId || '(not set)')

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      message: 'OPENAI_ADMIN_KEY or OPENAI_API_KEY must be set in .env.local'
    }, { status: 500 })
  }

  if (!orgId) {
    return NextResponse.json({
      success: false,
      message: 'OPENAI_ORG_ID must be set in .env.local'
    }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/organization/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': orgId,
        'OpenAI-Beta': 'projects=v2',
      },
      body: JSON.stringify({
        name: companyName,
        description: `Test project for ${companyName}`,
      }),
    })

    const text = await response.text()
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }

    // If project creation succeeded, create service account
    let serviceAccountResponse = null
    if (response.ok && parsed?.id) {
      console.log('🧪 [TEST] Creating service account for project:', parsed.id)
      const serviceAccount = await createServiceAccount(parsed.id)
      serviceAccountResponse = serviceAccount
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      project: parsed,
      serviceAccount: serviceAccountResponse,
      headersUsed: {
        hasOrgHeader: !!orgId,
      },
      env: {
        orgIdRaw: orgId || null,
        envKeys: Object.keys(process.env).filter((key) => key.startsWith('OPENAI_')),
      },
    }, { status: response.ok ? 200 : response.status })
  } catch (error: any) {
    console.error('🧪 [TEST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack,
    }, { status: 500 })
  }
}
