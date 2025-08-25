import { NextRequest, NextResponse } from 'next/server'
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { AIService } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, agentType, numberOfQuestions, skills, existingQuestions, agentName } = await request.json()

    if (!jobDescription || !agentType || !numberOfQuestions) {
      return NextResponse.json(
        { error: 'Missing required fields: jobDescription, agentType, numberOfQuestions' },
        { status: 400 }
      )
    }

    // Delegate to AIService which handles AI generation, normalization/dedup, and mock backfill
    const questions = await AIService.generateStagedInterviewQuestions(
      jobDescription,
      agentType,
      numberOfQuestions,
      Array.isArray(skills) ? skills : [],
      Array.isArray(existingQuestions) ? existingQuestions : [],
      agentName
    )
    return NextResponse.json({ questions })
  } catch (error) {
    // Final safety: if anything unexpected happens earlier (e.g., JSON parse of request), keep prior behavior
    console.error('AI question generation error (outer):', error)
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
