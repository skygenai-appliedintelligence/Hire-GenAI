# AI Interview Question Generator

## Overview

The AI Interview Question Generator is a powerful feature that automatically generates relevant interview questions based on job descriptions and interview stages. This tool helps recruiters and hiring managers create targeted, role-specific questions for different phases of the interview process.

## Features

- **Role-Specific Questions**: Questions tailored to job requirements and skills
- **Stage-Aware Generation**: Different question types for each interview stage
- **AI-Powered**: Powered by advanced AI for quality questions
- **Customizable**: Generate 1-20 questions per request
- **Multiple Agent Types**: Support for 4 different interview stages

## Interview Agent Types

### 1. Screening Agent
- **Purpose**: Basic qualification, work experience, and general fit
- **Focus Areas**: 
  - Basic qualifications
  - Work experience
  - General fit
  - Availability
  - Salary expectations
  - Company knowledge

### 2. Initial Interview Agent
- **Purpose**: Skill-based, role-relevant, and scenario-based questions
- **Focus Areas**:
  - Relevant experience
  - Problem-solving abilities
  - Work style
  - Role-specific scenarios

### 3. Technical Interview Agent
- **Purpose**: In-depth technical or domain-specific questions
- **Focus Areas**:
  - Technical skills
  - Problem-solving
  - System design
  - Coding challenges
  - Technical decision-making

### 4. Behavioral Interview Agent
- **Purpose**: Soft skills, teamwork, and conflict resolution questions
- **Focus Areas**:
  - Leadership
  - Teamwork
  - Communication
  - Conflict resolution
  - Cultural fit

## Usage

### Via Web Interface

1. Navigate to `/dashboard/ai-question-generator`
2. Paste the complete job description in the text area
3. Select the interview stage/agent type
4. Choose the number of questions (1-20)
5. Click "Generate Questions"
6. Review and use the generated questions

### Via API

```typescript
import { AIService } from "@/lib/ai-service"

// Generate questions for a technical interview
const questions = await AIService.generateStagedInterviewQuestions(
  "We are hiring a Frontend Developer with React.js, JavaScript, HTML/CSS, and API integration experience.",
  "Technical Interview Agent",
  5
)

// Output format:
// [
//   "How would you optimize the performance of a React application?",
//   "Can you explain the difference between state and props in React?",
//   "How do you handle cross-browser compatibility issues?",
//   "What steps do you take to ensure accessibility in web applications?",
//   "Can you describe your process for integrating a third-party API into a React project?"
// ]
```

## Example Usage

### Input Example

**Job Description:**
```
We are hiring a Senior Software Engineer to join our growing team. You will be responsible for designing, developing, and maintaining scalable web applications using modern technologies.

Requirements:
- 5+ years of experience in software development
- Strong knowledge of JavaScript/TypeScript
- Experience with React and Node.js
- Familiarity with cloud platforms (AWS/GCP)
- Strong problem-solving skills
```

**Agent Type:** Technical Interview Agent
**Number of Questions:** 5

### Output Example

```
Q1: How would you approach designing a scalable microservices architecture for a web application?
Q2: Can you explain the differences between REST and GraphQL APIs, and when would you choose one over the other?
Q3: How would you optimize the performance of a React application with thousands of components?
Q4: Describe your experience with cloud deployment strategies and CI/CD pipelines.
Q5: How would you handle database scaling challenges in a high-traffic application?
```

## Technical Implementation

### Core Function

```typescript
static async generateStagedInterviewQuestions(
  jobDescription: string,
  agentType: "Screening Agent" | "Initial Interview Agent" | "Technical Interview Agent" | "Behavioral Interview Agent",
  numberOfQuestions: number
): Promise<string[]>
```

### Key Features

1. **AI Integration**: Uses OpenAI GPT-4o for question generation
2. **Fallback System**: Provides mock questions when AI is unavailable
3. **Error Handling**: Graceful error handling with fallback questions
4. **Type Safety**: Full TypeScript support
5. **Response Parsing**: Automatic parsing of AI responses

### Mock Mode

When OpenAI API key is not available or running in browser, the system provides relevant mock questions based on the agent type:

```typescript
const mockQuestions = {
  "Screening Agent": [
    "Tell me about yourself and your background",
    "Why are you interested in this position?",
    "What are your salary expectations?",
    "When can you start?",
    "What do you know about our company?"
  ],
  // ... other agent types
}
```

## Integration

The AI Question Generator is integrated into the main dashboard and can be accessed via:

- **Navigation**: Dashboard → AI Question Generator
- **Direct URL**: `/dashboard/ai-question-generator`
- **API**: `AIService.generateStagedInterviewQuestions()`

## Benefits

1. **Time Savings**: Automatically generate relevant questions instead of manual creation
2. **Consistency**: Ensures all candidates are asked similar questions
3. **Quality**: AI-generated questions are role-specific and stage-appropriate
4. **Scalability**: Handle multiple job positions and interview stages
5. **Compliance**: Questions are designed to be fair and non-discriminatory

## Future Enhancements

- [ ] Question difficulty levels (Easy, Medium, Hard)
- [ ] Industry-specific question templates
- [ ] Question customization and editing
- [ ] Question bank management
- [ ] Integration with interview scheduling
- [ ] Question performance analytics
- [ ] Multi-language support
- [ ] Question validation and quality scoring

## Support

For questions or issues with the AI Question Generator, please refer to the main project documentation or contact the development team.
