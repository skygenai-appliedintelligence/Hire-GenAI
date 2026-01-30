import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ============================================================================
// NEW CV EVALUATION SYSTEM v2.0
// 3-Phase Architecture: Eligibility Gates → Scoring → Risk Adjustment
// ============================================================================

/**
 * SYSTEM PROMPT for LLM - Focused on extraction and specific scoring only
 * Rule-based logic handles: Experience, Location, Language compliance
 */
const SYSTEM_PROMPT = `You are a senior ATS CV parser and evaluator. Your role is EXTRACTION and LIMITED SCORING only.

CRITICAL RULES:
1. Extract ALL structured data from the resume accurately
2. Score ONLY these 3 dimensions (LLM responsibility):
   - skill_match (0-100): Direct skill matches weighted higher than related technologies
   - project_relevance (0-100): How relevant are recent projects to the JD
   - resume_quality (0-100): Clarity, structure, completeness of the resume
3. DO NOT score: Experience years, Location, Language - these are rule-based
4. Output ONLY valid JSON matching the provided schema
5. Cite evidence by quoting short spans from resume (max 20 words each)
6. Be conservative - do not hallucinate skills or experience not clearly stated
7. Distinguish between issued certifications and those being pursued
8. Match skills EXACTLY as specified in the JD - identify critical vs nice-to-have skills

SCORING GUIDELINES:
- skill_match: 90-100 = all critical skills present, 70-89 = most skills present, 50-69 = partial match, <50 = major gaps
- project_relevance: Score based on how many JD-required skills appear in recent 3-5 year projects
- resume_quality: Grammar, formatting, completeness, professional presentation

EXTRACTION REQUIREMENTS:
- Separate issued vs pursuing certifications
- Calculate total experience from work history dates
- Extract languages with proficiency levels
- Identify all technical platforms/tools mentioned in resume
- Note any career gaps > 6 months`

// ============================================================================
// TYPE DEFINITIONS - New Schema
// ============================================================================

type EligibilityStatus = "PASS" | "FAIL"
type Verdict = "Strong Match" | "Good Match" | "Borderline" | "Reject"
type MatchLevel = "Below" | "Within" | "Above"
type CertStatus = "issued" | "pursuing" | "expired"
type JobHoppingRisk = "Low" | "Medium" | "High"

/**
 * Main evaluation result - NEW SCHEMA
 */
export interface CVEvaluationResult {
  overall: {
    score_percent: number
    qualified: boolean
    verdict: Verdict
    reason_summary: string
  }

  eligibility: {
    domain_fit: EligibilityStatus
    must_have_fit: EligibilityStatus
    experience_fit: EligibilityStatus
    language_fit: EligibilityStatus
    fail_reasons: string[]
    missing_must_have: string[]  // NEW: Exposed missing must-have skills
  }

  scores: {
    skill_match: {
      score: number
      weight: 30
      matched_critical: string[]
      matched_important: string[]
      missing_critical: string[]
      evidence: string[]
    }

    project_relevance: {
      score: number
      weight: 20
      relevant_projects: number
      recent_skills_used: string[]
      evidence: string[]
    }

    experience_match: {
      score: number
      weight: 20
      years_actual: number | null
      years_required: string
      match_level: MatchLevel
      evidence: string[]
    }

    education_and_certs: {
      score: number
      weight: 15
      degree: string | null
      field_match: boolean
      issued_certs: string[]
      pursuing_certs: string[]
      missing_required_certs: string[]
      evidence: string[]
    }

    location_and_availability: {
      score: number
      weight: 10
      candidate_location: string | null
      job_location: string | null
      remote_possible: boolean
      joining_time_days: number | null
      evidence: string[]
    }

    resume_quality: {
      score: number
      weight: 5
      clarity: number
      structure: number
      completeness: number
      issues: string[]
      evidence: string[]
    }
  }

  risk_adjustments: {
    critical_gaps: string[]
    risk_flags: string[]
    score_cap_applied: number | null
  }

  // NEW: Production exposure signal (domain-agnostic)
  production_exposure: {
    has_prod_experience: boolean
    evidence: string[]
  }

  // NEW: Tenure stability analysis
  tenure_analysis: {
    average_tenure_months: number | null
    job_hopping_risk: JobHoppingRisk
  }

  // NEW: Explainable score breakdown
  explainable_score: {
    skill_contribution: number
    project_contribution: number
    experience_contribution: number
    edu_certs_contribution: number
    location_contribution: number
    quality_contribution: number
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
    work_experience: Array<{
      company: string
      title: string
      start_date: string | null
      end_date: string | null
      duration: string
    }>
    certifications: Array<{
      name: string
      status: CertStatus
      year: string | null
    }>
    languages: Array<{
      language: string
      proficiency: string
    }>
    recent_projects: Array<{
      title: string
      duration: string
      technologies: string[]
    }>
  }
}

/**
 * Internal LLM response structure (what we ask the LLM to return)
 */
interface LLMExtractionResponse {
  llm_scores: {
    skill_match: {
      score: number
      matched_critical: string[]
      matched_important: string[]
      missing_critical: string[]
      evidence: string[]
    }
    project_relevance: {
      score: number
      relevant_projects: number
      recent_skills_used: string[]
      evidence: string[]
    }
    resume_quality: {
      score: number
      clarity: number
      structure: number
      completeness: number
      issues: string[]
      evidence: string[]
    }
  }
  extracted: CVEvaluationResult['extracted']
  detected_platforms: string[]  // Generic: any platforms/tools detected in resume
  detected_languages: string[]
  has_production_deployment: boolean
  has_debugging_experience: boolean
  has_cloud_exposure: boolean
  average_tenure_months: number | null
  career_gaps_months: number[]
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// NOTE: No hardcoded domain-specific constants - all skills are extracted dynamically from JD

const COMMON_LANGUAGES = ['english', 'hindi', 'spanish', 'french', 'german', 'mandarin', 'japanese']

// Scoring weights (must sum to 100)
const WEIGHTS = {
  skill_match: 30,
  project_relevance: 20,
  experience_match: 20,
  education_and_certs: 15,
  location_and_availability: 10,
  resume_quality: 5
} as const

// ============================================================================
// CVEvaluator CLASS - NEW 3-PHASE ARCHITECTURE
// ============================================================================

export class CVEvaluator {
  
  // =========================================================================
  // PHASE 0: ELIGIBILITY GATES (Deterministic)
  // Domain-agnostic: Works for RPA, Full-stack, Data, DevOps, or any domain
  // =========================================================================

  /**
   * DOMAIN-AGNOSTIC: Extract critical platforms/tools mentioned in JD
   * Dynamically parses JD to find platforms that are marked as required/critical
   * Works for any domain (RPA, Backend, Frontend, Data, DevOps, etc.)
   */
  private static extractCriticalPlatforms(jd: string): string[] {
    const jdLower = jd.toLowerCase()
    const criticalPlatforms: string[] = []
    
    // Patterns that indicate a platform/tool is CRITICAL
    const criticalPatterns = [
      /(?:must\s+have|required|mandatory|essential|critical)[:\s]+[^.\n]*?\b([a-z][a-z0-9.#+\-]+)\b/gi,
      /(?:experience\s+(?:with|in)|proficiency\s+in|expertise\s+in)[:\s]*([a-z][a-z0-9.#+\-]+)/gi,
      /\b([a-z][a-z0-9.#+\-]+)\s+(?:is\s+)?(?:required|mandatory|must)/gi
    ]
    
    // Common tech platforms/tools to recognize (expanded for all domains)
    const knownPlatforms = [
      // RPA
      'uipath', 'automation anywhere', 'blue prism', 'power automate', 'workfusion', 'pega', 'nice', 'kofax',
      // Backend
      'java', 'python', 'node.js', 'nodejs', 'spring', 'django', 'flask', 'express', '.net', 'c#', 'golang', 'rust',
      // Frontend
      'react', 'angular', 'vue', 'svelte', 'next.js', 'nextjs', 'typescript', 'javascript',
      // Data
      'spark', 'hadoop', 'kafka', 'airflow', 'snowflake', 'databricks', 'pandas', 'tensorflow', 'pytorch',
      // DevOps
      'kubernetes', 'docker', 'aws', 'azure', 'gcp', 'terraform', 'jenkins', 'gitlab', 'github actions',
      // Databases
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sql server', 'oracle',
      // Other
      'salesforce', 'sap', 'servicenow', 'jira', 'confluence'
    ]
    
    // Find platforms mentioned in critical sections
    for (const pattern of criticalPatterns) {
      const matches = Array.from(jd.matchAll(pattern))
      for (const match of matches) {
        const potentialPlatform = match[1]?.toLowerCase().trim()
        if (potentialPlatform && potentialPlatform.length > 1) {
          // Check if it's a known platform or add it anyway if in critical section
          if (knownPlatforms.includes(potentialPlatform) && !criticalPlatforms.includes(potentialPlatform)) {
            criticalPlatforms.push(potentialPlatform)
          }
        }
      }
    }
    
    // Also check direct mentions of known platforms in JD with "required" nearby
    for (const platform of knownPlatforms) {
      if (jdLower.includes(platform)) {
        // Check if platform appears near requirement indicators
        const platformIndex = jdLower.indexOf(platform)
        const context = jdLower.substring(Math.max(0, platformIndex - 50), platformIndex + platform.length + 50)
        if (/required|mandatory|must|essential|critical/i.test(context)) {
          if (!criticalPlatforms.includes(platform)) {
            criticalPlatforms.push(platform)
          }
        }
      }
    }
    
    return criticalPlatforms.slice(0, 5) // Limit to top 5
  }

  /**
   * DOMAIN-AGNOSTIC: Check if resume has any of the critical platforms
   * Returns true if resume contains at least ONE of the critical platforms
   */
  private static hasCriticalPlatform(resumeText: string, criticalPlatforms: string[]): boolean {
    if (criticalPlatforms.length === 0) return true // No critical platforms = pass
    const textLower = resumeText.toLowerCase()
    return criticalPlatforms.some(p => textLower.includes(p))
  }

  /**
   * DOMAIN-AGNOSTIC: Define equivalent tool groups
   * Tools in the same group are considered interchangeable alternatives
   * If JD requires one tool from a group, having ANY tool from that group is acceptable
   */
  private static readonly EQUIVALENT_TOOL_GROUPS: string[][] = [
    // RPA Tools - any one is acceptable if JD mentions RPA
    ['uipath', 'automation anywhere', 'blue prism', 'power automate', 'workfusion', 'pega', 'nice', 'kofax', 'a360', 'a2019'],
    // Backend Frameworks - similar purpose
    ['spring', 'django', 'flask', 'express', 'fastapi', 'rails'],
    // Frontend Frameworks - similar purpose
    ['react', 'angular', 'vue', 'svelte'],
    // Cloud Platforms - similar purpose
    ['aws', 'azure', 'gcp', 'google cloud'],
    // Container/Orchestration - similar purpose
    ['kubernetes', 'docker swarm', 'openshift', 'ecs'],
    // CI/CD Tools - similar purpose
    ['jenkins', 'gitlab', 'github actions', 'circleci', 'azure devops'],
    // Databases - SQL databases are often interchangeable
    ['postgresql', 'mysql', 'sql server', 'oracle', 'mariadb'],
    // NoSQL Databases
    ['mongodb', 'dynamodb', 'couchdb', 'cassandra'],
  ]

  /**
   * Find equivalent tools for a given platform
   * Returns all tools in the same group, or just the platform itself if no group found
   */
  private static getEquivalentTools(platform: string): string[] {
    const platformLower = platform.toLowerCase()
    for (const group of this.EQUIVALENT_TOOL_GROUPS) {
      if (group.some(tool => platformLower.includes(tool) || tool.includes(platformLower))) {
        return group
      }
    }
    return [platformLower] // No equivalent group found, return just the platform
  }

  /**
   * DOMAIN-AGNOSTIC: Check domain fit
   * If JD specifies critical platforms, check if resume has ANY equivalent tool
   * Example: JD says "UiPath required" but resume has "Automation Anywhere" → PASS (same RPA domain)
   */
  private static checkDomainFit(resumeText: string, jd: string): {
    pass: boolean
    criticalPlatforms: string[]
    foundPlatforms: string[]
    reason: string | null
  } {
    const criticalPlatforms = this.extractCriticalPlatforms(jd)
    const textLower = resumeText.toLowerCase()
    const jdLower = jd.toLowerCase()
    
    // Direct matches
    const foundPlatforms = criticalPlatforms.filter(p => textLower.includes(p))
    
    // If direct match found, pass immediately
    if (foundPlatforms.length > 0) {
      return { pass: true, criticalPlatforms, foundPlatforms, reason: null }
    }
    
    // If no direct match, check for equivalent tools
    if (criticalPlatforms.length > 0) {
      // For each critical platform, check if resume has ANY equivalent tool
      for (const platform of criticalPlatforms) {
        const equivalentTools = this.getEquivalentTools(platform)
        
        // Check if resume has any equivalent tool
        for (const eqTool of equivalentTools) {
          if (textLower.includes(eqTool)) {
            // Found an equivalent tool - check if JD also mentions this category broadly
            // or if JD lists multiple options (e.g., "UiPath/Automation Anywhere")
            const jdMentionsEquivalent = equivalentTools.some(t => jdLower.includes(t))
            
            if (jdMentionsEquivalent) {
              // JD mentions tools from same category, so equivalent is acceptable
              foundPlatforms.push(eqTool)
              return { 
                pass: true, 
                criticalPlatforms, 
                foundPlatforms: [eqTool],
                reason: null 
              }
            }
          }
        }
      }
      
      // No direct or equivalent match found
      return {
        pass: false,
        criticalPlatforms,
        foundPlatforms: [],
        reason: `Domain mismatch: JD requires ${criticalPlatforms.slice(0, 3).join('/')} but resume shows none of these`
      }
    }
    
    return { pass: true, criticalPlatforms, foundPlatforms, reason: null }
  }

  /**
   * Extract required language from JD
   */
  private static extractRequiredLanguage(jd: string): string | null {
    const jdLower = jd.toLowerCase()
    const languagePatterns = [
      /(?:must|should|required|fluent|proficient)\s+(?:in|with)?\s*(english|hindi|spanish|french|german|mandarin|japanese)/i,
      /(english|hindi|spanish|french|german|mandarin|japanese)\s+(?:required|mandatory|must)/i,
      /language[s]?[:\s]+(english|hindi|spanish|french|german|mandarin|japanese)/i
    ]
    
    for (const pattern of languagePatterns) {
      const match = jd.match(pattern)
      if (match) return match[1].toLowerCase()
    }
    
    // Default: English is often implicit
    if (jdLower.includes('english')) return 'english'
    return null
  }

  /**
   * Check if resume shows required language
   */
  private static hasLanguage(resumeText: string, language: string): boolean {
    const textLower = resumeText.toLowerCase()
    return textLower.includes(language.toLowerCase())
  }

  /**
   * Extract experience requirement from JD (e.g., "3-5 years", "5+ years")
   */
  private static extractExperienceRequirement(jd: string): { min: number; max: number | null; raw: string } | null {
    const patterns = [
      /(\d+)\s*[-–to]+\s*(\d+)\s*(?:\+)?\s*years?/i,  // "3-5 years", "3 to 5 years"
      /(\d+)\s*\+\s*years?/i,                          // "5+ years"
      /(?:minimum|min|at least)\s*(\d+)\s*years?/i,    // "minimum 3 years"
      /(\d+)\s*years?\s*(?:of)?\s*experience/i         // "3 years experience"
    ]
    
    for (const pattern of patterns) {
      const match = jd.match(pattern)
      if (match) {
        if (match[2]) {
          return { min: parseInt(match[1]), max: parseInt(match[2]), raw: match[0] }
        } else {
          return { min: parseInt(match[1]), max: null, raw: match[0] }
        }
      }
    }
    return null
  }

  /**
   * DOMAIN-AGNOSTIC: Extract must-have skills from JD - split into CRITICAL and IMPORTANT
   * FIX A: Critical skills must ALL be present, important can be partial
   * Dynamically parses JD sections to find required skills for ANY domain
   */
  private static extractMustHaveSkills(jd: string): { critical: string[]; important: string[] } {
    const jdLower = jd.toLowerCase()
    const critical: string[] = []
    const important: string[] = []
    
    // First, add critical platforms detected from domain fit
    const criticalPlatforms = this.extractCriticalPlatforms(jd)
    critical.push(...criticalPlatforms)
    
    // Section headers that indicate CRITICAL/REQUIRED skills
    const criticalSectionPatterns = [
      /(?:required\s+skills?|must\s+have|mandatory|essential\s+skills?|key\s+requirements?|responsibilities)[:\s]*([^]*?)(?=\n\n|nice\s+to\s+have|preferred|good\s+to\s+have|$)/gi,
      /(?:critical|necessary|minimum\s+requirements?)[:\s]*([^]*?)(?=\n\n|nice|preferred|$)/gi
    ]
    
    // Section headers that indicate IMPORTANT/PREFERRED skills
    const importantSectionPatterns = [
      /(?:nice\s+to\s+have|preferred|good\s+to\s+have|bonus|desired|optional)[:\s]*([^]*?)(?=\n\n|$)/gi,
      /(?:additional\s+skills?|plus\s+points?)[:\s]*([^]*?)(?=\n\n|$)/gi
    ]
    
    // Extract skill-like words (technology names, tools, methodologies)
    const extractSkillsFromText = (text: string): string[] => {
      const skills: string[] = []
      // Match technology-like words: alphanumeric with possible dots, hashes, plusses
      const skillPattern = /\b([A-Za-z][A-Za-z0-9.#+\-]{1,20})\b/g
      const matches = Array.from(text.matchAll(skillPattern))
      
      // Common non-skill words to filter out
      const stopWords = [
        'the', 'and', 'or', 'with', 'for', 'to', 'in', 'of', 'a', 'an', 'is', 'are',
        'have', 'has', 'will', 'be', 'been', 'being', 'experience', 'years', 'year',
        'knowledge', 'understanding', 'skills', 'skill', 'ability', 'strong', 'good',
        'excellent', 'proficient', 'working', 'hands-on', 'minimum', 'required',
        'preferred', 'must', 'should', 'can', 'may', 'etc', 'including', 'such'
      ]
      
      for (const match of matches) {
        const word = match[1].toLowerCase()
        if (word.length > 1 && !stopWords.includes(word)) {
          skills.push(word)
        }
      }
      // Deduplicate using filter
      return skills.filter((skill, index) => skills.indexOf(skill) === index)
    }
    
    // Extract from critical sections
    for (const pattern of criticalSectionPatterns) {
      const matches = Array.from(jd.matchAll(pattern))
      for (const match of matches) {
        const sectionText = match[1] || ''
        const skills = extractSkillsFromText(sectionText)
        for (const skill of skills) {
          if (!critical.includes(skill) && !important.includes(skill)) {
            critical.push(skill)
          }
        }
      }
    }
    
    // Extract from important sections
    for (const pattern of importantSectionPatterns) {
      const matches = Array.from(jd.matchAll(pattern))
      for (const match of matches) {
        const sectionText = match[1] || ''
        const skills = extractSkillsFromText(sectionText)
        for (const skill of skills) {
          if (!critical.includes(skill) && !important.includes(skill)) {
            important.push(skill)
          }
        }
      }
    }
    
    return {
      critical: critical.slice(0, 5),   // Limit critical to 5 (FIX A preserved)
      important: important.slice(0, 10) // Limit important to 10
    }
  }

  /**
   * DOMAIN-AGNOSTIC: Check must-have skills with equivalent tool support
   * FIX A: Fail if ANY critical skill is missing (preserved)
   * NEW: Accept equivalent tools for critical platform skills
   * Percentage matching does NOT override missing critical skills
   * Works for ANY domain - no RPA-specific logic
   */
  private static checkMustHaveSkills(
    resumeText: string, 
    mustHaveSkills: { critical: string[]; important: string[] }
  ): { pass: boolean; missingCritical: string[]; missingImportant: string[] } {
    const textLower = resumeText.toLowerCase()
    const missingCritical: string[] = []
    const missingImportant: string[] = []
    
    // Check each critical skill - ALL must be present
    for (const skill of mustHaveSkills.critical) {
      // First check direct match
      if (textLower.includes(skill)) {
        continue // Skill found directly
      }
      
      // If not found directly, check for equivalent tools
      const equivalentTools = this.getEquivalentTools(skill)
      const hasEquivalent = equivalentTools.some(eqTool => textLower.includes(eqTool))
      
      if (!hasEquivalent) {
        missingCritical.push(skill)
      }
    }
    
    // Check important skills (no equivalent logic for important skills)
    for (const skill of mustHaveSkills.important) {
      if (!textLower.includes(skill)) {
        missingImportant.push(skill)
      }
    }
    
    // FIX A: If ANY critical skill is missing, FAIL (no percentage override)
    const pass = missingCritical.length === 0
    
    return { pass, missingCritical, missingImportant }
  }

  /**
   * DOMAIN-AGNOSTIC: Run all eligibility gates
   * FIX A: Uses new critical/important must-have split (preserved)
   * FIX B: Experience buffer reduced to 0.5 years (preserved)
   * Works for ANY domain - no RPA-specific logic
   */
  private static runEligibilityGates(
    resumeText: string, 
    jd: string, 
    yearsActual: number | null
  ): CVEvaluationResult['eligibility'] {
    const failReasons: string[] = []
    let missingMustHave: string[] = []
    
    // Gate 1: Domain Fit (DOMAIN-AGNOSTIC)
    const domainCheck = this.checkDomainFit(resumeText, jd)
    const domainFit: EligibilityStatus = domainCheck.pass ? "PASS" : "FAIL"
    if (domainFit === "FAIL" && domainCheck.reason) {
      failReasons.push(domainCheck.reason)
    }
    
    // Gate 2: Must-Have Skills (FIX A: Critical skills cause immediate failure)
    const mustHaveSkills = this.extractMustHaveSkills(jd)
    const mustHaveCheck = this.checkMustHaveSkills(resumeText, mustHaveSkills)
    const mustHaveFit: EligibilityStatus = mustHaveCheck.pass ? "PASS" : "FAIL"
    if (mustHaveFit === "FAIL") {
      failReasons.push(`Missing critical skills: ${mustHaveCheck.missingCritical.join(', ')}`)
    }
    // Expose all missing must-haves (critical + important)
    missingMustHave = [...mustHaveCheck.missingCritical, ...mustHaveCheck.missingImportant]
    
    // Gate 3: Experience Fit (FIX B: Only 0.5 year buffer allowed)
    const expReq = this.extractExperienceRequirement(jd)
    let experienceFit: EligibilityStatus = "PASS"
    if (expReq && yearsActual !== null) {
      if (yearsActual < expReq.min - 0.5) { // FIX B: Reduced from 1 year to 0.5 years
        experienceFit = "FAIL"
        failReasons.push(`Experience below requirement: ${yearsActual} years vs ${expReq.raw} required (min ${expReq.min - 0.5} allowed)`)
      }
    }
    
    // Gate 4: Language Fit (binary compliance only - no scoring)
    const requiredLang = this.extractRequiredLanguage(jd)
    let languageFit: EligibilityStatus = "PASS"
    if (requiredLang && !this.hasLanguage(resumeText, requiredLang)) {
      languageFit = "FAIL"
      failReasons.push(`Required language not found: ${requiredLang}`)
    }
    
    return {
      domain_fit: domainFit,
      must_have_fit: mustHaveFit,
      experience_fit: experienceFit,
      language_fit: languageFit,
      fail_reasons: failReasons,
      missing_must_have: missingMustHave
    }
  }

  // =========================================================================
  // PHASE 1: SCORING (Rule-based + LLM Hybrid)
  // =========================================================================

  /**
   * Rule-based experience score calculation
   */
  private static calculateExperienceScore(
    yearsActual: number | null, 
    jd: string
  ): { score: number; matchLevel: MatchLevel; yearsRequired: string } {
    const expReq = this.extractExperienceRequirement(jd)
    
    if (!expReq) {
      return { score: 70, matchLevel: "Within", yearsRequired: "Not specified" }
    }
    
    if (yearsActual === null) {
      return { score: 50, matchLevel: "Within", yearsRequired: expReq.raw }
    }
    
    const { min, max } = expReq
    
    if (yearsActual < min - 0.5) {
      // Below minimum (FIX B: only 0.5 year buffer allowed)
      const ratio = yearsActual / min
      return { score: Math.max(20, Math.round(ratio * 60)), matchLevel: "Below", yearsRequired: expReq.raw }
    } else if (max && yearsActual > max + 2) {
      // Overqualified (more than 2 years over max)
      return { score: 75, matchLevel: "Above", yearsRequired: expReq.raw }
    } else if (yearsActual >= min && (!max || yearsActual <= max)) {
      // Within range
      return { score: 95, matchLevel: "Within", yearsRequired: expReq.raw }
    } else {
      // Slightly above max
      return { score: 85, matchLevel: "Above", yearsRequired: expReq.raw }
    }
  }

  /**
   * Rule-based location score
   */
  private static calculateLocationScore(
    candidateLocation: string | null,
    jobLocation: string | null,
    jd: string
  ): { score: number; remotePossible: boolean } {
    const jdLower = jd.toLowerCase()
    const remotePossible = jdLower.includes('remote') || 
                           jdLower.includes('work from home') || 
                           jdLower.includes('wfh') ||
                           jdLower.includes('hybrid')
    
    if (remotePossible) {
      return { score: 90, remotePossible: true }
    }
    
    if (!candidateLocation || !jobLocation) {
      return { score: 60, remotePossible: false }
    }
    
    const candLower = candidateLocation.toLowerCase()
    const jobLower = jobLocation.toLowerCase()
    
    // Exact city match
    if (candLower.includes(jobLower) || jobLower.includes(candLower)) {
      return { score: 100, remotePossible: false }
    }
    
    // Same country (India-specific cities)
    const indiaCities = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'noida', 'gurgaon', 'gurugram']
    const candInIndia = indiaCities.some(c => candLower.includes(c))
    const jobInIndia = indiaCities.some(c => jobLower.includes(c))
    
    if (candInIndia && jobInIndia) {
      return { score: 70, remotePossible: false } // Same country, different city
    }
    
    return { score: 40, remotePossible: false }
  }

  /**
   * Calculate weighted final score
   */
  private static calculateWeightedScore(scores: CVEvaluationResult['scores']): number {
    const weightedSum = 
      (scores.skill_match.score * WEIGHTS.skill_match / 100) +
      (scores.project_relevance.score * WEIGHTS.project_relevance / 100) +
      (scores.experience_match.score * WEIGHTS.experience_match / 100) +
      (scores.education_and_certs.score * WEIGHTS.education_and_certs / 100) +
      (scores.location_and_availability.score * WEIGHTS.location_and_availability / 100) +
      (scores.resume_quality.score * WEIGHTS.resume_quality / 100)
    
    return Math.round(weightedSum)
  }

  // =========================================================================
  // PHASE 2: RISK ADJUSTMENT & SCORE CAPPING
  // =========================================================================

  /**
   * Identify risk flags and apply score caps
   * FIX C: Added production exposure check with score cap at 65
   */
  private static applyRiskAdjustments(
    rawScore: number,
    scores: CVEvaluationResult['scores'],
    llmData: LLMExtractionResponse,
    jd: string // Added to check if production role
  ): { 
    finalScore: number
    criticalGaps: string[]
    riskFlags: string[]
    scoreCap: number | null 
  } {
    const criticalGaps: string[] = []
    const riskFlags: string[] = []
    let scoreCap: number | null = null
    
    // Check for critical missing skills
    if (scores.skill_match.missing_critical.length > 0) {
      criticalGaps.push(`Missing critical skills: ${scores.skill_match.missing_critical.join(', ')}`)
    }
    
    // Risk flags from LLM extraction (DOMAIN-AGNOSTIC)
    if (!llmData.has_debugging_experience) {
      riskFlags.push("No debugging/maintenance experience mentioned")
    }
    if (!llmData.has_cloud_exposure) {
      riskFlags.push("No cloud exposure mentioned")
    }
    if (llmData.career_gaps_months.some(g => g > 6)) {
      riskFlags.push("Career gap > 6 months detected")
    }
    
    // FIX C: Production exposure check - if JD is production role and no prod experience
    const isProductionRole = this.isProductionRole(jd)
    if (isProductionRole && !llmData.has_production_deployment) {
      riskFlags.push("No production deployment experience")
    }
    
    // FIX F: Tenure stability - check for job hopping risk
    if (llmData.average_tenure_months !== null && llmData.average_tenure_months < 12) {
      riskFlags.push("High job hopping risk")
    }
    
    // Apply score caps
    let finalScore = rawScore
    
    // Cap at 75 if critical skills missing
    if (criticalGaps.length > 0) {
      if (finalScore > 75) {
        finalScore = 75
        scoreCap = 75
      }
    }
    
    // FIX C: Cap at 65 if production role but no production experience
    if (isProductionRole && !llmData.has_production_deployment) {
      if (finalScore > 65) {
        finalScore = 65
        scoreCap = 65
      }
    }
    
    // Cap at 65 if multiple risk flags (3+)
    if (riskFlags.length >= 3) {
      if (finalScore > 65) {
        finalScore = 65
        scoreCap = 65
      }
    }
    
    return { finalScore, criticalGaps, riskFlags, scoreCap }
  }

  /**
   * FIX C: Check if JD requires production experience (DOMAIN-AGNOSTIC)
   * Works for any role type - not just RPA
   */
  private static isProductionRole(jd: string): boolean {
    const jdLower = jd.toLowerCase()
    const productionKeywords = [
      'production', 'prod environment', 'live system', 'deployment',
      'operations', 'support', 'maintenance', 'monitoring',
      'post-deployment', 'deployment support', 'production support',
      'live environment', 'production environment', 'on-call'
    ]
    return productionKeywords.some(k => jdLower.includes(k))
  }

  /**
   * FIX C: Detect production experience from resume (DOMAIN-AGNOSTIC)
   * Works for any domain - not just RPA
   */
  private static detectProductionExposure(resumeText: string, llmData: LLMExtractionResponse): {
    has_prod_experience: boolean
    evidence: string[]
  } {
    const evidence: string[] = []
    const textLower = resumeText.toLowerCase()
    
    // DOMAIN-AGNOSTIC production patterns
    const productionPatterns = [
      { pattern: /prod(?:uction)?\s+(?:deployment|support|environment)/i, desc: 'Production deployment/support' },
      { pattern: /deployed\s+(?:to|in)\s+prod/i, desc: 'Deployed to production' },
      { pattern: /live\s+(?:environment|system|server)/i, desc: 'Live environment experience' },
      { pattern: /post[\-\s]deployment/i, desc: 'Post-deployment experience' },
      { pattern: /on[\-\s]call/i, desc: 'On-call support' },
      { pattern: /production\s+(?:system|server|app|application)/i, desc: 'Production system experience' },
      { pattern: /(?:24x7|24\/7)\s+support/i, desc: '24x7 support' },
      { pattern: /incident\s+(?:management|response)/i, desc: 'Incident management' },
      { pattern: /monitoring\s+(?:tools?|systems?)/i, desc: 'Monitoring experience' }
    ]
    
    for (const { pattern, desc } of productionPatterns) {
      if (pattern.test(resumeText)) {
        evidence.push(desc)
      }
    }
    
    // Also use LLM detection
    const hasProdExperience = llmData.has_production_deployment || evidence.length > 0
    
    return {
      has_prod_experience: hasProdExperience,
      evidence
    }
  }

  /**
   * FIX F: Compute tenure analysis
   */
  private static computeTenureAnalysis(llmData: LLMExtractionResponse): {
    average_tenure_months: number | null
    job_hopping_risk: JobHoppingRisk
  } {
    const avgTenure = llmData.average_tenure_months
    
    let jobHoppingRisk: JobHoppingRisk = 'Low'
    if (avgTenure !== null) {
      if (avgTenure < 12) {
        jobHoppingRisk = 'High'
      } else if (avgTenure < 24) {
        jobHoppingRisk = 'Medium'
      }
    }
    
    return {
      average_tenure_months: avgTenure,
      job_hopping_risk: jobHoppingRisk
    }
  }

  /**
   * FIX G: Calculate explainable score breakdown
   */
  private static calculateExplainableScore(scores: CVEvaluationResult['scores']): {
    skill_contribution: number
    project_contribution: number
    experience_contribution: number
    edu_certs_contribution: number
    location_contribution: number
    quality_contribution: number
  } {
    return {
      skill_contribution: Math.round((scores.skill_match.score * WEIGHTS.skill_match / 100) * 100) / 100,
      project_contribution: Math.round((scores.project_relevance.score * WEIGHTS.project_relevance / 100) * 100) / 100,
      experience_contribution: Math.round((scores.experience_match.score * WEIGHTS.experience_match / 100) * 100) / 100,
      edu_certs_contribution: Math.round((scores.education_and_certs.score * WEIGHTS.education_and_certs / 100) * 100) / 100,
      location_contribution: Math.round((scores.location_and_availability.score * WEIGHTS.location_and_availability / 100) * 100) / 100,
      quality_contribution: Math.round((scores.resume_quality.score * WEIGHTS.resume_quality / 100) * 100) / 100
    }
  }

  // =========================================================================
  // PHASE 3: VERDICT DETERMINATION
  // =========================================================================

  /**
   * Determine final verdict based on score and eligibility
   * FIX D: < 55 = Reject (Borderline is 55-64 only)
   * FIX E: missing_critical blocks Strong Match
   */
  private static determineVerdict(
    score: number, 
    eligibility: CVEvaluationResult['eligibility'],
    criticalGaps: string[],
    missingCritical: string[] // FIX E: Added to check for missing critical skills
  ): { verdict: Verdict; qualified: boolean } {
    // Any eligibility gate failure = Reject
    if (eligibility.fail_reasons.length > 0) {
      return { verdict: "Reject", qualified: false }
    }
    
    // FIX D: Low score hard reject (< 55 even if gates pass)
    if (score < 55) {
      return { verdict: "Reject", qualified: false }
    }
    
    // FIX E: Strong Match Protection - missing_critical blocks Strong Match
    const hasMissingCritical = missingCritical.length > 0 || criticalGaps.length > 0
    
    // Score-based verdict
    if (score >= 80 && !hasMissingCritical) {
      return { verdict: "Strong Match", qualified: true }
    } else if (score >= 80 && hasMissingCritical) {
      // FIX E: Score >= 80 but missing critical = max Good Match
      return { verdict: "Good Match", qualified: true }
    } else if (score >= 65) {
      return { verdict: "Good Match", qualified: true }
    } else if (score >= 55) {
      // FIX D: Borderline is now 55-64 only
      return { verdict: "Borderline", qualified: false }
    } else {
      return { verdict: "Reject", qualified: false }
    }
  }

  /**
   * Generate reason summary
   */
  private static generateReasonSummary(
    verdict: Verdict,
    eligibility: CVEvaluationResult['eligibility'],
    scores: CVEvaluationResult['scores'],
    riskAdjustments: CVEvaluationResult['risk_adjustments']
  ): string {
    const parts: string[] = []
    
    if (eligibility.fail_reasons.length > 0) {
      parts.push(`Eligibility failed: ${eligibility.fail_reasons[0]}`)
    }
    
    if (verdict === "Strong Match") {
      parts.push("Excellent skill match with relevant project experience")
    } else if (verdict === "Good Match") {
      parts.push("Good overall fit with some areas for development")
    } else if (verdict === "Borderline") {
      parts.push("Partial match - requires careful consideration")
    }
    
    if (scores.skill_match.missing_critical.length > 0) {
      parts.push(`Missing: ${scores.skill_match.missing_critical.slice(0, 3).join(', ')}`)
    }
    
    if (riskAdjustments.score_cap_applied) {
      parts.push(`Score capped at ${riskAdjustments.score_cap_applied} due to risk factors`)
    }
    
    return parts.join('. ') || "Evaluation complete"
  }

  // =========================================================================
  // MAIN EVALUATION METHOD
  // =========================================================================

  /**
   * Main evaluation entry point - NEW 3-PHASE ARCHITECTURE
   */
  static async evaluateCandidate(
    resumeText: string,
    jobDescription: string,
    passThreshold: number = 50,
    companyId?: string,
    openaiClient?: any
  ): Promise<CVEvaluationResult> {
    console.log('🎯 [CV EVALUATOR v2.0] Starting 3-phase evaluation (DOMAIN-AGNOSTIC)...')
    
    // Quick pre-check for domain mismatch (DOMAIN-AGNOSTIC)
    const domainCheck = this.checkDomainFit(resumeText, jobDescription)
    
    if (!domainCheck.pass) {
      console.log('❌ [CV EVALUATOR] Hard reject: Domain mismatch')
      return this.createRejectionResult(
        domainCheck.reason || "Domain mismatch: Required platforms/tools not found in resume",
        { domain_fit: "FAIL", must_have_fit: "PASS", experience_fit: "PASS", language_fit: "PASS", fail_reasons: [domainCheck.reason || "Required platforms not found"], missing_must_have: domainCheck.criticalPlatforms }
      )
    }

    // Build LLM prompt for extraction and limited scoring
    const userPrompt = this.buildLLMPrompt(resumeText, jobDescription)

    try {
      const apiKey = openaiClient?.apiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
      
      if (!apiKey) {
        throw new Error('No OpenAI API key configured')
      }

      // Call LLM for extraction
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = apiKey
      
      let llmResponse: LLMExtractionResponse
      
      try {
        const response = await generateText({
          model: openai("gpt-4o"),
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.1,
        })
        
        const cleaned = response.text.trim()
          .replace(/^```(?:json)?/i, '')
          .replace(/```$/i, '')
          .trim()
        
        llmResponse = JSON.parse(cleaned)
        console.log('✅ [CV EVALUATOR] LLM extraction complete')
      } finally {
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey
        } else {
          delete process.env.OPENAI_API_KEY
        }
      }

      // PHASE 0: Run eligibility gates
      const eligibility = this.runEligibilityGates(
        resumeText, 
        jobDescription, 
        llmResponse.extracted.total_experience_years_estimate
      )
      console.log(`📋 [CV EVALUATOR] Eligibility: ${eligibility.fail_reasons.length === 0 ? 'PASS' : 'FAIL - ' + eligibility.fail_reasons.join('; ')}`)

      // PHASE 1: Calculate scores
      const expScore = this.calculateExperienceScore(
        llmResponse.extracted.total_experience_years_estimate,
        jobDescription
      )
      
      const locScore = this.calculateLocationScore(
        llmResponse.extracted.location,
        this.extractJobLocation(jobDescription),
        jobDescription
      )

      const scores: CVEvaluationResult['scores'] = {
        skill_match: {
          score: llmResponse.llm_scores.skill_match.score,
          weight: 30,
          matched_critical: llmResponse.llm_scores.skill_match.matched_critical,
          matched_important: llmResponse.llm_scores.skill_match.matched_important,
          missing_critical: llmResponse.llm_scores.skill_match.missing_critical,
          evidence: llmResponse.llm_scores.skill_match.evidence
        },
        project_relevance: {
          score: llmResponse.llm_scores.project_relevance.score,
          weight: 20,
          relevant_projects: llmResponse.llm_scores.project_relevance.relevant_projects,
          recent_skills_used: llmResponse.llm_scores.project_relevance.recent_skills_used,
          evidence: llmResponse.llm_scores.project_relevance.evidence
        },
        experience_match: {
          score: expScore.score,
          weight: 20,
          years_actual: llmResponse.extracted.total_experience_years_estimate,
          years_required: expScore.yearsRequired,
          match_level: expScore.matchLevel,
          evidence: [`Calculated ${llmResponse.extracted.total_experience_years_estimate || 'unknown'} years from work history`]
        },
        education_and_certs: {
          score: this.calculateEducationScore(llmResponse.extracted),
          weight: 15,
          degree: llmResponse.extracted.education[0]?.degree || null,
          field_match: this.checkFieldMatch(llmResponse.extracted.education, jobDescription),
          issued_certs: llmResponse.extracted.certifications.filter(c => c.status === 'issued').map(c => c.name),
          pursuing_certs: llmResponse.extracted.certifications.filter(c => c.status === 'pursuing').map(c => c.name),
          missing_required_certs: this.findMissingCerts(llmResponse.extracted.certifications, jobDescription),
          evidence: []
        },
        location_and_availability: {
          score: locScore.score,
          weight: 10,
          candidate_location: llmResponse.extracted.location,
          job_location: this.extractJobLocation(jobDescription),
          remote_possible: locScore.remotePossible,
          joining_time_days: null,
          evidence: []
        },
        resume_quality: {
          score: llmResponse.llm_scores.resume_quality.score,
          weight: 5,
          clarity: llmResponse.llm_scores.resume_quality.clarity,
          structure: llmResponse.llm_scores.resume_quality.structure,
          completeness: llmResponse.llm_scores.resume_quality.completeness,
          issues: llmResponse.llm_scores.resume_quality.issues,
          evidence: llmResponse.llm_scores.resume_quality.evidence
        }
      }

      // Calculate raw weighted score
      const rawScore = this.calculateWeightedScore(scores)
      console.log(`📊 [CV EVALUATOR] Raw weighted score: ${rawScore}`)

      // PHASE 2: Risk adjustments (FIX C: now includes JD for production role check)
      const riskResult = this.applyRiskAdjustments(rawScore, scores, llmResponse, jobDescription)
      console.log(`⚠️ [CV EVALUATOR] Risk-adjusted score: ${riskResult.finalScore} (cap: ${riskResult.scoreCap || 'none'})`)

      // FIX C: Compute production exposure
      const productionExposure = this.detectProductionExposure(resumeText, llmResponse)
      console.log(`🏭 [CV EVALUATOR] Production exposure: ${productionExposure.has_prod_experience}`)

      // FIX F: Compute tenure analysis
      const tenureAnalysis = this.computeTenureAnalysis(llmResponse)
      console.log(`📅 [CV EVALUATOR] Tenure analysis: ${tenureAnalysis.average_tenure_months}mo, risk=${tenureAnalysis.job_hopping_risk}`)

      // FIX G: Calculate explainable score
      const explainableScore = this.calculateExplainableScore(scores)

      // PHASE 3: Final verdict (FIX D+E: updated logic)
      const { verdict, qualified } = this.determineVerdict(
        riskResult.finalScore, 
        eligibility, 
        riskResult.criticalGaps,
        scores.skill_match.missing_critical // FIX E: pass missing_critical for Strong Match protection
      )
      console.log(`🏁 [CV EVALUATOR] Verdict: ${verdict} (qualified: ${qualified})`)

      // Build final result with all new fields
      const result: CVEvaluationResult = {
        overall: {
          score_percent: riskResult.finalScore,
          qualified,
          verdict,
          reason_summary: this.generateReasonSummary(verdict, eligibility, scores, {
            critical_gaps: riskResult.criticalGaps,
            risk_flags: riskResult.riskFlags,
            score_cap_applied: riskResult.scoreCap
          })
        },
        eligibility,
        scores,
        risk_adjustments: {
          critical_gaps: riskResult.criticalGaps,
          risk_flags: riskResult.riskFlags,
          score_cap_applied: riskResult.scoreCap
        },
        production_exposure: productionExposure,  // FIX C: NEW
        tenure_analysis: tenureAnalysis,          // FIX F: NEW
        explainable_score: explainableScore,      // FIX G: NEW
        extracted: llmResponse.extracted
      }

      return result

    } catch (error) {
      console.error("❌ [CV EVALUATOR] Error:", error)
      return this.createFallbackResult(error, passThreshold)
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Build LLM prompt for extraction and limited scoring
   */
  private static buildLLMPrompt(resumeText: string, jobDescription: string): string {
    return `Extract data from this resume and score ONLY skill_match, project_relevance, and resume_quality.

[JOB DESCRIPTION]
${jobDescription}

[RESUME]
${resumeText}

[INSTRUCTIONS]
1. Extract all structured data accurately
2. Score skill_match (0-100): How well do resume skills match JD requirements?
3. Score project_relevance (0-100): How relevant are recent projects to the JD?
4. Score resume_quality (0-100): Clarity, structure, completeness
5. Identify platforms/tools, languages, and experience flags

[OUTPUT SCHEMA - RETURN ONLY JSON]
{
  "llm_scores": {
    "skill_match": {
      "score": number,
      "matched_critical": string[],
      "matched_important": string[],
      "missing_critical": string[],
      "evidence": string[]
    },
    "project_relevance": {
      "score": number,
      "relevant_projects": number,
      "recent_skills_used": string[],
      "evidence": string[]
    },
    "resume_quality": {
      "score": number,
      "clarity": number,
      "structure": number,
      "completeness": number,
      "issues": string[],
      "evidence": string[]
    }
  },
  "extracted": {
    "name": string|null,
    "email": string|null,
    "phone": string|null,
    "location": string|null,
    "total_experience_years_estimate": number|null,
    "titles": string[],
    "skills": string[],
    "education": [{"degree": string|null, "field": string|null, "institution": string|null, "year": string|null}],
    "work_experience": [{"company": string, "title": string, "start_date": string|null, "end_date": string|null, "duration": string}],
    "certifications": [{"name": string, "status": "issued"|"pursuing"|"expired", "year": string|null}],
    "languages": [{"language": string, "proficiency": string}],
    "recent_projects": [{"title": string, "duration": string, "technologies": string[]}]
  },
  "detected_platforms": string[],
  "detected_languages": string[],
  "has_production_deployment": boolean,
  "has_debugging_experience": boolean,
  "has_cloud_exposure": boolean,
  "average_tenure_months": number|null,
  "career_gaps_months": number[]
}`
  }

  /**
   * Extract job location from JD
   */
  private static extractJobLocation(jd: string): string | null {
    const locationPatterns = [
      /location[:\s]+([^,.\n]+)/i,
      /based\s+(?:in|at)\s+([^,.\n]+)/i,
      /(mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|pune|kolkata|ahmedabad|noida|gurgaon|gurugram)/i
    ]
    
    for (const pattern of locationPatterns) {
      const match = jd.match(pattern)
      if (match) return match[1].trim()
    }
    return null
  }

  /**
   * Calculate education score
   */
  private static calculateEducationScore(extracted: CVEvaluationResult['extracted']): number {
    let score = 50 // Base score
    
    if (extracted.education.length > 0) {
      const degree = extracted.education[0].degree?.toLowerCase() || ''
      if (degree.includes('master') || degree.includes('mba') || degree.includes('m.tech') || degree.includes('mca')) {
        score += 30
      } else if (degree.includes('bachelor') || degree.includes('b.tech') || degree.includes('bca') || degree.includes('b.e')) {
        score += 20
      } else if (degree.includes('diploma')) {
        score += 10
      }
    }
    
    // Add points for certifications
    const issuedCerts = extracted.certifications.filter(c => c.status === 'issued').length
    score += Math.min(issuedCerts * 5, 20)
    
    return Math.min(score, 100)
  }

  /**
   * Check if education field matches JD
   */
  private static checkFieldMatch(education: CVEvaluationResult['extracted']['education'], jd: string): boolean {
    const jdLower = jd.toLowerCase()
    const techFields = ['computer', 'software', 'it', 'information technology', 'electronics', 'engineering']
    
    for (const edu of education) {
      const field = edu.field?.toLowerCase() || ''
      if (techFields.some(f => field.includes(f) || jdLower.includes(f))) {
        return true
      }
    }
    return false
  }

  /**
   * DOMAIN-AGNOSTIC: Find missing required certifications
   * Supports certifications across all domains
   */
  private static findMissingCerts(certs: CVEvaluationResult['extracted']['certifications'], jd: string): string[] {
    const jdLower = jd.toLowerCase()
    const requiredCerts: string[] = []
    
    // Domain-agnostic certification patterns
    const certPatterns = [
      // RPA
      { pattern: /uipath\s+certif/i, name: 'UiPath Certified' },
      { pattern: /automation anywhere\s+certif/i, name: 'AA Certified' },
      { pattern: /blue prism\s+certif/i, name: 'Blue Prism Certified' },
      // Cloud
      { pattern: /aws\s+certif/i, name: 'AWS Certified' },
      { pattern: /azure\s+certif/i, name: 'Azure Certified' },
      { pattern: /gcp\s+certif|google\s+cloud\s+certif/i, name: 'GCP Certified' },
      // DevOps
      { pattern: /kubernetes\s+certif|cka|ckad/i, name: 'Kubernetes Certified' },
      { pattern: /docker\s+certif/i, name: 'Docker Certified' },
      // Agile/PM
      { pattern: /pmp\s+certif|project\s+management\s+professional/i, name: 'PMP Certified' },
      { pattern: /scrum\s+master|csm\s+certif/i, name: 'Scrum Master Certified' },
      // Security
      { pattern: /cissp/i, name: 'CISSP Certified' },
      { pattern: /ceh\s+certif|certified\s+ethical\s+hacker/i, name: 'CEH Certified' }
    ]
    
    for (const { pattern, name } of certPatterns) {
      if (pattern.test(jd)) {
        const hasCert = certs.some(c => c.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
        if (!hasCert) requiredCerts.push(name)
      }
    }
    
    return requiredCerts
  }

  /**
   * Create rejection result for hard failures
   */
  private static createRejectionResult(
    reason: string,
    eligibility: Omit<CVEvaluationResult['eligibility'], 'missing_must_have'> & { missing_must_have?: string[] }
  ): CVEvaluationResult {
    const scores = {
      skill_match: { score: 10, weight: 30 as const, matched_critical: [], matched_important: [], missing_critical: ['Required Platform'], evidence: [] },
      project_relevance: { score: 10, weight: 20 as const, relevant_projects: 0, recent_skills_used: [], evidence: [] },
      experience_match: { score: 20, weight: 20 as const, years_actual: null, years_required: "Unknown", match_level: "Below" as const, evidence: [] },
      education_and_certs: { score: 30, weight: 15 as const, degree: null, field_match: false, issued_certs: [], pursuing_certs: [], missing_required_certs: [], evidence: [] },
      location_and_availability: { score: 50, weight: 10 as const, candidate_location: null, job_location: null, remote_possible: false, joining_time_days: null, evidence: [] },
      resume_quality: { score: 50, weight: 5 as const, clarity: 50, structure: 50, completeness: 50, issues: [], evidence: [] }
    }
    
    return {
      overall: {
        score_percent: 15,
        qualified: false,
        verdict: "Reject",
        reason_summary: reason
      },
      eligibility: {
        ...eligibility,
        missing_must_have: eligibility.missing_must_have || ['Required Platform']
      },
      scores,
      risk_adjustments: {
        critical_gaps: ['Required platform/skill not found'],
        risk_flags: [],
        score_cap_applied: null
      },
      production_exposure: {
        has_prod_experience: false,
        evidence: []
      },
      tenure_analysis: {
        average_tenure_months: null,
        job_hopping_risk: 'Low'
      },
      explainable_score: this.calculateExplainableScore(scores),
      extracted: {
        name: null, email: null, phone: null, location: null,
        total_experience_years_estimate: null, titles: [], skills: [],
        education: [], work_experience: [], certifications: [], languages: [], recent_projects: []
      }
    }
  }

  /**
   * Create fallback result when API fails
   */
  private static createFallbackResult(error: unknown, passThreshold: number): CVEvaluationResult {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log('🔐 [CV EVALUATOR] Using fallback evaluation due to:', errorMessage)
    
    const scores = {
      skill_match: { score: 50, weight: 30 as const, matched_critical: [], matched_important: [], missing_critical: [], evidence: ["Mock - API unavailable"] },
      project_relevance: { score: 50, weight: 20 as const, relevant_projects: 0, recent_skills_used: [], evidence: ["Mock - API unavailable"] },
      experience_match: { score: 50, weight: 20 as const, years_actual: null, years_required: "Unknown", match_level: "Within" as const, evidence: ["Mock - API unavailable"] },
      education_and_certs: { score: 50, weight: 15 as const, degree: null, field_match: false, issued_certs: [], pursuing_certs: [], missing_required_certs: [], evidence: ["Mock - API unavailable"] },
      location_and_availability: { score: 50, weight: 10 as const, candidate_location: null, job_location: null, remote_possible: false, joining_time_days: null, evidence: ["Mock - API unavailable"] },
      resume_quality: { score: 50, weight: 5 as const, clarity: 50, structure: 50, completeness: 50, issues: ["API unavailable"], evidence: ["Mock - API unavailable"] }
    }
    
    return {
      overall: {
        score_percent: 35,
        qualified: false,
        verdict: "Reject",
        reason_summary: "Evaluation failed - OpenAI API unavailable. Please configure a valid API key."
      },
      eligibility: {
        domain_fit: "PASS",
        must_have_fit: "PASS",
        experience_fit: "PASS",
        language_fit: "PASS",
        fail_reasons: ["API error - manual review required"],
        missing_must_have: []
      },
      scores,
      risk_adjustments: {
        critical_gaps: [],
        risk_flags: ["API error - scores are estimates"],
        score_cap_applied: null
      },
      production_exposure: {
        has_prod_experience: false,
        evidence: []
      },
      tenure_analysis: {
        average_tenure_months: null,
        job_hopping_risk: 'Low'
      },
      explainable_score: this.calculateExplainableScore(scores),
      extracted: {
        name: null, email: null, phone: null, location: null,
        total_experience_years_estimate: null, titles: [], skills: [],
        education: [], work_experience: [], certifications: [], languages: [], recent_projects: []
      }
    }
  }

  /**
   * Normalize skills for better matching
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
      'ui path': 'uipath',
      'aa': 'automation anywhere',
    }

    return skills.map(skill => {
      const lower = skill.toLowerCase().trim()
      return synonymMap[lower] || skill
    })
  }

  /**
   * DOMAIN-AGNOSTIC: Extract key skills from job description
   * Supports skills across all domains
   */
  static extractJDSkills(jobDescription: string): string[] {
    const allSkills = [
      // RPA
      'uipath', 'automation anywhere', 'blue prism', 'power automate', 'orchestrator',
      'pdd', 'sdd', 'bot development', 'rpa',
      // Programming
      'python', 'sql', 'vb.net', '.net', 'javascript', 'vba', 'c#', 'golang', 'rust', 'ruby',
      // Frontend
      'react', 'angular', 'vue', 'svelte', 'next.js', 'typescript', 'html', 'css', 'tailwind',
      // Backend
      'node.js', 'java', 'spring', 'django', 'flask', 'express', 'fastapi',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
      // Databases
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
      // Data & ML
      'spark', 'hadoop', 'kafka', 'airflow', 'tensorflow', 'pytorch', 'pandas', 'numpy',
      // General
      'graphql', 'rest api', 'microservices', 'ci/cd', 'git', 'agile', 'scrum'
    ]

    const jdLower = jobDescription.toLowerCase()
    return allSkills.filter(skill => jdLower.includes(skill.toLowerCase()))
  }
}
