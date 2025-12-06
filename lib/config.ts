// Configuration file for environment variables and settings

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    hasKey: !!(process.env.OPENAI_API_KEY),
  },
  
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    hasConfig: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Billing Configuration - ALL PRICING COMES FROM .env FILE ONLY
  // NO external pricing, NO OpenAI API costs - ONLY these env values
  billing: {
    // Cost per CV parsing (default: $0.50)
    cvParsingCost: parseFloat(process.env.COST_PER_CV_PARSING || '0.50'),
    
    // Cost per 10 questions generated (default: $0.10)
    questionGenerationCostPer10: parseFloat(process.env.COST_PER_10_QUESTIONS || '0.10'),
    
    // Cost per minute of video interview (default: $0.10)
    videoInterviewCostPerMinute: parseFloat(process.env.COST_PER_VIDEO_MINUTE || '0.10'),
  },
  
  // Feature flags
  features: {
    aiEnabled: !!(process.env.OPENAI_API_KEY),
    databaseEnabled: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
}

// Helper function to check if AI is available
export const isAIEnabled = () => {
  return config.features.aiEnabled
}

// Helper function to check if database is available
export const isDatabaseEnabled = () => {
  return config.features.databaseEnabled
}

// Helper function to check OpenAI API key permissions
export const checkOpenAIPermissions = async (): Promise<{
  hasKey: boolean
  hasPermissions: boolean
  error?: string
  suggestions?: string[]
}> => {
  if (!config.features.aiEnabled) {
    return {
      hasKey: false,
      hasPermissions: false,
      error: 'No OpenAI API key configured',
      suggestions: [
        'Add OPENAI_API_KEY to your .env.local file',
        'Restart the development server after adding the key',
        'Ensure the API key starts with "sk-" for secret keys'
      ]
    }
  }

  try {
    const { openai } = await import("@ai-sdk/openai")
    const { generateText } = await import("ai")

    // Try a simple API call to test permissions
    await generateText({
      model: openai("gpt-3.5-turbo"), // Use cheaper model for testing
      prompt: "Say 'API test successful' in JSON format.",
      system: "Respond with valid JSON only.",
      temperature: 0.1,
    })

    return {
      hasKey: true,
      hasPermissions: true,
      suggestions: [
        '✅ OpenAI API key is working correctly',
        '✅ All required permissions are available',
        '🎯 CV evaluation will work with real AI'
      ]
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)

    if (errorMessage.includes('insufficient permissions') ||
        errorMessage.includes('Missing scopes') ||
        errorMessage.includes('api.responses.write')) {
      return {
        hasKey: true,
        hasPermissions: false,
        error: 'OpenAI API key lacks required permissions',
        suggestions: [
          '🔑 Your OpenAI API key is missing the "api.responses.write" scope',
          '🔧 Go to OpenAI Platform → API Keys → Edit your key',
          '🔧 Enable all available scopes/permissions',
          '🔧 Or create a new API key with full permissions',
          '⚠️  Current key will use fallback mock evaluation'
        ]
      }
    }

    return {
      hasKey: true,
      hasPermissions: false,
      error: `OpenAI API error: ${errorMessage}`,
      suggestions: [
        '❌ Check your OpenAI API key is valid and active',
        '❌ Verify your OpenAI account has sufficient credits',
        '❌ Check OpenAI status page for service outages',
        '⚠️  Current key will use fallback mock evaluation'
      ]
    }
  }
}

// ============================================
// BILLING PRICING - ALL FROM .env FILE ONLY
// NO OpenAI API costs, NO external sources
// ============================================

// Get CV parsing cost from .env
export const getCVParsingCost = (): number => {
  return config.billing.cvParsingCost
}

// Get question generation cost per 10 questions from .env
export const getQuestionGenerationCostPer10 = (): number => {
  return config.billing.questionGenerationCostPer10
}

// Get video interview cost per minute from .env
export const getVideoInterviewCostPerMinute = (): number => {
  return config.billing.videoInterviewCostPerMinute
}

// Get all billing prices (for API/UI display)
export const getBillingPrices = () => {
  return {
    cvParsingCost: config.billing.cvParsingCost,
    questionGenerationCostPer10: config.billing.questionGenerationCostPer10,
    videoInterviewCostPerMinute: config.billing.videoInterviewCostPerMinute,
  }
}

// Get profit margin percentage from .env (default: 20%)
export const getProfitMarginPercentage = (): number => {
  return parseFloat(process.env.PROFIT_MARGIN_PERCENTAGE || '20')
}

// Apply profit margin to a base cost
export const applyProfitMargin = (baseCost: number): number => {
  const marginPercentage = getProfitMarginPercentage()
  return baseCost * (1 + marginPercentage / 100)
}
