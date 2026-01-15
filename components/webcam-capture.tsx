'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, User, AlertCircle, Check, AlertTriangle, Loader2 } from 'lucide-react'
import * as faceapi from 'face-api.js'

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void
  capturedImage: string | null
  onClear: () => void
  disabled?: boolean
}

export default function WebcamCapture({ onCapture, capturedImage, onClear, disabled }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [tempCapture, setTempCapture] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [faceStatus, setFaceStatus] = useState<'loading' | 'no_face' | 'too_far' | 'not_centered' | 'ready'>('loading')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return
    setLoadingModels(true)
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      setModelsLoaded(true)
    } catch (err) {
      console.error('Failed to load face detection models:', err)
    }
    setLoadingModels(false)
  }, [modelsLoaded, loadingModels])

  // Real face detection using face-api.js
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isCameraReady || !modelsLoaded) return

    try {
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      )

      if (detections.length === 0) {
        setFaceStatus('no_face')
        return
      }

      const face = detections[0]
      const videoWidth = videoRef.current.videoWidth
      const videoHeight = videoRef.current.videoHeight
      
      // Check face size (must be at least 35% of frame height - user must be close)
      const faceHeight = face.box.height
      const faceSizeRatio = faceHeight / videoHeight
      
      if (faceSizeRatio < 0.35) {
        setFaceStatus('too_far')
        return
      }

      // Check if face is centered (within middle 60% of frame)
      const faceCenterX = face.box.x + face.box.width / 2
      const faceCenterY = face.box.y + face.box.height / 2
      const marginX = videoWidth * 0.2
      const marginY = videoHeight * 0.2
      
      const isCentered = 
        faceCenterX > marginX && faceCenterX < (videoWidth - marginX) &&
        faceCenterY > marginY && faceCenterY < (videoHeight - marginY)

      if (!isCentered) {
        setFaceStatus('not_centered')
        return
      }

      setFaceStatus('ready')
    } catch (err) {
      console.error('Face detection error:', err)
    }
  }, [isCameraReady, modelsLoaded])

  // Run face detection periodically
  useEffect(() => {
    if (!isCameraOpen || !isCameraReady || tempCapture || !modelsLoaded) return
    
    const interval = setInterval(detectFace, 500)
    return () => clearInterval(interval)
  }, [isCameraOpen, isCameraReady, tempCapture, modelsLoaded, detectFace])

  const startCamera = useCallback(async () => {
    setError(null)
    setTempCapture(null)
    setFaceStatus('loading')
    setIsCameraOpen(true)
    
    // Load models first
    await loadModels()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            setIsCameraReady(true)
          } catch (playErr) {
            console.error('Video play error:', playErr)
          }
        }
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      setIsCameraOpen(false)
      if (err.name === 'NotAllowedError') setError('Camera access denied. Please allow camera permissions.')
      else if (err.name === 'NotFoundError') setError('No camera found. Please connect a webcam.')
      else setError('Failed to access camera.')
    }
  }, [loadModels])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
    setIsCameraReady(false)
  }, [])

  const startCountdown = useCallback(() => {
    setCountdown(3)
  }, [])

  // Handle countdown
  useEffect(() => {
    if (countdown === null) return
    
    if (countdown === 0) {
      // Capture photo
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(video, 0, 0)
          
          const imageData = canvas.toDataURL('image/jpeg', 0.9)
          setTempCapture(imageData)
          stopCamera()
        }
      }
      setCountdown(null)
      return
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, stopCamera])

  const handleRetake = useCallback(() => {
    setTempCapture(null)
    startCamera()
  }, [startCamera])

  const handleUsePhoto = useCallback(() => {
    if (tempCapture) {
      onCapture(tempCapture)
      setTempCapture(null)
    }
  }, [tempCapture, onCapture])

  const handleRemovePhoto = useCallback(() => {
    onClear()
  }, [onClear])

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-600" />
          Candidate Photo <span className="text-red-500">*</span>
        </h3>
        <span className="text-xs text-slate-500">Required for verification</span>
      </div>

      <div className="border border-slate-200 rounded-lg bg-slate-50/50 p-4">
        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={startCamera} disabled={disabled}>
              Try Again
            </Button>
          </div>
        )}

        {/* Initial State - No Camera */}
        {!isCameraOpen && !tempCapture && !capturedImage && !error && (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 mb-3 text-center">Capture a clear, professional photo</p>
            <Button type="button" onClick={startCamera} disabled={disabled} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Camera className="w-4 h-4 mr-2" />
              Open Camera
            </Button>
          </div>
        )}

        {/* Camera Open - Live Preview */}
        {isCameraOpen && !tempCapture && !capturedImage && (
          <div className="flex flex-col items-center">
            {/* Face Detection Status */}
            <div className={`w-full max-w-xs mb-3 p-2 rounded-lg text-center text-sm font-medium ${
              faceStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' :
              faceStatus === 'loading' ? 'bg-slate-100 text-slate-600' :
              'bg-red-100 text-red-700'
            }`}>
              {faceStatus === 'loading' && <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading face detection...</span>}
              {faceStatus === 'no_face' && '❌ No face detected - look at camera'}
              {faceStatus === 'too_far' && '⚠️ Move closer to camera'}
              {faceStatus === 'not_centered' && '↔️ Center your face in the circle'}
              {faceStatus === 'ready' && '✓ Face detected - Ready to capture!'}
            </div>

            {/* Camera with Face Guide */}
            <div className="relative">
              {/* Face Oval Guide */}
              <div 
                className={`relative overflow-hidden bg-black transition-all duration-300 ${
                  faceStatus === 'ready' ? 'ring-4 ring-emerald-500' : 'ring-4 ring-red-400'
                }`} 
                style={{ width: '240px', height: '300px', borderRadius: '50%' }}
              >
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                />
                
                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="text-6xl font-bold text-white animate-pulse">{countdown}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Capture Instructions */}
            <div className="mt-3 text-xs text-slate-500 text-center max-w-xs">
              Position your face inside the oval. Ensure good lighting and plain background.
            </div>

            <Button 
              type="button" 
              onClick={() => setCountdown(3)} 
              disabled={!isCameraReady || disabled || countdown !== null || faceStatus !== 'ready'} 
              className={`mt-3 ${faceStatus === 'ready' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'} text-white`}
            >
              <Camera className="w-4 h-4 mr-2" />
              {countdown !== null ? 'Capturing...' : 'Capture Photo'}
            </Button>
          </div>
        )}

        {/* Captured Photo Preview */}
        {tempCapture && !capturedImage && (
          <div className="flex flex-col items-center">
            <div className="ring-4 ring-emerald-500" style={{ width: '200px', height: '250px', borderRadius: '50%', overflow: 'hidden' }}>
              <img src={tempCapture} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            
            {/* Confirmation */}
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 text-sm max-w-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-700">
                <Check className="w-4 h-4" />
                Photo Captured
              </div>
              <p className="text-xs text-slate-600 mt-1">Review your photo. Make sure your face is clearly visible.</p>
            </div>

            <div className="flex gap-3 mt-3">
              <Button type="button" variant="outline" size="sm" onClick={handleRetake} disabled={disabled}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retake
              </Button>
              <Button type="button" size="sm" onClick={handleUsePhoto} disabled={disabled} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="w-3 h-3 mr-1" />
                Use Photo
              </Button>
            </div>
          </div>
        )}

        {/* Photo Confirmed */}
        {capturedImage && !isCameraOpen && !tempCapture && (
          <div className="flex flex-col items-center py-2">
            <div className="relative">
              <img src={capturedImage} alt="Your photo" className="w-20 h-20 object-cover rounded-full ring-2 ring-emerald-500" />
              <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5">
                <Check className="w-3 h-3" />
              </div>
            </div>
            <p className="text-sm text-emerald-600 font-medium mt-2">Photo confirmed</p>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} disabled={disabled} className="mt-1 text-slate-500 text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              Change
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Used for identity verification only. Stored securely.
      </p>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
