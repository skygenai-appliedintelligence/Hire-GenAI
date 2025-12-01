# How Scores (90, 70) Are Calculated - Complete Explanation

## Question: "Mujhe y btao y calculation kon kr rha h kaise kr rha h 90 aur 70 100 m se?"

### Answer: OpenAI (gpt-4o-mini) Calculates the Scores

---

## Complete Flow

### Step 1: Candidate Answers a Question
```
Candidate: "I have four years of hands-on experience building, optimizing, and maintaining 
end-to-end automation using both UiPath and Automation Anywhere..."
```

### Step 2: Interview Page Captures the Answer
- Full answer is captured (NOT truncated)
- Question is tracked
- Criterion is identified (e.g., "Technical Skills")

### Step 3: Real-time Evaluation API is Called
**Endpoint:** `/api/interview/evaluate-answer`

**Request Body:**
```json
{
  "question": "How do your skills and experience with UiPath and Automation Anywhere align with the requirements of this role?",
  "answer": "I have four years of hands-on experience building, optimizing, and maintaining end-to-end automation using both UiPath and Automation Anywhere. I have worked across the full lifecycle requirement analysis, development testing, and deployment and support, which aligned the role technical expectation.",
  "criterion": "Technical Skills",
  "questionNumber": 1,
  "totalQuestions": 10,
  "jobTitle": "RPA Developer",
  "companyName": "HDFC",
  "companyId": "uuid-here",
  "applicationId": "uuid-here"
}
```

### Step 4: API Fetches Company's OpenAI Key
```typescript
// From database
SELECT openai_service_account_key, openai_project_id 
FROM companies 
WHERE id = companyId

// Result: Company's OpenAI service account key (encrypted)
// Decrypt it and extract the actual API key
```

### Step 5: Build Evaluation Prompt for OpenAI
```
You are an expert interview evaluator conducting real-time answer evaluation.

**Context:**
- Position: RPA Developer
- Company: HDFC
- Question 1 of 10

**Question Asked:**
"How do your skills and experience with UiPath and Automation Anywhere align with the requirements of this role?"

**Assigned Criterion:** Technical Skills
- Evaluation Focus: technical accuracy, depth of knowledge, specific tools/technologies mentioned, practical experience

**Candidate's Full Answer:**
"I have four years of hands-on experience building, optimizing, and maintaining end-to-end automation using both UiPath and Automation Anywhere. I have worked across the full lifecycle requirement analysis, development testing, and deployment and support, which aligned the role technical expectation."

**EVALUATE THE ANSWER AND PROVIDE A DETAILED JSON RESPONSE:**

{
  "matches_question": true/false,
  "completeness": "complete" | "partial" | "incomplete" | "off_topic",
  "score": 0-100,
  "reasoning": "Detailed explanation of why this score was given, citing specific parts of the answer",
  ...
}

**SCORING GUIDELINES:**
- 90-100: Exceptional answer - comprehensive, detailed, directly addresses the question with specific examples
- 75-89: Good answer - covers main points well, may lack some depth or specificity
- 60-74: Adequate answer - addresses the question but lacks detail or examples
- 40-59: Partial answer - some relevant content but significant gaps
- 20-39: Weak answer - minimal relevant content, mostly off-topic or vague
- 0-19: Inadequate answer - does not address the question, inaudible, or refused to answer

**CRITICAL RULES:**
1. Score must reflect ONLY the actual content of the answer - NO assumptions
2. If answer is very brief (< 20 words), score should be lower unless it's a yes/no question
3. If answer is off-topic, score should be below 40
4. If answer shows specific knowledge/examples relevant to the criterion, score should be higher
5. DO NOT give default scores like 85 - evaluate the actual content
```

### Step 6: OpenAI Analyzes and Returns Score
**OpenAI Model:** `gpt-4o-mini` (fast, cost-effective)

**OpenAI's Analysis:**
```
The candidate provided:
✓ 4 years of hands-on experience (specific)
✓ Both UiPath AND Automation Anywhere (both tools mentioned)
✓ Full lifecycle coverage (requirement analysis, development, testing, deployment, support)
✓ Direct alignment with role requirements

Missing:
- Specific project examples
- Metrics/results from projects
- Advanced features or techniques

Score: 90/100 (Excellent - comprehensive, detailed, directly addresses the question)
```

**OpenAI Response:**
```json
{
  "matches_question": true,
  "completeness": "complete",
  "score": 90,
  "reasoning": "The candidate provided a comprehensive answer detailing their experience with both UiPath and Automation Anywhere, covering various stages of the automation lifecycle. This demonstrates a strong alignment with the technical requirements of the role.",
  "criterion_match": {
    "assigned_criterion": "Technical Skills",
    "matches_criterion": true,
    "criterion_reasoning": "Question asks about specific RPA tools and experience, and candidate clearly demonstrates technical knowledge of both platforms."
  },
  "answer_analysis": {
    "key_points_covered": ["4 years experience", "Both UiPath and Automation Anywhere", "Full lifecycle coverage"],
    "missing_elements": ["Specific project examples", "Metrics or results"],
    "strengths": ["Comprehensive experience", "Experience across full lifecycle"],
    "weaknesses": ["Could provide specific project examples for further depth"]
  },
  "recommendation": "proceed"
}
```

### Step 7: Score Stored in Real-time Evaluations
```typescript
realTimeEvaluationsRef.current.push({
  question_number: 1,
  question_text: "How do your skills and experience...",
  full_answer: "I have four years of hands-on experience...",
  criterion: "Technical Skills",
  score: 90,  // ← FROM OPENAI
  matches_question: true,
  completeness: "complete",
  reasoning: "The candidate provided a comprehensive answer...",
  source: "openai-realtime"
})
```

### Step 8: Report Page Displays the Score
```
Question 1: How do your skills and experience with UiPath and Automation Anywhere align with the requirements of this role?

Technical Skills | Why Technical Skills: This question assesses the candidate's experience and skills with specific RPA tools, which are technical in nature.

90 / 100 [████████████████████] Excellent

Candidate Response:
I have four years of hands-on experience building, optimizing, and maintaining end-to-end automation using both UiPath and Automation Anywhere. I have worked across the full lifecycle requirement analysis, development testing, and deployment and support, which aligned the role technical expectation.

Evaluation Reasoning:
The candidate provided a comprehensive answer detailing their experience with both UiPath and Automation Anywhere, covering various stages of the automation lifecycle. This demonstrates a strong alignment with the technical requirements of the role.

Strengths:
✓ Comprehensive experience with UiPath and Automation Anywhere
✓ Experience across the full lifecycle of automation

Gaps:
• Could provide specific project examples for further depth
```

---

## Key Points

### Who Calculates?
- **OpenAI gpt-4o-mini model** calculates the score
- Uses the company's OpenAI service account key (from database)
- No mock scores, no fallback, no hardcoded values

### How Does It Calculate?
1. **Reads the full answer** (not truncated)
2. **Checks against the criterion** (Technical, Team Player, etc.)
3. **Applies scoring guidelines** (90-100 = Exceptional, etc.)
4. **Analyzes specific content** (mentions tools, examples, depth)
5. **Returns detailed reasoning** (why this score, what's good, what's missing)

### Why Different Scores?
- **90** = Comprehensive, specific examples, directly addresses criterion
- **70** = Good but lacks depth, brief examples, some gaps
- **50** = Partial answer, significant gaps, off-topic
- **20** = Weak answer, vague, mostly irrelevant

### Real Example from Report
**Question 1:** "How do your skills and experience with UiPath and Automation Anywhere align..."
- **Answer:** "I have four years of hands-on experience building, optimizing, and maintaining end-to-end automation using both UiPath and Automation Anywhere..."
- **OpenAI Score:** 90/100
- **Reason:** Comprehensive, specific tools mentioned, full lifecycle coverage

**Question 2:** "Can you discuss a time when you worked closely with business analysts..."
- **Answer:** "In one project I have worked closely with the BA team to break down a minimal invoice validation process. We conduct a workshop and create PDD and finalize expectation flow together."
- **OpenAI Score:** 70/100
- **Reason:** Good example but lacks detail about process and outcomes

---

## Technical Implementation

### File: `/api/interview/evaluate-answer/route.ts`
- Receives answer from interview page
- Fetches company's OpenAI key from database
- Builds detailed prompt with scoring guidelines
- Calls OpenAI gpt-4o-mini
- Returns score, reasoning, analysis

### File: `/app/interview/[applicationId]/page.tsx`
- Calls `/api/interview/evaluate-answer` after each answer
- Stores evaluation in `realTimeEvaluationsRef`
- Sends all evaluations to final evaluation endpoint

### File: `/app/dashboard/analytics/.../report/page.tsx`
- Displays score with progress bar
- Shows reasoning from OpenAI
- Shows strengths and gaps
- Marks as "AI ✓" for real-time evaluated answers

---

## Summary

```
Candidate Answer → Interview Page → /api/interview/evaluate-answer 
→ Fetch Company's OpenAI Key → Build Prompt with Guidelines 
→ Call OpenAI gpt-4o-mini → Get Score (90, 70, etc.) 
→ Store in realTimeEvaluations → Report Page Shows Score + Reasoning
```

**No mock scores. No fallback. 100% real OpenAI evaluation.**
