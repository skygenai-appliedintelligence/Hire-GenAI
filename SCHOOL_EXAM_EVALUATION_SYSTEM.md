# School Exam Style Evaluation System

## Overview

The interview evaluation system now works like a school exam where each question has different marks based on its importance. This ensures fair and accurate scoring based on question weightage.

## 🤖 System Auto-Decides Everything

The AI system automatically:
1. **Categorizes each question** based on its content
2. **Assigns marks** based on question importance
3. **Scores the candidate** based on their answers

No manual configuration needed!

## How It Works

### 1. Total Marks = 100

Just like a school exam, the total marks are fixed at 100, distributed across 10 questions.

### 2. Automatic Question Categorization

The system analyzes each question and decides its category:

| Question Type | Category | Example |
|--------------|----------|---------|
| Coding, frameworks, tools, APIs | **Technical Skills** | "What is your experience with React?" |
| Debugging, troubleshooting, challenges | **Problem Solving** | "How would you debug a production issue?" |
| Explaining, presenting, storytelling | **Communication** | "Tell me about your project" |
| Teamwork, values, collaboration | **Cultural Fit** | "How do you handle conflicts?" |

### 3. Automatic Marks Assignment

The system assigns marks based on category importance:

| Category | Total Marks | Marks per Question |
|----------|-------------|---------------------|
| Technical Skills | 40 marks | 8-15 marks each |
| Problem Solving | 25 marks | 8-12 marks each |
| Communication | 20 marks | 5-10 marks each |
| Cultural Fit | 15 marks | 5-8 marks each |

### 3. Scoring Rules

Like a school exam:
- **Perfect answer**: Full marks (e.g., 15/15)
- **Good answer**: 70-90% marks (e.g., 11-13/15)
- **Partial answer**: 40-70% marks (e.g., 6-10/15)
- **Vague answer** ("Hmm", "Yeah"): 0-20% marks (e.g., 0-3/15)
- **Not answered**: 0 marks (but question still counts!)

### 4. Final Score Calculation

```
Final Score = Sum of all marks obtained / Total marks (100) × 100%

Example:
Q1: 12/15 + Q2: 9/12 + Q3: 0/8 + Q4: 0/5 + Q5: 11/15 + 
Q6: 0/10 + Q7: 10/12 + Q8: 0/8 + Q9: 7/8 + Q10: 0/7

= 49/100 = 49%
```

## Key Principle: Unanswered Questions Still Count

**Important**: Even if a question was not asked or not answered, it still counts in the total marks.

Example:
- If only 2 out of 10 questions were answered
- And those 2 questions had max marks of 27 (15+12)
- And candidate got 21 marks (12+9)
- Final score = 21/100 = 21% (NOT 21/27 = 78%)

This ensures candidates who answer fewer questions get proportionally lower scores.

## Data Structure

### New Format (School Exam Style)

```json
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Explain your experience with React",
      "category": "Technical Skills",
      "max_marks": 15,
      "marks_obtained": 12,
      "answered": true,
      "candidate_response": "Discussed Redux and Context API...",
      "feedback": "Good understanding, lost 3 marks for..."
    }
  ],
  "marks_summary": {
    "total_max_marks": 100,
    "total_obtained": 49,
    "percentage": 49,
    "questions_asked": 6,
    "questions_answered": 5,
    "by_category": {
      "Technical Skills": { "max": 40, "obtained": 21 },
      "Problem Solving": { "max": 25, "obtained": 11 },
      "Communication": { "max": 20, "obtained": 10 },
      "Cultural Fit": { "max": 15, "obtained": 7 }
    }
  },
  "overall_score": 49,
  "recommendation": "Maybe",
  "summary": "Candidate scored 49/100...",
  "strengths": ["..."],
  "areas_for_improvement": ["..."],
  "scoring_explanation": "Q1(12/15) + Q2(9/12) + ... = 49/100"
}
```

## Category Weights

The system automatically assigns marks to questions based on their category:

1. **Technical Skills (40 marks)**: Core job-related technical questions
2. **Problem Solving (25 marks)**: Analytical and debugging questions
3. **Communication (20 marks)**: Presentation and explanation skills
4. **Cultural Fit (15 marks)**: Team collaboration and values alignment

## Benefits

1. **Fair Scoring**: Important questions carry more weight
2. **Transparent**: Clear breakdown of marks per question
3. **Accurate**: Unanswered questions properly penalize the score
4. **Consistent**: Same evaluation criteria for all candidates
5. **Detailed Feedback**: Per-question feedback for improvement

## Example Scenarios

### Scenario 1: Candidate answers all 10 questions well
- Total obtained: 85/100
- Result: 85% - Strong Hire

### Scenario 2: Candidate answers only 5 questions (others not asked)
- Answered questions total: 50 marks max
- Obtained: 40/50 on answered questions
- Final score: 40/100 = 40% (NOT 40/50 = 80%)
- Result: Maybe/No Hire

### Scenario 3: Candidate gives vague answers
- All 10 questions asked
- Most answers are "Hmm", "Yeah", "Please move forward"
- Obtained: 15/100
- Result: 15% - No Hire

## Files Modified

- `app/api/applications/[applicationId]/evaluate/route.ts` - Main evaluation logic
- Updated OpenAI prompt for school-exam style scoring
- Updated mock evaluation data
- Updated helper functions for new format

## Backward Compatibility

The system automatically converts old evaluation formats to the new school-exam style format using the `normalizeEvaluationResponse()` function.
