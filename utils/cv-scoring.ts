export interface SkillMatch {
  name: string
  score: number
  required: boolean
}

export interface CVData {
  role: string
  appliedRole: string
  skills: SkillMatch[]
  yearsOfExperience: number
  relevantExperience: number
  domain: string
  targetDomain: string
  education: string[]
  certifications: string[]
  communicationIndicators: string[]
}

export const WEIGHTS = {
  roleAlignment: 15,
  hardSkills: 35,
  experience: 20,
  domain: 10,
  education: 10,
  niceToHave: 5,
  communication: 5,
}

export function scoreRoleAlignment(role: string, appliedRole: string): number {
  // Exact match
  if (role.toLowerCase() === appliedRole.toLowerCase()) return 100
  
  // Similar role (e.g. "RPA Developer" vs "RPA Engineer")
  if (role.toLowerCase().includes(appliedRole.toLowerCase()) || 
      appliedRole.toLowerCase().includes(role.toLowerCase())) return 80
  
  // Related role
  const relatedTerms = role.toLowerCase().split(/\s+/)
  const matchedTerms = relatedTerms.filter(term => 
    appliedRole.toLowerCase().includes(term)
  )
  
  if (matchedTerms.length > 0) return 60
  
  return 40 // Partially related by default
}

export function scoreHardSkills(skills: SkillMatch[]): number {
  const requiredSkills = skills.filter(s => s.required)
  const preferredSkills = skills.filter(s => !s.required)
  
  const requiredScore = requiredSkills.reduce((sum, skill) => sum + skill.score, 0) / 
                       (requiredSkills.length * 100) * 80 // Required skills worth 80% of score
                       
  const preferredScore = preferredSkills.reduce((sum, skill) => sum + skill.score, 0) / 
                        (preferredSkills.length * 100) * 20 // Preferred skills worth 20%
  
  return Math.min(100, requiredScore + preferredScore)
}

export function scoreExperience(total: number, relevant: number, required: number): number {
  const relevanceScore = (relevant / total) * 100
  const yearsScore = Math.min(100, (total / required) * 100)
  
  return (relevanceScore * 0.4) + (yearsScore * 0.6) // 40% relevance, 60% years
}

export function scoreDomain(current: string, target: string): number {
  if (current.toLowerCase() === target.toLowerCase()) return 100
  
  // Check for related domains
  const relatedDomains = {
    finance: ["banking", "insurance", "fintech"],
    technology: ["it", "software", "tech"],
    healthcare: ["medical", "health", "pharma"],
    // Add more domain mappings
  }
  
  const currentLower = current.toLowerCase()
  const targetLower = target.toLowerCase()
  
  for (const [domain, related] of Object.entries(relatedDomains)) {
    if (related.includes(currentLower) && related.includes(targetLower)) return 80
  }
  
  return 40 // Different domain
}

export function scoreEducationCertifications(
  education: string[],
  certifications: string[],
  requiredEducation: string[],
  requiredCertifications: string[]
): number {
  const educationScore = requiredEducation.every(req => 
    education.some(edu => edu.toLowerCase().includes(req.toLowerCase()))
  ) ? 50 : 25

  const certScore = requiredCertifications.every(req =>
    certifications.some(cert => cert.toLowerCase().includes(req.toLowerCase()))
  ) ? 50 : 25

  return educationScore + certScore
}

export function scoreCommunication(indicators: string[]): number {
  const criteria = {
    clarity: 30,      // Clear communication style
    professionalism: 30, // Professional tone
    completeness: 40  // Complete information
  }
  
  let score = 0
  
  indicators.forEach(indicator => {
    if (indicator.includes("clear")) score += criteria.clarity
    if (indicator.includes("professional")) score += criteria.professionalism
    if (indicator.includes("complete")) score += criteria.completeness
  })
  
  return Math.min(100, score)
}

export function calculateOverallScore(scores: {
  roleAlignment: number
  hardSkills: number
  experience: number
  domain: number
  education: number
  niceToHave: number
  communication: number
}): number {
  return Math.round(
    (scores.roleAlignment * (WEIGHTS.roleAlignment / 100)) +
    (scores.hardSkills * (WEIGHTS.hardSkills / 100)) +
    (scores.experience * (WEIGHTS.experience / 100)) +
    (scores.domain * (WEIGHTS.domain / 100)) +
    (scores.education * (WEIGHTS.education / 100)) +
    (scores.niceToHave * (WEIGHTS.niceToHave / 100)) +
    (scores.communication * (WEIGHTS.communication / 100))
  )
}
