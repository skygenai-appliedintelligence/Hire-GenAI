import { NextRequest, NextResponse } from 'next/server'
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, agentType, numberOfQuestions, skills } = await request.json()

    if (!jobDescription || !agentType || !numberOfQuestions) {
      return NextResponse.json(
        { error: 'Missing required fields: jobDescription, agentType, numberOfQuestions' },
        { status: 400 }
      )
    }

    // Check if OpenAI key is available
    const hasOpenAIKey = !!(process.env.OPENAI_API_KEY)
    
    console.log('OpenAI Key available:', hasOpenAIKey)
    console.log('Environment variables:', {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Found' : 'Not found',
      NODE_ENV: process.env.NODE_ENV
    })
    
    if (!hasOpenAIKey) {
      // Keyword-based mock questions that adapt to the JD
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
      const focusSkills: string[] = Array.isArray(skills) ? skills : []
      const roleMatch = text.match(/(?:role|position|title)[:\s-]*([^\n]+)/i)
      const role = roleMatch ? roleMatch[1].trim() : (top[0] ? top[0] : "the role")

      const kw = [...focusSkills.map(s=>s.toLowerCase()), ...top]
      const make = (q: string) => q
        .replace(/\{role\}/g, role)
        .replace(/\{kw(\d)\}/g, (_m, i)=> kw[Number(i)-1] || role)

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

      return NextResponse.json({ questions: out.slice(0, numberOfQuestions) })
    }

    const agentTypePrompts = {
      "Screening Agent": "Generate basic qualification, work experience, and general fit questions. Focus on: basic qualifications, work experience, general fit, availability, salary expectations, and company knowledge.",
      "Initial Interview Agent": "Generate skill-based, role-relevant, and scenario-based questions. Focus on: relevant experience, problem-solving abilities, work style, and role-specific scenarios.",
      "Technical Interview Agent": "Generate in-depth technical or domain-specific questions. Focus on: technical skills, problem-solving, system design, coding challenges, and technical decision-making.",
      "Behavioral Interview Agent": "Generate soft skills, teamwork, and conflict resolution questions. Focus on: leadership, teamwork, communication, conflict resolution, and cultural fit."
    }

    const focus = Array.isArray(skills) && skills.length > 0 ? `\nFOCUS SKILLS:\n${skills.map((s: string)=>`- ${s}`).join('\n')}\n` : ''
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

${agentTypePrompts[agentType as keyof typeof agentTypePrompts] || agentTypePrompts["Screening Agent"]}
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

    console.log('Attempting to generate AI questions...')
    
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      system: "You are an AI Interview Question Generator. Generate relevant, clear, and role-specific interview questions based on the job description and interview stage.",
    })

    console.log('AI response received:', text)

    // Parse the response to extract questions
    const lines = text.split('\n').filter(line => line.trim().startsWith('Q'))
    const parsed = lines.map(line => {
      const match = line.match(/Q\d+:\s*(.+)/)
      return match ? match[1].trim() : line.replace(/Q\d+:\s*/, '').trim()
    }).filter(q => q.length > 0)

    // Deduplicate and limit
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[\p{P}\p{S}]+/gu, '').trim()
    const seen = new Set<string>()
    const questions: string[] = []
    for (const q of parsed) {
      const key = normalize(q)
      if (!seen.has(key)) {
        questions.push(q)
        seen.add(key)
      }
      if (questions.length >= numberOfQuestions) break
    }

    console.log('Parsed questions:', questions)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('AI question generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
