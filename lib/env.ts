// Environment variables
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string
if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is not set in environment variables')
}

// Add more environment variables as needed
export const DATABASE_URL = process.env.DATABASE_URL as string
export const NODE_ENV = process.env.NODE_ENV as string
