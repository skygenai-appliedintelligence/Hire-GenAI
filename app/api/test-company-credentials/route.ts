import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 })
    }

    const company = await DatabaseService.getCompanyById(companyId)

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      hasServiceKey: !!company.openai_service_account_key,
      hasProjectId: !!company.openai_project_id,
      serviceKeyPreview: company.openai_service_account_key 
        ? (typeof company.openai_service_account_key === 'string' 
            ? company.openai_service_account_key.substring(0, 50) + '...'
            : 'JSON object')
        : null,
      projectId: company.openai_project_id || null
    })
  } catch (error: any) {
    console.error('Error checking credentials:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
