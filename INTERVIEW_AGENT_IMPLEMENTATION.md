# Interview Agent Implementation

## Overview
Implemented a structured 6-step Interview Agent system that conducts professional video interviews using AI, with database-driven questions and automated evaluation.

## 🎯 Features Implemented

### ✅ 6-Step Structured Interview Flow
1. **Greeting & Setup Check** - Confirms audio/video setup
2. **Start Interview & Time Management** - Sets expectations and duration
3. **Question Flow** - Asks database-stored questions sequentially
4. **Wrap-up & Candidate Questions** - Handles candidate inquiries
5. **Closing** - Professional interview conclusion
6. **Transcript & Evaluation** - Automated scoring and feedback

### ✅ Database Integration
- Fetches interview questions from `job_rounds.configuration`
- Uses questions created during job setup
- Supports multiple rounds and criteria
- Stores transcripts in `applications.transcript`

### ✅ AI-Powered Evaluation
- Analyzes interview transcripts using GPT-4
- Scores candidates on multiple criteria
- Provides detailed feedback and recommendations
- Stores evaluation results in database

## 🏗️ Architecture

### API Endpoints

#### 1. `/api/applications/[applicationId]/interview-questions`
**Purpose**: Fetch interview questions for a specific application
```typescript
GET /api/applications/[applicationId]/interview-questions

Response:
{
  "ok": true,
  "application": {
    "id": "uuid",
    "jobId": "uuid", 
    "jobTitle": "Senior Software Engineer",
    "companyName": "TechCorp",
    "candidateName": "John Doe"
  },
  "rounds": [
    {
      "id": "uuid",
      "name": "Phone Screening",
      "duration_minutes": 30,
      "questions": [
        "Tell me about yourself...",
        "Why are you interested in this position?",
        ...
      ],
      "criteria": ["Communication", "Technical", "Culture fit"]
    }
  ]
}
```

#### 2. `/api/applications/[applicationId]/evaluate`
**Purpose**: Run AI evaluation on interview transcript
```typescript
POST /api/applications/[applicationId]/evaluate
Body: { "transcript": "Interviewer: Hello... Candidate: Thank you..." }

Response:
{
  "ok": true,
  "evaluation": {
    "scores": {
      "Communication": { "score": 8, "feedback": "Clear and articulate..." },
      "Technical": { "score": 7, "feedback": "Good understanding..." }
    },
    "overall_score": 7.5,
    "recommendation": "Hire",
    "summary": "Strong candidate with good technical skills...",
    "strengths": ["Clear communication", "Problem-solving"],
    "areas_for_improvement": ["More specific examples needed"]
  }
}
```

### Frontend Components

#### Updated Interview Page (`/interview/[applicationId]`)
- **Real-time timer** showing elapsed time vs. total duration
- **Questions counter** showing number of loaded questions
- **Phase tracking** for interview progress
- **Structured AI instructions** following 6-step process

## 🤖 AI Agent Instructions

The AI agent follows this exact structured prompt:

```
You are Olivia, a professional AI recruiter conducting a structured video interview. Follow this EXACT 6-step process:

**STEP 1: GREETING & SETUP CHECK**
- Greet warmly: "Hello [Name], welcome and thank you for joining today's interview."
- Confirm setup: "Before we begin, can you please confirm that your audio and video are working fine, and you can hear/see me clearly?"
- Wait for confirmation before proceeding.

**STEP 2: START INTERVIEW & TIME MANAGEMENT**  
- Once setup confirmed: "Great, let's get started. This interview will last about [X] minutes. I'll be asking you questions based on the [Position] role you applied for at [Company]."
- Keep track of time and ensure interview finishes within allocated time.

**STEP 3: QUESTION FLOW**
Ask these questions sequentially:
[Database-loaded questions specific to the job]

Allow time for responses. If candidate goes off-track or takes too long, politely redirect: "Thank you, let's move to the next question so we can cover everything within our time."

**STEP 4: WRAP-UP & CANDIDATE QUESTIONS**
Once all questions covered (or time runs out): "That concludes my set of questions. Do you have any questions for me?"
- If question is about JD/role, answer briefly
- If question is not directly related (HR policy, compensation, next steps): "That's a great question. Our team will get back to you with the details after this interview."

**STEP 5: CLOSING**
Thank the candidate: "Thank you for your time today. We'll review your responses and share feedback through the recruitment team."

**STEP 6: TRANSCRIPT & EVALUATION (System Action)**
- Store full transcript in database
- Run evaluation pipeline comparing against criteria
- Generate scores & comments for each metric
```

## 📊 Evaluation System

### Scoring Criteria
The system evaluates candidates on criteria defined during job creation:
- **Communication** - Clarity, articulation, listening skills
- **Technical** - Job-relevant technical knowledge and skills  
- **Culture Fit** - Alignment with company values and culture
- **Team Player** - Collaboration and interpersonal skills
- **Problem-solving** - Analytical thinking and approach to challenges

### Scoring Scale
- **1-3**: Below expectations
- **4-6**: Meets expectations  
- **7-8**: Exceeds expectations
- **9-10**: Outstanding

### Recommendation Categories
- **Hire**: Strong candidate, recommend for next round/offer
- **Maybe**: Potential candidate, needs further evaluation
- **No Hire**: Does not meet requirements

## 🔄 Complete Interview Flow

### 1. Pre-Interview Setup
```typescript
// Fetch questions and job details
const questions = await fetch(`/api/applications/${applicationId}/interview-questions`)

// Initialize AI agent with structured instructions
const instructions = buildStructuredPrompt(jobDetails, questions, duration)
```

### 2. During Interview
```typescript
// Real-time transcript capture
conversation.push({ 
  role: 'agent' | 'user', 
  text: transcribedText, 
  timestamp: Date.now() 
})

// Visual indicators
- Timer: "5:23 / 30:00"
- Questions: "10 Questions Loaded"  
- Status: "Agent Connected"
```

### 3. Post-Interview Processing
```typescript
// Step 6: Store transcript
await fetch(`/api/applications/${applicationId}/interview-status`, {
  method: 'POST',
  body: JSON.stringify({ transcript })
})

// Run evaluation pipeline
await fetch(`/api/applications/${applicationId}/evaluate`, {
  method: 'POST', 
  body: JSON.stringify({ transcript })
})
```

## 🗄️ Database Schema Updates

### Applications Table
```sql
-- Store evaluation results
ALTER TABLE applications 
ADD COLUMN evaluation JSONB,
ADD COLUMN status VARCHAR DEFAULT 'pending';

-- Evaluation structure:
{
  "scores": {
    "Communication": { "score": 8, "feedback": "..." },
    "Technical": { "score": 7, "feedback": "..." }
  },
  "overall_score": 7.5,
  "recommendation": "Hire",
  "summary": "...",
  "strengths": [...],
  "areas_for_improvement": [...],
  "evaluated_at": "2025-01-01T00:00:00Z",
  "evaluation_criteria": ["Communication", "Technical", ...]
}
```

### Job Rounds Table (Already Updated)
```sql
-- Questions stored in configuration column
ALTER TABLE job_rounds 
ADD COLUMN configuration JSONB DEFAULT '{}';

-- Configuration structure:
{
  "questions": [
    "Tell me about yourself...",
    "Why are you interested in this position?",
    ...
  ],
  "criteria": ["Communication", "Technical", "Culture fit", "Team player"]
}
```

## 🎮 Usage Instructions

### For Recruiters
1. **Create Job** with interview questions using "Generate Questions" feature
2. **Questions are automatically stored** in database during job creation
3. **Send interview link** to candidates
4. **Review evaluation results** in candidate dashboard after interview completion

### For Candidates  
1. **Click interview link** received via email
2. **Allow camera/microphone** permissions
3. **Follow AI agent instructions** through 6-step process
4. **Answer questions naturally** - AI handles timing and flow
5. **Ask questions** during wrap-up phase if needed

## 🔍 Testing the Implementation

### 1. Test Interview Flow
```bash
# Navigate to interview page
http://localhost:3000/interview/[applicationId]

# Expected flow:
1. Setup check confirmation
2. Interview duration announcement  
3. Sequential question asking
4. Candidate questions phase
5. Professional closing
6. Automatic evaluation
```

### 2. Verify Database Storage
```sql
-- Check stored questions
SELECT configuration FROM job_rounds WHERE job_id = '[job-id]';

-- Check evaluation results  
SELECT evaluation FROM applications WHERE id = '[application-id]';
```

### 3. Monitor Console Logs
```javascript
// Look for these logs:
"📋 Loaded interview questions: 10"
"⏱️ Interview duration: 30 minutes"
"🔍 Starting evaluation pipeline..."
"✅ Evaluation completed: {...}"
```

## 🚀 Benefits

### For Companies
- **Consistent interviews** following structured format
- **Objective evaluation** using AI analysis
- **Time-efficient** automated scoring
- **Detailed feedback** for hiring decisions
- **Scalable** for high-volume recruiting

### For Candidates
- **Professional experience** with AI interviewer
- **Clear structure** and expectations
- **Fair evaluation** based on consistent criteria
- **Immediate processing** of interview results

## 🔮 Future Enhancements

### Planned Features
- [ ] **Multi-round interviews** with different question sets
- [ ] **Video analysis** for non-verbal communication scoring
- [ ] **Custom evaluation criteria** per job role
- [ ] **Interview scheduling** integration
- [ ] **Candidate feedback** sharing system
- [ ] **Interview analytics** and reporting dashboard

### Technical Improvements
- [ ] **Real-time question progression** tracking
- [ ] **Adaptive timing** based on candidate responses
- [ ] **Multi-language support** for global hiring
- [ ] **Integration with ATS** systems
- [ ] **Advanced AI models** for better evaluation

## 📈 Success Metrics

### Interview Quality
- **Completion Rate**: % of started interviews finished
- **Question Coverage**: Average questions asked per interview
- **Duration Accuracy**: Interviews finishing within time limit

### Evaluation Accuracy  
- **Scoring Consistency**: Variance in AI evaluation scores
- **Recruiter Agreement**: AI vs. human evaluation alignment
- **Hire Success Rate**: Performance of AI-recommended hires

### System Performance
- **Response Time**: AI agent response latency
- **Uptime**: Interview system availability
- **Error Rate**: Failed interviews or evaluations

---

## 🎯 Implementation Complete

✅ **6-Step Interview Process** - Structured, professional flow
✅ **Database Integration** - Questions from job creation stored and used
✅ **AI Evaluation** - Automated scoring with detailed feedback  
✅ **Real-time UI** - Timer, progress indicators, status updates
✅ **Complete Pipeline** - From interview start to evaluation storage

The Interview Agent is now fully functional and ready for production use at:
**http://localhost:3000/interview/[applicationId]**
