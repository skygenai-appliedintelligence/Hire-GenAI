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
    const questions = await AIService.generateStagedInterviewQuestions(
      jobDescription,
      agentType,
      numberOfQuestions,
      Array.isArray(skills) ? skills : [],
      Array.isArray(existingQuestions) ? existingQuestions : [],
      agentName
    )

    // Record billing usage for question generation
    // Estimate token usage: ~100 tokens per question for prompt + ~50 tokens per question for completion
    if (companyId && jobId && questions.length > 0) {
      try {
        const estimatedPromptTokens = Math.round(jobDescription.length / 4) + (numberOfQuestions * 100)
        const estimatedCompletionTokens = questions.length * 50
        
        await DatabaseService.recordQuestionGenerationUsage({
          companyId,
          jobId,
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          questionCount: questions.length,
          modelUsed: 'gpt-4o'
        })
        console.log('[Question Generation] ✅ Billing tracked: Question generation usage recorded')
      } catch (billingErr) {
        console.error('[Question Generation] ⚠️ Failed to record billing usage:', billingErr)
        // Non-fatal, don't block the response
      }
    }

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
