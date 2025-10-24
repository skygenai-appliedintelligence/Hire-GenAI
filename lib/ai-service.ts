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
  ): Promise<{ questions: string[], usage?: { promptTokens: number, completionTokens: number } }> {
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
          return { 
            questions: this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions),
            usage: undefined
          }
        }

        try {
          const data = await response.json()
          const raw: string[] = Array.isArray(data.questions) ? data.questions : []
          const apiUsage = data.usage || undefined
          // Apply the same dedupe/backfill logic on client to enforce uniqueness even if API doesn't
          const norm = (s: string) => {
            let t = String(s || '')
            // Remove explicit focus hints/parentheticals and trailing focusing-on clauses
            t = t.replace(/\([^)]*focus[^)]*\)/gi, '') // remove (Focus: X)
            t = t.replace(/,\s*focusing\s+on\s+[^,.?!]+[.?!]?$/gi, '')
            t = t.replace(/\bfocusing\s+on\s+[^,.?!]+[.?!]?$/gi, '')
            t = t.replace(/\bfocused\s+on\s+[^,.?!]+[.?!]?$/gi, '')
            t = t.replace(/\bplease\s*focus(?:\s*specifically)?\s*on\s+[^,.?!]+[.?!]?$/gi, '')
            t = t.replace(/\bplease\s+focus[^.?!]*[.?!]?$/gi, '')
            t = t.replace(/\bplease\b[^.?!]*[.?!]?$/gi, '')
            t = t.replace(/\bsee\s+the\s+question\b[^.?!]*[.?!]?$/gi, '')
            // Remove leading JD-emphasis boilerplate to reduce near-duplicates
            t = t.replace(/^\s*based\s+on\s+the\s+jd\s+emphasis\s+on\s+[^,]+,\s*/gi, '')
            // Collapse redundant patterns like "rpa and working with rpa" -> "rpa"
            t = t.replace(/\b(\w+)\b\s+and\s+working\s+with\s+\1\b/gi, '$1')
            // Mask variable-heavy phrases so different X map to same stem
            t = t.replace(/\bscales?\s+for\s+heavy\s+[a-z0-9\s\-\/&+]+\s+workloads?\b/gi, 'scales for heavy workloads')
            t = t.replace(/\boptimi[sz]e\s+performance\s+in\s+a\s+system\s+focused\s+on\s+[a-z0-9\s\-\/&+]+/gi, 'optimize performance in a system')
            // Collapse whitespace, remove trailing punctuation, lowercase
            t = t.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/g, '')
            return t.toLowerCase()
          }
          const seed = Array.isArray(existingQuestions) ? existingQuestions.map(norm) : []
          const seen = new Set<string>(seed)
          const usedStarts = new Set<string>()
          const usedStems = new Set<string>()
          const startKey = (s: string) => {
            const t = norm(s)
            const words = t.split(' ')
            return words.slice(0, 3).join(' ')
          }
          const stemKey = (s: string) => {
            let t = norm(s)
            // Remove common variable tails such as "related to X", "about X", "with X", "involving X", "regarding X"
            t = t.replace(/\b(related to|about|with|involving|regarding)\s+[a-z0-9\s\-\/&+]+/gi, '')
            // Collapse whitespace again
            t = t.replace(/\s+/g, ' ').trim()
            // Use first 6 words as the stem signature
            return t.split(' ').slice(0, 6).join(' ')
          }
          const clean = (s: string) => {
            // Apply similar cleanup as norm but preserve casing and terminal '?'
            let t = String(s || '')
            t = t.replace(/\([^)]*focus[^)]*\)/gi, '')
            t = t.replace(/,\s*focusing\s+on\s+[^,.?!]+/gi, '')
            t = t.replace(/\bfocusing\s+on\s+[^,.?!]+/gi, '')
            t = t.replace(/\bfocused\s+on\s+[^,.?!]+/gi, '')
            t = t.replace(/^\s*based\s+on\s+the\s+jd\s+emphasis\s+on\s+[^,]+,\s*/gi, '')
            t = t.replace(/\s+/g, ' ').trim()
            return t
          }
          const unique: string[] = []
          for (const q of raw) {
            const k = norm(q)
            const sk = startKey(q)
            const tk = stemKey(q)
            if (q && !seen.has(k) && !usedStarts.has(sk) && !usedStems.has(tk)) {
              unique.push(clean(q))
              seen.add(k)
              usedStarts.add(sk)
              usedStems.add(tk)
            }
          }
          if (unique.length < numberOfQuestions) {
            // Pass 1: large backfill pool with full variety checks
            const fill = this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions * 8)
            for (const q of fill) {
              const k = norm(q)
              const sk = startKey(q)
              const tk = stemKey(q)
              if (!seen.has(k) && !usedStarts.has(sk) && !usedStems.has(tk)) {
                unique.push(clean(q))
                seen.add(k)
                usedStarts.add(sk)
                usedStems.add(tk)
              }
              if (unique.length >= numberOfQuestions) break
            }
          }
          if (unique.length < numberOfQuestions) {
            // Pass 2: relax stem constraint, keep different openers
            const fill2 = this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions * 8)
            for (const q of fill2) {
              const k = norm(q)
              const sk = startKey(q)
              if (!seen.has(k) && !usedStarts.has(sk)) {
                unique.push(clean(q))
                seen.add(k)
                usedStarts.add(sk)
              }
              if (unique.length >= numberOfQuestions) break
            }
          }
          if (unique.length < numberOfQuestions) {
            // Pass 3: relax opener/stem, ensure only canonical uniqueness
            const fill3 = this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions * 8)
            for (const q of fill3) {
              const k = norm(q)
              if (!seen.has(k)) {
                unique.push(clean(q))
                seen.add(k)
              }
              if (unique.length >= numberOfQuestions) break
            }
          }
          return { 
            questions: unique.slice(0, numberOfQuestions),
            usage: apiUsage
          }
        } catch (e) {
          console.error('Failed to parse AI API response as JSON', e)
          return { 
            questions: this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions),
            usage: undefined
          }
        }
      } catch (error) {
        console.error('Error calling AI API:', error)
        // Fall back to mock questions
        return { 
          questions: this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions),
          usage: undefined
        }
      }
    }

    // Server-side logic
    if (!hasOpenAIKey()) {
      return { 
        questions: this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions),
        usage: undefined
      }
    }

    const agentTypePrompts = {
      "Screening Agent": "Generate basic qualification, work experience, and general fit questions. Focus on: basic qualifications, work experience, general fit, availability, salary expectations, and company knowledge.",
      "Initial Interview Agent": "Generate skill-based, role-relevant, and scenario-based questions. Focus on: relevant experience, problem-solving abilities, work style, and role-specific scenarios.",
      "Technical Interview Agent": "Generate in-depth technical or domain-specific questions. Focus on: technical skills, problem-solving, system design, coding challenges, and technical decision-making.",
      "Behavioral Interview Agent": "Generate soft skills, teamwork, and conflict resolution questions. Focus on: leadership, teamwork, communication, conflict resolution, and cultural fit."
    }

    const focus = Array.isArray(skills) && skills.length > 0 ? `\nFOCUS SKILLS (must influence questions):\n${skills.map((s, i)=>`- ${s}`).join('\n')}\n` : ''
    const prompt = `
You are an AI Interview Question Generator for an automated hiring platform.

JOB DESCRIPTION:
${jobDescription}

INTERVIEW STAGE/AGENT TYPE: ${agentType}
NUMBER OF QUESTIONS REQUIRED: ${numberOfQuestions}

INSTRUCTIONS:
- Read the JD carefully and extract the key skills, requirements, and responsibilities.
- Use the FOCUS SKILLS list as a guidance signal; prefer questions that validate these skills as they appear in the JD context.
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
  5. When FOCUS SKILLS are provided, ensure coverage across them where reasonable (not necessarily one-to-one), and each question should be obviously connected to either a JD requirement or a FOCUS SKILL.

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
      // Fail fast on quota/latency: no retries and a short timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10s ceiling
      const { text, usage } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        system: "You are an AI Interview Question Generator. Generate relevant, clear, and role-specific interview questions based on the job description and interview stage.",
        maxRetries: 0,
        abortSignal: controller.signal,
      })
      clearTimeout(timeout)

      // Extract real token usage from OpenAI response
      const tokenUsage = usage ? {
        promptTokens: (usage as any).promptTokens || 0,
        completionTokens: (usage as any).completionTokens || 0
      } : undefined

      // Parse the response to extract questions
      const lines = text.split('\n').filter(line => line.trim().startsWith('Q'))
      const parsed = lines.slice(0, numberOfQuestions).map(line => {
        const match = line.match(/Q\d+:\s*(.+)/)
        return match ? match[1].trim() : line.replace(/Q\d+:\s*/, '').trim()
      })

      // Deduplicate (case/space insensitive) and avoid prior existingQuestions
      const norm = (s: string) => {
        let t = String(s || '')
        // Remove explicit focus suffixes or parentheticals the model may add
        t = t.replace(/\([^)]*focus[^)]*\)/gi, '') // remove (Focus: X)
        t = t.replace(/,\s*focusing\s+on\s+[^,.?!]+[.?!]?$/gi, '')
        t = t.replace(/\bfocusing\s+on\s+[^,.?!]+[.?!]?$/gi, '')
        t = t.replace(/\bfocused\s+on\s+[^,.?!]+[.?!]?$/gi, '')
        t = t.replace(/\bplease\s*focus(?:\s*specifically)?\s*on\s+[^,.?!]+[.?!]?$/gi, '')
        t = t.replace(/\bplease\s+focus[^.?!]*[.?!]?$/gi, '')
        t = t.replace(/\bplease\b[^.?!]*[.?!]?$/gi, '')
        t = t.replace(/\bsee\s+the\s+question\b[^.?!]*[.?!]?$/gi, '')
        // Remove leading JD-emphasis boilerplate to reduce near-duplicates
        t = t.replace(/^\s*based\s+on\s+the\s+jd\s+emphasis\s+on\s+[^,]+,\s*/gi, '')
        // Collapse redundant patterns like "rpa and working with rpa" -> "rpa"
        t = t.replace(/\b(\w+)\b\s+and\s+working\s+with\s+\1\b/gi, '$1')
        // Mask variable-heavy phrases so different X map to same stem
        t = t.replace(/\bscales?\s+for\s+heavy\s+[a-z0-9\s\-\/&+]+\s+workloads?\b/gi, 'scales for heavy workloads')
        t = t.replace(/\boptimi[sz]e\s+performance\s+in\s+a\s+system\s+focused\s+on\s+[a-z0-9\s\-\/&+]+/gi, 'optimize performance in a system')
        // Collapse whitespace, remove trailing punctuation, lowercase
        t = t.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/g, '')
        return t.toLowerCase()
      }
      const seed = Array.isArray(existingQuestions) ? existingQuestions.map(norm) : []
      const seen = new Set<string>(seed)
      const usedStarts = new Set<string>()
      const usedStems = new Set<string>()
      const startKey = (s: string) => {
        const t = norm(s)
        const words = t.split(' ')
        return words.slice(0, 3).join(' ')
      }
      const stemKey = (s: string) => {
        let t = norm(s)
        t = t.replace(/\b(related to|about|with|involving|regarding)\s+[a-z0-9\s\-\/&+]+/gi, '')
        t = t.replace(/\s+/g, ' ').trim()
        return t.split(' ').slice(0, 6).join(' ')
      }
      const clean = (s: string) => {
        let t = String(s || '')
        t = t.replace(/\([^)]*focus[^)]*\)/gi, '')
        t = t.replace(/,\s*focusing\s+on\s+[^,.?!]+/gi, '')
        t = t.replace(/\bfocusing\s+on\s+[^,.?!]+/gi, '')
        t = t.replace(/\bfocused\s+on\s+[^,.?!]+/gi, '')
        t = t.replace(/^\s*based\s+on\s+the\s+jd\s+emphasis\s+on\s+[^,]+,\s*/gi, '')
        t = t.replace(/\s+/g, ' ').trim()
        return t
      }
      const unique: string[] = []
      for (const q of parsed) {
        const k = norm(q)
        const sk = startKey(q)
        const tk = stemKey(q)
        if (q && !seen.has(k) && !usedStarts.has(sk) && !usedStems.has(tk)) {
          unique.push(clean(q))
          seen.add(k)
          usedStarts.add(sk)
          usedStems.add(tk)
        }
      }

      // Backfill with mock to reach exactly numberOfQuestions
      if (unique.length < numberOfQuestions) {
        // Pass 1: large backfill pool with full variety checks
        const fill = this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions * 8)
        for (const q of fill) {
          const k = norm(q)
          const sk = startKey(q)
          const tk = stemKey(q)
          if (!seen.has(k) && !usedStarts.has(sk) && !usedStems.has(tk)) {
            unique.push(clean(q))
            seen.add(k)
            usedStarts.add(sk)
            usedStems.add(tk)
          }
          if (unique.length >= numberOfQuestions) break
        }
      }
      if (unique.length < numberOfQuestions) {
        // Pass 2: relax stem constraint, keep different openers
        const fill2 = this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions * 8)
        for (const q of fill2) {
          const k = norm(q)
          const sk = startKey(q)
          if (!seen.has(k) && !usedStarts.has(sk)) {
            unique.push(clean(q))
            seen.add(k)
            usedStarts.add(sk)
          }
          if (unique.length >= numberOfQuestions) break
        }
      }
      if (unique.length < numberOfQuestions) {
        // Pass 3: relax opener/stem, ensure only canonical uniqueness
        const fill3 = this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions * 8)
        for (const q of fill3) {
          const k = norm(q)
          if (!seen.has(k)) {
            unique.push(clean(q))
            seen.add(k)
          }
          if (unique.length >= numberOfQuestions) break
        }
      }

      return { 
        questions: unique.slice(0, numberOfQuestions),
        usage: tokenUsage
      }
    } catch (error) {
      console.error("Interview question generation error:", error)
      return { 
        questions: this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions),
        usage: undefined
      }
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

  private static getJDAdaptedMock(jobDescription: string, agentType: string, numberOfQuestions: number, extraSkills?: string[]): string[] {
    const text = String(jobDescription || "")
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
    const stop = new Set(["the","and","for","with","a","an","of","to","in","on","at","by","as","is","are","be","or","from","this","that","you","we","our","your","like"]) 
    const freq = new Map<string, number>()
    for (const w of words) {
      if (w.length < 3 || stop.has(w)) continue
      freq.set(w, (freq.get(w) || 0) + 1)
    }
    const top = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([w])=>w)
    const roleMatch = text.match(/(?:role|position|title)[:\s-]*([^\n]+)/i)
    const role = roleMatch ? roleMatch[1].trim() : (top[0] ? top[0] : "the role")

    // Simple deterministic shuffle seeded by JD hash, so different JDs => different ordering
    const hash = (s: string) => {
      let h = 2166136261 >>> 0
      for (let i=0;i<s.length;i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
      }
      return h >>> 0
    }
    const seed = hash(text)
    let rng = seed
    const rand = () => {
      // xorshift32
      rng ^= rng << 13; rng >>>= 0
      rng ^= rng >> 17; rng >>>= 0
      rng ^= rng << 5;  rng >>>= 0
      return (rng >>> 0) / 0xFFFFFFFF
    }
    const shuffle = <T,>(arr: T[]) => {
      const a = arr.slice()
      for (let i=a.length-1;i>0;i--) {
        const j = Math.floor(rand()*(i+1))
        ;[a[i],a[j]] = [a[j],a[i]]
      }
      return a
    }

    // Merge JD keywords with provided skills (if any), prioritizing skills to improve variety
    const skillsNorm = (extraSkills || [])
      .map(s => String(s).toLowerCase().trim())
      .filter(Boolean)
    const merged: string[] = []
    const seenKW = new Set<string>()
    for (const s of skillsNorm) { if (!seenKW.has(s)) { merged.push(s); seenKW.add(s) } }
    for (const w of top) { if (!seenKW.has(w)) { merged.push(w); seenKW.add(w) } }
    const kw = merged.length > 0 ? merged : ["experience","skills","project"]

    const make = (tpl: string, a?: string, b?: string, c?: string) =>
      tpl
        .replace(/\{role\}/g, role)
        .replace(/\{kw1\}/g, a || kw[0] || role)
        .replace(/\{kw2\}/g, b || kw[1] || kw[0] || role)
        .replace(/\{kw3\}/g, c || kw[2] || kw[1] || kw[0] || role)

    const pools: Record<string, string[]> = {
      "Screening Agent": [
        "Can you summarize your experience relevant to {role} and working with {kw1}?",
        "What attracts you to this {role} opportunity and our work with {kw2}?",
        "Which requirement in the JD do you best satisfy, and why?",
        "What timeline are you targeting to join if selected for {role}?",
        "What do you understand about our product or domain related to {kw3}?",
        "Which achievements best demonstrate your fit for {role}?",
        "Tell us about a recent accomplishment related to {kw1} or {kw2} and its impact.",
        "Based on the JD emphasis on {kw1} and {kw2}, where do you see your strongest alignment?",
        "What aspects of {kw1} have you handled end-to-end that are relevant to {role}?",
        "Describe a situation where {kw2} was critical to your success in a prior role."
      ],
      "Initial Interview Agent": [
        "Walk me through a project where you applied {kw1} or {kw2}. What was your role and impact?",
        "How would you approach a new requirement in {kw3} with ambiguous scope?",
        "Describe how you prioritize tasks when balancing {kw1} and stakeholder deadlines.",
        "Tell me about a time you unblocked a team on {kw2}. What did you do?",
        "Which part of the JD do you see as the quickest win in your first 30 days, and how?",
        "What trade-offs did you make in a recent project relevant to {role}?",
        "How do you validate success criteria when the JD highlights {kw1} and {kw3}?",
        "Explain how you collaborate across teams when work involves {kw2}."
      ],
      "Technical Interview Agent": [
        "Design a solution that scales for heavy {kw1} workloads—what architecture would you use and why?",
        "How would you optimize performance in a system focused on {kw2}?",
        "Explain your approach to testing and observability for features involving {kw3}.",
        "Walk through a debugging session you led related to {kw1}—root cause and fix.",
        "How would you design data models or APIs for {kw2}?",
        "What security considerations are critical when handling {kw3}?",
        "How would you design for resiliency when {kw1} is a core dependency?",
        "What trade-offs would you consider when implementing {kw2} under tight SLAs?"
      ],
      "Behavioral Interview Agent": [
        "Describe a conflict you resolved on a team working on {kw1}. What was your approach?",
        "Tell me about a time you influenced stakeholders around {kw2} without direct authority.",
        "How do you balance quality vs. speed when delivering {kw3}-heavy work?",
        "Give an example of feedback you received related to {kw1}. How did you act on it?",
        "When priorities changed late in a project related to {kw2}, how did you adapt?",
        "How do you create alignment across functions for a {role} initiative?",
        "Describe how you handled communication breakdowns while working on {kw3}.",
        "How do you build trust on a new team when {kw1} is a central theme of the work?"
      ]
    }

    const baseTemplates = pools[agentType as keyof typeof pools] || pools["Screening Agent"]
    // Build many candidates by mixing multiple keywords into templates
    const expanded: string[] = []
    const pair = (arr: string[]) => {
      const res: Array<[string,string]> = []
      for (let i=0;i<Math.min(arr.length,6);i++) {
        for (let j=i+1;j<Math.min(arr.length,6);j++) res.push([arr[i],arr[j]])
      }
      return res
    }
    const trip = (arr: string[]) => {
      const res: Array<[string,string,string]> = []
      for (let i=0;i<Math.min(arr.length,5);i++) {
        for (let j=i+1;j<Math.min(arr.length,6);j++) {
          for (let k=j+1;k<Math.min(arr.length,7);k++) res.push([arr[i],arr[j],arr[k]])
        }
      }
      return res
    }

    for (const tpl of baseTemplates) {
      expanded.push(make(tpl))
      for (const [a,b] of pair(kw)) expanded.push(make(tpl, a, b))
      for (const [a,b,c] of trip(kw)) expanded.push(make(tpl, a, b, c))
    }

    // Shuffle deterministically so different JDs create different ordering
    const shuffled = shuffle(expanded)
    const out: string[] = []
    const seen = new Set<string>()
    for (const q of shuffled) {
      const key = q.toLowerCase()
      if (!seen.has(key)) {
        out.push(q)
        seen.add(key)
      }
      if (out.length >= numberOfQuestions) break
    }
    return out.slice(0, numberOfQuestions)
  }

  /**
   * JD + Skills aware mock fallback. Uses JD keyword extraction plus provided skills
   * to form stage-appropriate questions. Ensures some coverage of the focus skills.
   */
  private static getJDAndSkillsMock(
    jobDescription: string,
    skills: string[],
    agentType: string,
    numberOfQuestions: number
  ): string[] {
    // Directly generate using a combined keyword pool (skills + JD keywords) so skill terms
    // appear in the core sentence (not as trailing phrases that normalization strips).
    return this.getJDAdaptedMock(jobDescription, agentType, numberOfQuestions, skills)
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

// ------------------ Multi-job question generation (JSON schema) ------------------
export namespace MultiJob {
  export type Guidelines = {
    focus_areas: string[]
    non_functionals?: string[]
    contexts: string[]
    count_per_job: number
    banned_phrases?: string[]
  }
  export type Job = {
    job_id: string
    title: string
    summary?: string
    must_have: string[]
    nice_to_have?: string[]
    domains?: string[]
    seniority?: string
  }
  export type Payload = {
    organization?: Record<string, any>
    global_guidelines: Guidelines
    jobs: Job[]
  }
  export type Question = {
    id: number
    text: string
    focus: string
    category: 'Security'|'Observability'|'Scalability'|'Resilience'|'Data Modeling'|'Testing'|'Integration'|'Cost'|'Compliance'|'Performance'
    context: string
    targets: string[]
    jd_trace: string[]
  }
  export type Result = { job_id: string, title: string, questions: Question[] }
}

export class AIMultiJobService {
  // Reuse normalization helpers from AIService logic (copy minimal variants locally)
  private static normBase(s: string): string {
    let t = String(s || '')
    t = t.replace(/\([^)]*focus[^)]*\)/gi, '')
    t = t.replace(/,\s*focusing\s+on\s+[^,.?!]+[.?!]?$/gi, '')
    t = t.replace(/\bfocusing\s+on\s+[^,.?!]+[.?!]?$/gi, '')
    t = t.replace(/\bfocused\s+on\s+[^,.?!]+[.?!]?$/gi, '')
    t = t.replace(/\bplease\s*focus(?:\s*specifically)?\s*on\s+[^,.?!]+[.?!]?$/gi, '')
    t = t.replace(/\bplease\s+focus[^.?!]*[.?!]?$/gi, '')
    t = t.replace(/\bplease\b[^.?!]*[.?!]?$/gi, '')
    t = t.replace(/\bsee\s+the\s+question\b[^.?!]*[.?!]?$/gi, '')
    t = t.replace(/^\s*based\s+on\s+the\s+jd\s+emphasis\s+on\s+[^,]+,\s*/gi, '')
    t = t.replace(/\b(\w+)\b\s+and\s+working\s+with\s+\1\b/gi, '$1')
    t = t.replace(/\bscales?\s+for\s+heavy\s+[a-z0-9\s\-\/&+]+\s+workloads?\b/gi, 'scales for heavy workloads')
    t = t.replace(/\boptimi[sz]e\s+performance\s+in\s+a\s+system\s+focused\s+on\s+[a-z0-9\s\-\/&+]+/gi, 'optimize performance in a system')
    t = t.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/g, '')
    return t.toLowerCase()
  }
  private static startKey(s: string): string {
    const w = this.normBase(s).split(' ')
    return w.slice(0, 3).join(' ')
  }
  private static stemKey(s: string): string {
    let t = this.normBase(s)
    t = t.replace(/\b(related to|about|with|involving|regarding)\s+[a-z0-9\s\-\/&+]+/gi, '')
    t = t.replace(/\s+/g, ' ').trim()
    return t.split(' ').slice(0, 6).join(' ')
  }

  static generate(payload: MultiJob.Payload): { results: MultiJob.Result[] } {
    const categories: MultiJob.Question['category'][] = [
      'Security','Observability','Scalability','Resilience','Data Modeling','Testing','Integration','Cost','Compliance','Performance'
    ]
    const { global_guidelines, jobs } = payload
    const focuses = global_guidelines.focus_areas || []
    const contexts = global_guidelines.contexts || []
    const banned = (global_guidelines.banned_phrases || []).map(x=>x.toLowerCase())
    const count = global_guidelines.count_per_job

    const results: MultiJob.Result[] = []

    for (const job of jobs) {
      const title = job.title
      const pool = [...(job.must_have||[]), ...(job.nice_to_have||[])]
        .map(s=>s.trim()).filter(Boolean)
      const targetsPool = pool.length ? pool : [title]

      const usedStarts = new Set<string>()
      const usedStems = new Set<string>()
      const questions: MultiJob.Question[] = []

      let fi = 0, ci = 0, xi = 0, id = 1
      const takeTargets = (): string[] => {
        const out = new Set<string>()
        for (let k=0; k<3 && out.size<3; k++) {
          const idx = (fi + ci + xi + k) % targetsPool.length
          out.add(targetsPool[idx])
        }
        return Array.from(out)
      }
      const ensureLenAndPunct = (text: string): string => {
        let t = text.trim()
        if (!t.endsWith('?')) t += '?'
        if (t.length < 90) {
          t = t.replace(/\?$/, ', keeping trade-offs explicit and outcomes measurable?')
        }
        if (t.length > 220) {
          t = t.slice(0, 218).replace(/[ ,;:.]*$/, '') + ' ?'
        }
        return t
      }

      while (questions.length < count) {
        const focus = focuses[fi % Math.max(1, focuses.length)] || focuses[0] || 'General'
        const category = categories[ci % categories.length]
        const context = contexts[xi % Math.max(1, contexts.length)] || contexts[0] || 'General'
        const targets = takeTargets()
        const trace = targets.slice(0, 2)

        // Template selection varies by category and focus
        const tgtA = targets[0]
        const tgtB = targets[1] || targets[0]
        let text = ''
        switch (category) {
          case 'Scalability':
            text = `When scaling ${tgtA} under ${context}, which patterns would you choose and why, and how would you validate capacity limits without inflating latency?`
            break
          case 'Performance':
            text = `How would you profile and optimize a ${tgtA}-centric path for ${context}, and which metrics would guide iterative tuning without risking regressions?`
            break
          case 'Observability':
            text = `What signals, traces, and dashboards would you design to make ${tgtA} issues diagnosable in ${context}, and how would alerts avoid noise while catching real faults?`
            break
          case 'Resilience':
            text = `Design failure handling for ${tgtA} in ${context}: retries, idempotency, and backoff—how do you prevent cascading failures and ensure graceful degradation?`
            break
          case 'Security':
            text = `For ${tgtA} in ${context}, which threats are most material and how would you harden auth, secrets, and data flows while preserving developer velocity?`
            break
          case 'Compliance':
            text = `How would you implement compliant handling for ${tgtA} under ${context}, and what controls and evidence would you put in place to pass audits reliably?`
            break
          case 'Integration':
            text = `Describe an integration strategy for ${tgtA} with ${tgtB} in ${context}; how do you manage contracts, retries, and schema evolution over time?`
            break
          case 'Data Modeling':
            text = `Propose a data model for ${tgtA} used in ${context}; what trade-offs do you make for query patterns, evolution, and backward compatibility?`
            break
          case 'Testing':
            text = `How would you structure tests for ${tgtA} in ${context}—from unit to end-to-end—to ensure fast feedback while preventing flakiness?`
            break
          case 'Cost':
            text = `How would you control run-time and platform costs for ${tgtA} in ${context}, and which levers would you prioritize before sacrificing reliability?`
            break
        }

        // Light touch focus adaptation
        if (/communication/i.test(focus)) {
          text = text.replace(/\?$/, ' How would you communicate risks and decisions to stakeholders?')
        } else if (/problem|debug/i.test(focus)) {
          text = text.replace(/\?$/, ' Which risks would you tackle first and how would you validate the fix?')
        } else if (/ownership|delivery|end-to-end/i.test(focus)) {
          text = text.replace(/\?$/, ' Outline milestones and a credible path to first value.')
        }

        text = ensureLenAndPunct(text)

        // Banned phrase check
        const lower = text.toLowerCase()
        if (banned.some(p => lower.includes(p))) {
          fi++; ci++; xi++; continue
        }

        // Dedup on starts and stems
        const sk = this.startKey(text)
        const tk = this.stemKey(text)
        if (usedStarts.has(sk) || usedStems.has(tk)) {
          fi++; ci++; xi++; continue
        }

        questions.push({
          id: id++,
          text,
          focus,
          category,
          context,
          targets,
          jd_trace: trace
        })

        usedStarts.add(sk)
        usedStems.add(tk)
        fi++; ci++; xi++
      }

      results.push({ job_id: job.job_id, title: job.title, questions })
    }

    return { results }
  }
}
