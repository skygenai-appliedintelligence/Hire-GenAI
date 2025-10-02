# Resume Parsing System

## Overview

The application now includes a complete resume parsing system that extracts structured data from uploaded resumes (PDF, DOCX, TXT) and uses that data to evaluate candidate qualifications.

## Architecture

### 1. Resume Parser Library (`lib/resume-parser.ts`)

**Purpose:** Extract text and structured data from resume files

**Features:**
- Supports PDF, DOCX, and TXT formats
- Uses `pdf-parse` for PDF extraction
- Uses `mammoth` for Word document extraction
- AI-powered parsing with OpenAI GPT-4o
- Fallback to basic keyword extraction if OpenAI unavailable

**Extracted Data:**
```typescript
{
  rawText: string              // Full text content
  name?: string                // Candidate name
  email?: string               // Email address
  phone?: string               // Phone number
  location?: string            // Location/city
  summary?: string             // Professional summary
  skills: string[]             // Technical & soft skills
  experience: Array<{          // Work history
    company?: string
    title?: string
    location?: string
    startDate?: string
    endDate?: string
    description?: string
  }>
  education: Array<{           // Education history
    school?: string
    degree?: string
    field?: string
    startYear?: string
    endYear?: string
  }>
  certifications?: string[]    // Certifications
  languages?: string[]         // Languages
  links?: Array<{              // LinkedIn, GitHub, etc.
    type: string
    url: string
  }>
}
```

### 2. Parse API Endpoint (`app/api/resumes/parse/route.ts`)

**Endpoint:** `POST /api/resumes/parse`

**Request:**
```typescript
FormData {
  file: File                    // Resume file (PDF/DOCX/TXT)
  candidateId?: string          // Optional candidate ID
  applicationId?: string        // Optional application ID
}
```

**Response:**
```json
{
  "success": true,
  "parsed": {
    "name": "John Doe",
    "email": "john@example.com",
    "skills": ["JavaScript", "React", "Node.js"],
    "experience": [...],
    "education": [...],
    "rawText": "..."
  }
}
```

**Features:**
- File validation (type, size < 10MB)
- Automatic database updates (saves parsed text to `applications.resume_text`)
- Updates candidate profile with extracted info
- Non-blocking errors (continues even if DB save fails)

### 3. Application Flow Integration

**Updated Flow:**

1. **User uploads resume** → `ApplyForm.tsx`
2. **Resume uploaded to Vercel Blob** → `/api/resumes/upload`
3. **Resume parsed for structured data** → `/api/resumes/parse` ✨ NEW
4. **Parsed data attached to application** → `application.parsedResume`
5. **Qualification evaluation uses parsed data** → `AIInterviewService.evaluateApplication()`

### 4. Enhanced Qualification Evaluation

**Before:** Only evaluated manually typed form fields
- `application.technicalSkills` (text input)
- `application.whyInterested` (cover letter)
- `application.impactfulProject`

**After:** Evaluates BOTH form fields AND parsed resume
- Manual form inputs
- **Parsed resume skills** ✨
- **Parsed work experience** ✨
- **Parsed certifications** ✨
- **Professional summary** ✨

**Evaluation Logic:**
```typescript
// Combines all data sources
const applicantText = [
  application.technicalSkills,           // Manual input
  application.whyInterested,
  application.parsedResume?.skills,      // From resume
  application.parsedResume?.summary,     // From resume
  application.parsedResume?.experience,  // From resume
  application.parsedResume?.certifications
].join(' ')

// AI evaluates with full context
const evaluation = await openai.evaluate({
  jobDescription,
  candidateData: applicantText,
  rules: "Focus on skill match, consider both manual and parsed data"
})
```

## Usage

### For Developers

**Test the parser directly:**
```typescript
import { parseResume } from '@/lib/resume-parser'

const buffer = fs.readFileSync('resume.pdf')
const parsed = await parseResume(buffer, 'application/pdf')
console.log(parsed.skills) // ["React", "TypeScript", "AWS"]
```

**Call the API:**
```typescript
const formData = new FormData()
formData.append('file', resumeFile)
formData.append('candidateId', 'candidate_123')

const response = await fetch('/api/resumes/parse', {
  method: 'POST',
  body: formData
})

const { parsed } = await response.json()
```

### For Users

1. Fill out application form
2. Upload resume (PDF/DOCX/TXT)
3. System automatically:
   - Uploads file to cloud storage
   - Parses resume to extract skills
   - Shows toast: "Extracted X skills from your resume"
   - Evaluates qualification using parsed data

## Environment Requirements

**Required:**
- `OPENAI_API_KEY` - For AI-powered parsing and evaluation

**Optional:**
- If OpenAI key missing, falls back to basic keyword matching

## Database Schema

**Optional columns** (system adapts if missing):

```sql
-- applications table
ALTER TABLE applications ADD COLUMN resume_text TEXT;

-- candidates table  
ALTER TABLE candidates ADD COLUMN full_name VARCHAR(255);
ALTER TABLE candidates ADD COLUMN phone VARCHAR(50);
ALTER TABLE candidates ADD COLUMN location VARCHAR(255);
```

## Error Handling

**Graceful degradation:**
- ✅ File upload fails → Shows error, stops submission
- ✅ Parsing fails → Continues without parsed data, uses form fields only
- ✅ OpenAI unavailable → Falls back to keyword matching
- ✅ Database save fails → Logs warning, continues with evaluation

## Benefits

### Before Resume Parsing
❌ Candidates marked "Not Qualified" even with perfect resumes  
❌ Had to manually type all skills in form  
❌ Resume file uploaded but never analyzed  
❌ Evaluation based only on what user typed  

### After Resume Parsing
✅ Resume automatically analyzed for skills  
✅ Skills extracted from actual work experience  
✅ Certifications and education considered  
✅ More accurate qualification decisions  
✅ Better candidate experience  

## Testing

**Test with different file types:**
```bash
# PDF resume
curl -X POST http://localhost:3000/api/resumes/parse \
  -F "file=@resume.pdf"

# DOCX resume
curl -X POST http://localhost:3000/api/resumes/parse \
  -F "file=@resume.docx"
```

**Expected behavior:**
1. Upload resume → ✅ Success toast
2. Parse resume → ✅ "Extracted X skills" toast
3. Submit application → ✅ Evaluation uses parsed data
4. Qualification decision → ✅ Based on actual resume content

## Troubleshooting

**"Could not extract meaningful text from resume"**
- Resume file is corrupted or empty
- Try re-saving the PDF or converting to different format

**"Resume parsing failed (non-fatal)"**
- OpenAI API error or rate limit
- Application continues with form data only
- Check OpenAI API key and quota

**Skills not detected**
- Resume format is unusual (tables, images)
- Skills written in non-standard way
- Manually enter skills in form as backup

## Future Enhancements

- [ ] Support for more file formats (RTF, ODT)
- [ ] Resume scoring/quality feedback
- [ ] Duplicate detection (same resume uploaded twice)
- [ ] Resume comparison across candidates
- [ ] ATS keyword optimization suggestions
