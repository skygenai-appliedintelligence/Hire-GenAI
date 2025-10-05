# Automatic Question Generation Implementation

## Overview
Implemented automatic AI-powered question generation that fetches job description from the database and generates categorized interview questions.

## Features

### 1. Job Creation Page (`/dashboard/jobs/new?tab=interview`)

#### Generate Questions Button
- Located in the Interview tab when agent is expanded
- Automatically fetches job description from form data
- Generates 10 questions categorized as:
  - **2 Introduction questions**
  - **3 Behavioral questions**
  - **5 Technical questions**

#### Implementation
```typescript
const handleGenerateQuestions = async (round: string) => {
  const jobDescription = generateStructuredDescription()
  
  const res = await fetch('/api/ai/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobDescription,
      agentType: 'Screening Agent',
      numberOfQuestions: 10,
      skills: agentCriteria[round] || []
    })
  })

  const data = await res.json()
  const generatedQuestions = data.questions || []
  
  // Categorize: 2 intro, 3 behavioral, 5 technical
  const categorizedQuestions = [
    ...generatedQuestions.slice(0, 2),  // 2 intro
    ...generatedQuestions.slice(2, 5),  // 3 behavioral  
    ...generatedQuestions.slice(5, 10)  // 5 technical
  ]

  setAgentQuestions({
    ...agentQuestions,
    [round]: categorizedQuestions
  })
}
```

#### Button States
- **Normal**: "Generate Questions" with refresh icon
- **Loading**: "Generating..." with spinner
- **Disabled**: While generating questions

### 2. Selected Agents Page (`/selected-agents?jobId=...`)

#### AI Question Generator Modal
- Opens when clicking "AI Generate Questions" button
- Automatically prefills job description from `jobData.description`
- Default number of questions: **10**
- User can click "Generate Questions" to create questions
- Questions are categorized based on agent type

#### Auto-Prefill Logic
```typescript
const handleOpenChange = (next: boolean) => {
  if (next) {
    setNumberOfQuestions("10") // Default to 10
    const jobId = searchParams.get('jobId')
    if (!jobDescription && initialJobDescription && jobId) {
      setJobDescription(initialJobDescription) // Auto-fill from DB
    }
  }
}
```

## Question Categories

### Screening Agent Questions (Total: 10)

#### Introduction (2 questions)
- Tell me about yourself and your relevant experience
- Why are you interested in this position?

#### Behavioral (3 questions)
- What motivates you in your work?
- Describe a challenging situation you faced and how you handled it
- How do you handle feedback and criticism?

#### Technical (5 questions)
- What technical skills do you bring to this role?
- How do you stay updated with the latest technologies?
- Describe a technical problem you solved recently
- Explain your approach to [specific technical skill from job]
- How would you handle [technical scenario from job]

## API Integration

### Endpoint
**POST** `/api/ai/generate-questions`

### Request Body
```json
{
  "jobDescription": "Full job description from jobs.description_md",
  "agentType": "Screening Agent",
  "numberOfQuestions": 10,
  "skills": ["Communication", "Culture fit", "Technical", "Team player"]
}
```

### Response
```json
{
  "questions": [
    "Question 1...",
    "Question 2...",
    ...
    "Question 10..."
  ]
}
```

## User Flow

### Job Creation Flow
1. Navigate to `/dashboard/jobs/new?tab=interview`
2. Select "Screening Agent"
3. Expand agent card
4. Click "Generate Questions" button
5. **AI fetches form data** → Generates 10 questions
6. Questions appear in categorized format
7. User can edit/delete/add more questions

### Selected Agents Flow
1. Navigate to `/selected-agents?jobId=[id]`
2. Click "AI Generate Questions" button
3. Modal opens with **job description pre-filled**
4. Number of questions defaults to **10**
5. Click "Generate Questions"
6. **AI fetches from `jobs.description_md`** → Generates questions
7. Click "Use These Questions" to add to agent

## Benefits

✅ **Automatic Fetching** - No manual copy-paste of job description
✅ **Categorized Questions** - 2 intro, 3 behavioral, 5 technical
✅ **Context-Aware** - Questions based on actual job requirements
✅ **Time-Saving** - Instant generation instead of manual writing
✅ **Consistent Quality** - AI ensures professional question format
✅ **Editable** - Generated questions can be modified
✅ **Skills-Based** - Uses evaluation criteria for relevance

## Technical Details

### State Management
```typescript
const [generatingQuestions, setGeneratingQuestions] = useState(false)
const [agentQuestions, setAgentQuestions] = useState<Record<string, string[]>>({
  "Phone Screening": []
})
```

### Error Handling
- Shows alert on generation failure
- Maintains button state during loading
- Logs errors to console for debugging

### Loading States
- Button disabled during generation
- Spinner animation while loading
- Success message after completion

## Testing

1. **Job Creation Page**:
   - Fill basic job info
   - Navigate to Interview tab
   - Expand Screening Agent
   - Click "Generate Questions"
   - Verify 10 questions appear

2. **Selected Agents Page**:
   - Open existing job
   - Click "AI Generate Questions"
   - Verify job description is pre-filled
   - Click "Generate Questions"
   - Verify questions are generated
   - Click "Use These Questions"
   - Verify questions added to agent

## Future Enhancements

- [ ] Custom question count per category
- [ ] Multiple agent types with different question mixes
- [ ] Question difficulty levels
- [ ] Save question templates
- [ ] Regenerate specific categories only
