/**
 * OpenAI Usage Tracker
 * Centralized service to fetch real-time usage from OpenAI API after each operation
 * and store it in the database for accurate billing
 */

import { OpenAIUsageService } from './openai-usage-service'
import { applyProfitMargin } from './config'

export interface UsageTrackingResult {
  baseCost: number
  finalCost: number
  tokens?: number
  source: 'openai-api' | 'fallback'
  details?: any
}

export class OpenAIUsageTracker {
  /**
   * Fetch real-time usage from OpenAI API for the last N minutes
   * @param minutesAgo - How many minutes back to fetch (default: 5)
   * @param category - Type of operation: 'cv-parsing', 'question-generation', 'video-interview'
   */
  static async fetchRecentUsage(
    minutesAgo: number = 5,
    category: 'cv-parsing' | 'question-generation' | 'video-interview'
  ): Promise<UsageTrackingResult> {
    // Retry up to 3 times with short backoff and expanding window
    let attempt = 1
    let windowMinutes = minutesAgo
    while (attempt <= 3) {
      try {
        console.log(`🔗 [${category.toUpperCase()}] Fetching REAL OpenAI usage from API...`)
        console.log(`⏰ Time Range (attempt ${attempt}): Last ${windowMinutes} minutes`)

        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - windowMinutes * 60 * 1000)

        // Fetch usage from OpenAI Platform API
        const openAIUsage = await OpenAIUsageService.getUsageForCustomRange(startDate, endDate)

        let baseCost = 0
        let tokens = 0
        let details: any = {}

        // Extract cost based on category
        switch (category) {
          case 'cv-parsing':
            baseCost = openAIUsage.cvParsing?.cost || 0
            tokens = openAIUsage.cvParsing?.tokens || 0
            details = {
              count: openAIUsage.cvParsing?.count || 0,
              tokens: tokens
            }
            break

          case 'question-generation':
            baseCost = openAIUsage.questionGeneration?.cost || 0
            tokens = openAIUsage.questionGeneration?.tokens || 0
            details = {
              count: openAIUsage.questionGeneration?.count || 0,
              tokens: tokens
            }
            break

          case 'video-interview':
            baseCost = openAIUsage.videoInterview?.cost || 0
            tokens = openAIUsage.videoInterview?.tokens || 0
            details = {
              count: openAIUsage.videoInterview?.count || 0,
              tokens: tokens
            }
            break
        }

        if (baseCost > 0) {
          const { finalCost } = applyProfitMargin(baseCost)

          console.log(`✅ [${category.toUpperCase()}] SUCCESS: Real OpenAI cost fetched!`)
          console.log(`💰 OpenAI Base Cost: $${baseCost.toFixed(4)}`)
          console.log(`💵 Final Cost (with margin): $${finalCost.toFixed(4)}`)
          console.log(`🔢 Tokens Used: ${tokens}`)
          console.log(`🏷️  Source: OpenAI Platform API (Real Data)`)

          return {
            baseCost,
            finalCost,
            tokens,
            source: 'openai-api',
            details
          }
        }

        // If cost is zero, expand window and retry
        if (attempt < 3) {
          console.warn(`⚠️  [${category.toUpperCase()}] No usage yet. Expanding window and retrying...`)
          windowMinutes += 5
          await new Promise((r) => setTimeout(r, 3000))
          attempt++
          continue
        }
        throw new Error('No usage data returned from OpenAI API after retries')
      } catch (error: any) {
        if (attempt < 3) {
          console.warn(`⚠️  [${category.toUpperCase()}] Error on attempt ${attempt}: ${error?.message || error}`)
          await new Promise((r) => setTimeout(r, 3000))
          windowMinutes += 5
          attempt++
          continue
        }
        console.warn(`⚠️  [${category.toUpperCase()}] Failed to fetch from OpenAI API after retries: ${error?.message || error}`)
        return this.getFallbackCost(category)
      }
    }
    // Should not reach here
    return this.getFallbackCost(category)
  }
  
  /**
   * Get fallback cost estimates when OpenAI API is unavailable
   */
  private static getFallbackCost(
    category: 'cv-parsing' | 'question-generation' | 'video-interview'
  ): UsageTrackingResult {
    let baseCost = 0
    
    switch (category) {
      case 'cv-parsing':
        baseCost = 0.50 // GPT-4 estimation for CV parsing
        break
      case 'question-generation':
        baseCost = 0.01 // Estimation for question generation
        break
      case 'video-interview':
        baseCost = 0.30 // Per minute for Realtime API
        break
    }
    
    const { finalCost } = applyProfitMargin(baseCost)
    
    console.log(`⚠️  [${category.toUpperCase()}] Using fallback pricing`)
    console.log(`💰 Fallback Base Cost: $${baseCost.toFixed(4)}`)
    console.log(`💵 Final Cost (with margin): $${finalCost.toFixed(4)}`)
    console.log(`🏷️  Source: Fallback Estimation`)
    
    return {
      baseCost,
      finalCost,
      source: 'fallback',
      details: { note: 'OpenAI API unavailable, using fallback pricing' }
    }
  }
  
  /**
   * Fetch and calculate cost for CV parsing operation
   */
  static async trackCVParsing(): Promise<UsageTrackingResult> {
    console.log('\n' + '='.repeat(70))
    console.log('🎯 [CV PARSING] Tracking OpenAI usage...')
    // Use a wider window to accommodate OpenAI usage aggregation latency
    const result = await this.fetchRecentUsage(15, 'cv-parsing')
    console.log('='.repeat(70) + '\n')
    return result
  }
  
  /**
   * Fetch and calculate cost for question generation operation
   */
  static async trackQuestionGeneration(): Promise<UsageTrackingResult> {
    console.log('\n' + '='.repeat(70))
    console.log('🎯 [QUESTION GENERATION] Tracking OpenAI usage...')
    const result = await this.fetchRecentUsage(5, 'question-generation')
    console.log('='.repeat(70) + '\n')
    return result
  }
  
  /**
   * Fetch and calculate cost for video interview operation
   */
  static async trackVideoInterview(durationMinutes?: number): Promise<UsageTrackingResult> {
    console.log('\n' + '='.repeat(70))
    console.log('🎯 [VIDEO INTERVIEW] Tracking OpenAI usage...')
    if (durationMinutes) {
      console.log(`⏱️  Interview Duration: ${durationMinutes} minutes`)
    }
    const result = await this.fetchRecentUsage(10, 'video-interview') // Longer window for interviews
    console.log('='.repeat(70) + '\n')
    return result
  }
}
