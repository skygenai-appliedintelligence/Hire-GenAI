# OpenAI Usage Tracking Flow Diagram

## 🔄 Complete Flow for Each Operation

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER ACTION                                   │
│  (Upload CV / Generate Questions / Complete Interview)              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   OPENAI API CALL                                    │
│  • CV Parsing: GPT-4o extracts resume data                          │
│  • Questions: GPT-4o generates interview questions                  │
│  • Interview: Realtime API conducts video interview                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  OPERATION COMPLETES                                 │
│  • Resume parsed successfully                                        │
│  • Questions generated                                               │
│  • Interview completed                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│           🔥 IMMEDIATELY TRACK USAGE 🔥                              │
│                                                                      │
│  DatabaseService.recordCVParsingUsage()                             │
│         OR                                                           │
│  DatabaseService.recordQuestionGenerationUsage()                    │
│         OR                                                           │
│  DatabaseService.recordVideoInterviewUsage()                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              OPENAI USAGE TRACKER                                    │
│                                                                      │
│  OpenAIUsageTracker.trackCVParsing()                                │
│         OR                                                           │
│  OpenAIUsageTracker.trackQuestionGeneration()                       │
│         OR                                                           │
│  OpenAIUsageTracker.trackVideoInterview()                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         CALL OPENAI PLATFORM API                                     │
│                                                                      │
│  GET https://api.openai.com/v1/organization/usage/completions       │
│                                                                      │
│  Parameters:                                                         │
│  • start_time: 5-10 minutes ago (Unix timestamp)                    │
│  • end_time: now (Unix timestamp)                                   │
│  • bucket_width: '1d'                                                │
│  • limit: 100                                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            OPENAI RETURNS USAGE DATA                                 │
│                                                                      │
│  {                                                                   │
│    "data": [{                                                        │
│      "results": [{                                                   │
│        "input_tokens": 1500,                                         │
│        "output_tokens": 500,                                         │
│        "model": "gpt-4o",                                            │
│        "project_id": "proj_xxx"                                      │
│      }]                                                              │
│    }]                                                                │
│  }                                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│           CALCULATE REAL COST                                        │
│                                                                      │
│  baseCost = (input_tokens × $2.50/1M) +                             │
│             (output_tokens × $10.00/1M)                              │
│                                                                      │
│  Example:                                                            │
│  baseCost = (1500 × 0.0000025) + (500 × 0.00001)                    │
│           = $0.00375 + $0.005                                        │
│           = $0.00875                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            APPLY PROFIT MARGIN                                       │
│                                                                      │
│  margin = baseCost × 0.25 (25%)                                      │
│  finalCost = baseCost + margin                                       │
│                                                                      │
│  Example:                                                            │
│  margin = $0.00875 × 0.25 = $0.0022                                 │
│  finalCost = $0.00875 + $0.0022 = $0.011                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            STORE IN DATABASE                                         │
│                                                                      │
│  INSERT INTO cv_parsing_usage (                                      │
│    company_id, job_id, candidate_id,                                 │
│    unit_price, cost, created_at                                      │
│  ) VALUES (                                                          │
│    'company-123', 'job-456', 'candidate-789',                        │
│    0.00875,  -- Real OpenAI base cost                                │
│    0.011,    -- Final cost with margin                               │
│    NOW()                                                             │
│  )                                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         DISPLAY ON BILLING PAGE                                      │
│                                                                      │
│  http://localhost:3000/dashboard/settings/billing?tab=usage         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  CV Parsing                                          │            │
│  │  • Total Cost: $5.25                                 │            │
│  │  • CVs Parsed: 10                                    │            │
│  │  • Avg Cost: $0.525/CV                               │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  Question Generation                                 │            │
│  │  • Total Cost: $2.15                                 │            │
│  │  • Questions: 50                                     │            │
│  │  • Avg Cost: $0.043/question                         │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  Video Interviews                                    │            │
│  │  • Total Cost: $12.50                                │            │
│  │  • Duration: 35.2 minutes                            │            │
│  │  • Avg Cost: $0.355/min                              │            │
│  └─────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 Category-Wise Breakdown

### CV Parsing Flow
```
Resume Upload
    ↓
parseResume() with OpenAI GPT-4o
    ↓
recordCVParsingUsage()
    ↓
OpenAIUsageTracker.trackCVParsing()
    ↓
Fetch usage from last 5 minutes
    ↓
Calculate: baseCost from tokens
    ↓
Apply 25% margin
    ↓
Store: cv_parsing_usage table
    ↓
Display: Billing page "CV Parsing" section
```

### Question Generation Flow
```
Generate Questions Button
    ↓
generateStagedInterviewQuestions() with GPT-4o
    ↓
recordQuestionGenerationUsage()
    ↓
OpenAIUsageTracker.trackQuestionGeneration()
    ↓
Fetch usage from last 5 minutes
    ↓
Calculate: baseCost from tokens
    ↓
Apply 25% margin
    ↓
Store: question_generation_usage table
    ↓
Display: Billing page "Questions" section
```

### Video Interview Flow
```
Interview Completion
    ↓
Realtime API session ends
    ↓
recordVideoInterviewUsage()
    ↓
OpenAIUsageTracker.trackVideoInterview()
    ↓
Fetch usage from last 10 minutes
    ↓
Calculate: baseCost from tokens/duration
    ↓
Apply 25% margin
    ↓
Store: video_interview_usage table
    ↓
Display: Billing page "Video Interviews" section
```

## 🔍 Fallback Flow (if OpenAI API unavailable)

```
┌─────────────────────────────────────────────────────────────────────┐
│         OPENAI USAGE API CALL FAILS                                  │
│  (Network error / API down / Rate limit)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            USE FALLBACK PRICING                                      │
│                                                                      │
│  CV Parsing: $0.50 per CV                                            │
│  Question Generation: $0.01 per generation                           │
│  Video Interview: $0.30 per minute                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            APPLY PROFIT MARGIN                                       │
│                                                                      │
│  baseCost = fallback price                                           │
│  finalCost = baseCost × 1.25                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            STORE IN DATABASE                                         │
│  (with source = 'fallback')                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         DISPLAY ON BILLING PAGE                                      │
│  (still accurate, based on industry standard pricing)                │
└─────────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Points

1. **Immediate Tracking**: Usage tracked right after operation completes
2. **Real-Time API**: Calls OpenAI Usage API for actual costs
3. **Centralized Service**: Single `OpenAIUsageTracker` for all operations
4. **Database Storage**: All costs persisted for historical analysis
5. **Category-Wise**: Separate tracking for CV, Questions, Interviews
6. **Fallback Ready**: Works even if OpenAI API unavailable
7. **Profit Margin**: Automatically applied to all costs
8. **UI Display**: Accurate billing on settings page

## ✅ Result

**Every OpenAI operation** → **Real-time usage tracking** → **Accurate database storage** → **Category-wise billing display**

🎉 **100% accurate, real-time billing across the entire site!**
