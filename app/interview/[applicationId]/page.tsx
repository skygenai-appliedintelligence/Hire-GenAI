"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react"

export default function InterviewPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""
  const userVideoRef = useRef<HTMLVideoElement | null>(null)
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentReady, setAgentReady] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [jobDetails, setJobDetails] = useState<any>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const agentTextBufferRef = useRef<string>("")
  const userTextBufferRef = useRef<string>("")
  
  const logTs = (label: string, text?: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    if (text !== undefined) {
      console.log(`[${ts}] ${label}`, text)
    } else {
      console.log(`[${ts}] ${label}`)
    }
  }

  // Extract message text from content array
  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return ""
    return content
      .map((c) => {
        if (!c || typeof c !== "object") return ""
        if (c.type === "input_text") return c.text ?? ""
        if (c.type === "audio") return c.transcript ?? ""
        if (c.type === "input_audio") return c.transcript ?? ""
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  
  const pendingUserItems = useRef<Map<string, number>>(new Map())
  
  const handleTranscriptionCompleted = (event: any) => {
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const itemId = event.item_id
      const finalTranscript = !event.transcript || event.transcript === "\n" ? "[inaudible]" : event.transcript
      if (itemId && finalTranscript) {
        console.log('[You]', finalTranscript)
        setConversation(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'user' && last.text === finalTranscript) return prev
          const next = [...prev, { role: 'user' as const, text: finalTranscript, t: Date.now() }]
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: next }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return next
        })
      }
    } else if (event.type === 'response.audio_transcript.done') {
      const text = agentTextBufferRef.current
      if (text) {
        agentTextBufferRef.current = ''
        setConversation(prev => {
          const next = [...prev, { role: 'agent' as const, text, t: Date.now() }]
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: next }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return next
        })
      }
    }
  }
  
  const handleTranscriptionDelta = (event: any) => {
    if (event.type === 'response.audio_transcript.delta' && typeof event.delta === 'string') {
      agentTextBufferRef.current += event.delta
    }
  }
  
  const handleHistoryAdded = (item: any) => {
    if (!item || item.type !== 'message') return
    const { id: itemId, role, content = [] } = item
    
    if (itemId && role) {
      const isUser = role === "user"
      let text = extractMessageText(content)
      
      if (isUser && !text) {
        pendingUserItems.current.set(itemId, Date.now())
        console.log('[addTranscriptMessage] user item created, status:', item.status)
        text = "[Transcribing...]"
      } else if (!isUser) {
        console.log('[addTranscriptMessage] assistant item created, status:', item.status)
      }
      
      if (text && text !== "[Transcribing...]") {
        console.log(isUser ? '[You]' : '[Agent]', text)
        setConversation(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === role && last.text === text) return prev
          const next = [...prev, { role: role as 'agent' | 'user', text, t: Date.now() }]
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: next }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return next
        })
      }
    }
  }
  
  const handleHistoryUpdated = (items: any[]) => {
    console.log('[handleHistoryUpdated]', items)
    items.forEach((item: any) => {
      if (!item || item.type !== 'message') return
      const { id: itemId, content = [] } = item
      const text = extractMessageText(content)
      
      if (text) {
        setConversation(prev => {
          const updated = prev.map(convItem => {
            if (convItem.t && Math.abs(convItem.t - Date.now()) < 30000) {
              return { ...convItem, text }
            }
            return convItem
          })
          try {
            const payload = { id: applicationId, createdAt: Date.now(), conversation: updated }
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
          } catch {}
          return updated
        })
      }
    })
  }

  const [conversation, setConversation] = useState<{ role: 'agent' | 'user'; text: string; t: number }[]>([])
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if interview is already completed
  useEffect(() => {
    if (!applicationId) {
      router.push('/')
      return
    }
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, { cache: 'no-store' })
        const json = await res.json()
        
        if (res.ok && json?.ok) {
          if (!json.canInterview) {
            // Interview already completed
            setInterviewCompleted(true)
            setCheckingStatus(false)
            return
          }
        }
        
        // Interview not completed, proceed with initialization
        await init()
      } catch (e) {
        console.error('Failed to check interview status:', e)
        await init()
      }
    }
    
    const init = async () => {
      try {
        // First fetch job details
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/summary`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.ok) {
          const details = {
            jobTitle: json.job?.title || 'Position',
            company: json.company?.name || 'Company',
            jobDescription: json.job?.description || '',
            requirements: json.job?.requirements || '',
            candidateName: json.candidate?.name || 'Candidate'
          }
          setJobDetails(details)
          setCheckingStatus(false)
          // Then request permissions with job context
          await requestPermissions(details)
        } else {
          setCheckingStatus(false)
          // Fallback if job details not available
          await requestPermissions(null)
        }
      } catch (e) {
        console.error('Failed to fetch job details:', e)
        setCheckingStatus(false)
        await requestPermissions(null)
      }
    }
    
    checkStatus()
  }, [applicationId])

  const requestPermissions = async (details: any) => {
    setInitializing(true)
    setError(null)
    try {
      console.log('[Init] Requesting camera + mic permissions…')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777778 },
          facingMode: 'user',
        },
        audio: true,
      })
      console.log('[Init] Permissions granted; local stream ready')
      streamRef.current = stream
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
        await userVideoRef.current.play().catch(() => {})
      }
      
      // Initialize AI agent session
      logTs('Init: Requesting ephemeral session…')
      const resp = await fetch('/api/session')
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j?.error || 'Failed to init AI agent session')
      }
      const data = await resp.json()
      logTs('Init: Ephemeral session received')
      setSessionInfo(data)
      await initRealtimeConnection(data, stream, details)
      setAgentReady(true)
      logTs('Agent Connected (peer connection established)')
    } catch (e: any) {
      setError("Please allow camera and microphone to start the interview.")
    } finally {
      setInitializing(false)
    }
  }

  // Initialize WebRTC connection with OpenAI Realtime
  const initRealtimeConnection = async (session: any, localStream: MediaStream, details: any) => {
    pcRef.current?.close()
    pcRef.current = null

    logTs('RTC: Creating RTCPeerConnection')
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    })
    pcRef.current = pc
    pc.onconnectionstatechange = () => {
      logTs('RTC connectionState =', pc.connectionState)
    }
    pc.oniceconnectionstatechange = () => {
      logTs('RTC iceConnectionState =', pc.iceConnectionState)
    }

    const remoteStream = new MediaStream()
    if (agentAudioRef.current) {
      agentAudioRef.current.srcObject = remoteStream
      agentAudioRef.current.autoplay = true
      agentAudioRef.current.muted = false
    }
    pc.ontrack = (event) => {
      try {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t))
        } else if (event.track) {
          remoteStream.addTrack(event.track)
        }
        agentAudioRef.current?.play().catch(() => {})
        logTs('RTC: Remote track added', event.track?.kind)
      } catch {}
    }

    localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream))
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })

    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc
    dc.onopen = () => {
      logTs('DC open')
      try {
        // Build context-aware instructions for the AI agent
        let instructions = 'You are Olivia, a professional AI recruiter conducting a video interview.'
        
        if (details && details.jobTitle) {
          instructions += `\n\nIMPORTANT CONTEXT:
- You are interviewing ${details.candidateName} for the position of ${details.jobTitle} at ${details.company}
- DO NOT ask which position they are applying for - you already know it's ${details.jobTitle}
- Start by greeting them warmly and saying something like: "Hello ${details.candidateName}, welcome to your interview for the ${details.jobTitle} position at ${details.company}. I'm excited to learn more about your experience."`
          
          if (details.jobDescription) {
            instructions += `\n- Job Description: ${details.jobDescription}`
          }
          if (details.requirements) {
            instructions += `\n- Key Requirements: ${details.requirements}`
          }
          
          instructions += `\n\nConduct a professional interview focusing on their experience, skills, and fit for the ${details.jobTitle} role. Ask relevant technical and behavioral questions.`
        } else {
          instructions += '\n\nGreet the candidate warmly and ask which position they are interviewing for, then proceed with relevant questions.'
        }
        
        // Update session with instructions
        const updateMsg = {
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: instructions,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }
        dc.send(JSON.stringify(updateMsg))
        logTs('Session updated with job context')
        
        // Then trigger the first response
        const startMsg = {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text']
          }
        }
        dc.send(JSON.stringify(startMsg))
        logTs('First response triggered')
      } catch (e) {
        console.error('Error in dc.onopen:', e)
      }
    }
    dc.onerror = (e) => console.log('[DC] error', e)
    dc.onclose = () => console.log('[DC] close')
    dc.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        
        switch (msg.type) {
          case "conversation.item.input_audio_transcription.completed": {
            console.log('[handleTranscriptionCompleted]', msg);
            handleTranscriptionCompleted(msg);
            break;
          }
          case "response.audio_transcript.done": {
            console.log('[handleTranscriptionCompleted]', msg);
            handleTranscriptionCompleted(msg);
            break;
          }
          case "response.audio_transcript.delta": {
            console.log('[handleTranscriptionEvent]', msg);
            handleTranscriptionDelta(msg);
            break;
          }
          case "conversation.item.created": {
            console.log('[handleHistoryAdded]', msg.item || msg);
            handleHistoryAdded(msg.item || msg);
            break;
          }
          case "conversation.item.updated": 
          case "history.updated": {
            if (msg.items) {
              handleHistoryUpdated(msg.items);
            }
            break;
          }
        }
        
        if (msg.type === 'response.output_text.delta' && typeof msg.delta === 'string') {
          agentTextBufferRef.current += msg.delta
        }
        if ((msg.type === 'response.audio_transcript.delta' || msg.type === 'response.output_audio_transcript.delta') && typeof msg.delta === 'string') {
          agentTextBufferRef.current += msg.delta
        }
      } catch (e) {
        console.log('[DC raw]', evt.data)
      }
    }

    logTs('RTC: Creating offer…')
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const baseUrl = 'https://api.openai.com/v1/realtime'
    const model = session?.model || 'gpt-4o-realtime-preview'
    const clientSecret = session?.client_secret?.value
    if (!clientSecret) throw new Error('Missing realtime client secret from session response')

    logTs('RTC: Exchanging SDP with OpenAI…')
    const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp || '',
    })
    if (!sdpResponse.ok) {
      const txt = await sdpResponse.text()
      throw new Error(`Realtime SDP exchange failed: ${txt}`)
    }
    const answerSdp = await sdpResponse.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    logTs('RTC: Remote description set (answer). Waiting for tracks…')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      pcRef.current?.close()
      pcRef.current = null
    }
  }, [])

  // Handle avatar autoplay
  useEffect(() => {
    if (avatarVideoRef.current) {
      avatarVideoRef.current.play().catch(() => {})
    }
  }, [])

  const toggleMic = () => {
    const audioTracks = streamRef.current?.getAudioTracks() || []
    audioTracks.forEach(t => (t.enabled = !t.enabled))
    setMicOn(prev => !prev)
  }

  const toggleCam = () => {
    const videoTracks = streamRef.current?.getVideoTracks() || []
    videoTracks.forEach(t => (t.enabled = !t.enabled))
    setCamOn(prev => !prev)
  }

  const endInterview = async () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    try { pcRef.current?.close(); pcRef.current = null } catch {}

    // Persist transcript and mark interview as completed
    try {
      const turns = (() => {
        let arr = [] as { role: 'agent' | 'user'; text: string; t: number }[]
        try { arr = JSON.parse(JSON.stringify(conversation)) } catch { arr = conversation }
        if (agentTextBufferRef.current) {
          arr.push({ role: 'agent', text: agentTextBufferRef.current, t: Date.now() })
          agentTextBufferRef.current = ''
        }
        if (userTextBufferRef.current) {
          arr.push({ role: 'user', text: userTextBufferRef.current, t: Date.now() })
          userTextBufferRef.current = ''
        }
        return arr
      })()
      const payload = { id: applicationId, createdAt: Date.now(), conversation: turns }
      localStorage.setItem(`interview:${applicationId}`, JSON.stringify(payload))
      
      // Mark interview as completed in database
      const transcript = turns.map(t => `${t.role === 'agent' ? 'Agent' : 'You'}: ${t.text}`).join('\n\n')
      console.log('📝 Saving transcript to database...')
      console.log('📝 Conversation turns:', turns.length)
      console.log('📝 Transcript length:', transcript.length)
      console.log('📝 Transcript preview:', transcript.substring(0, 300))
      
      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      }).catch(e => {
        console.error('❌ Failed to mark interview as completed:', e)
        return null
      })
      
      if (response) {
        const result = await response.json()
        console.log('✅ Interview marked as completed:', result)
      }
      
      // Navigate to interview success page
      router.push(`/interview/${encodeURIComponent(applicationId)}/success`)
      return
    } catch {}
    
    router.push("/")
  }

  // Show "Interview Already Completed" message
  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Interview Already Completed</h1>
          <p className="text-lg text-slate-600 mb-6">
            This interview link has already been used and the interview has been completed.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Each interview link can only be used once for security purposes. If you believe this is an error, please contact the recruiting team.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/')} className="bg-black text-white hover:bg-gray-900">
              Go to Home
            </Button>
          </div>
          <div className="mt-6 text-xs text-slate-400">
            Application ID: <span className="font-mono">{applicationId.substring(0, 12)}...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while checking
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-slate-600">Checking interview status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">AI Video Interview</h1>
          <div className="text-sm text-slate-500">Application ID: {applicationId.substring(0, 8)}...</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Fixed 16:9 container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black max-w-4xl mx-auto aspect-video">
          {/* User camera preview */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <video
              ref={userVideoRef}
              className={`block w-full h-full object-cover object-center ${camOn ? '' : 'opacity-40'}`}
              style={{ transform: 'scaleX(-1)', transformOrigin: 'center center' }}
              muted
              playsInline
              autoPlay
            />
          </div>


          {/* Picture-in-picture Avatar overlay */}
          <div className="absolute left-4 bottom-4">
            <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black/60 backdrop-blur-sm">
              <video
                ref={avatarVideoRef}
                src="https://storage.googleapis.com/ai_recruiter_bucket_prod/assets/videos/olivia_character_no_audio.mp4"
                className="w-[220px] h-[124px] md:w-[260px] md:h-[146px] object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
              <audio ref={agentAudioRef} className="hidden" />
              <div className="absolute left-2 bottom-2 text-[10px] md:text-xs text-white/90">
                Olivia
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-4 bg-white/90 backdrop-blur rounded-full shadow-lg px-4 py-2 z-50">
            <Button size="icon" variant="ghost" className="rounded-full" onClick={toggleMic} title={micOn ? 'Mute mic' : 'Unmute mic'}>
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
              {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" className="rounded-full bg-red-500 hover:bg-red-600 text-white relative z-50" onClick={endInterview} title="End interview">
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          {/* Agent status badge */}
          {agentReady && (
            <div className="absolute right-4 bottom-6 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full shadow">
              Agent Connected
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
