import { NextRequest, NextResponse } from 'next/server'
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { AIService } from '@/lib/ai-service'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, agentType, numberOfQuestions, skills, existingQuestions, agentName, companyId, jobId } = await request.json()

    if (!jobDescription || !agentType || !numberOfQuestions) {
      return NextResponse.json(
        { error: 'Missing required fields: jobDescription, agentType, numberOfQuestions' },
        { status: 400 }
      )
    }

    // Delegate to AIService which handles AI generation, normalization/dedup, and mock backfill
    const result = await AIService.generateStagedInterviewQuestions(
      jobDescription,
      agentType,
      numberOfQuestions,
      Array.isArray(skills) ? skills : [],
      Array.isArray(existingQuestions) ? existingQuestions : [],
      agentName
    )

    // Record billing usage for question generation using REAL OpenAI token counts
    if (companyId && jobId && result.questions.length > 0) {
      try {
        // Use real token counts from OpenAI API if available, otherwise estimate
        const promptTokens = result.usage?.promptTokens || Math.round(jobDescription.length / 4) + (numberOfQuestions * 100)
        const completionTokens = result.usage?.completionTokens || result.questions.length * 50
        
        await DatabaseService.recordQuestionGenerationUsage({
          companyId,
          jobId,
          promptTokens,
          completionTokens,
          questionCount: result.questions.length,
          modelUsed: 'gpt-4o'
        })
        
        if (result.usage) {
          console.log(`[Question Generation] ✅ Billing tracked: ${promptTokens} prompt + ${completionTokens} completion tokens (REAL OpenAI data)`)
        } else {
          console.log(`[Question Generation] ✅ Billing tracked: ${promptTokens} prompt + ${completionTokens} completion tokens (estimated - no API key)`)
        }
      } catch (billingErr) {
        console.error('[Question Generation] ⚠️ Failed to record billing usage:', billingErr)
        // Non-fatal, don't block the response
      }
    }

    return NextResponse.json({ questions: result.questions, usage: result.usage })
  } catch (error) {
    // Final safety: if anything unexpected happens earlier (e.g., JSON parse of request), keep prior behavior
    console.error('AI question generation error (outer):', error)
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
