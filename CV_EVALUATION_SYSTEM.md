# CV Evaluation System - Implementation Complete

## Overview

Implemented a comprehensive, strict CV parser and JD evaluator that scores candidates objectively using a transparent rubric with 7 weighted criteria.

---

## System Architecture

### **1. CV Evaluator Library** (`lib/cv-evaluator.ts`)

**Core Class:** `CVEvaluator`

**Main Method:**
```typescript
CVEvaluator.evaluateCandidate(
  resumeText: string,
  jobDescription: string,
  passThreshold: number = 40
): Promise<CVEvaluationResult>
```

**Features:**
- Strict fact extraction (no guessing)
- Evidence-based scoring with citations
- Transparent rubric with 7 weighted criteria
- Skill normalization (handles synonyms)
- Conservative approach for unclear data

---

## Scoring Rubric (Total: 100%)

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Role/Title Alignment** | 15% | How well candidate's titles match the JD role |
| **Core Hard Skills** | 35% | Match of technical skills & tools (highest weight) |
| **Experience Depth** | 20% | Years of relevant experience, seniority level |
| **Domain Relevance** | 10% | Industry/domain alignment |
| **Education/Certs** | 10% | Degrees, certifications matching requirements |
| **Nice-to-Have Skills** | 5% | Bonus skills mentioned in JD |
| **Communication/Red Flags** | 5% | Resume quality, gaps, frequent job changes |

**Weighted Score Formula:**
```
final_score = Σ(score_i × weight_i / 100)
qualified = final_score >= pass_threshold (default: 40%)
```

---

## Evaluation Rules

### **Hard Skills Matching:**
- Exact match or close equivalents (React ~ Next.js)
- Explains equivalence in evidence
- Cites specific resume sections (max 20 words each)

### **Experience:**
- Prefers explicit timelines
- Conservative if unclear
- Doesn't penalize gaps (just notes them)

### **Domain:**
- Credits similar industries when justified
- Explains relevance

### **Education:**
- Only counts if clearly stated
- Doesn't invent degrees

### **Red Flags:**
- Large employment gaps
- Frequent short stints
- Explains findings, doesn't auto-reject

---

## Output Schema

```typescript
{
  overall: {
    score_percent: number,        // 0-100
    qualified: boolean,           // score >= threshold
    reason_summary: string        // 1-3 sentences
  },
  breakdown: {
    role_title_alignment: { 
      score: number, 
      weight: 15, 
      evidence: string[] 
    },
    hard_skills: { 
      score: number, 
      weight: 35, 
      matched: string[], 
      missing: string[], 
      evidence: string[] 
    },
    experience_depth: { 
      score: number, 
      weight: 20, 
      years_estimate: number|null, 
      evidence: string[] 
    },
    domain_relevance: { 
      score: number, 
      weight: 10, 
      evidence: string[] 
    },
    education_certs: { 
      score: number, 
      weight: 10, 
      matched: string[], 
      missing: string[], 
      evidence: string[] 
    },
    nice_to_have: { 
      score: number, 
      weight: 5, 
      matched: string[], 
      missing: string[], 
      evidence: string[] 
    },
    communication_redflags: { 
      score: number, 
      weight: 5, 
      red_flags: string[], 
      evidence: string[] 
    }
  },
  extracted: {
    name: string|null,
    email: string|null,
    phone: string|null,
    location: string|null,
    total_experience_years_estimate: number|null,
    titles: string[],
    skills: string[],
    education: Array<{
      degree: string|null,
      field: string|null,
      institution: string|null,
      year: string|null
    }>,
    certifications: string[],
    notable_projects: string[]
  },
  gaps_and_notes: string[]  // unclear dates, OCR noise, etc.
}
```

---

## API Endpoint

### **POST** `/api/applications/evaluate-cv`

**Request Body:**
```json
{
  "applicationId": "uuid",
  "resumeText": "full resume text...",
  "jobDescription": "full JD text...",
  "passThreshold": 40
}
```

**Response:**
```json
{
  "success": true,
  "evaluation": {
    "overall": { ... },
    "breakdown": { ... },
    "extracted": { ... },
    "gaps_and_notes": [ ... ]
  }
}
```

**Features:**
- Automatic text truncation (resume: 15K chars, JD: 5K chars)
- Saves evaluation to database (`qualification_score`, `is_qualified`, `qualification_explanations`)
- Non-blocking if database save fails

---

## Application Flow

```
1. User submits application with resume
   ↓
2. Resume uploaded to Vercel Blob
   ↓
3. Application saved to database
   ↓
4. Resume parsed to extract text
   ↓
5. CV Evaluator analyzes resume vs JD
   ├─ Extracts structured data
   ├─ Scores 7 criteria (0-100 each)
   ├─ Calculates weighted score
   ├─ Determines qualified (>= 40%)
   └─ Provides evidence & citations
   ↓
6. Evaluation saved to database
   ↓
7. User redirected to success page
   ↓
8. Recruiter can view detailed breakdown
```

---

## Database Schema

**Required Columns** (from migration):

```sql
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_score INTEGER;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_explanations JSONB;
```

**Stored Data:**
- `qualification_score`: 0-100 (rounded)
- `is_qualified`: true/false
- `qualification_explanations`: Full JSON with breakdown, extracted data, gaps

---

## Key Features

### **1. Strict & Conservative**
- No guessing or inventing data
- Conservative with unclear information
- Marks missing fields as `null`

### **2. Evidence-Based**
- Every score backed by citations
- Quotes max 20 words from resume
- Transparent reasoning

### **3. Skill Normalization**
```typescript
CVEvaluator.normalizeSkills(['TypeScript', 'ReactJS', 'GCP'])
// Returns: ['ts', 'react', 'google cloud']
```

### **4. Synonym Handling**
- TypeScript ↔ TS
- JavaScript ↔ JS
- React ↔ ReactJS ↔ Next.js
- Node.js ↔ NodeJS
- AWS ↔ Amazon Web Services
- GCP ↔ Google Cloud
- K8s ↔ Kubernetes

### **5. Red Flag Detection**
- Employment gaps
- Frequent job changes
- Unclear timelines
- OCR noise

---

## Configuration

### **Pass Threshold**
Default: `40%`

Adjust per role:
```typescript
// Senior role - higher bar
await CVEvaluator.evaluateCandidate(resume, jd, 60)

// Junior role - lower bar
await CVEvaluator.evaluateCandidate(resume, jd, 30)
```

### **Temperature**
Set to `0.2` for consistency and reliability

### **Model**
Uses `gpt-4o` for best accuracy

---

## Example Evaluation

**Input:**
- JD: "Senior React Developer with 5+ years, TypeScript, AWS"
- Resume: "3 years React, 2 years Node.js, AWS certified"

**Output:**
```json
{
  "overall": {
    "score_percent": 72,
    "qualified": true,
    "reason_summary": "Strong technical skills match (React, AWS). Experience depth slightly below senior level but compensated by relevant certifications."
  },
  "breakdown": {
    "hard_skills": {
      "score": 85,
      "weight": 35,
      "matched": ["React", "TypeScript", "AWS"],
      "missing": [],
      "evidence": ["3 years React development", "AWS Certified Solutions Architect"]
    },
    "experience_depth": {
      "score": 60,
      "weight": 20,
      "years_estimate": 5,
      "evidence": ["3 years React", "2 years Node.js"]
    }
    // ... other criteria
  }
}
```

---

## Error Handling

**Graceful Degradation:**
- ✅ Resume parsing fails → Continues without evaluation
- ✅ OpenAI API error → Returns error, doesn't crash
- ✅ Database save fails → Logs warning, returns evaluation
- ✅ Invalid JSON → Catches and reports error

**Non-Blocking:**
- Application submission always succeeds
- Evaluation runs in background
- User sees success page regardless

---

## Testing

**Test the evaluator:**
```typescript
import { CVEvaluator } from '@/lib/cv-evaluator'

const result = await CVEvaluator.evaluateCandidate(
  resumeText,
  jobDescription,
  40
)

console.log('Score:', result.overall.score_percent)
console.log('Qualified:', result.overall.qualified)
console.log('Matched Skills:', result.breakdown.hard_skills.matched)
```

**Test the API:**
```bash
curl -X POST http://localhost:3000/api/applications/evaluate-cv \
  -H "Content-Type: application/json" \
  -d '{
    "resumeText": "...",
    "jobDescription": "...",
    "passThreshold": 40
  }'
```

---

## Benefits

### **Before:**
- ❌ Subjective evaluation
- ❌ No scoring breakdown
- ❌ Binary qualified/not qualified
- ❌ No evidence or reasoning

### **After:**
- ✅ Objective 7-criteria rubric
- ✅ Detailed score breakdown (0-100 per criterion)
- ✅ Evidence-based with citations
- ✅ Transparent reasoning
- ✅ Configurable threshold
- ✅ Stored in database for review

---

## Future Enhancements

- [ ] Embeddings pre-filter (text-embedding-3-large)
- [ ] Batch evaluation for multiple candidates
- [ ] Custom rubric per job role
- [ ] A/B testing different thresholds
- [ ] Candidate feedback based on gaps
- [ ] Resume improvement suggestions

---

## Status

✅ **System is live and operational!**

All applications with resumes are now evaluated using the strict rubric and scores are saved to the database.
