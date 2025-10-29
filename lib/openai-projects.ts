export type OpenAIProject = {
  id: string
  name: string
  created_at?: number
}

export async function createOpenAIProject(name: string, description?: string): Promise<OpenAIProject | null> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const orgId = process.env.OPENAI_ORG_ID
    if (!apiKey) {
      console.warn('[OpenAI Projects] Skipping project creation: OPENAI_API_KEY not set')
      return null
    }

    const projectName = (name || '').toString().trim()
    if (!projectName) {
      console.warn('[OpenAI Projects] Skipping project creation: empty name')
      return null
    }

    const res = await fetch('https://api.openai.com/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Projects API requires beta header for now
        'OpenAI-Beta': 'projects=v2',
        ...(orgId ? { 'OpenAI-Organization': orgId } : {}),
      },
      body: JSON.stringify({
        name: projectName,
        description: description || undefined,
      }),
    })

    if (!res.ok) {
      let errText: any
      try { errText = await res.json() } catch { errText = await res.text() }
      console.warn('[OpenAI Projects] Failed to create project:', res.status, errText)
      return null
    }

    const data = await res.json()
    return { id: data.id, name: data.name, created_at: data.created_at }
  } catch (e) {
    console.warn('[OpenAI Projects] Error creating project:', e)
    return null
  }
}
