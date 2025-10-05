# Multi-Step Job Creation Form Implementation

## Overview
Implemented a multi-step form with validation, progressive saving, and proper button states for job creation flow.

## Key Features

### 1. Button States & Labels

#### All Tabs (except Interview)
- **Button**: "Next"
- **State**: Disabled until required fields are filled
- **Action**: Navigate to next tab

#### Interview Tab (Last Tab)
- **Button**: "Create Job & Setup Agents"
- **State**: Disabled until agent is selected
- **Action**: Submit form and redirect to selected-agents page

### 2. Tab Validation Rules

| Tab | Required Fields | Validation |
|-----|----------------|------------|
| **Basic Info** | Job Title, Location, Job Type | All 3 must be filled |
| **Requirements** | Technical Skills OR Must-Have Skills | At least one field filled |
| **Responsibilities** | Day-to-day duties | Must be filled |
| **Compensation** | Salary Min & Max | Both must be filled |
| **Logistics** | None | Always valid (optional) |
| **Resume Screening** | None | Always valid (auto-configured) |
| **Interview** | Interview Rounds | At least 1 agent selected |

### 3. Progressive Job Saving

#### Resume Screening Tab
- When clicking "Next" on Resume Screening tab:
  - **Creates job in database** (POST `/api/jobs`)
  - Stores `createdJobId` in state
  - Updates URL with `?jobId=[id]`
  - Navigates to Interview tab

#### Interview Tab
- When clicking "Create Job & Setup Agents":
  - **Updates existing job** (PATCH `/api/jobs/[id]`)
  - Saves interview rounds and agent configuration
  - Redirects to `/selected-agents` page

### 4. Edit Mode Support

- If `jobId` exists in URL or `createdJobId` is set:
  - All changes update the existing job
  - No new job is created
  - User can navigate back and forth between tabs
  - Changes are saved when clicking final submit

### 5. URL Management

- Each tab change updates URL: `?tab=[tabName]`
- Job creation adds: `?jobId=[id]&tab=[tabName]`
- Preserves all query parameters during navigation

## User Flow

```
1. Basic Info → Fill required fields → Click "Next" (enabled)
2. Requirements → Fill required fields → Click "Next" (enabled)
3. Responsibilities → Fill required fields → Click "Next" (enabled)
4. Compensation → Fill required fields → Click "Next" (enabled)
5. Logistics → (Optional) → Click "Next" (always enabled)
6. Resume Screening → Click "Next" → **Job Created in DB** ✅
7. Interview → Select agent → Click "Create Job & Setup Agents" → **Job Updated** ✅
8. Redirect to /selected-agents page
```

## Technical Implementation

### State Management
```typescript
const [createdJobId, setCreatedJobId] = useState<string | null>(null)
const [currentTab, setCurrentTab] = useState("basic")
```

### Validation Functions
- `isBasicInfoValid()` - Checks job title, location, job type
- `isRequirementsValid()` - Checks technical or must-have skills
- `isResponsibilitiesValid()` - Checks day-to-day duties
- `isCompensationValid()` - Checks salary min and max
- `isLogisticsValid()` - Always true (optional)
- `isResumeScreeningValid()` - Always true (auto-configured)
- `isInterviewValid()` - Checks interview rounds selected
- `isCurrentTabValid()` - Returns validation for current tab

### Navigation
```typescript
const goToNextTab = () => {
  const tabs = ['basic', 'requirements', 'responsibilities', 'compensation', 'logistics', 'resume-screening', 'interview']
  const currentIndex = tabs.indexOf(currentTab)
  if (currentIndex < tabs.length - 1) {
    setCurrentTab(tabs[currentIndex + 1])
    router.push(`/dashboard/jobs/new?tab=${tabs[currentIndex + 1]}`, { scroll: false })
  }
}
```

### Job Creation (Resume Screening Tab)
```typescript
if (currentTab === 'resume-screening' && !createdJobId) {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      description: compiledDescription,
      requirements: compiledRequirements,
      companyId: company?.id,
      createdBy: user?.id,
    }),
  })
  const data = await res.json()
  if (res.ok && data?.ok && data?.jobId) {
    setCreatedJobId(data.jobId)
    router.push(`/dashboard/jobs/new?jobId=${data.jobId}&tab=interview`, { scroll: false })
  }
}
```

### Job Update (Interview Tab)
```typescript
const jobIdToUpdate = createdJobId || searchParams.get('jobId')

if (jobIdToUpdate) {
  const res = await fetch(`/api/jobs/${jobIdToUpdate}?company=${company?.name}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}
```

## Benefits

✅ **Better UX** - Clear progress through form steps
✅ **Validation** - Can't proceed without required fields
✅ **Progressive Saving** - Job saved before final step
✅ **Edit Support** - Can modify job after creation
✅ **No Duplicates** - Updates existing job instead of creating new
✅ **URL State** - Current tab reflected in URL
✅ **Error Prevention** - Disabled buttons prevent invalid submissions

## Testing

1. Navigate to `/dashboard/jobs/new`
2. Try clicking "Next" without filling required fields → Should be disabled
3. Fill Basic Info → "Next" button enables
4. Continue through all tabs
5. On Resume Screening → Click "Next" → Job created in DB
6. Check URL → Should have `?jobId=[id]&tab=interview`
7. Select agent → "Create Job & Setup Agents" enables
8. Click button → Redirects to `/selected-agents` page
9. Go back to job form → Should update existing job, not create new
