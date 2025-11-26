export interface EducationEntry {
  institution: string
  degree: string
}

export interface CandidateProfile {
  university: 'targeted' | 'non-targeted'
  educationList?: EducationEntry[]  // All education entries (institution + degree)
  employer: 'targeted' | 'non-targeted'
  experience: number
  hasRelevantExperience: boolean
}

export interface ProfileGroup {
  id: string
  name: string
  description: string
  priority: 'highest' | 'high' | 'medium' | 'low'
  color: string
  bgColor: string
  criteria: {
    university: 'targeted' | 'non-targeted' | 'any'
    employer: 'targeted' | 'non-targeted' | 'any'
    minExperience: number
    requiresRelevantExp: boolean
  }
}

export const PROFILE_GROUPS: ProfileGroup[] = [
  {
    id: 'profile-0',
    name: 'Least Ideal',
    description: 'Non targeted university AND Non targeted employer',
    priority: 'low',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    criteria: {
      university: 'non-targeted',
      employer: 'non-targeted',
      minExperience: 0,
      requiresRelevantExp: false
    }
  },
  {
    id: 'profile-1',
    name: 'Average',
    description: 'Targeted university BUT Non targeted employer',
    priority: 'medium',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    criteria: {
      university: 'targeted',
      employer: 'non-targeted',
      minExperience: 0,
      requiresRelevantExp: false
    }
  },
  {
    id: 'profile-2',
    name: 'Good Match',
    description: 'Non targeted university BUT targeted employer (with at least 3 yrs of exp.)',
    priority: 'high',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    criteria: {
      university: 'non-targeted',
      employer: 'targeted',
      minExperience: 3,
      requiresRelevantExp: true
    }
  },
  {
    id: 'profile-3',
    name: 'Most Ideal',
    description: 'Targeted university AND targeted employer (with at least 3 yrs of exp.)',
    priority: 'highest',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    criteria: {
      university: 'targeted',
      employer: 'targeted',
      minExperience: 3,
      requiresRelevantExp: true
    }
  }
]

export function classifyCandidate(profile: CandidateProfile): ProfileGroup {
  // Check Profile 3 (Most Ideal) first
  if (profile.university === 'targeted' && 
      profile.employer === 'targeted' && 
      profile.experience >= 3 && 
      profile.hasRelevantExperience) {
    return PROFILE_GROUPS[3]
  }
  
  // Check Profile 2
  if (profile.university === 'non-targeted' && 
      profile.employer === 'targeted' && 
      profile.experience >= 3 && 
      profile.hasRelevantExperience) {
    return PROFILE_GROUPS[2]
  }
  
  // Check Profile 1
  if (profile.university === 'targeted' && 
      profile.employer === 'non-targeted') {
    return PROFILE_GROUPS[1]
  }
  
  // Default to Profile 0 (Least Ideal)
  return PROFILE_GROUPS[0]
}

export function getProfileRecommendation(profileGroup: ProfileGroup): string {
  switch (profileGroup.id) {
    case 'profile-3':
      return '🎯 **Highly Recommended** - Ideal candidate profile with strong background and experience'
    case 'profile-2':
      return '✅ **Recommended** - Good candidate with relevant experience from targeted employer'
    case 'profile-1':
      return '⚠️ **Consider with Caution** - Good educational background but limited industry experience'
    case 'profile-0':
    default:
      return '❌ **Not Recommended** - Does not meet preferred criteria for background and experience'
  }
}
