"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Play } from "lucide-react"

export default function DemoInterviewPage() {
  const router = useRouter()
  const userVideoRef = useRef<HTMLVideoElement | null>(null)
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // framing: lock to fill (cover)
  const [agentReady, setAgentReady] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const agentTextBufferRef = useRef<string>("")

  // Request permissions on explicit user action
  const requestPermissions = async () => {
    setInitializing(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.7777778 },
          facingMode: 'user',
        },
        audio: true,
      })
      streamRef.current = stream
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
        await userVideoRef.current.play().catch(() => {})
      }
      // Initialize AI agent session
      const resp = await fetch('/api/session')
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j?.error || 'Failed to init AI agent session')
      }
      const data = await resp.json()
      setSessionInfo(data)
      await initRealtimeConnection(data, stream)
      setAgentReady(true)
    } catch (e: any) {
      setError("Please allow camera and microphone to try the demo interview.")
    } finally {
      setInitializing(false)
    }
  }

  // Initialize WebRTC connection with OpenAI Realtime using ephemeral session
  const initRealtimeConnection = async (session: any, localStream: MediaStream) => {
    // Close any existing connection
    pcRef.current?.close()
    pcRef.current = null

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    })
    pcRef.current = pc

    // Prepare remote audio stream; keep avatar MP4 playing visually
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
        // Ensure audio element plays
        agentAudioRef.current?.play().catch(() => {})
      } catch {}
    }

    // Add local microphone
    localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream))

    // Ensure we also receive audio/video from the agent
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })

    // Data channel for events: ask the agent to start the interview
    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc
    dc.onopen = () => {
      try {
        const startMsg = {
          type: 'response.create',
          response: {
            modalities: ['audio'],
            instructions: "Please greet the candidate and ask which job title they are interviewing for. Wait for their answer before continuing with role-specific questions.",
          },
        }
        dc.send(JSON.stringify(startMsg))
      } catch {}
    }
    dc.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        // Agent text streaming (delta)
        if (msg.type === 'response.output_text.delta' && typeof msg.delta === 'string') {
          agentTextBufferRef.current += msg.delta
        }
        // Agent text done
        if (msg.type === 'response.output_text.done') {
          console.log('[Agent]', agentTextBufferRef.current)
          agentTextBufferRef.current = ''
        }
        // User speech transcription completed
        if (msg.type === 'input_audio_transcription.completed' && msg.transcript) {
          console.log('[You]', msg.transcript)
        }
        // Turn markers (optional debug)
        if (msg.type === 'response.completed') {
          // Finalize any remaining buffer just in case
          if (agentTextBufferRef.current) {
            console.log('[Agent]', agentTextBufferRef.current)
            agentTextBufferRef.current = ''
          }
        }
      } catch (e) {
        // Non-JSON payloads
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const baseUrl = 'https://api.openai.com/v1/realtime'
    const model = session?.model || 'gpt-4o-realtime-preview'
    const clientSecret = session?.client_secret?.value
    if (!clientSecret) throw new Error('Missing realtime client secret from session response')

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

  // Handle avatar autoplay for iOS by ensuring muted+playsInline
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

  const endDemo = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Demo Interview</h1>
          <Button variant="outline" onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Fixed 16:9 container to maintain natural proportions */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black max-w-4xl mx-auto aspect-video">
          {/* User camera preview (fill) */}
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

          {/* Permission overlay */}
          {!streamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Enable your camera and microphone</h3>
                <p className="text-sm text-slate-600 mb-4">We need access to start the demo interview.</p>
                <Button onClick={requestPermissions} disabled={initializing} className="sr-button-primary">
                  {initializing ? 'Requesting…' : 'Allow Camera & Mic'}
                </Button>
                {error && <div className="text-xs text-red-600 mt-3 max-w-xs">{error}</div>}
              </div>
            </div>
          )}

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
              {/* Hidden audio element to play agent voice while avatar video keeps playing visually */}
              <audio ref={agentAudioRef} className="hidden" />
              <div className="absolute left-2 bottom-2 text-[10px] md:text-xs text-white/90">
                Olivia
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-4 bg-white/90 backdrop-blur rounded-full shadow-lg px-4 py-2">
            <Button size="icon" variant="ghost" className="rounded-full" onClick={toggleMic} title={micOn ? 'Mute mic' : 'Unmute mic'}>
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
              {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" className="rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={endDemo} title="End demo">
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          {/* Agent status badge */}
          {agentReady && (
            <div className="absolute right-4 bottom-6 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full shadow">
              Agent Connected
            </div>
          )}

          

          {/* Overlays */}
          {initializing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="px-4 py-2 bg-white/90 rounded-lg shadow">Initializing camera…</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-md px-4 py-3 bg-white/95 rounded-lg shadow text-center text-slate-700">
                {error}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
