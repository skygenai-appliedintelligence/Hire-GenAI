import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

const SYSTEM_PROMPT = `You are a fair but moderately lenient CV parser and JD evaluator. Your goal is to identify promising candidates without being overly strict, while ensuring relevance to the job description.
- Extract structured facts from the resume.
- Compare against the Job Description (JD), giving partial credit for transferable skills but prioritizing core skills.
- Score fairly based on the provided rubric. Focus on potential, but don't ignore major skill gaps.
- Output ONLY valid JSON matching the provided schema.
- If a required field is missing, mark it as null.
- Cite evidence by quoting short spans from the resume (max 20 words each).
- Acknowledge related technologies (e.g., React vs. Vue, AWS vs. GCP) but weigh direct matches higher.
- Be realistic: a full-stack developer is not an RPA developer, but they have some transferable skills. Your scoring should reflect this nuance.`

interface CVEvaluationResult {
  overall: {
    score_percent: number
    qualified: boolean
    reason_summary: string
  }
  breakdown: {
    role_title_alignment: { score: number; weight: 15; evidence: string[] }
    hard_skills: { score: number; weight: 35; matched: string[]; missing: string[]; evidence: string[] }
    experience_depth: { score: number; weight: 20; years_estimate: number | null; evidence: string[] }
    domain_relevance: { score: number; weight: 10; evidence: string[] }
    education_certs: { score: number; weight: 10; matched: string[]; missing: string[]; evidence: string[] }
    nice_to_have: { score: number; weight: 5; matched: string[]; missing: string[]; evidence: string[] }
    communication_redflags: { score: number; weight: 5; red_flags: string[]; evidence: string[] }
  }
  extracted: {
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    total_experience_years_estimate: number | null
    titles: string[]
    skills: string[]
    education: Array<{
      degree: string | null
      field: string | null
      institution: string | null
      year: string | null
    }>
    certifications: string[]
    notable_projects: string[]
  }
  gaps_and_notes: string[]
}

export class CVEvaluator {
  /**
   * Evaluate candidate resume against job description with detailed scoring
   */
  static async evaluateCandidate(
    resumeText: string,
    jobDescription: string,
    passThreshold: number = 40,
    companyId?: string,
    openaiClient?: any
  ): Promise<CVEvaluationResult> {
    // --- Deterministic pre-filters to avoid obvious false positives ---
    const text = (resumeText || '').toLowerCase()
    const jd = (jobDescription || '').toLowerCase()

    const tokenize = (s: string) => Array.from(new Set(s.split(/[^a-z0-9+#\.]+/).filter(Boolean)))
    const tokens = tokenize(text)
    const has = (kw: string | string[]) => {
      const list = Array.isArray(kw) ? kw : [kw]
      return list.some(k => {
        const kk = k.toLowerCase()
        return text.includes(kk) || tokens.some(t => t === kk || t.includes(kk) || kk.includes(t))
      })
    }

    // Core domain keywords for RPA vs Full-Stack
    const RPA_KWS = [
      'rpa','robotic process automation','uipath','ui path','automation anywhere','blue prism','power automate','workfusion','pega','orchestrator'
    ]
    const FULLSTACK_KWS = [
      'full stack','full-stack','mern','mean','react','next.js','node','express','angular','vue','typescript','javascript','mongodb','postgres','mysql'
    ]

    const jdMentionsRPA = RPA_KWS.some(k => jd.includes(k))
    const resumeHasRPA = has(RPA_KWS)

    // Require direct JD skill overlap using existing extractor
    const requiredSkills = CVEvaluator.extractJDSkills(jobDescription)
    const overlap = requiredSkills.filter(s => has(s)).length

    // Hard fail if JD has clear RPA intent but resume lacks any RPA signals
    if (jdMentionsRPA && !resumeHasRPA) {
      const reason = 'JD targets RPA but resume has no RPA tools (UiPath, Automation Anywhere, Blue Prism, etc.).'
      return {
        overall: { score_percent: 15, qualified: false, reason_summary: reason },
        breakdown: {
          role_title_alignment: { score: 10, weight: 15, evidence: [] },
          hard_skills: { score: 10, weight: 35, matched: [], missing: requiredSkills, evidence: [] },
          experience_depth: { score: 20, weight: 20, years_estimate: null, evidence: [] },
          domain_relevance: { score: 5, weight: 10, evidence: [] },
          education_certs: { score: 20, weight: 10, matched: [], missing: [], evidence: [] },
          nice_to_have: { score: 10, weight: 5, matched: [], missing: [], evidence: [] },
          communication_redflags: { score: 70, weight: 5, red_flags: [], evidence: [] },
        },
        extracted: {
          name: null, email: null, phone: null, location: null,
          total_experience_years_estimate: null, titles: [], skills: [], education: [], certifications: [], notable_projects: []
        },
        gaps_and_notes: ['Domain mismatch: RPA JD vs non-RPA resume']
      }
    }

    // If JD has any core skills, require at least 1 direct overlap
    if (requiredSkills.length > 0 && overlap === 0) {
      const reason = 'No direct overlap with JD core skills.'
      return {
        overall: { score_percent: 20, qualified: false, reason_summary: reason },
        breakdown: {
          role_title_alignment: { score: 20, weight: 15, evidence: [] },
          hard_skills: { score: 10, weight: 35, matched: [], missing: requiredSkills, evidence: [] },
          experience_depth: { score: 25, weight: 20, years_estimate: null, evidence: [] },
          domain_relevance: { score: 20, weight: 10, evidence: [] },
          education_certs: { score: 30, weight: 10, matched: [], missing: [], evidence: [] },
          nice_to_have: { score: 10, weight: 5, matched: [], missing: [], evidence: [] },
          communication_redflags: { score: 80, weight: 5, red_flags: [], evidence: [] },
        },
        extracted: {
          name: null, email: null, phone: null, location: null,
          total_experience_years_estimate: null, titles: [], skills: [], education: [], certifications: [], notable_projects: []
        },
        gaps_and_notes: ['No JD skill overlap found']
      }
    }
    const userPrompt = `Evaluate this candidate for the given JD. Use the schema and rubric below.

[THRESHOLD]
pass_threshold_percent = ${passThreshold}

[INPUTS]
JD_TEXT:
<<<JD_START
${jobDescription}
JD_END>>>

RESUME_TEXT:
<<<RESUME_START
${resumeText}
RESUME_END>>>

[SCORING RUBRIC]
Weighting must sum to 100. Score each 0–100, then compute weighted_sum = Σ(score_i * weight_i/100).
- Role/Title alignment (weight 15)
- Core hard skills & tools (weight 35)
- Relevant experience depth (years, seniority) (weight 20)
- Domain/industry relevance (weight 10)
- Education/certs (weight 10)
- Nice-to-have skills (weight 5)
- Communication/readability & red flags (weight 5)

FAIR SCORING GUIDELINES:
- Hard skills: Prioritize JD-listed skills. Give partial credit for related technologies (e.g., React vs. Vue, AWS vs. GCP), but weigh direct matches higher.
- Experience: Estimate years/seniority from resume context. Score based on relevance to required level; if unclear, give modest partial credit.
- Role alignment: Score higher for direct title matches; give partial credit for adjacent roles (e.g., Developer ↔ Engineer).
- Domain: Credit similar industries when justified with evidence.
- Education: Score based on relevance of degree/certifications; mark null if not clearly stated.
- Red flags: Note serious issues (unreadable resume, clearly contradictory claims). Do not penalize normal job changes.

[OUTPUT SCHEMA — RETURN ONLY JSON]
{
  "overall": {
    "score_percent": number,               // 0-100
    "qualified": boolean,                  // true if score_percent >= pass_threshold_percent
    "reason_summary": string               // 1-3 sentences
  },
  "breakdown": {
    "role_title_alignment": { "score": number, "weight": 15, "evidence": string[] },
    "hard_skills":            { "score": number, "weight": 35, "matched": string[], "missing": string[], "evidence": string[] },
    "experience_depth":       { "score": number, "weight": 20, "years_estimate": number|null, "evidence": string[] },
    "domain_relevance":       { "score": number, "weight": 10, "evidence": string[] },
    "education_certs":        { "score": number, "weight": 10, "matched": string[], "missing": string[], "evidence": string[] },
    "nice_to_have":           { "score": number, "weight": 5,  "matched": string[], "missing": string[], "evidence": string[] },
    "communication_redflags": { "score": number, "weight": 5,  "red_flags": string[], "evidence": string[] }
  },
  "extracted": {
    "name": string|null,
    "email": string|null,
    "phone": string|null,
    "location": string|null,
    "total_experience_years_estimate": number|null,
    "titles": string[],
    "skills": string[],
    "education": [{ "degree": string|null, "field": string|null, "institution": string|null, "year": string|null }],
    "certifications": string[],
    "notable_projects": string[]
  },
  "gaps_and_notes": string[]               // unclear dates, missing claims, OCR noise, etc.
}`

    try {
      // Use provided API key or fall back to environment
      const apiKey = openaiClient?.apiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
      
      if (!apiKey) {
        throw new Error('No OpenAI API key configured')
      }

      let text: string
      
      // Set the API key in environment for this call
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = apiKey
      
      try {
        const response = await generateText({
          model: openai("gpt-4o"),
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.1,
        })
        text = response.text
      } finally {
        // Restore original key
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey
        } else {
          delete process.env.OPENAI_API_KEY
        }
      }

      // Parse JSON response
      const cleaned = text.trim()
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim()

      const result: CVEvaluationResult = JSON.parse(cleaned)

      // Validate and ensure qualified field matches threshold
      if (result.overall.score_percent >= passThreshold) {
        result.overall.qualified = true
      } else {
        result.overall.qualified = false
      }

      return result
    } catch (error) {
      console.error("CV Evaluation error:", error)

      // Check if it's a permissions error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('insufficient permissions') ||
          errorMessage.includes('Missing scopes') ||
          errorMessage.includes('api.responses.write')) {
        console.log('🔐 [CV EVALUATOR] OpenAI API key lacks required permissions (api.responses.write)')
        console.log('🏷️  Falling back to mock evaluation system...')
      } else {
        console.log('❌ [CV EVALUATOR] OpenAI API call failed:', errorMessage)
      }

      // Return mock evaluation with proper structure
      const mockResult: CVEvaluationResult = {
        overall: {
          score_percent: Math.floor(Math.random() * 40) + 30, // 30-70 range
          qualified: false,
          reason_summary: "Mock evaluation - OpenAI API unavailable. Please add a valid OPENAI_API_KEY with proper permissions."
        },
        breakdown: {
          role_title_alignment: { score: Math.floor(Math.random() * 30) + 35, weight: 15, evidence: ["Mock evaluation data"] },
          hard_skills: { score: Math.floor(Math.random() * 30) + 35, weight: 35, matched: ["Basic skills"], missing: ["Advanced skills"], evidence: ["Mock evaluation data"] },
          experience_depth: { score: Math.floor(Math.random() * 30) + 35, weight: 20, years_estimate: 3, evidence: ["Mock evaluation data"] },
          domain_relevance: { score: Math.floor(Math.random() * 30) + 35, weight: 10, evidence: ["Mock evaluation data"] },
          education_certs: { score: Math.floor(Math.random() * 30) + 35, weight: 10, matched: ["Basic education"], missing: [], evidence: ["Mock evaluation data"] },
          nice_to_have: { score: Math.floor(Math.random() * 30) + 35, weight: 5, matched: [], missing: [], evidence: ["Mock evaluation data"] },
          communication_redflags: { score: Math.floor(Math.random() * 30) + 35, weight: 5, red_flags: [], evidence: ["Mock evaluation data"] },
        },
        extracted: {
          name: null, email: null, phone: null, location: null,
          total_experience_years_estimate: null, titles: [], skills: [], education: [], certifications: [], notable_projects: []
        },
        gaps_and_notes: ["Mock evaluation - add OPENAI_API_KEY for real AI analysis"]
      }

      // Ensure qualification matches score
      if (mockResult.overall.score_percent >= passThreshold) {
        mockResult.overall.qualified = true
      }

      return mockResult
    }
  }

  /**
   * Normalize skills for better matching (handle synonyms)
   */
  static normalizeSkills(skills: string[]): string[] {
    const synonymMap: Record<string, string> = {
      'typescript': 'ts',
      'javascript': 'js',
      'reactjs': 'react',
      'nodejs': 'node.js',
      'nextjs': 'next.js',
      'gcp': 'google cloud',
      'aws': 'amazon web services',
      'k8s': 'kubernetes',
    }

    return skills.map(skill => {
      const lower = skill.toLowerCase().trim()
      return synonymMap[lower] || skill
    })
  }

  /**
   * Extract key skills from job description for pre-filtering
   */
  static extractJDSkills(jobDescription: string): string[] {
    const commonSkills = [
      'react', 'angular', 'vue', 'node.js', 'python', 'java', 'typescript',
      'javascript', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql',
      'mongodb', 'postgresql', 'redis', 'graphql', 'rest api', 'microservices',
      'ci/cd', 'git', 'agile', 'scrum', 'machine learning', 'ai', 'data science'
    ]

    const jdLower = jobDescription.toLowerCase()
    return commonSkills.filter(skill => jdLower.includes(skill.toLowerCase()))
  }
}
