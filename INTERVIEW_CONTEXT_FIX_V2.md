# Interview Context Fix V2 - Proper Job Context Passing

## Problem
1. AI agent (Olivia) was still asking "which job title are you applying for?" even though job context was being passed
2. The job details weren't being passed at the right time in the WebRTC connection flow

## Root Cause
- Job details were being fetched asynchronously but the WebRTC connection was initialized before the fetch completed
- The `response.create` message wasn't the right way to set persistent context
- Need to use `session.update` to configure the AI agent before starting the conversation

## Solution

### 1. Sequential Initialization
Changed the initialization flow to be sequential:
```typescript
const init = async () => {
  // 1. First fetch job details
  const details = await fetchJobDetails()
  
  // 2. Then request permissions with job context
  await requestPermissions(details)
  
  // 3. Initialize WebRTC with job context
  await initRealtimeConnection(session, stream, details)
}
```

### 2. Pass Job Context Through Function Chain
- `requestPermissions(details)` - receives job details as parameter
- `initRealtimeConnection(session, stream, details)` - receives job details
- `dc.onopen()` - uses the details parameter directly (not state)

### 3. Use session.update Instead of response.create
Changed from:
```typescript
// OLD - Wrong approach
const startMsg = {
  type: 'response.create',
  response: {
    instructions: "..."
  }
}
```

To:
```typescript
// NEW - Correct approach
const updateMsg = {
  type: 'session.update',
  session: {
    modalities: ['audio', 'text'],
    instructions: instructions,
    voice: 'alloy',
    input_audio_transcription: { model: 'whisper-1' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  }
}
dc.send(JSON.stringify(updateMsg))

// Then trigger first response
const startMsg = {
  type: 'response.create',
  response: { modalities: ['audio', 'text'] }
}
dc.send(JSON.stringify(startMsg))
```

### 4. Explicit Instructions to AI Agent
```typescript
if (details && details.jobTitle) {
  instructions += `\n\nIMPORTANT CONTEXT:
- You are interviewing ${details.candidateName} for the position of ${details.jobTitle} at ${details.company}
- DO NOT ask which position they are applying for - you already know it's ${details.jobTitle}
- Start by greeting them warmly and saying something like: "Hello ${details.candidateName}, welcome to your interview for the ${details.jobTitle} position at ${details.company}. I'm excited to learn more about your experience."
- Job Description: ${details.jobDescription}
- Key Requirements: ${details.requirements}

Conduct a professional interview focusing on their experience, skills, and fit for the ${details.jobTitle} role. Ask relevant technical and behavioral questions.`
}
```

## End Call Button
The red "End Interview" button is already enabled and functional:
- Located at the bottom center of the video interface
- Red circular button with phone icon
- Calls `endInterview()` function which:
  - Stops all media tracks
  - Closes WebRTC connection
  - Saves conversation transcript
  - Redirects to qualified page

## Testing
1. Navigate to `/interview/[applicationId]/start`
2. Click "Start Video Interview"
3. Allow camera and microphone
4. Observe Olivia greeting you by name and mentioning the specific job role
5. Verify she does NOT ask "which position are you applying for?"
6. Test the red end call button to terminate interview

## Key Changes
- **File**: `app/interview/[applicationId]/page.tsx`
- Sequential async initialization
- Job context passed through function parameters
- `session.update` used to configure AI agent
- Explicit instructions prevent asking about job title
- End call button already functional (no changes needed)
