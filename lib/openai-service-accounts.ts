export type OpenAIServiceAccount = {
  id: string
  api_key: string
  name?: string
}

export async function createServiceAccount(projectId: string): Promise<OpenAIServiceAccount | null> {
  try {
    const adminKey = process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY
    const orgId = process.env.OPENAI_ORG_ID?.trim()

    if (!adminKey) {
      console.warn('[OpenAI Service Account] Skipping creation: OPENAI_ADMIN_KEY or OPENAI_API_KEY not set')
      return null
    }

    if (!orgId) {
      console.warn('[OpenAI Service Account] Skipping creation: OPENAI_ORG_ID not set')
      return null
    }

    if (!projectId) {
      console.warn('[OpenAI Service Account] Skipping creation: projectId is empty')
      return null
    }

    const endpoint = `https://api.openai.com/v1/organization/projects/${projectId}/service_accounts`

    console.log(`[OpenAI Service Account] Creating service account for project: ${projectId}`)
    console.log(`[OpenAI Service Account] API endpoint: ${endpoint}`)
    console.log(`[OpenAI Service Account] Using admin key prefix: ${adminKey.substring(0, 15)}…`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': orgId,
        'OpenAI-Beta': 'projects=v2',
      },
      body: JSON.stringify({
        name: 'default',
      }),
    })

    console.log(`[OpenAI Service Account] Response status: ${res.status}`)

    if (!res.ok) {
      const errText = await res.text()
      let errData: any
      try {
        errData = JSON.parse(errText)
      } catch {
        errData = errText
      }
      console.error('[OpenAI Service Account] ❌ Failed to create service account:', res.status, errData)
      return null
    }

    const data = await res.json()
    console.log('[OpenAI Service Account] ✅ Service account created successfully:', { id: data.id, name: data.name })
    
    // OpenAI returns api_key as an object with 'value' property
    const apiKey = data.api_key?.value || data.api_key
    
    if (!apiKey) {
      console.error('[OpenAI Service Account] ❌ No API key in response:', data)
      return null
    }
    
    return { id: data.id, api_key: apiKey, name: data.name }
  } catch (e) {
    console.error('[OpenAI Service Account] Error creating service account:', e)
    return null
  }
}
