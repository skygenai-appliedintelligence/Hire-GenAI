# Azure Realtime AI Interview Demo Setup

## Environment Variables

Add these to your `.env.local` file:

```env
# Azure OpenAI (Server-side only - NEVER expose to client)
AZURE_OPENAI_API_KEY=YOUR_REAL_KEY
AZURE_OPENAI_RESOURCE=https://YOUR-RESOURCE-NAME.openai.azure.com
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_REALTIME_VOICE=verse

# Public (safe for client)
NEXT_PUBLIC_AZURE_REALTIME_RTC_URL=https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc
NEXT_PUBLIC_AZURE_REALTIME_DEPLOYMENT=TA-AI-Recruiter-gpt-4o-mini-realtime-preview
```

## Dependencies

Already installed:
```bash
npm install jspdf html2canvas
```

## Files Created

1. **`app/api/azure/session/route.ts`** - Secure server-side route that mints Azure ephemeral sessions
2. **`app/demo-en/page.tsx`** - Full interview UI with 4 screens (Job → Candidate → Interview → Assessment)

## How It Works

### 1. Job Details Screen
- Recruiter enters job title and description
- Validates job title before proceeding

### 2. Candidate Details Screen
- Candidate enters name
- Drag-and-drop resume upload (PDF, DOCX, TXT)
- Text files are automatically parsed

### 3. Interview Screen
- WebRTC video/audio connection
- Real-time AI interviewer via Azure Realtime API
- Mic and camera controls
- Live transcript capture
- Start/End interview buttons

### 4. Assessment Screen
- Overall score (circular progress)
- 6 evaluation categories with scores
- Complete interview transcript
- Download PDF report button

## Security

✅ API keys never exposed to browser
✅ Ephemeral session tokens generated server-side
✅ WebRTC connection secured via Azure

## Usage

1. Visit `http://localhost:3000/demo-en`
2. Fill in job details → Next
3. Fill in candidate details → Next
4. Click "Start" to begin interview
5. Speak with AI interviewer
6. Click "End" to finish
7. View assessment and download PDF report

## Technical Details

- **WebRTC**: Peer-to-peer connection with Azure Realtime API
- **Data Channel**: Receives AI responses and transcripts
- **Media Streams**: Local camera/mic + remote AI audio/video
- **PDF Export**: jsPDF + html2canvas for report generation
- **Transcript**: Real-time capture of all AI questions and responses

## Troubleshooting

### Camera/Mic Not Working
- Ensure HTTPS (or localhost)
- Check browser permissions
- Verify getUserMedia support

### Session Creation Fails
- Check Azure API key is valid
- Verify resource URL is correct
- Ensure deployment name matches

### No AI Response
- Check data channel is open (console logs)
- Verify WebRTC connection established
- Check Azure Realtime API status

## Next Steps

- Split into smaller components for maintainability
- Add real evaluation logic (replace mock scores)
- Integrate with existing HireGenAI database
- Add billing tracking for interview usage
- Customize AI interviewer prompts per job
