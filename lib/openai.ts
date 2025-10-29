import { OPENAI_API_KEY } from './env'

export class OpenAIService {
  private static headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v1'
  }

  /**
   * Creates a new OpenAI Project for a company
   */
  static async createProject(name: string, description?: string): Promise<{ id: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/projects', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          name,
          description: description || `AI Interview Project for ${name}`,
          purpose: 'hire-genai-interviews'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI Project creation failed: ${error.message}`)
      }

      const data = await response.json()
      return { id: data.id }
    } catch (error: any) {
      console.error('OpenAI Project creation error:', error)
      throw error
    }
  }

  /**
   * Updates an existing OpenAI Project
   */
  static async updateProject(projectId: string, updates: { name?: string; description?: string }): Promise<void> {
    try {
      const response = await fetch(`https://api.openai.com/v1/projects/${projectId}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI Project update failed: ${error.message}`)
      }
    } catch (error: any) {
      console.error('OpenAI Project update error:', error)
      throw error
    }
  }

  /**
   * Deletes an OpenAI Project
   */
  static async deleteProject(projectId: string): Promise<void> {
    try {
      const response = await fetch(`https://api.openai.com/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.headers
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI Project deletion failed: ${error.message}`)
      }
    } catch (error: any) {
      console.error('OpenAI Project deletion error:', error)
      throw error
    }
  }
}
