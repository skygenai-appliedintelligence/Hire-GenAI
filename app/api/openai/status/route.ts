import { NextRequest, NextResponse } from 'next/server'
import { checkOpenAIPermissions, isAIEnabled } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/openai/status
 * Check OpenAI API key status and permissions
 */
export async function GET(request: NextRequest) {
  try {
    const status = await checkOpenAIPermissions()

    return NextResponse.json({
      ok: true,
      aiEnabled: isAIEnabled(),
      ...status
    })
  } catch (error: any) {
    console.error('OpenAI status check error:', error)
    return NextResponse.json({
      ok: false,
      aiEnabled: isAIEnabled(),
      error: error?.message || 'Failed to check OpenAI status'
    }, { status: 500 })
  }
}
