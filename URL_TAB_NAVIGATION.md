# URL-Based Tab Navigation for Report Page

## Overview
Report page ab URL-based tab navigation use karta hai. Jab aap tabs switch karte ho, URL automatically update hota hai.

## Implementation

### URL Format
```
/dashboard/analytics/[jdId]/applications/[candidateId]/report?tab=[tabName]
```

### Available Tabs
- `?tab=candidate` - Candidate information
- `?tab=evaluation` - Evaluation scores and feedback
- `?tab=transcript` - Interview transcript
- `?tab=job` - Job application details

### Features

1. **URL Updates on Tab Change**
   - Jab aap kisi tab pe click karte ho, URL automatically update hota hai
   - Example: Click "Transcript" → URL becomes `...report?tab=transcript`

2. **Direct URL Access**
   - Aap directly specific tab ka URL open kar sakte ho
   - Example: `...report?tab=evaluation` directly evaluation tab khol dega

3. **Browser Back/Forward**
   - Browser ke back/forward buttons kaam karte hain
   - Tab history maintain hoti hai

4. **Shareable URLs**
   - Aap specific tab ka URL share kar sakte ho
   - Recipient directly us tab pe land karega

5. **No Page Reload**
   - Tab change karne par page reload nahi hota
   - Smooth navigation with `scroll: false`

## Technical Details

### Implementation
- Uses `useSearchParams()` to read URL query parameters
- Uses `router.push()` to update URL without page reload
- `changeTab()` function handles both state and URL updates

### Code Changes
```typescript
// Read tab from URL on mount
useEffect(() => {
  const tabParam = searchParams?.get('tab')
  if (tabParam && ['candidate', 'evaluation', 'transcript', 'job'].includes(tabParam)) {
    setActiveTab(tabParam as "candidate" | "evaluation" | "transcript" | "job")
  }
}, [searchParams])

// Function to change tab and update URL
const changeTab = (tab: "candidate" | "evaluation" | "transcript" | "job") => {
  setActiveTab(tab)
  const url = `/dashboard/analytics/${jdId}/applications/${candidateId}/report?tab=${tab}`
  router.push(url, { scroll: false })
}
```

## Usage Examples

### Direct Navigation
```
http://localhost:3000/dashboard/analytics/[jdId]/applications/[candidateId]/report?tab=transcript
```

### Programmatic Navigation
```typescript
changeTab("evaluation")
```

## Benefits

✅ **Better UX** - Users can bookmark specific tabs
✅ **Shareable** - Share direct links to specific sections
✅ **Browser History** - Back/forward buttons work naturally
✅ **SEO Friendly** - Each tab has unique URL
✅ **State Persistence** - Tab state reflected in URL
