import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { config, isAIEnabled } from "./config"

// Check for OpenAI key in both server and client environments
const hasOpenAIKey = () => {
  return isAIEnabled()
}

export class AIService {
  static async screenCandidate(candidateData: {
    name: string
    email: string
    resume?: string
    jobDescription: string
    requirements: string
  }) {
    if (!hasOpenAIKey()) {
      return {
        status: "QUALIFIED",
        explanation: "Mock screening – add an OPENAI_API_KEY for real AI results.",
        strengths: ["Strong JavaScript skills", "Team leadership"],
        concerns: ["Lacks AWS certification"],
        nextSteps: "Proceed to technical interview",
      }
    }

    const prompt = `
      You are an AI recruitment assistant. Please evaluate this candidate for the given job position.
      
      Job Description: ${candidateData.jobDescription}
      Requirements: ${candidateData.requirements}
      
      Candidate: ${candidateData.name}
      Email: ${candidateData.email}
      Resume: ${candidateData.resume || "Not provided"}
      
      Please provide:
      1. A qualification status (QUALIFIED/UNQUALIFIED)
      2. A brief explanation (2-3 sentences)
      3. Key strengths or concerns
      4. Recommended next steps
      
      Format your response as JSON with the following structure:
      {
        "status": "QUALIFIED" or "UNQUALIFIED",
        "explanation": "Brief explanation",
        "strengths": ["strength1", "strength2"],
        "concerns": ["concern1", "concern2"],
        "nextSteps": "Recommended action"
      }
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "You are a professional recruitment AI assistant. Always respond with valid JSON.",
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("AI screening error:", error)
      return {
        status: "UNQUALIFIED",
        explanation: "Unable to process candidate screening",
        strengths: [],
        concerns: ["Technical error in screening process"],
        nextSteps: "Manual review required",
      }
    }
  }

  static async generateInterviewQuestions(jobTitle: string, level: string) {
    if (!hasOpenAIKey()) {
      return [
        { question: `Describe a recent ${jobTitle} challenge you solved.`, type: "behavioral" },
        { question: `Explain your favourite ${level} level design pattern.`, type: "technical" },
      ]
    }

    const prompt = `
      Generate 5 interview questions for a ${jobTitle} position at ${level} level.
      Include a mix of technical and behavioral questions.
      Format as JSON array of objects with "question" and "type" fields.
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "You are a professional recruitment AI assistant. Generate relevant interview questions.",
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("Question generation error:", error)
      return []
    }
  }

  /**
   * AI Interview Question Generator for automated hiring platform
   * @param jobDescription - The complete job description
   * @param agentType - Interview stage/agent type (Screening Agent, Initial Interview Agent, Technical Interview Agent, Behavioral Interview Agent)
   * @param numberOfQuestions - Number of questions required
   * @returns Array of questions formatted as Q1, Q2, etc.
   */
  static async generateStagedInterviewQuestions(
    jobDescription: string,
    agentType: "Screening Agent" | "Initial Interview Agent" | "Technical Interview Agent" | "Behavioral Interview Agent",
    numberOfQuestions: number,
    skills?: string[],
    existingQuestions?: string[],
    agentName?: string
  ): Promise<string[]> {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      // Use the API route for browser-side calls
      try {
        const response = await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobDescription,
            agentType,
            numberOfQuestions,
            skills: Array.isArray(skills) ? skills : undefined,
            existingQuestions: Array.isArray(existingQuestions) ? existingQuestions : undefined,
            agentName,
          }),
        })

        if (!response.ok) {
          try {
            const errText = await response.text()
            console.error('AI API returned non-OK status', response.status, errText)
          } catch {}
          return this.getJDAdaptedMock(jobDescription, agentType, numberOfQuestions)
        }

        try {
          const data = await response.json()
          return Array.isArray(data.questions) ? data.questions : this.getJDAdaptedMock(jobDescription, agentType, numberOfQuestions)
        } catch (e) {
          console.error('Failed to parse AI API response as JSON', e)
          return this.getJDAdaptedMock(jobDescription, agentType, numberOfQuestions)
        }
      } catch (error) {
        console.error('Error calling AI API:', error)
        // Fall back to mock questions
        return this.getMockQuestions(agentType, numberOfQuestions)
      }
    }

    // Server-side logic
    if (!hasOpenAIKey()) {
      return this.getJDAdaptedMock(jobDescription, agentType, numberOfQuestions)
    }

    const agentTypePrompts = {
      "Screening Agent": "Generate basic qualification, work experience, and general fit questions. Focus on: basic qualifications, work experience, general fit, availability, salary expectations, and company knowledge.",
      "Initial Interview Agent": "Generate skill-based, role-relevant, and scenario-based questions. Focus on: relevant experience, problem-solving abilities, work style, and role-specific scenarios.",
      "Technical Interview Agent": "Generate in-depth technical or domain-specific questions. Focus on: technical skills, problem-solving, system design, coding challenges, and technical decision-making.",
      "Behavioral Interview Agent": "Generate soft skills, teamwork, and conflict resolution questions. Focus on: leadership, teamwork, communication, conflict resolution, and cultural fit."
    }

    const focus = Array.isArray(skills) && skills.length > 0 ? `\nFOCUS SKILLS:\n${skills.map((s, i)=>`- ${s}`).join('\n')}\n` : ''
    const prompt = `
You are an AI Interview Question Generator for an automated hiring platform.

JOB DESCRIPTION:
${jobDescription}

INTERVIEW STAGE/AGENT TYPE: ${agentType}
NUMBER OF QUESTIONS REQUIRED: ${numberOfQuestions}

INSTRUCTIONS:
- Read the JD carefully and extract the key skills, requirements, and responsibilities
- Based on the interview stage/agent type, generate only relevant questions:
  • Screening Agent → Basic qualification, work experience, and general fit
  • Initial Interview Agent → Skill-based, role-relevant, and scenario-based
  • Technical Interview Agent → In-depth technical or domain-specific
  • Behavioral Interview Agent → Soft skills, teamwork, conflict resolution

- Ensure the questions are:
  1. Directly related to the role
  2. Clear, concise, and easy to understand
  3. Unique (no repetition)
  4. Suitable for the given interview stage

${agentTypePrompts[agentType]}
 ${focus}

OUTPUT FORMAT:
Generate exactly ${numberOfQuestions} questions in this format:
Q1: <question>
Q2: <question>
Q3: <question>
...
Q${numberOfQuestions}: <question>

Only provide the questions, no explanations or additional text.
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "You are an AI Interview Question Generator. Generate relevant, clear, and role-specific interview questions based on the job description and interview stage.",
      })

      // Parse the response to extract questions
      const lines = text.split('\n').filter(line => line.trim().startsWith('Q'))
      const questions = lines.slice(0, numberOfQuestions).map(line => {
        const match = line.match(/Q\d+:\s*(.+)/)
        return match ? match[1].trim() : line.replace(/Q\d+:\s*/, '').trim()
      })

      return questions.filter(q => q.length > 0)
    } catch (error) {
      console.error("Interview question generation error:", error)
      return this.getJDAdaptedMock(jobDescription, agentType, numberOfQuestions)
    }
  }

  /**
   * Get mock questions for fallback
   */
  private static getMockQuestions(agentType: string, numberOfQuestions: number): string[] {
    const mockQuestions = {
      "Screening Agent": [
        "Tell me about yourself and your background",
        "Why are you interested in this position?",
        "What are your salary expectations?",
        "When can you start?",
        "What do you know about our company?"
      ],
      "Initial Interview Agent": [
        "Describe a challenging project you worked on",
        "How do you handle tight deadlines?",
        "Tell me about a time you had to learn something new quickly",
        "How do you prioritize your work?",
        "Describe a situation where you had to work with a difficult team member"
      ],
      "Technical Interview Agent": [
        "How would you optimize the performance of a React application?",
        "Can you explain the difference between state and props in React?",
        "How do you handle cross-browser compatibility issues?",
        "What steps do you take to ensure accessibility in web applications?",
        "Can you describe your process for integrating a third-party API?"
      ],
      "Behavioral Interview Agent": [
        "How do you handle conflict in a team environment?",
        "Tell me about a time you had to resolve a difficult situation at work",
        "How do you give and receive feedback?",
        "Describe a time when you had to adapt to a significant change",
        "How do you handle stress and tight deadlines?"
      ]
    }
    
    const baseQuestions = mockQuestions[agentType as keyof typeof mockQuestions] || mockQuestions["Screening Agent"]
    return baseQuestions.slice(0, numberOfQuestions)
  }

  private static getJDAdaptedMock(jobDescription: string, agentType: string, numberOfQuestions: number): string[] {
    const text = String(jobDescription || "")
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
    const stop = new Set(["the","and","for","with","a","an","of","to","in","on","at","by","as","is","are","be","or","from","this","that","you","we","our","your"]) 
    const freq = new Map<string, number>()
    for (const w of words) {
      if (w.length < 3 || stop.has(w)) continue
      freq.set(w, (freq.get(w) || 0) + 1)
    }
    const top = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([w])=>w)
    const roleMatch = text.match(/(?:role|position|title)[:\s-]*([^\n]+)/i)
    const role = roleMatch ? roleMatch[1].trim() : (top[0] ? top[0] : "the role")

    const make = (q: string) => q.replace(/\{role\}/g, role).replace(/\{kw(\d)\}/g, (_m, i)=> top[Number(i)-1] || role)

    const templatesByAgent: Record<string, string[]> = {
      "Screening Agent": [
        "Can you summarize your experience relevant to {role} and working with {kw1}?",
        "What attracts you to this {role} opportunity and our work with {kw2}?",
        "Which requirement in the JD do you best satisfy, and why?",
        "What timeline are you targeting to join if selected for {role}?",
        "What do you understand about our product or domain related to {kw3}?",
        "Which achievements best demonstrate your fit for {role}?"
      ],
      "Initial Interview Agent": [
        "Walk me through a project where you applied {kw1} or {kw2}. What was your role and impact?",
        "How would you approach a new requirement in {kw3} with ambiguous scope?",
        "Describe how you prioritize tasks when balancing {kw4} and stakeholder deadlines.",
        "Tell me about a time you unblocked a team on {kw5}. What did you do?",
        "Which part of the JD do you see as the quickest win in your first 30 days, and how?",
        "What trade-offs did you make in a recent project relevant to {role}?"
      ],
      "Technical Interview Agent": [
        "Design a solution that scales for heavy {kw1} workloads—what architecture would you use and why?",
        "How would you optimize performance in a system focused on {kw2}?",
        "Explain your approach to testing and observability for features involving {kw3}.",
        "Walk through a debugging session you led related to {kw4}—root cause and fix.",
        "How would you design data models or APIs for {kw5}?",
        "What security considerations are critical when handling {kw6}?"
      ],
      "Behavioral Interview Agent": [
        "Describe a conflict you resolved on a team working on {kw1}. What was your approach?",
        "Tell me about a time you influenced stakeholders around {kw2} without direct authority.",
        "How do you balance quality vs. speed when delivering {kw3}-heavy work?",
        "Give an example of feedback you received related to {kw4}. How did you act on it?",
        "When priorities changed late in a project related to {kw5}, how did you adapt?",
        "How do you create alignment across functions for a {role} initiative?"
      ]
    }

    const templates = templatesByAgent[agentType as keyof typeof templatesByAgent] || templatesByAgent["Screening Agent"]
    const out: string[] = []
    const seen = new Set<string>()
    for (const t of templates) {
      const q = make(t)
      const key = q.toLowerCase()
      if (!seen.has(key)) {
        out.push(q)
        seen.add(key)
      }
      if (out.length >= numberOfQuestions) break
    }

    // Deduplicate and cap
    return out.slice(0, numberOfQuestions)
  }

  static async scheduleInterview(candidateName: string, jobTitle: string) {
    if (!hasOpenAIKey()) {
      return `Hi ${candidateName},

We'd like to schedule a 30-minute call for the ${jobTitle} role.
Please share your availability this week.

Best,
HireGenAI Team`
    }

    const prompt = `
      Generate a professional email template to schedule an interview with ${candidateName} for the ${jobTitle} position.
      Include:
      1. Professional greeting
      2. Interview invitation
      3. Request for availability
      4. Next steps
      
      Keep it concise and professional.
    `

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "You are a professional recruitment AI assistant. Generate professional communication.",
      })

      return text
    } catch (error) {
      console.error("Email generation error:", error)
      return "Error generating email template"
    }
  }
}
