import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export interface ResumeAnalysis {
  candidateId: string
  jobId: string
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendedStage: string
  reasoning: string
  redFlags: string[]
  skillsMatch: {
    matched: string[]
    missing: string[]
    percentage: number
  }
}

export interface AIFeedback {
  stage: string
  rating: number
  comments: string
  strengths: string[]
  concerns: string[]
  recommendation: "proceed" | "reject" | "review"
  reasoning: string
  generatedAt: string
}

class AIRecruiterService {
  private async analyzeResume(resumeText: string, jobDescription: string): Promise<any> {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: `You are an expert AI recruiter. Analyze resumes against job descriptions and provide structured feedback.`,
        prompt: `
          Analyze this resume against the job description and provide a JSON response:

          RESUME:
          ${resumeText}

          JOB DESCRIPTION:
          ${jobDescription}

          Provide analysis in this exact JSON format:
          {
            "score": 85,
            "strengths": ["Strong technical skills", "Relevant experience"],
            "weaknesses": ["Limited leadership experience"],
            "skillsMatch": {
              "matched": ["JavaScript", "React"],
              "missing": ["Node.js", "AWS"],
              "percentage": 75
            },
            "recommendedStage": "technical_screening",
            "reasoning": "Candidate shows strong technical foundation...",
            "redFlags": ["Employment gap", "Job hopping"]
          }
        `,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("AI Resume Analysis Error:", error)
      return this.getFallbackAnalysis()
    }
  }

  private getFallbackAnalysis() {
    return {
      score: 65,
      strengths: ["Resume submitted", "Basic qualifications met"],
      weaknesses: ["Requires manual review"],
      skillsMatch: {
        matched: ["General experience"],
        missing: ["Specific skills need verification"],
        percentage: 60,
      },
      recommendedStage: "initial_screening",
      reasoning: "AI analysis unavailable, requires human review",
      redFlags: [],
    }
  }

  async screenCandidate(candidateId: string, jobId: string): Promise<ResumeAnalysis> {
    // Simulate getting candidate and job data
    const candidate = this.getCandidateData(candidateId)
    const job = this.getJobData(jobId)

    const analysis = await this.analyzeResume(candidate.resume, job.description)

    const result: ResumeAnalysis = {
      candidateId,
      jobId,
      score: analysis.score,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendedStage: analysis.recommendedStage,
      reasoning: analysis.reasoning,
      redFlags: analysis.redFlags || [],
      skillsMatch: analysis.skillsMatch,
    }

    // Save analysis to localStorage
    this.saveAnalysis(result)

    // Auto-progress candidate if score is high enough
    if (analysis.score >= 75) {
      this.progressCandidate(candidateId, analysis.recommendedStage)
    }

    return result
  }

  async generateStageFeedback(candidateId: string, stage: string, interviewData?: any): Promise<AIFeedback> {
    try {
      const candidate = this.getCandidateData(candidateId)
      const analysis = this.getAnalysis(candidateId)

      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: `You are an AI recruiter providing interview stage feedback. Be professional and constructive.`,
        prompt: `
          Generate feedback for candidate at ${stage} stage:

          CANDIDATE: ${candidate.name}
          PREVIOUS ANALYSIS: ${JSON.stringify(analysis)}
          INTERVIEW DATA: ${JSON.stringify(interviewData || {})}

          Provide feedback in this JSON format:
          {
            "rating": 4,
            "comments": "Detailed professional feedback...",
            "strengths": ["Technical competency", "Communication skills"],
            "concerns": ["Limited experience in X"],
            "recommendation": "proceed",
            "reasoning": "Candidate demonstrates..."
          }
        `,
      })

      const feedback = JSON.parse(text)

      const result: AIFeedback = {
        stage,
        rating: feedback.rating,
        comments: feedback.comments,
        strengths: feedback.strengths,
        concerns: feedback.concerns,
        recommendation: feedback.recommendation,
        reasoning: feedback.reasoning,
        generatedAt: new Date().toISOString(),
      }

      this.saveFeedback(candidateId, stage, result)
      return result
    } catch (error) {
      console.error("AI Feedback Generation Error:", error)
      return this.getFallbackFeedback(stage)
    }
  }

  private getFallbackFeedback(stage: string): AIFeedback {
    return {
      stage,
      rating: 3,
      comments: `Candidate completed ${stage} stage. Manual review recommended for detailed assessment.`,
      strengths: ["Participated in interview process"],
      concerns: ["Requires human evaluation"],
      recommendation: "review",
      reasoning: "AI feedback generation unavailable",
      generatedAt: new Date().toISOString(),
    }
  }

  private getCandidateData(candidateId: string) {
    const candidates = JSON.parse(localStorage.getItem("candidates") || "[]")
    return (
      candidates.find((c: any) => c.id === candidateId) || {
        id: candidateId,
        name: "Unknown Candidate",
        resume: "Resume content not available",
      }
    )
  }

  private getJobData(jobId: string) {
    const jobs = JSON.parse(localStorage.getItem("jobs") || "[]")
    return (
      jobs.find((j: any) => j.id === jobId) || {
        id: jobId,
        title: "Unknown Position",
        description: "Job description not available",
      }
    )
  }

  private saveAnalysis(analysis: ResumeAnalysis) {
    const analyses = JSON.parse(localStorage.getItem("ai_analyses") || "[]")
    const existingIndex = analyses.findIndex((a: any) => a.candidateId === analysis.candidateId)

    if (existingIndex >= 0) {
      analyses[existingIndex] = analysis
    } else {
      analyses.push(analysis)
    }

    localStorage.setItem("ai_analyses", JSON.stringify(analyses))
  }

  private saveFeedback(candidateId: string, stage: string, feedback: AIFeedback) {
    const key = `ai_feedback_${candidateId}`
    const existingFeedback = JSON.parse(localStorage.getItem(key) || "{}")
    existingFeedback[stage] = feedback
    localStorage.setItem(key, JSON.stringify(existingFeedback))
  }

  getAnalysis(candidateId: string): ResumeAnalysis | null {
    const analyses = JSON.parse(localStorage.getItem("ai_analyses") || "[]")
    return analyses.find((a: any) => a.candidateId === candidateId) || null
  }

  getFeedback(candidateId: string, stage?: string) {
    const key = `ai_feedback_${candidateId}`
    const feedback = JSON.parse(localStorage.getItem(key) || "{}")
    return stage ? feedback[stage] : feedback
  }

  private progressCandidate(candidateId: string, stage: string) {
    // Update candidate stage in localStorage
    const candidates = JSON.parse(localStorage.getItem("candidates") || "[]")
    const candidateIndex = candidates.findIndex((c: any) => c.id === candidateId)

    if (candidateIndex >= 0) {
      candidates[candidateIndex].stage = stage
      candidates[candidateIndex].lastUpdated = new Date().toISOString()
      localStorage.setItem("candidates", JSON.stringify(candidates))
    }
  }

  async processNewApplication(candidateId: string, jobId: string) {
    try {
      // Screen the candidate
      const analysis = await this.screenCandidate(candidateId, jobId)

      // Generate initial feedback
      const feedback = await this.generateStageFeedback(candidateId, "initial_screening")

      // Log AI activity
      this.logActivity({
        type: "candidate_screened",
        candidateId,
        jobId,
        score: analysis.score,
        recommendation: analysis.recommendedStage,
        timestamp: new Date().toISOString(),
      })

      return { analysis, feedback }
    } catch (error) {
      console.error("Error processing new application:", error)
      throw error
    }
  }

  private logActivity(activity: any) {
    const activities = JSON.parse(localStorage.getItem("ai_activities") || "[]")
    activities.unshift(activity)
    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(100)
    }
    localStorage.setItem("ai_activities", JSON.stringify(activities))
  }

  getRecentActivities(limit = 10) {
    const activities = JSON.parse(localStorage.getItem("ai_activities") || "[]")
    return activities.slice(0, limit)
  }
}

export const aiRecruiterService = new AIRecruiterService()
