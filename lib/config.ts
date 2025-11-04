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
  
  // Billing Configuration
  billing: {
    // Profit margin percentage to add on top of OpenAI costs (e.g., 20 = 20% markup)
    profitMarginPercentage: parseFloat(process.env.PROFIT_MARGIN_PERCENTAGE || '20'),
    
    // Hardcoded pricing (NEVER shown in database or UI)
    // These values are ONLY used internally for billing calculations
    cvParsingPrice: parseFloat(process.env.CV_PARSING_PRICE || '0.50'),
    videoInterviewPricePerMinute: parseFloat(process.env.VIDEO_INTERVIEW_PRICE_PER_MINUTE || '0.50'),
    questionGenerationPricePer10Questions: parseFloat(process.env.QUESTION_GENERATION_PRICE_PER_10_QUESTIONS || '0.10'),
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

// Helper function to calculate cost with profit margin
export const applyProfitMargin = (baseCost: number): { baseCost: number, markup: number, finalCost: number } => {
  const profitMargin = config.billing.profitMarginPercentage
  const markup = (baseCost * profitMargin) / 100
  const finalCost = baseCost + markup

  return {
    baseCost: parseFloat(baseCost.toFixed(4)),
    markup: parseFloat(markup.toFixed(4)),
    finalCost: parseFloat(finalCost.toFixed(4))
  }
}

// Get profit margin percentage
export const getProfitMarginPercentage = () => {
  return config.billing.profitMarginPercentage
}

// Get hardcoded CV parsing price (INTERNAL USE ONLY - Never expose to UI/DB)
export const getCVParsingPrice = () => {
  return config.billing.cvParsingPrice
}

// Get hardcoded video interview price per minute (INTERNAL USE ONLY - Never expose to UI/DB)
export const getVideoInterviewPricePerMinute = () => {
  return config.billing.videoInterviewPricePerMinute
}

// Get hardcoded question generation price per 10 questions (INTERNAL USE ONLY - Never expose to UI/DB)
export const getQuestionGenerationPricePer10Questions = () => {
  return config.billing.questionGenerationPricePer10Questions
}
