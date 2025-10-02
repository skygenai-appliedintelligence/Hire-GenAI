import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Detect if we can safely call OpenAI (server-side + key present)
const hasOpenAIKey =
  typeof process !== "undefined" && !!(process.env as Record<string, string | undefined>)?.OPENAI_API_KEY

export interface CandidateApplication {
  id: string
  jobId: string
  fullName: string
  email: string
  phone: string
  yearsOfExperience: string
  technicalSkills: string
  whyInterested: string
  impactfulProject: string
  availability: string
  resumeUrl?: string
  parsedResume?: {
    rawText?: string
    skills?: string[]
    experience?: any[]
    education?: any[]
    summary?: string
    certifications?: string[]
  }
  submittedAt: string
  status: "applied" | "screening" | "qualified" | "unqualified" | "interview_scheduled" | "completed"
}

export interface InterviewStage {
  id: string
  name: string
  duration: number
  status: "pending" | "scheduled" | "in_progress" | "completed" | "passed" | "failed"
  scheduledAt?: string
  completedAt?: string
  score?: number
  maxScore: number
  feedback?: string
  keyQuestions: string[]
  keyHighlights?: string[]
  aiTranscript?: string
}

export interface InterviewPipeline {
  id: string
  candidateId: string
  jobId: string
  overallProgress: number
  currentStage: number
  stages: InterviewStage[]
  finalRecommendation?: {
    decision: "recommend" | "reject"
    overallScore: number
    successRate: number
    summary: string
    strengths: string[]
    weaknesses: string[]
    reasoning: string
  }
  createdAt: string
  updatedAt: string
}

export class AIInterviewService {
  private static readonly INTERVIEW_STAGES: Omit<InterviewStage, "id" | "status" | "score">[] = [
    {
      name: "Initial Screening",
      duration: 15,
      maxScore: 100,
      keyQuestions: [
        "Tell me about yourself and your background",
        "Why are you interested in this position?",
        "What are your salary expectations?",
        "When can you start?",
      ],
    },
    {
      name: "Technical Interview",
      duration: 45,
      maxScore: 100,
      keyQuestions: [
        "Describe your experience with our technology stack",
        "Walk me through how you would approach solving a complex technical problem",
        "Tell me about a challenging bug you've fixed",
        "How do you stay updated with new technologies?",
      ],
    },
    {
      name: "HR Interview",
      duration: 30,
      maxScore: 100,
      keyQuestions: [
        "How do you handle working in a team environment?",
        "Tell me about a time you had to resolve a conflict at work",
        "What are your career goals?",
        "How do you handle stress and tight deadlines?",
      ],
    },
    {
      name: "Final Interview",
      duration: 60,
      maxScore: 100,
      keyQuestions: [
        "Describe your leadership style and experience",
        "How would you contribute to our company's strategic goals?",
        "What questions do you have about the role and company?",
        "Why should we hire you over other candidates?",
      ],
    },
  ]

  static async evaluateApplication(
    application: CandidateApplication,
    jobDescription: string,
  ): Promise<{
    qualified: boolean
    score: number
    reasoning: string
    feedback: string
  }> {
    // Extract key skills from JD (simple keyword match fallback)
    const SKILL_KEYWORDS = [
      'react','reactjs','next.js','nextjs','vue','nuxt','angular','svelte',
      'node','node.js','express','nest','nestjs',
      'typescript','ts','javascript','js','es6',
      'java','spring','spring boot','kotlin',
      'python','django','flask','fastapi',
      'go','golang','rust','ruby','rails','php','laravel',
      'c#','dotnet','.net','c++','c ',
      'html','html5','css','css3','scss','sass','tailwind','bootstrap',
      'react native','expo','flutter','swift','ios','android',
      'aws','gcp','azure','cloud','serverless','lambda','s3','ec2',
      'docker','kubernetes','k8s','terraform','ansible','helm',
      'sql','postgres','postgresql','mysql','mssql','sql server','sqlite',
      'nosql','mongodb','dynamodb','redis','elasticsearch',
      'graphql','rest','rest api','grpc','websocket',
      'kafka','rabbitmq','sqs','sns','pubsub','message queue','mq',
      'microservice','microservices','monorepo',
      'ci/cd','cicd','pipeline','github actions','gitlab ci',
      'testing','unit test','integration test','jest','vitest','cypress','playwright',
      'devops','observability','prometheus','grafana','sentry',
      'git','github','gitlab','bitbucket'
    ]
    const SYNONYMS: Record<string, string[]> = {
      'react': ['reactjs'],
      'next.js': ['nextjs'],
      'node': ['node.js'],
      'typescript': ['ts'],
      'javascript': ['js','es6'],
      'spring': ['spring boot'],
      'postgres': ['postgresql'],
      'mssql': ['sql server'],
      'ci/cd': ['cicd','pipeline','github actions','gitlab ci'],
      'rest': ['rest api'],
      'kubernetes': ['k8s'],
      'microservices': ['microservice'],
      'testing': ['unit test','integration test','jest','vitest','cypress','playwright'],
    }

    const jdLower = (jobDescription || '').toLowerCase()
    const requiredSkills = Array.from(new Set(SKILL_KEYWORDS.filter(k => jdLower.includes(k))))

    const normalize = (text: string) => text.toLowerCase()
    const tokenize = (text: string) => Array.from(new Set(normalize(text).split(/[^a-z0-9+#\.]+/).filter(Boolean)))

    // Combine form fields AND parsed resume data
    const applicantText = [
      application.technicalSkills,
      application.whyInterested,
      application.impactfulProject,
      // Include parsed resume skills and experience
      application.parsedResume?.skills?.join(' '),
      application.parsedResume?.summary,
      application.parsedResume?.experience?.map((exp: any) => 
        [exp.title, exp.company, exp.description].filter(Boolean).join(' ')
      ).join(' '),
      application.parsedResume?.certifications?.join(' '),
    ].filter(Boolean).join(' ')

    const applicantTokens = tokenize(applicantText)
    const applicantJoined = normalize(applicantText)

    const hasOverlap = (skill: string) => {
      if (applicantJoined.includes(skill)) return true
      const aliases = SYNONYMS[skill] || []
      if (aliases.some(a => applicantJoined.includes(a))) return true
      // partial contains for longer words
      if (skill.length >= 5 && applicantTokens.some(t => t.includes(skill) || skill.includes(t))) return true
      return false
    }

    const countOverlap = (skills: string[]) => skills.reduce((acc, s) => acc + (hasOverlap(s) ? 1 : 0), 0)

    // ---- MOCK MODE -----------------------------------------------------------
    if (!hasOpenAIKey || typeof window !== "undefined") {
      const overlap = countOverlap(requiredSkills)
      const pass = requiredSkills.length === 0 ? true : overlap >= 1
      const score = pass ? 75 : 50
      return {
        qualified: pass,
        score,
        reasoning: pass
          ? `Skills-only check passed: matched ${overlap} key skill(s) required for the role.`
          : `Skills-only check did not find the core skill(s) in the résumé.`,
        feedback: pass
          ? 'Your skills align with the core requirements. Proceeding to interviews.'
          : 'Please include at least one core skill from the job description.',
      }
    }
    // --------------------------------------------------------------------------
    const prompt = `
      You are a technical recruiter evaluating candidates. Be fair and balanced.
      
      Job Description: ${jobDescription}
      
      Candidate Application:
      - Name: ${application.fullName}
      - Technical Skills: ${application.technicalSkills || 'Not provided'}
      - Why Interested: ${application.whyInterested || 'Not provided'}
      - Impactful Project: ${application.impactfulProject || 'Not provided'}
      ${application.parsedResume ? `
      - PARSED RESUME DATA:
        * Skills: ${application.parsedResume.skills?.join(', ') || 'None'}
        * Summary: ${application.parsedResume.summary || 'None'}
        * Experience: ${application.parsedResume.experience?.map((exp: any) => 
            `${exp.title || 'Position'} at ${exp.company || 'Company'}`
          ).join('; ') || 'None'}
        * Certifications: ${application.parsedResume.certifications?.join(', ') || 'None'}
      ` : '- Resume file uploaded but text extraction pending'}
      
      EVALUATION RULES:
      1. Extract key technical skills/technologies from the Job Description
      2. Check if candidate has mentioned ANY of those skills (in form OR resume)
      3. QUALIFY if:
         - They mention at least 2-3 relevant skills from JD
         - OR have similar/transferable skills (React↔Next.js, Python↔Django, Java↔Spring, etc.)
         - OR their job title/experience is directly relevant
      4. DO NOT QUALIFY if:
         - Zero overlap with required skills
         - Completely different domain (e.g., Marketing resume for Backend Dev job)
         - No technical background for technical role
      5. IGNORE: years of experience, employment gaps, dates, education level
      6. Scoring:
         - 80-100: Strong match (3+ key skills)
         - 60-79: Good match (2-3 skills or transferable)
         - 40-59: Weak match (1 skill or loosely related)
         - 0-39: No match (no relevant skills)
      
      Respond as pure JSON:
      {
        "qualified": boolean,
        "score": number (0-100),
        "reasoning": "explain skill match or mismatch",
        "feedback": "constructive feedback"
      }
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "Skills-only screening: ignore timelines; qualify if key skills overlap is sufficient.",
      })

      // Robust JSON extraction: strip code fences and extract the first JSON object
      const cleaned = String(text)
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
      const match = cleaned.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(cleaned)

      let qualified = Boolean(parsed?.qualified)
      const scoreNum = Number(parsed?.score)
      let score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, scoreNum)) : 0
      let reasoning = String(parsed?.reasoning || '').trim() || 'Evaluation summary not provided.'
      let feedback = String(parsed?.feedback || '').trim() || (qualified ? 'You are qualified.' : 'You are currently not a match for this role.')

      // Skills-only post-processing: auto-qualify if enough overlap regardless of score
      try {
        const overlap = countOverlap(requiredSkills)
        const pass = requiredSkills.length === 0 ? true : overlap >= 1
        if (pass && !qualified) {
          qualified = true
          score = Math.max(score, 70)
          feedback = feedback || 'Your skills align with the core requirements. Proceeding to interviews.'
          reasoning = `${reasoning}\nSkills-only rule applied: matched ${overlap} key skill(s).`.trim()
        }
      } catch {}

      return { qualified, score, reasoning, feedback }
    } catch (error) {
      console.error("AI evaluation error", error)
      return {
        qualified: false,
        score: 0,
        reasoning: "Unable to evaluate application due to technical error",
        feedback: "We're experiencing technical difficulties. Please try again later.",
      }
    }
  }

  static async createInterviewPipeline(candidateId: string, jobId: string): Promise<InterviewPipeline> {
    const stages: InterviewStage[] = this.INTERVIEW_STAGES.map((stage, index) => ({
      ...stage,
      id: `stage_${index + 1}_${Date.now()}`,
      status: index === 0 ? "pending" : "pending",
    }))

    const pipeline: InterviewPipeline = {
      id: `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      candidateId,
      jobId,
      overallProgress: 0,
      currentStage: 0,
      stages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return pipeline
  }

  static async scheduleNextInterview(pipeline: InterviewPipeline): Promise<{
    success: boolean
    scheduledTime?: string
    teamsLink?: string
    message: string
  }> {
    // Simulate scheduling logic
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const currentStage = pipeline.stages[pipeline.currentStage]
    if (!currentStage) {
      return {
        success: false,
        message: "No more interviews to schedule",
      }
    }

    // Schedule for next business day at a random time
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0)

    const teamsLink = `https://teams.microsoft.com/l/meetup-join/19%3a${Math.random().toString(36).substr(2, 20)}`

    return {
      success: true,
      scheduledTime: tomorrow.toISOString(),
      teamsLink,
      message: `${currentStage.name} scheduled for ${tomorrow.toLocaleDateString()} at ${tomorrow.toLocaleTimeString()}`,
    }
  }

  static async conductAIInterview(
    pipeline: InterviewPipeline,
    stageIndex: number,
    candidateResponses?: Record<string, string>,
  ): Promise<{
    score: number
    feedback: string
    keyHighlights: string[]
    transcript: string
    passed: boolean
  }> {
    const stage = pipeline.stages[stageIndex]
    if (!stage) throw new Error("Invalid stage")

    if (!hasOpenAIKey || typeof window !== "undefined") {
      const score = Math.floor(Math.random() * stage.maxScore)
      return {
        score,
        feedback: "Mock AI interview feedback (no OpenAI key).",
        keyHighlights: ["Clear communication", "Good problem-solving"],
        transcript: "Mock transcript...",
        passed: score >= stage.maxScore * 0.6,
      }
    }

    // Simulate AI interview conversation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const prompt = `
      Conduct a ${stage.name} interview evaluation based on these responses:
      
      Questions and Responses:
      ${stage.keyQuestions
        .map(
          (q, i) => `
        Q: ${q}
        A: ${candidateResponses?.[`q${i}`] || "Candidate provided a comprehensive response covering relevant experience and skills."}
      `,
        )
        .join("\n")}
      
      Evaluate the candidate on:
      1. Technical competency (if applicable)
      2. Communication skills
      3. Cultural fit
      4. Problem-solving ability
      5. Experience relevance
      
      Provide a score out of ${stage.maxScore}, feedback, key highlights, and pass/fail decision.
      Pass threshold is 60% (${Math.floor(stage.maxScore * 0.6)}).
      
      Format as JSON:
      {
        "score": number,
        "feedback": "detailed feedback",
        "keyHighlights": ["highlight1", "highlight2"],
        "transcript": "simulated interview conversation",
        "passed": boolean
      }
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: `You are conducting a ${stage.name} for a software engineering position. Be thorough but fair in your evaluation.`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("AI interview error:", error)
      return {
        score: 0,
        feedback: "Technical error during interview evaluation",
        keyHighlights: [],
        transcript: "Interview could not be completed due to technical issues",
        passed: false,
      }
    }
  }

  static async generateFinalReport(
    pipeline: InterviewPipeline,
    candidate: CandidateApplication,
  ): Promise<InterviewPipeline> {
    const completedStages = pipeline.stages.filter((s) => s.status === "passed" || s.status === "failed")
    const totalScore = completedStages.reduce((sum, stage) => sum + (stage.score || 0), 0)
    const maxPossibleScore = completedStages.reduce((sum, stage) => sum + stage.maxScore, 0)
    const overallScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0

    const passedStages = completedStages.filter((s) => s.status === "passed").length
    const successRate = completedStages.length > 0 ? Math.round((passedStages / completedStages.length) * 100) : 0

    if (!hasOpenAIKey || typeof window !== "undefined") {
      pipeline.finalRecommendation = {
        decision: overallScore >= 60 ? "recommend" : "reject",
        overallScore,
        successRate,
        summary: "Mock final summary (AI key missing).",
        strengths: ["Strong fundamentals", "Team player"],
        weaknesses: ["Needs deeper system-design experience"],
        reasoning: "This recommendation was produced in mock-mode because no OpenAI key is configured.",
      }
      pipeline.overallProgress = 100
      pipeline.updatedAt = new Date().toISOString()
      return pipeline
    }

    const prompt = `
      Generate a final hiring recommendation based on this interview pipeline:
      
      Candidate: ${candidate.fullName}
      Position: Software Engineer
      
      Interview Results:
      ${completedStages
        .map(
          (stage) => `
        ${stage.name}: ${stage.score}/${stage.maxScore} - ${stage.status}
        Feedback: ${stage.feedback}
        Highlights: ${stage.keyHighlights?.join(", ")}
      `,
        )
        .join("\n")}
      
      Overall Score: ${overallScore}/100
      Success Rate: ${successRate}%
      
      Provide a comprehensive recommendation including:
      1. Hire/Don't Hire decision
      2. Summary of performance
      3. Key strengths
      4. Areas for improvement
      5. Reasoning for decision
      
      Format as JSON:
      {
        "decision": "recommend" or "reject",
        "summary": "comprehensive summary",
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "reasoning": "detailed reasoning for decision"
      }
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "You are a senior hiring manager making final hiring decisions. Be thorough and fair.",
      })

      const recommendation = JSON.parse(text)

      pipeline.finalRecommendation = {
        ...recommendation,
        overallScore,
        successRate,
      }

      pipeline.overallProgress = 100
      pipeline.updatedAt = new Date().toISOString()

      return pipeline
    } catch (error) {
      console.error("Final report generation error:", error)

      pipeline.finalRecommendation = {
        decision: overallScore >= 60 ? "recommend" : "reject",
        overallScore,
        successRate,
        summary: "Candidate evaluation completed with mixed results",
        strengths: ["Technical competency", "Communication skills"],
        weaknesses: ["Limited experience in some areas"],
        reasoning: "Decision based on overall interview performance and scores",
      }

      return pipeline
    }
  }
}
