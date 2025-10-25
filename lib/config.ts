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
