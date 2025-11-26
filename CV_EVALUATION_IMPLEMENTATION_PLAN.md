# CV Evaluation - 12 Criteria Implementation Plan

## Overview
Implementing comprehensive CV evaluation with 12 criteria for accurate candidate assessment.

## Implementation Strategy

### Phase 1: Enhanced Data Structure ✅
Update `CVEvaluationResult` interface to include all 12 criteria with clear scoring.

### Phase 2: Enhanced Prompt Engineering ✅
Update OpenAI prompt to extract and evaluate all 12 criteria systematically.

### Phase 3: UI Enhancement ✅
Update CV evaluation report component to display all 12 criteria clearly.

---

## 12 Criteria Breakdown

### 1. **Skill Set Match (Weight: 30%)**
- **Extract from JD**: Required skills, preferred skills, tools
- **Extract from CV**: Technical skills, tools mentioned in experience
- **Scoring**: (matched_skills / total_jd_skills) × 100
- **Implementation**: Fuzzy matching with skill normalization
- **Display**: Progress bar + matched skills list

### 2. **Missed Skills (Weight: 10%)**
- **Extract from JD**: Critical skills, important skills, nice-to-have
- **Extract from CV**: All skills mentioned
- **Scoring**: Penalty for missing critical skills
- **Implementation**: Categorize by importance (critical/important/nice)
- **Display**: Red flag list with severity indicators

### 3. **Skills in Recent Projects (Weight: 15%)**
- **Extract from JD**: Required technical skills
- **Extract from CV**: Last 3-5 years of projects, technologies used
- **Scoring**: (jd_skills_in_recent_projects / total_jd_skills) × 100
- **Implementation**: Focus on last 3-5 years, parse project descriptions
- **Display**: Timeline view with skill usage

### 4. **Experience Range Match (Weight: 15%)**
- **Extract from JD**: "X-Y years", "minimum X years"
- **Extract from CV**: Calculate from work history dates
- **Scoring**: 
  - Exact match: 100%
  - Within range: 80-99%
  - Below minimum: 0-50%
  - Above maximum: 60-80%
- **Implementation**: Date parsing, career break handling
- **Display**: Experience gauge with range indicator

### 5. **Location Match (Weight: 5%)**
- **Extract from JD**: Job location, remote options
- **Extract from CV**: Current location, relocation willingness
- **Scoring**:
  - Same city: 100%
  - Same region: 80%
  - Different country: 0-30%
- **Implementation**: Location parsing, remote work detection
- **Display**: Location badge with match indicator

### 6. **Written Communication (Weight: 5%)**
- **Extract from CV**: Overall structure, grammar, formatting
- **Scoring**:
  - Grammar errors: -20% per major error
  - Structure: Header, summary, experience, education
  - Professional formatting
- **Implementation**: Basic NLP, structure analysis
- **Display**: Communication quality score with feedback

### 7. **Education Qualification (Weight: 10%)**
- **Extract from JD**: Required degree, field of study
- **Extract from CV**: Highest degree, GPA, institution
- **Scoring**:
  - Exact match: 100%
  - Related field: 80%
  - Different field: 60%
  - Below required: 0-40%
- **Implementation**: Degree hierarchy, field mapping
- **Display**: Education match card with degree comparison

### 8. **Certifications (Weight: 5%)**
- **Extract from JD**: Required certifications
- **Extract from CV**: All certifications with dates
- **Scoring**: (matching_certs / required_certs) × 100
- **Implementation**: Certification validity check, equivalent recognition
- **Display**: Certification badges with validity status

### 9. **Language Skills (Weight: 2%)**
- **Extract from JD**: Required languages, proficiency levels
- **Extract from CV**: Languages with proficiency
- **Scoring**:
  - Native: 100%
  - Fluent: 80%
  - Intermediate: 60%
  - Basic: 30%
- **Implementation**: Proficiency standardization
- **Display**: Language proficiency bars

### 10. **Nationality (Weight: 1%)**
- **Extract from JD**: Nationality preferences (if any)
- **Extract from CV**: Nationality/citizenship
- **Scoring**: Binary match
- **Implementation**: Optional, country-specific
- **Display**: Hidden by default (privacy)

### 11. **Gender Preference (Weight: 0%)**
- **Status**: NOT IMPLEMENTED (Legal/Ethical concerns)
- **Recommendation**: Remove from evaluation
- **Note**: Focus on skills and experience only

### 12. **Profile Quality (Weight: 2%)**
- **Extract from JD**: Target company types, education levels
- **Extract from CV**: Education institutions, previous employers
- **Scoring**: Education ranking + Employer prestige
- **Implementation**: Institution/company ranking system
- **Display**: Profile classification (already exists)

---

## Technical Implementation

### 1. Update Interface (`lib/cv-evaluator.ts`)
```typescript
interface CVEvaluationResult {
  overall: {
    score_percent: number
    qualified: boolean
    reason_summary: string
  }
  breakdown: {
    skill_set_match: { score: number; weight: 30; matched: string[]; missing: string[]; evidence: string[] }
    missed_skills: { score: number; weight: 10; critical_missing: string[]; important_missing: string[]; evidence: string[] }
    skills_in_recent_projects: { score: number; weight: 15; recent_skills: string[]; evidence: string[] }
    experience_range: { score: number; weight: 15; years_actual: number; years_required: string; match_level: string; evidence: string[] }
    location_match: { score: number; weight: 5; candidate_location: string; job_location: string; evidence: string[] }
    written_communication: { score: number; weight: 5; grammar_score: number; structure_score: number; evidence: string[] }
    education_qualification: { score: number; weight: 10; candidate_degree: string; required_degree: string; evidence: string[] }
    certifications: { score: number; weight: 5; matched: string[]; missing: string[]; evidence: string[] }
    language_skills: { score: number; weight: 2; matched: string[]; missing: string[]; evidence: string[] }
    nationality: { score: number; weight: 1; match: boolean; evidence: string[] }
    profile_quality: { score: number; weight: 2; education_rank: string; employer_rank: string; evidence: string[] }
  }
  extracted: {
    // ... existing fields
    location: string | null
    languages: Array<{ language: string; proficiency: string }>
    nationality: string | null
    recent_projects: Array<{ title: string; duration: string; technologies: string[] }>
  }
  gaps_and_notes: string[]
}
```

### 2. Enhanced Prompt
Update `SYSTEM_PROMPT` and `userPrompt` to include all 12 criteria with detailed instructions.

### 3. UI Components
Create new card components for each criterion in `components/cv-evaluation-report.tsx`.

---

## Display Layout

### Section 1: Overview (Existing)
- Candidate info
- Overall score
- Qualification status

### Section 2: Profile Classification (Existing)
- University/Employer/Experience

### Section 3: 12 Criteria Breakdown (NEW)
Grid layout with cards for each criterion:

**Row 1: Skills Analysis**
- Skill Set Match (30%)
- Missed Skills (10%)
- Skills in Recent Projects (15%)

**Row 2: Experience & Location**
- Experience Range (15%)
- Location Match (5%)
- Written Communication (5%)

**Row 3: Qualifications**
- Education (10%)
- Certifications (5%)
- Language Skills (2%)

**Row 4: Additional**
- Profile Quality (2%)
- Nationality (1%) - Optional

### Section 4: Detailed Analysis (Existing)
- Strengths & Gaps
- Recommendation

---

## Scoring Formula

```
Total Score = Σ(criterion_score × weight) / 100

Where:
- Skill Set Match: 30%
- Missed Skills: 10%
- Skills in Recent Projects: 15%
- Experience Range: 15%
- Location Match: 5%
- Written Communication: 5%
- Education: 10%
- Certifications: 5%
- Language Skills: 2%
- Profile Quality: 2%
- Nationality: 1%
Total: 100%
```

---

## Implementation Steps

1. ✅ Update `CVEvaluationResult` interface
2. ✅ Enhance OpenAI prompt with 12 criteria
3. ✅ Update CV evaluator logic
4. ✅ Create new UI components for each criterion
5. ✅ Update sample data in page.tsx
6. ✅ Test with real CV and JD
7. ✅ Deploy to localhost:3000/cv-evaluation

---

## Notes

- **Gender Preference**: Excluded due to legal/ethical concerns
- **Nationality**: Optional, can be hidden based on jurisdiction
- **Weights**: Adjustable based on company requirements
- **Fallback**: Mock data for testing when OpenAI unavailable
- **Privacy**: Sensitive data (nationality, gender) handled carefully

---

## Status: READY FOR IMPLEMENTATION ✅
