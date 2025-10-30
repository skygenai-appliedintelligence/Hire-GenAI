export type OpenAIProject = {
  id: string
  name: string
  created_at?: number
}

export async function createOpenAIProject(name: string, description?: string): Promise<OpenAIProject | null> {
  try {
    // Use admin key for project creation (separate from regular API key)
    const adminKey = process.env.OPENAI_ADMIN_KEY
    const orgId = process.env.OPENAI_ORG_ID
    
    if (!adminKey) {
      console.warn('[OpenAI Projects] Skipping project creation: OPENAI_ADMIN_KEY not set')
      return null
    }
    
    if (!orgId) {
      console.warn('[OpenAI Projects] Skipping project creation: OPENAI_ORG_ID not set')
      return null
    }

    const projectName = (name || '').toString().trim()
    if (!projectName) {
      console.warn('[OpenAI Projects] Skipping project creation: empty name')
      return null
    }

    const cleanedOrgId = orgId.trim()
    const endpoint = `https://api.openai.com/v1/organizations/${cleanedOrgId}/projects`

    console.log(`[OpenAI Projects] Creating project: ${projectName}`)
    console.log(`[OpenAI Projects] API endpoint: ${endpoint}`)
    console.log(`[OpenAI Projects] Using admin key prefix: ${adminKey.substring(0, 12)}…`)
    console.log(`[OpenAI Projects] Organization ID: ${cleanedOrgId}`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': cleanedOrgId,
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
      console.warn('[OpenAI Projects] Failed to create project:', res.status, errData)
      return null
    }

    const data = await res.json()
    return { id: data.id, name: data.name, created_at: data.created_at }
  } catch (e) {
    console.warn('[OpenAI Projects] Error creating project:', e)
    return null
  }
}
