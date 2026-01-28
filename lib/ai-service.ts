import { generateText } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"
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
    agentName?: string,
    companyApiKey?: string,
    companyProjectId?: string
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
    // Check for company API key first, then fall back to environment
    const hasValidKey = companyApiKey || hasOpenAIKey()
    if (!hasValidKey) {
      console.log('⚠️  [AI Service] No OpenAI API key available, using mock questions')
      return { 
        questions: this.getJDAndSkillsMock(jobDescription, Array.isArray(skills) ? skills : [], agentType, numberOfQuestions),
        usage: undefined
      }
    }

    // Create custom OpenAI provider with company credentials if available
    const openaiProvider = companyApiKey 
      ? createOpenAI({ 
          apiKey: companyApiKey,
          project: companyProjectId || undefined,
        })
      : openai

    if (companyApiKey) {
      console.log('✅ [AI Service] Using company service account key for question generation')
      if (companyProjectId) {
        console.log('📊 [AI Service] Project ID:', companyProjectId)
      }
    } else {
      console.log('⚠️  [AI Service] Using environment OPENAI_API_KEY for question generation')
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

CRITICAL UNIQUENESS REQUIREMENT:
**EVERY SINGLE QUESTION MUST BE COMPLETELY UNIQUE AND DIFFERENT FROM ALL OTHERS.**
- Do NOT generate questions that ask the same thing in different words
- Do NOT generate questions with the same core intent or topic
- Each question must cover a DIFFERENT aspect, skill, or scenario
- Vary the question structure (some "How would you...", some "Describe a time...", some "What is your approach to...", etc.)
- If asking about multiple skills, ensure each question focuses on a DIFFERENT skill
- NEVER repeat or rephrase the same concept twice

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
  3. **100% UNIQUE - no duplicates, no rephrasing, no similar questions**
  4. Suitable for the given interview stage
  5. When FOCUS SKILLS are provided, ensure coverage across them where reasonable (not necessarily one-to-one), and each question should be obviously connected to either a JD requirement or a FOCUS SKILL.
  6. Each question should test a DIFFERENT competency or aspect of the candidate

${agentTypePrompts[agentType]}
 ${focus}

OUTPUT FORMAT:
Generate exactly ${numberOfQuestions} UNIQUE questions in this format:
Q1: <question about topic A>
Q2: <question about topic B - DIFFERENT from Q1>
Q3: <question about topic C - DIFFERENT from Q1 and Q2>
...
Q${numberOfQuestions}: <question about topic ${numberOfQuestions} - DIFFERENT from all previous>

Before outputting, mentally verify that NO TWO questions are similar in meaning or intent.
Only provide the questions, no explanations or additional text.
    `

    try {
      // Fail fast on quota/latency: no retries and a short timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000) // 15s ceiling (increased for better reliability)
      const { text, usage } = await generateText({
        model: openaiProvider("gpt-4o"),
        prompt,
        system: "You are an AI Interview Question Generator. Generate relevant, clear, and role-specific interview questions based on the job description and interview stage. CRITICAL: Every question MUST be completely unique - no duplicates, no rephrasing, no similar questions. Each question must test a different competency or aspect.",
        maxRetries: 0,
        abortSignal: controller.signal,
      })
      clearTimeout(timeout)

      // Extract real token usage from OpenAI response
      const tokenUsage = usage ? {
        promptTokens: (usage as any).promptTokens || (usage as any).prompt_tokens || 0,
        completionTokens: (usage as any).completionTokens || (usage as any).completion_tokens || 0
      } : undefined

      // Debug logging to see actual usage object structure
      if (usage) {
        console.log('🔍 [AI Service] OpenAI usage object received:', JSON.stringify(usage, null, 2))
        console.log('🔍 [AI Service] Extracted tokens:', {
          promptTokens: tokenUsage?.promptTokens,
          completionTokens: tokenUsage?.completionTokens
        })
      }

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

  /**
   * NEW: Criteria-Based Interview Question Generator
   * Generates exactly 10 questions based on HR-selected evaluation criteria (max 5)
   * No interview stages - questions are distributed across selected criteria
   * 
   * @param jobDescription - The complete job description
   * @param selectedCriteria - Array of selected evaluation criteria (1-5 from the 9 available)
   * @param companyApiKey - Optional company-specific OpenAI API key
   * @param companyProjectId - Optional company-specific OpenAI project ID
   * @returns Array of 10 questions and token usage
   */
  static async generateCriteriaBasedQuestions(
    jobDescription: string,
    selectedCriteria: string[],
    existingQuestions?: string[],
    companyApiKey?: string,
    companyProjectId?: string
  ): Promise<{ questions: string[], usage?: { promptTokens: number, completionTokens: number } }> {
    
    const TOTAL_QUESTIONS = 10
    
    // Validate criteria
    if (!selectedCriteria || selectedCriteria.length === 0) {
      console.error('❌ [AI Service] No evaluation criteria selected')
      return { questions: this.getCriteriaMockQuestions(selectedCriteria, TOTAL_QUESTIONS), usage: undefined }
    }
    
    if (selectedCriteria.length > 5) {
      console.error('❌ [AI Service] Too many criteria selected (max 5)')
      return { questions: this.getCriteriaMockQuestions(selectedCriteria.slice(0, 5), TOTAL_QUESTIONS), usage: undefined }
    }

    // Check if we're in the browser - use API route
    if (typeof window !== "undefined") {
      try {
        const response = await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription,
            selectedCriteria,
            numberOfQuestions: TOTAL_QUESTIONS,
            existingQuestions: Array.isArray(existingQuestions) ? existingQuestions : undefined,
            useCriteriaBased: true
          }),
        })

        if (!response.ok) {
          console.error('AI API returned non-OK status', response.status)
          return { questions: this.getCriteriaMockQuestions(selectedCriteria, TOTAL_QUESTIONS), usage: undefined }
        }

        const data = await response.json()
        return { 
          questions: Array.isArray(data.questions) ? data.questions.slice(0, TOTAL_QUESTIONS) : [],
          usage: data.usage || undefined
        }
      } catch (error) {
        console.error('Error calling AI API:', error)
        return { questions: this.getCriteriaMockQuestions(selectedCriteria, TOTAL_QUESTIONS), usage: undefined }
      }
    }

    // Server-side logic
    const hasValidKey = companyApiKey || hasOpenAIKey()
    if (!hasValidKey) {
      console.log('⚠️  [AI Service] No OpenAI API key available, using mock questions')
      return { questions: this.getCriteriaMockQuestions(selectedCriteria, TOTAL_QUESTIONS), usage: undefined }
    }

    // Create custom OpenAI provider with company credentials if available
    const openaiProvider = companyApiKey 
      ? createOpenAI({ 
          apiKey: companyApiKey,
          project: companyProjectId || undefined,
        })
      : openai

    if (companyApiKey) {
      console.log('✅ [AI Service] Using company service account key for criteria-based question generation')
      if (companyProjectId) {
        console.log('📊 [AI Service] Project ID:', companyProjectId)
      }
    } else {
      console.log('⚠️  [AI Service] Using environment OPENAI_API_KEY for question generation')
    }

    // Build the criteria list for the prompt
    const criteriaList = selectedCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
    
    const prompt = `You are an AI Interview Question Generator for a hiring platform.

Your task is to generate interview questions strictly based on the SELECTED EVALUATION CRITERIA provided by HR.

==================================================
AVAILABLE EVALUATION CRITERIA (REFERENCE ONLY)
==================================================
The system supports the following evaluation criteria:

1. Technical Skills
2. Problem Solving
3. Communication
4. Experience
5. Culture Fit
6. Teamwork / Collaboration
7. Leadership
8. Adaptability / Learning
9. Work Ethic / Reliability

NOTE:
- HR has selected specific criteria from this list.
- You MUST ONLY generate questions for the selected criteria.
- There is NO interview stage concept. Do NOT assume or reference stages.

==================================================
JOB DESCRIPTION
==================================================
${jobDescription}

==================================================
SELECTED EVALUATION CRITERIA (${selectedCriteria.length} selected)
==================================================
${criteriaList}

==================================================
QUESTION GENERATION RULES (CRITICAL)
==================================================

1) Generate EXACTLY ${TOTAL_QUESTIONS} interview questions.
2) Every question MUST clearly align with ONE of the selected criteria.
3) Distribute questions reasonably across the selected criteria:
   - If fewer criteria are selected, increase depth per criterion.
   - If more criteria are selected, ensure each is covered at least once.
4) Do NOT repeat intent or rephrase the same question.
5) Each question must test a DIFFERENT aspect of the criterion.
6) Questions must sound like they are asked by a real human interviewer.
7) Avoid academic, exam-style, or textbook wording.
8) Questions should work for both technical and non-technical roles, depending on the selected criteria.

==================================================
QUESTION STYLE GUIDELINES
==================================================

- Keep questions clear, practical, and conversational.
- Do NOT force long explanations.
- Short but insightful answers should be possible.
- Avoid unnecessary multi-part or confusing questions.
- Prefer real-world and experience-based phrasing.

==================================================
OUTPUT FORMAT (STRICT)
==================================================

Return ONLY the questions in this format:

Q1: <question text>
Q2: <question text>
Q3: <question text>
...
Q${TOTAL_QUESTIONS}: <question text>

- Do NOT mention criteria names in the output.
- Do NOT include explanations.
- Do NOT include any text before or after the questions.

==================================================
FINAL CHECK BEFORE OUTPUT
==================================================

Before responding, verify that:
- All questions relate ONLY to the selected criteria
- No selected criterion is ignored
- No two questions test the same intent
- Questions feel realistic and interview-appropriate

Now generate the ${TOTAL_QUESTIONS} questions.`

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      
      const { text, usage } = await generateText({
        model: openaiProvider("gpt-4o"),
        prompt,
        system: "You are an AI Interview Question Generator. Generate exactly 10 unique, criteria-aligned interview questions. Each question must be conversational, practical, and test a different aspect. Do NOT mention criteria names in questions. Output ONLY Q1-Q10 format.",
        maxRetries: 0,
        abortSignal: controller.signal,
      })
      clearTimeout(timeout)

      // Extract token usage
      const tokenUsage = usage ? {
        promptTokens: (usage as any).promptTokens || (usage as any).prompt_tokens || 0,
        completionTokens: (usage as any).completionTokens || (usage as any).completion_tokens || 0
      } : undefined

      if (usage) {
        console.log('🔍 [AI Service] Criteria-based generation - tokens:', {
          promptTokens: tokenUsage?.promptTokens,
          completionTokens: tokenUsage?.completionTokens
        })
      }

      // Parse questions
      const lines = text.split('\n').filter(line => line.trim().startsWith('Q'))
      const parsed = lines.slice(0, TOTAL_QUESTIONS).map(line => {
        const match = line.match(/Q\d+:\s*(.+)/)
        return match ? match[1].trim() : line.replace(/Q\d+:\s*/, '').trim()
      })

      // Deduplicate
      const norm = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.?!]+$/g, '')
      const seed = Array.isArray(existingQuestions) ? existingQuestions.map(norm) : []
      const seen = new Set<string>(seed)
      const unique: string[] = []
      
      for (const q of parsed) {
        const k = norm(q)
        if (q && !seen.has(k)) {
          unique.push(q)
          seen.add(k)
        }
      }

      // Backfill if needed
      if (unique.length < TOTAL_QUESTIONS) {
        const fill = this.getCriteriaMockQuestions(selectedCriteria, TOTAL_QUESTIONS * 2)
        for (const q of fill) {
          const k = norm(q)
          if (!seen.has(k)) {
            unique.push(q)
            seen.add(k)
          }
          if (unique.length >= TOTAL_QUESTIONS) break
        }
      }

      return { questions: unique.slice(0, TOTAL_QUESTIONS), usage: tokenUsage }
    } catch (error) {
      console.error("Criteria-based question generation error:", error)
      return { questions: this.getCriteriaMockQuestions(selectedCriteria, TOTAL_QUESTIONS), usage: undefined }
    }
  }

  /**
   * Mock questions for criteria-based generation fallback
   */
  private static getCriteriaMockQuestions(selectedCriteria: string[], count: number): string[] {
    const criteriaQuestions: Record<string, string[]> = {
      'Technical Skills': [
        "What technical tools or frameworks have you used most extensively in your recent work?",
        "Can you walk me through a technical challenge you solved and the approach you took?",
        "How do you stay current with new technologies in your field?",
        "Describe a system or feature you built from scratch. What decisions did you make?",
        "What's your debugging process when something isn't working as expected?"
      ],
      'Problem Solving': [
        "Tell me about a complex problem you faced at work. How did you break it down?",
        "Describe a situation where your initial solution didn't work. What did you do next?",
        "How do you approach problems when you don't have all the information you need?",
        "Give an example of a creative solution you came up with for a difficult challenge.",
        "When faced with multiple possible solutions, how do you decide which one to pursue?"
      ],
      'Communication': [
        "How do you explain technical concepts to non-technical stakeholders?",
        "Describe a time when miscommunication caused an issue. How did you resolve it?",
        "How do you handle giving feedback to a colleague who may not want to hear it?",
        "Tell me about a presentation or document you created that had significant impact.",
        "How do you ensure everyone on a project is aligned and informed?"
      ],
      'Experience': [
        "Walk me through your most relevant experience for this role.",
        "What's the most impactful project you've worked on and what was your contribution?",
        "How has your career progression prepared you for this position?",
        "Describe a situation where your past experience directly helped solve a current problem.",
        "What lessons from previous roles do you apply regularly in your work?"
      ],
      'Culture Fit': [
        "What type of work environment brings out your best performance?",
        "What motivates you to do your best work?",
        "How do you handle situations where company priorities conflict with your preferences?",
        "What values are most important to you in a workplace?",
        "Why are you interested in this particular role and company?"
      ],
      'Teamwork / Collaboration': [
        "Describe your ideal team dynamic and your role within it.",
        "Tell me about a successful collaboration. What made it work?",
        "How do you handle disagreements with team members?",
        "Give an example of how you supported a struggling colleague.",
        "How do you contribute to a positive team environment?"
      ],
      'Leadership': [
        "Describe a time when you led a project or initiative. What was your approach?",
        "How do you motivate others when facing a challenging deadline?",
        "Tell me about a difficult decision you had to make as a leader.",
        "How do you handle underperforming team members?",
        "What's your approach to mentoring or developing others?"
      ],
      'Adaptability / Learning': [
        "Tell me about a time you had to learn something new quickly. How did you approach it?",
        "Describe a significant change at work. How did you adapt?",
        "How do you handle unexpected changes to project requirements?",
        "Give an example of feedback that changed how you work.",
        "What's the most recent skill you've developed and how did you learn it?"
      ],
      'Work Ethic / Reliability': [
        "How do you prioritize when you have multiple competing deadlines?",
        "Describe a time when you went above and beyond what was expected.",
        "How do you ensure you meet your commitments consistently?",
        "Tell me about a time you had to work under pressure. How did you handle it?",
        "What does accountability mean to you in a professional context?"
      ]
    }

    const questions: string[] = []
    const usedQuestions = new Set<string>()
    
    // Distribute questions across selected criteria
    const criteriaCount = selectedCriteria.length || 1
    const questionsPerCriteria = Math.ceil(count / criteriaCount)
    
    for (const criterion of selectedCriteria) {
      const pool = criteriaQuestions[criterion] || criteriaQuestions['Experience']
      let added = 0
      for (const q of pool) {
        if (!usedQuestions.has(q) && questions.length < count) {
          questions.push(q)
          usedQuestions.add(q)
          added++
          if (added >= questionsPerCriteria) break
        }
      }
    }

    // Fill remaining with any unused questions
    if (questions.length < count) {
      for (const criterion of selectedCriteria) {
        const pool = criteriaQuestions[criterion] || []
        for (const q of pool) {
          if (!usedQuestions.has(q) && questions.length < count) {
            questions.push(q)
            usedQuestions.add(q)
          }
        }
      }
    }

    return questions.slice(0, count)
  }

  /**
   * Map questions to criteria with importance levels
   * This is the interview intelligence system that assigns evaluation metadata
   */
  static async mapQuestionsToCriteria(
    jobTitle: string,
    jobDescription: string,
    selectedCriteria: string[],
    questions: string[],
    companyApiKey?: string,
    companyProjectId?: string
  ): Promise<{
    mappedQuestions: Array<{
      question_text: string
      criterion: string
      importance: 'high' | 'medium' | 'low'
    }>
    error?: string
  }> {
    // ==================================================
    // PRE-CONDITION CHECK (MANDATORY)
    // ==================================================
    
    // Check 1: Job Title is present and non-empty
    if (!jobTitle || jobTitle.trim().length === 0) {
      return {
        mappedQuestions: [],
        error: "Please complete the Job Description and select evaluation criteria before generating interview questions."
      }
    }

    // Check 2: Job Description is present and sufficiently detailed
    if (!jobDescription || jobDescription.trim().length < 50) {
      return {
        mappedQuestions: [],
        error: "Please complete the Job Description and select evaluation criteria before generating interview questions."
      }
    }

    // Check 3: At least ONE evaluation criterion is selected
    if (!selectedCriteria || selectedCriteria.length === 0) {
      return {
        mappedQuestions: [],
        error: "Please complete the Job Description and select evaluation criteria before generating interview questions."
      }
    }

    // Check 4: Questions exist
    if (!questions || questions.length === 0) {
      return {
        mappedQuestions: [],
        error: "No questions to map. Please generate questions first."
      }
    }

    // ==================================================
    // TASK: Map questions to criteria with importance
    // ==================================================

    const criteriaList = selectedCriteria.join(', ')
    const questionsFormatted = questions.map((q, i) => `Q${i + 1}: ${q}`).join('\n')

    const prompt = `You are an internal interview intelligence system.

==================================================
TASK
==================================================

Your task is to ASSIGN evaluation metadata to interview questions.

This includes:
1) Mapping each question to ONE selected evaluation criterion
2) Assigning an importance level to each question
3) Ensuring FAIR and BALANCED distribution across criteria

==================================================
INPUT
==================================================

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Selected Evaluation Criteria: ${criteriaList}

Interview Questions:
${questionsFormatted}

==================================================
AVAILABLE EVALUATION CRITERIA
==================================================

You may ONLY use criteria from this list:
${selectedCriteria.map(c => `- ${c}`).join('\n')}

STRICT RULES:
- Do NOT invent new criteria
- Do NOT rename criteria
- Do NOT map any question outside this list

==================================================
CRITERIA DISTRIBUTION RULE (CRITICAL)
==================================================

1) MINIMUM COVERAGE RULE
   - EACH selected criterion MUST receive at least ONE question.

2) BALANCED DISTRIBUTION RULE
   - After minimum coverage is satisfied:
     • Assign remaining questions based on BEST-FIT INTENT.
     • Avoid overloading a single criterion.
     • Prefer a balanced, realistic interview structure.

3) HUMAN INTERVIEWER LOGIC
   - Think like an experienced interviewer.
   - Use judgment, not rigid math.
   - Balance depth and coverage.

==================================================
QUESTION-TO-CRITERION MAPPING RULES
==================================================

For EACH question:
- Assign EXACTLY ONE criterion.
- Use the INTENT of the question, not just keywords.
- No question may remain unmapped.

==================================================
IMPORTANCE ASSIGNMENT RULES
==================================================

Assign ONE importance level per question:
- "high" - Core decision-impact questions
- "medium" - Supporting or validation questions
- "low" - Contextual, warm-up, or hygiene questions

Do NOT assign the same importance to all questions.

==================================================
OUTPUT FORMAT (STRICT JSON ONLY)
==================================================

Return ONLY a JSON array. No explanation, no markdown, no extra text.

[
  {"question_text": "...", "criterion": "<one of selected criteria>", "importance": "high"},
  {"question_text": "...", "criterion": "<one of selected criteria>", "importance": "medium"},
  ...
]

Now perform the task. Return ONLY the JSON array.`

    try {
      const apiKey = companyApiKey || process.env.OPENAI_API_KEY
      if (!apiKey) {
        // Fallback to rule-based mapping
        return { mappedQuestions: this.fallbackQuestionMapping(questions, selectedCriteria) }
      }

      const openai = createOpenAI({
        apiKey,
        ...(companyProjectId && { project: companyProjectId })
      })

      const { text, usage: tokenUsage } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000
      })

      // Parse JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error('Failed to parse mapping response, using fallback')
        return { mappedQuestions: this.fallbackQuestionMapping(questions, selectedCriteria) }
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate and sanitize response
      const mappedQuestions = parsed.map((item: any, idx: number) => {
        // Ensure criterion is from selected list
        let criterion = item.criterion
        if (!selectedCriteria.includes(criterion)) {
          // Find best match or use first criterion
          criterion = selectedCriteria[idx % selectedCriteria.length]
        }
        
        // Ensure importance is valid
        let importance = item.importance
        if (!['high', 'medium', 'low'].includes(importance)) {
          importance = 'medium'
        }

        return {
          question_text: item.question_text || questions[idx],
          criterion,
          importance
        }
      })

      // Validate minimum coverage - each criterion should have at least 1 question
      const criteriaCount: Record<string, number> = {}
      selectedCriteria.forEach(c => criteriaCount[c] = 0)
      mappedQuestions.forEach((q: any) => {
        if (criteriaCount[q.criterion] !== undefined) {
          criteriaCount[q.criterion]++
        }
      })

      // Fix any criteria with 0 questions
      const zeroCriteria = selectedCriteria.filter(c => criteriaCount[c] === 0)
      if (zeroCriteria.length > 0) {
        // Find criteria with most questions and redistribute
        const maxCriterion = Object.entries(criteriaCount)
          .sort((a, b) => b[1] - a[1])[0][0]
        
        let reassigned = 0
        for (let i = 0; i < mappedQuestions.length && reassigned < zeroCriteria.length; i++) {
          if (mappedQuestions[i].criterion === maxCriterion && criteriaCount[maxCriterion] > 1) {
            mappedQuestions[i].criterion = zeroCriteria[reassigned]
            criteriaCount[maxCriterion]--
            criteriaCount[zeroCriteria[reassigned]]++
            reassigned++
          }
        }
      }

      return { mappedQuestions }
    } catch (error) {
      console.error('Question mapping error:', error)
      return { mappedQuestions: this.fallbackQuestionMapping(questions, selectedCriteria) }
    }
  }

  /**
   * Fallback rule-based question mapping when AI is unavailable
   */
  private static fallbackQuestionMapping(
    questions: string[],
    selectedCriteria: string[]
  ): Array<{ question_text: string; criterion: string; importance: 'high' | 'medium' | 'low' }> {
    const keywordMap: Record<string, string[]> = {
      'Technical Skills': ['technical', 'code', 'programming', 'framework', 'tool', 'system', 'debug', 'architecture', 'api', 'database'],
      'Problem Solving': ['problem', 'challenge', 'solve', 'solution', 'approach', 'debug', 'issue', 'fix', 'analyze'],
      'Communication': ['explain', 'communicate', 'present', 'feedback', 'stakeholder', 'team', 'align', 'inform'],
      'Experience': ['experience', 'project', 'worked', 'previous', 'background', 'career', 'role'],
      'Culture Fit': ['motivate', 'value', 'environment', 'company', 'culture', 'fit', 'why'],
      'Teamwork / Collaboration': ['team', 'collaborate', 'together', 'colleague', 'support', 'group'],
      'Leadership': ['lead', 'mentor', 'decision', 'guide', 'manage', 'initiative'],
      'Adaptability / Learning': ['learn', 'adapt', 'change', 'new', 'flexible', 'grow'],
      'Work Ethic / Reliability': ['deadline', 'commit', 'reliable', 'accountable', 'pressure', 'prioritize']
    }

    const result: Array<{ question_text: string; criterion: string; importance: 'high' | 'medium' | 'low' }> = []
    const criteriaUsage: Record<string, number> = {}
    selectedCriteria.forEach(c => criteriaUsage[c] = 0)

    // First pass: assign based on keywords
    for (const question of questions) {
      const qLower = question.toLowerCase()
      let bestCriterion = selectedCriteria[0]
      let bestScore = 0

      for (const criterion of selectedCriteria) {
        const keywords = keywordMap[criterion] || []
        const score = keywords.filter(kw => qLower.includes(kw)).length
        if (score > bestScore) {
          bestScore = score
          bestCriterion = criterion
        }
      }

      criteriaUsage[bestCriterion]++
      result.push({
        question_text: question,
        criterion: bestCriterion,
        importance: 'medium'
      })
    }

    // Ensure minimum coverage
    const zeroCriteria = selectedCriteria.filter(c => criteriaUsage[c] === 0)
    if (zeroCriteria.length > 0) {
      const maxCriterion = Object.entries(criteriaUsage)
        .filter(([c]) => selectedCriteria.includes(c))
        .sort((a, b) => b[1] - a[1])[0]?.[0]

      if (maxCriterion) {
        let reassigned = 0
        for (let i = 0; i < result.length && reassigned < zeroCriteria.length; i++) {
          if (result[i].criterion === maxCriterion && criteriaUsage[maxCriterion] > 1) {
            result[i].criterion = zeroCriteria[reassigned]
            criteriaUsage[maxCriterion]--
            criteriaUsage[zeroCriteria[reassigned]]++
            reassigned++
          }
        }
      }
    }

    // Assign importance levels
    const totalQuestions = result.length
    const highCount = Math.ceil(totalQuestions * 0.3)  // 30% high
    const lowCount = Math.ceil(totalQuestions * 0.2)   // 20% low
    
    // First few questions are warm-up (low), middle are high, rest are medium
    for (let i = 0; i < result.length; i++) {
      if (i < lowCount) {
        result[i].importance = 'low'
      } else if (i < lowCount + highCount) {
        result[i].importance = 'high'
      } else {
        result[i].importance = 'medium'
      }
    }

    return result
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
