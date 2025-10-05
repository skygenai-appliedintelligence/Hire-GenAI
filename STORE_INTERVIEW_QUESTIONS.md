# Store Interview Questions in Database

## Overview
Implemented functionality to save AI-generated interview questions and evaluation criteria to the database when "Create Job & Setup Agents" is clicked.

## Implementation

### 1. Database Method (`lib/database.ts`)

Added `updateJobRoundConfiguration` method to DatabaseService:

```typescript
static async updateJobRoundConfiguration(
  jobId: string, 
  roundName: string, 
  questions: string[], 
  criteria: string[]
): Promise<void> {
  const configuration = JSON.stringify({
    questions: questions || [],
    criteria: criteria || []
  })
  const q = `
    UPDATE job_rounds
    SET configuration = $1::jsonb,
        updated_at = NOW()
    WHERE job_id = $2::uuid AND name = $3
  `
  await this.query(q, [configuration, jobId, roundName])
}
```

**Storage Format:**
- **Table**: `job_rounds`
- **Column**: `configuration` (JSONB)
- **Structure**:
  ```json
  {
    "questions": [
      "Tell me about yourself and your relevant experience.",
      "Why are you interested in this position?",
      ...
    ],
    "criteria": [
      "Communication",
      "Culture fit",
      "Technical",
      "Team player"
    ]
  }
  ```

### 2. API Endpoint (`app/api/jobs/[jobId]/rounds/route.ts`)

Added `POST` method to save questions for multiple rounds:

```typescript
POST /api/jobs/[jobId]/rounds

Request Body:
{
  "roundsData": [
    {
      "roundName": "Phone Screening",
      "questions": ["Question 1", "Question 2", ...],
      "criteria": ["Communication", "Culture fit", ...]
    }
  ]
}

Response:
{
  "ok": true,
  "message": "Questions and criteria saved successfully"
}
```

**Features:**
- Accepts array of rounds with questions and criteria
- Updates each round's configuration in `job_rounds` table
- Uses DatabaseService for database operations
- Error handling and logging

### 3. Job Creation Page (`app/dashboard/jobs/new/page.tsx`)

Modified `handleSubmit` function to save questions after job creation:

```typescript
// After creating/updating job
const finalJobId = data.jobId || jobIdToUpdate

// Save interview questions and criteria to database
const roundsData = formData.interviewRounds.map(round => ({
  roundName: round,
  questions: agentQuestions[round] || [],
  criteria: agentCriteria[round] || []
}))

await fetch(`/api/jobs/${encodeURIComponent(finalJobId)}/rounds`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roundsData })
})
```

## Workflow

### Job Creation Flow

1. **User fills job form** (`/dashboard/jobs/new`)
   - Basic Info → Requirements → Responsibilities → Compensation → Logistics → Resume Screening → Interview

2. **On Interview tab:**
   - User selects "Screening Agent"
   - Expands agent card
   - Clicks "Generate Questions"
   - AI generates 10 questions (2 intro, 3 behavioral, 5 technical)
   - Questions appear in editable list
   - User can add/edit/delete questions

3. **Click "Create Job & Setup Agents":**
   - ✅ Creates job in `jobs` table
   - ✅ Creates rounds in `job_rounds` table
   - ✅ **Saves questions and criteria** in `job_rounds.configuration`
   - ✅ Redirects to Jobs List

## Data Structure

### job_rounds Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| job_id | UUID | Foreign key to jobs table |
| seq | INTEGER | Round sequence number |
| name | VARCHAR | Round name (e.g., "Phone Screening") |
| duration_minutes | INTEGER | Duration in minutes |
| **configuration** | **JSONB** | **Questions and criteria (NEW)** |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### Configuration JSONB Structure

```json
{
  "questions": [
    "Tell me about yourself and your relevant experience.",
    "Why are you interested in this position?",
    "What motivates you in your work?",
    "Describe a challenging situation you faced and how you handled it.",
    "How do you handle feedback and criticism?",
    "Tell me about a time you worked in a team to achieve a goal.",
    "What technical skills do you bring to this role?",
    "How do you stay updated with the latest technologies in your field?",
    "Describe a technical problem you solved recently.",
    "Do you have any questions about the role or company?"
  ],
  "criteria": [
    "Communication",
    "Culture fit",
    "Technical",
    "Team player"
  ]
}
```

## Question Categories

**Total: 10 Questions**

1. **Introduction (2 questions)**
   - About yourself
   - Interest in position

2. **Behavioral (3 questions)**
   - Motivation
   - Challenges
   - Feedback handling

3. **Technical (5 questions)**
   - Technical skills
   - Problem-solving
   - Technical scenarios

## Benefits

✅ **Persistent Storage** - Questions saved in database
✅ **Reusable Templates** - Can be used for multiple candidates
✅ **Editable** - Can modify questions before saving
✅ **Categorized** - Proper categorization for different interview aspects
✅ **Criteria-Based** - Evaluation criteria stored alongside questions
✅ **AI-Generated** - Automatically generated based on job description

## Error Handling

- **Job creation failure**: Error logged, redirect prevented
- **Questions save failure**: Error logged, job still created
- **Database errors**: Caught and logged in API
- **Invalid data**: 400 Bad Request with error message

## Testing

1. **Create New Job:**
   ```
   1. Fill job form
   2. Navigate to Interview tab
   3. Select "Screening Agent"
   4. Click "Generate Questions"
   5. Verify 10 questions appear
   6. Click "Create Job & Setup Agents"
   7. Check database: job_rounds.configuration should contain questions
   ```

2. **Verify Database:**
   ```sql
   SELECT 
     jr.name,
     jr.configuration->>'questions' as questions,
     jr.configuration->>'criteria' as criteria
   FROM job_rounds jr
   WHERE job_id = '[your-job-id]';
   ```

3. **Edit Existing Job:**
   ```
   1. Open job in edit mode
   2. Modify questions
   3. Save
   4. Verify updated in database
   ```

## Future Enhancements

- [ ] Fetch and display saved questions when editing job
- [ ] Question templates library
- [ ] Copy questions from other jobs
- [ ] Bulk import/export questions
- [ ] Question difficulty levels
- [ ] Expected answer guidelines
- [ ] Interview scoring rubrics

## API Reference

### POST /api/jobs/[jobId]/rounds

**Description**: Save interview questions and criteria for job rounds

**Request Body:**
```typescript
{
  roundsData: Array<{
    roundName: string
    questions: string[]
    criteria: string[]
  }>
}
```

**Response:**
```typescript
{
  ok: boolean
  message?: string
  error?: string
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing jobId or roundsData)
- `500` - Server error

## Database Schema Impact

**No schema changes required** - Uses existing `configuration` column in `job_rounds` table.

The `configuration` column is JSONB type which allows flexible storage of structured data without schema modifications.
