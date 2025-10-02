import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

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
    passThreshold: number = 40
  ): Promise<CVEvaluationResult> {
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
      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.2,
      })

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
      throw new Error(`Failed to evaluate CV: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
