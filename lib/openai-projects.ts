export type OpenAIProject = {
  id: string
  name: string
  created_at?: number
}

export async function createOpenAIProject(name: string, description?: string): Promise<OpenAIProject | null> {
  try {
    // Use OPENAI_ADMIN_KEY for project creation (falls back to OPENAI_API_KEY)
    const apiKey = process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY
    const orgId = process.env.OPENAI_ORG_ID?.trim()
    
    if (!apiKey) {
      console.warn('[OpenAI Projects] Skipping project creation: OPENAI_ADMIN_KEY or OPENAI_API_KEY not set')
      return null
    }

    const projectName = (name || '').toString().trim()
    if (!projectName) {
      console.warn('[OpenAI Projects] Skipping project creation: empty name')
      return null
    }

    if (!orgId) {
      console.warn('[OpenAI Projects] Skipping project creation: OPENAI_ORG_ID not set')
      return null
    }

    const endpoint = `https://api.openai.com/v1/organization/projects`

    console.log(`[OpenAI Projects] Creating project: ${projectName}`)
    console.log(`[OpenAI Projects] API endpoint: ${endpoint}`)
    console.log(`[OpenAI Projects] Using admin key prefix: ${apiKey.substring(0, 15)}…`)
    console.log(`[OpenAI Projects] Organization ID: ${orgId}`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'projects=v2',
        ...(orgId ? { 'OpenAI-Organization': orgId } : {}),
      },
      body: JSON.stringify({
        name: projectName,
        description: description || undefined,
      }),
    })

    console.log(`[OpenAI Projects] Response status: ${res.status}`)

    if (!res.ok) {
      const errText = await res.text()
      let errData: any
      try {
        errData = JSON.parse(errText)
      } catch {
        errData = errText
      }
      console.error('[OpenAI Projects] ❌ Failed to create project:', res.status, errData)
      return null
    }

    const data = await res.json()
    console.log('[OpenAI Projects] ✅ Project created successfully:', data)
    return { id: data.id, name: data.name, created_at: data.created_at }
  } catch (e) {
    console.warn('[OpenAI Projects] Error creating project:', e)
    return null
  }
}
