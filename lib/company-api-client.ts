import { DatabaseService } from './database'

/**
 * Company API Client
 * Uses the company's service account key for all API calls
 * This ensures usage is tracked at the company's project level in OpenAI
 */
export class CompanyAPIClient {
  private companyId: string
  private serviceAccountKey: string | null = null

  constructor(companyId: string) {
    this.companyId = companyId
  }

  /**
   * Initialize the client by fetching the company's service account key
   */
  async initialize(): Promise<void> {
    try {
      const company = await DatabaseService.getCompanyById(this.companyId)
      if (!company) {
        throw new Error(`Company not found: ${this.companyId}`)
      }

      this.serviceAccountKey = company.openai_service_account_key

      if (!this.serviceAccountKey) {
        console.warn(
          `[CompanyAPIClient] ⚠️ Company ${company.name} (${this.companyId}) has no service account key. ` +
          `Usage will not be tracked at project level.`
        )
      } else {
        console.log(
          `[CompanyAPIClient] ✅ Initialized for company: ${company.name} (${this.companyId})`
        )
      }
    } catch (error) {
      console.error(`[CompanyAPIClient] ❌ Failed to initialize for company ${this.companyId}:`, error)
      throw error
    }
  }

  /**
   * Make an API call using the company's service account key
   * Usage will be tracked at the company's project level
   */
  async fetch(
    url: string,
    options: RequestInit & { headers?: Record<string, string> } = {}
  ): Promise<Response> {
    if (!this.serviceAccountKey) {
      throw new Error(
        `[CompanyAPIClient] Service account key not available for company ${this.companyId}. ` +
        `Call initialize() first.`
      )
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.serviceAccountKey}`,
      'Content-Type': 'application/json',
    }

    console.log(`[CompanyAPIClient] 📤 API Call: ${options.method || 'GET'} ${url}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    console.log(
      `[CompanyAPIClient] 📥 Response: ${response.status} ${response.statusText} ` +
      `(Company: ${this.companyId})`
    )

    return response
  }

  /**
   * Make a JSON API call and return parsed response
   */
  async fetchJSON<T = any>(
    url: string,
    options: RequestInit & { headers?: Record<string, string> } = {}
  ): Promise<T> {
    const response = await this.fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = errorText
      }
      throw new Error(
        `API Error ${response.status}: ${errorData?.error?.message || errorData || errorText}`
      )
    }

    return response.json()
  }

  /**
   * Get the company's service account key (for manual API calls if needed)
   */
  getServiceAccountKey(): string | null {
    return this.serviceAccountKey
  }

  /**
   * Get the company's project ID
   */
  async getProjectId(): Promise<string | null> {
    const company = await DatabaseService.getCompanyById(this.companyId)
    return company?.openai_project_id || null
  }
}

/**
 * Factory function to create and initialize a company API client
 */
export async function createCompanyAPIClient(companyId: string): Promise<CompanyAPIClient> {
  const client = new CompanyAPIClient(companyId)
  await client.initialize()
  return client
}
