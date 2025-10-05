# Interview Context Fix

## Problem
When starting a video interview, the AI agent (Olivia) didn't know which role the candidate was interviewing for. The agent would ask generic questions instead of role-specific questions.

## Solution
Updated the interview page to fetch job and candidate details from the application summary API and pass this context to the AI agent before starting the interview.

## Changes Made

### File: `/app/interview/[applicationId]/page.tsx`

#### 1. Added Job Details State
```typescript
const [jobDetails, setJobDetails] = useState<any>(null)
```

#### 2. Fetch Application Summary on Mount
```typescript
useEffect(() => {
  const fetchJobDetails = async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/summary`)
      const json = await res.json()
      if (res.ok && json?.ok) {
        setJobDetails({
          jobTitle: json.job?.title || 'Position',
          company: json.company?.name || 'Company',
          jobDescription: json.job?.description || '',
          requirements: json.job?.requirements || '',
          candidateName: json.candidate?.name || 'Candidate'
        })
      }
    } catch (e) {
      console.error('Failed to fetch job details:', e)
    }
  }
  
  fetchJobDetails()
  requestPermissions()
}, [applicationId])
```

#### 3. Pass Context to AI Agent
When the WebRTC data channel opens, the agent receives detailed context:

```typescript
const jobContext = jobDetails ? `
You are interviewing a candidate for the position of ${jobDetails.jobTitle} at ${jobDetails.company}.
Candidate name: ${jobDetails.candidateName}
${jobDetails.jobDescription ? `Job Description: ${jobDetails.jobDescription}` : ''}
${jobDetails.requirements ? `Requirements: ${jobDetails.requirements}` : ''}

Conduct a professional interview focusing on the candidate's experience, skills, and fit for this specific role.` : ''

const startMsg = {
  type: 'response.create',
  response: {
    modalities: ['audio'],
    instructions: `You are Olivia, a professional AI recruiter conducting a video interview.${jobContext}

Start by greeting the candidate warmly, confirm their name and the position they're interviewing for, then proceed with relevant interview questions. Be professional, friendly, and thorough.`,
  },
}
```

## Benefits

1. **Role-Specific Questions**: AI agent now asks questions relevant to the specific job role
2. **Personalized Experience**: Agent knows the candidate's name and company name
3. **Context-Aware**: Agent has access to job description and requirements
4. **Professional Flow**: Agent confirms the position at the start of the interview
5. **Better Evaluation**: More targeted questions lead to better candidate assessment

## Flow

1. User clicks "Start Video Interview" from `/interview/[applicationId]/start`
2. Interview page loads and fetches application summary
3. Camera/mic permissions are requested
4. WebRTC connection is established with OpenAI Realtime API
5. When connection opens, AI agent receives full context about:
   - Job title
   - Company name
   - Candidate name
   - Job description
   - Job requirements
6. Agent starts interview with personalized greeting and role-specific questions

## API Dependency

The interview page uses the existing API endpoint:
- `GET /api/applications/[applicationId]/summary`

This endpoint returns:
- `job.title` - Job title
- `job.description` - Job description
- `job.requirements` - Job requirements
- `company.name` - Company name
- `candidate.name` - Candidate name

## Testing

To test:
1. Navigate to `/interview/[applicationId]/start`
2. Click "Start Video Interview"
3. Allow camera and microphone access
4. Observe that Olivia greets you by name and mentions the specific job role
5. Verify questions are relevant to the job position
