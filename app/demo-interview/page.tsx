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
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // framing: lock to fill (cover)

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
    } catch (e: any) {
      setError("Please allow camera and microphone to try the demo interview.")
    } finally {
      setInitializing(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
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
