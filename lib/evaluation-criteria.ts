/**
 * Evaluation Criteria Configuration
 * 
 * These are the 9 standard evaluation criteria that HR can select from.
 * HR can select a maximum of 5 criteria per job.
 * AI will generate exactly 10 questions distributed across selected criteria.
 */

export const EVALUATION_CRITERIA = [
  {
    id: 'technical_skills',
    name: 'Technical Skills',
    description: 'Assesses technical knowledge, tools, frameworks, and domain expertise',
    icon: '💻',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'problem_solving',
    name: 'Problem Solving',
    description: 'Evaluates analytical thinking, debugging, and solution design abilities',
    icon: '🧩',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Measures clarity, articulation, and ability to explain complex concepts',
    icon: '💬',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'experience',
    name: 'Experience',
    description: 'Validates relevant work history, projects, and professional background',
    icon: '📋',
    color: 'bg-slate-100 text-slate-800 border-slate-200'
  },
  {
    id: 'culture_fit',
    name: 'Culture Fit',
    description: 'Assesses alignment with company values, motivation, and career goals',
    icon: '🎯',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    id: 'teamwork',
    name: 'Teamwork / Collaboration',
    description: 'Evaluates ability to work with others, share knowledge, and collaborate',
    icon: '🤝',
    color: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    id: 'leadership',
    name: 'Leadership',
    description: 'Measures ability to guide, mentor, and influence others',
    icon: '👑',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: 'adaptability',
    name: 'Adaptability / Learning',
    description: 'Assesses flexibility, willingness to learn, and handling change',
    icon: '🔄',
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'work_ethic',
    name: 'Work Ethic / Reliability',
    description: 'Evaluates dependability, commitment, and professional responsibility',
    icon: '⭐',
    color: 'bg-rose-100 text-rose-800 border-rose-200'
  }
] as const

export type EvaluationCriteriaId = typeof EVALUATION_CRITERIA[number]['id']
export type EvaluationCriteriaName = typeof EVALUATION_CRITERIA[number]['name']

export const MAX_CRITERIA_SELECTION = 5
export const TOTAL_AI_QUESTIONS = 10

/**
 * Get criteria by ID
 */
export function getCriteriaById(id: string) {
  return EVALUATION_CRITERIA.find(c => c.id === id)
}

/**
 * Get criteria by name
 */
export function getCriteriaByName(name: string) {
  return EVALUATION_CRITERIA.find(c => c.name.toLowerCase() === name.toLowerCase())
}

/**
 * Get all criteria names
 */
export function getAllCriteriaNames(): string[] {
  return EVALUATION_CRITERIA.map(c => c.name)
}

/**
 * Validate selected criteria (max 5)
 */
export function validateCriteriaSelection(selectedCriteria: string[]): { valid: boolean; error?: string } {
  if (selectedCriteria.length === 0) {
    return { valid: false, error: 'Please select at least one evaluation criterion' }
  }
  if (selectedCriteria.length > MAX_CRITERIA_SELECTION) {
    return { valid: false, error: `Maximum ${MAX_CRITERIA_SELECTION} criteria can be selected` }
  }
  
  // Validate all selected criteria are valid
  const validNames = getAllCriteriaNames()
  const invalidCriteria = selectedCriteria.filter(c => !validNames.includes(c))
  if (invalidCriteria.length > 0) {
    return { valid: false, error: `Invalid criteria: ${invalidCriteria.join(', ')}` }
  }
  
  return { valid: true }
}

/**
 * Get color class for a criterion
 */
export function getCriteriaColor(criterionName: string): string {
  const criterion = getCriteriaByName(criterionName)
  return criterion?.color || 'bg-gray-100 text-gray-800 border-gray-200'
}
