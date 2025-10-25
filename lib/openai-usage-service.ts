/**
 * OpenAI Usage Service
 * Fetches real usage data from OpenAI Platform API
 * https://platform.openai.com/docs/api-reference/usage
 */

export interface OpenAIUsageData {
  object: 'list'
  data: OpenAIUsageBucket[]
  has_more?: boolean
  next_page?: string
}

export interface OpenAIUsageBucket {
  object: 'bucket'
  start_time: number // Unix timestamp
  end_time: number // Unix timestamp
  results: OpenAIUsageResult[]
}

export interface OpenAIUsageResult {
  object: 'organization.usage.completions.result'
  input_tokens: number
  output_tokens: number
  num_model_requests: number
  input_cached_tokens: number
  input_audio_tokens?: number
  output_audio_tokens?: number
  project_id?: string | null
  user_id?: string | null
  api_key_id?: string | null
  model?: string | null
  batch?: boolean | null
}

export interface ProcessedUsageData {
  cvParsing: {
    cost: number
    count: number
    tokens: number
  }
  questionGeneration: {
    cost: number
    count: number
    tokens: number
  }
  videoInterview: {
    cost: number
    count: number
    tokens: number
  }
  total: {
    cost: number
    tokens: number
    requests: number
  }
}

export class OpenAIUsageService {
  private static readonly BASE_URL = 'https://api.openai.com/v1'
  private static readonly PRICING = {
    // GPT-4o pricing per 1M tokens
    gpt4o: {
      input: 2.50, // $2.50 per 1M input tokens
      output: 10.00, // $10.00 per 1M output tokens
      cached: 1.25, // $1.25 per 1M cached tokens
    },
    // GPT-3.5-turbo pricing per 1M tokens
    gpt35turbo: {
      input: 0.50,
      output: 1.50,
    }
  }

  /**
   * Fetch usage data from OpenAI Platform API
   * @param startDate - Start date for usage data (YYYY-MM-DD)
   * @param endDate - End date for usage data (YYYY-MM-DD)
   * @param apiKey - OpenAI Admin API key
   */
  static async fetchUsageData(
    startDate: string,
    endDate: string,
    apiKey?: string
  ): Promise<OpenAIUsageData> {
    const key = apiKey || process.env.OPENAI_API_KEY

    if (!key) {
      throw new Error('OpenAI API key not configured')
    }

    // Convert date strings to Unix timestamps
    const startTime = Math.floor(new Date(startDate).getTime() / 1000)
    const endTime = Math.floor(new Date(endDate).getTime() / 1000)

    // Correct endpoint: /v1/organization/usage/completions
    const url = `${this.BASE_URL}/organization/usage/completions`
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }
    // Optional: support multi-org by specifying organization header if provided
    if (process.env.OPENAI_ORG_ID) {
      headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID
    }

    // The API limits daily buckets to 31 per page. Paginate and aggregate.
    const allBuckets: OpenAIUsageBucket[] = []
    let pageCursor: string | undefined = undefined

    while (true) {
      const params = new URLSearchParams({
        start_time: startTime.toString(),
        end_time: endTime.toString(),
        bucket_width: '1d',
        limit: '31',
      })
      if (pageCursor) params.set('page', pageCursor)

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 401) {
          throw new Error(
            `OpenAI API error: 401 - Insufficient permissions. The Usage API requires an Admin API key with api.usage.read scope. ` +
            `If you are in multiple organizations or projects, set OPENAI_ORG_ID as well. Raw error: ${errorText}`
          )
        }
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const json = await response.json()
      const data: OpenAIUsageBucket[] = json?.data || []
      allBuckets.push(...data)

      const nextPage: string | undefined = json?.next_page
      if (!nextPage) break
      pageCursor = nextPage
    }

    return {
      object: 'list',
      data: allBuckets,
      has_more: false,
    }
  }

  /**
   * Process raw OpenAI usage data and categorize by service type
   * This is a heuristic approach - you may need to adjust based on your actual usage patterns
   */
  static processUsageData(rawData: OpenAIUsageData): ProcessedUsageData {
    const result: ProcessedUsageData = {
      cvParsing: { cost: 0, count: 0, tokens: 0 },
      questionGeneration: { cost: 0, count: 0, tokens: 0 },
      videoInterview: { cost: 0, count: 0, tokens: 0 },
      total: { cost: 0, tokens: 0, requests: 0 }
    }

    // Process each bucket
    for (const bucket of rawData.data) {
      // Process each result in the bucket
      for (const record of bucket.results) {
        const inputTokens = record.input_tokens || 0
        const outputTokens = record.output_tokens || 0
        const cachedTokens = record.input_cached_tokens || 0
        const totalTokens = inputTokens + outputTokens

        // Calculate cost using GPT-4o pricing (adjust if using different model)
        const inputCost = (inputTokens / 1_000_000) * this.PRICING.gpt4o.input
        const outputCost = (outputTokens / 1_000_000) * this.PRICING.gpt4o.output
        const cachedCost = (cachedTokens / 1_000_000) * this.PRICING.gpt4o.cached
        const recordCost = inputCost + outputCost + cachedCost

        // Categorize based on token count patterns
        // This is a simplified heuristic - adjust based on your actual usage
        // Heuristic: Larger token counts typically indicate CV parsing or interviews
        // Smaller counts are usually question generation
        if (totalTokens > 5000) {
          // Likely CV parsing (large document processing)
          result.cvParsing.cost += recordCost
          result.cvParsing.count += record.num_model_requests
          result.cvParsing.tokens += totalTokens
        } else if (totalTokens > 1000) {
          // Likely video interview analysis
          result.videoInterview.cost += recordCost
          result.videoInterview.count += record.num_model_requests
          result.videoInterview.tokens += totalTokens
        } else {
          // Likely question generation (smaller prompts)
          result.questionGeneration.cost += recordCost
          result.questionGeneration.count += record.num_model_requests
          result.questionGeneration.tokens += totalTokens
        }

        // Update totals
        result.total.cost += recordCost
        result.total.tokens += totalTokens
        result.total.requests += record.num_model_requests
      }
    }

    return result
  }

  /**
   * Get usage data for a specific date range
   * @param daysBack - Number of days to look back (default: 30)
   */
  static async getUsageForDateRange(daysBack: number = 30): Promise<ProcessedUsageData> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const rawData = await this.fetchUsageData(startDateStr, endDateStr)
    return this.processUsageData(rawData)
  }

  /**
   * Get usage data with custom date range
   */
  static async getUsageForCustomRange(
    startDate: Date,
    endDate: Date
  ): Promise<ProcessedUsageData> {
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const rawData = await this.fetchUsageData(startDateStr, endDateStr)
    return this.processUsageData(rawData)
  }
}
