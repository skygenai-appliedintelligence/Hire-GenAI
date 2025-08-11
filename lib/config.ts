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
