"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Shield, 
  Mail, 
  Camera, 
  Check, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  ChevronRight,
  Lock,
  User
} from "lucide-react"
import * as faceapi from 'face-api.js'

export default function InterviewVerifyPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""

  // Step management (1 = OTP, 2 = Photo)
  const [currentStep, setCurrentStep] = useState(1)
  
  // OTP State
  const [otpSending, setOtpSending] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Photo State
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const storedPhotoRef = useRef<HTMLImageElement | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [photoVerifying, setPhotoVerifying] = useState(false)
  const [photoVerified, setPhotoVerified] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSkipped, setPhotoSkipped] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [faceStatus, setFaceStatus] = useState<'loading' | 'no_face' | 'too_far' | 'not_centered' | 'ready'>('loading')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  
  // Face comparison state
  const [storedPhotoUrl, setStoredPhotoUrl] = useState<string | null>(null)
  const [faceMatchScore, setFaceMatchScore] = useState<number | null>(null)
  const [faceMatchStatus, setFaceMatchStatus] = useState<'pending' | 'comparing' | 'matched' | 'not_matched' | 'no_stored_photo'>('pending')

  // Auto-send OTP on page load
  useEffect(() => {
    if (applicationId && !otpSent && !otpSending) {
      sendOtp()
    }
  }, [applicationId])

  // Send OTP
  const sendOtp = async () => {
    setOtpSending(true)
    setOtpError(null)
    try {
      const res = await fetch('/api/interview/verify/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      })
      const data = await res.json()
      if (data.ok) {
        setOtpSent(true)
        setMaskedEmail(data.maskedEmail || '')
        setCandidateName(data.candidateName || '')
        setCandidateEmail(data.email || '') // Store actual email for verification
        // Focus first OTP input
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else {
        setOtpError(data.error || 'Failed to send OTP')
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    
    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    
    // Auto-verify when all digits entered
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      verifyOtp(newOtp.join(''))
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      verifyOtp(pastedData)
    }
  }

  // Handle OTP keydown (backspace)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Verify OTP
  const verifyOtp = async (otpCode: string) => {
    setOtpVerifying(true)
    setOtpError(null)
    try {
      // Use the email that was stored from send-otp response
      if (!candidateEmail) {
        setOtpError('Email not found. Please refresh and try again.')
        setOtpVerifying(false)
        return
      }

      const res = await fetch('/api/interview/verify/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidateEmail, otp: otpCode, applicationId })
      })
      const data = await res.json()
      if (data.ok) {
        setOtpVerified(true)
        // Move to step 2 after short delay
        setTimeout(() => {
          setCurrentStep(2)
          startCamera()
        }, 500)
      } else {
        setOtpError(data.error || 'Invalid OTP')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to verify OTP')
    } finally {
      setOtpVerifying(false)
    }
  }

  // Fetch stored photo URL from database
  const fetchStoredPhoto = useCallback(async () => {
    try {
      const res = await fetch(`/api/interview/verify/compare-photo?applicationId=${applicationId}`)
      const data = await res.json()
      if (data.ok && data.storedPhotoUrl) {
        setStoredPhotoUrl(data.storedPhotoUrl)
      } else if (data.skipped) {
        setFaceMatchStatus('no_stored_photo')
      }
    } catch (err) {
      console.error('Failed to fetch stored photo:', err)
    }
  }, [applicationId])

  // Load face-api.js models (including face recognition for comparison)
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return
    setLoadingModels(true)
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ])
      setModelsLoaded(true)
    } catch (err) {
      console.error('Failed to load face detection models:', err)
    }
    setLoadingModels(false)
  }, [modelsLoaded, loadingModels])

  // Compare captured photo with stored photo using face-api.js
  const compareFaces = useCallback(async (capturedImageData: string): Promise<{ matched: boolean; score: number; error?: string }> => {
    if (!storedPhotoUrl) {
      console.log('[FaceCompare] No stored photo URL, skipping comparison')
      return { matched: true, score: 100 }
    }

    try {
      setFaceMatchStatus('comparing')
      console.log('[FaceCompare] Starting face comparison...')
      console.log('[FaceCompare] Stored photo URL:', storedPhotoUrl)

      // Load captured image (base64)
      const capturedImg = new Image()
      await new Promise<void>((resolve, reject) => {
        capturedImg.onload = () => {
          console.log('[FaceCompare] Captured image loaded:', capturedImg.width, 'x', capturedImg.height)
          resolve()
        }
        capturedImg.onerror = (e) => {
          console.error('[FaceCompare] Failed to load captured image:', e)
          reject(new Error('Failed to load captured image'))
        }
        capturedImg.src = capturedImageData
      })

      // Load stored image - use fetch to handle CORS properly
      console.log('[FaceCompare] Fetching stored image...')
      let storedImg: HTMLImageElement
      try {
        const response = await fetch(storedPhotoUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        
        storedImg = new Image()
        await new Promise<void>((resolve, reject) => {
          storedImg.onload = () => {
            console.log('[FaceCompare] Stored image loaded:', storedImg.width, 'x', storedImg.height)
            resolve()
          }
          storedImg.onerror = (e) => {
            console.error('[FaceCompare] Failed to load stored image from blob:', e)
            reject(new Error('Failed to load stored image'))
          }
          storedImg.src = blobUrl
        })
      } catch (fetchErr) {
        console.error('[FaceCompare] Failed to fetch stored image:', fetchErr)
        // Fallback: try direct image load
        storedImg = new Image()
        storedImg.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          storedImg.onload = () => {
            console.log('[FaceCompare] Stored image loaded (fallback):', storedImg.width, 'x', storedImg.height)
            resolve()
          }
          storedImg.onerror = (e) => {
            console.error('[FaceCompare] Failed to load stored image (fallback):', e)
            reject(new Error('Failed to load stored image'))
          }
          storedImg.src = storedPhotoUrl
        })
      }

      // Detect face in captured image
      console.log('[FaceCompare] Detecting face in captured image...')
      const capturedDetection = await faceapi
        .detectSingleFace(capturedImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!capturedDetection) {
        console.error('[FaceCompare] No face detected in captured image')
        return { matched: false, score: 0, error: 'No face detected in current photo' }
      }
      console.log('[FaceCompare] Captured face detected, confidence:', capturedDetection.detection.score.toFixed(3))

      // Detect face in stored image
      console.log('[FaceCompare] Detecting face in stored image...')
      const storedDetection = await faceapi
        .detectSingleFace(storedImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!storedDetection) {
        console.error('[FaceCompare] No face detected in stored image')
        return { matched: false, score: 0, error: 'No face detected in application photo' }
      }
      console.log('[FaceCompare] Stored face detected, confidence:', storedDetection.detection.score.toFixed(3))

      // Compare face descriptors using Euclidean distance
      const distance = faceapi.euclideanDistance(
        capturedDetection.descriptor,
        storedDetection.descriptor
      )

      // Convert distance to similarity score (0-100)
      // Euclidean distance typically ranges from 0 (identical) to ~1.5 (very different)
      // Distance < 0.6 is typically considered a match
      const normalizedScore = Math.max(0, Math.min(1, 1 - (distance / 1.0)))
      const score = Math.round(normalizedScore * 100)
      const matched = distance < 0.6

      console.log(`[FaceCompare] Result: distance=${distance.toFixed(4)}, score=${score}%, matched=${matched}`)
      console.log(`[FaceCompare] Captured descriptor sample:`, Array.from(capturedDetection.descriptor).slice(0, 5))
      console.log(`[FaceCompare] Stored descriptor sample:`, Array.from(storedDetection.descriptor).slice(0, 5))

      return { matched, score }
    } catch (err: any) {
      console.error('[FaceCompare] Error:', err)
      return { matched: false, score: 0, error: err?.message || 'Face comparison failed' }
    }
  }, [storedPhotoUrl])

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
    if (!isCameraOpen || !isCameraReady || capturedPhoto || !modelsLoaded) return
    const interval = setInterval(detectFace, 500)
    return () => clearInterval(interval)
  }, [isCameraOpen, isCameraReady, capturedPhoto, modelsLoaded, detectFace])

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
          setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.9))
          stopCamera()
        }
      }
      setCountdown(null)
      return
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Start camera
  const startCamera = useCallback(async () => {
    setCapturedPhoto(null)
    setPhotoError(null)
    setFaceStatus('loading')
    setFaceMatchStatus('pending')
    setIsCameraOpen(true)
    
    // Load models and fetch stored photo in parallel
    await Promise.all([
      loadModels(),
      fetchStoredPhoto()
    ])
    
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
      setPhotoError('Camera access denied. Please allow camera permissions.')
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
    setIsCameraReady(false)
  }, [])

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!isCameraReady || !videoRef.current || !canvasRef.current) return
    
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
      setCapturedPhoto(imageData)
      stopCamera()
    }
  }, [isCameraReady, stopCamera])

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null)
    setPhotoError(null)
    startCamera()
  }

  // Verify photo with face comparison
  const verifyPhoto = async () => {
    if (!capturedPhoto) return
    
    setPhotoVerifying(true)
    setPhotoError(null)
    
    try {
      // If no stored photo, skip comparison
      if (faceMatchStatus === 'no_stored_photo' || !storedPhotoUrl) {
        setPhotoVerified(true)
        setPhotoSkipped(true)
        setFaceMatchStatus('matched')
        setTimeout(() => {
          router.push(`/interview/${applicationId}`)
        }, 1500)
        return
      }

      // Compare faces using face-api.js
      const result = await compareFaces(capturedPhoto)
      setFaceMatchScore(result.score)
      
      // Handle specific errors
      if (result.error) {
        setFaceMatchStatus('not_matched')
        setPhotoError(result.error)
        return
      }
      
      if (result.matched) {
        setFaceMatchStatus('matched')
        setPhotoVerified(true)
        
        // Save verification result to database
        await fetch('/api/interview/verify/compare-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            applicationId, 
            verified: true, 
            score: result.score 
          })
        })
        
        // Redirect to interview after success
        setTimeout(() => {
          router.push(`/interview/${applicationId}`)
        }, 1500)
      } else {
        // Low match but not an error - allow retry or manual review
        setFaceMatchStatus('not_matched')
        if (result.score > 30) {
          setPhotoError(`Face match score is low: ${result.score}%. Try again with better lighting or position.`)
        } else {
          setPhotoError(`Face does not match! Match score: ${result.score}%. Please ensure you are the same person who applied.`)
        }
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'Failed to verify photo')
    } finally {
      setPhotoVerifying(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Identity Verification</h1>
          <p className="text-slate-600 mt-2">Please complete the verification to start your interview</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            currentStep === 1 
              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' 
              : otpVerified 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-100 text-slate-500'
          }`}>
            {otpVerified ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            <span>Email OTP</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            currentStep === 2 
              ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' 
              : photoVerified 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-100 text-slate-500'
          }`}>
            {photoVerified ? <Check className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span>Photo Verify</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Step 1: OTP Verification */}
          {currentStep === 1 && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                  <Mail className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Email Verification</h2>
                {otpSent && maskedEmail && (
                  <p className="text-slate-600 mt-2">
                    We've sent a 6-digit code to <span className="font-medium text-slate-900">{maskedEmail}</span>
                  </p>
                )}
              </div>

              {otpSending && (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                  <p className="text-slate-600">Sending verification code...</p>
                </div>
              )}

              {otpSent && !otpVerified && (
                <>
                  {/* OTP Input */}
                  <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={el => { otpRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg transition-all ${
                          digit 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-slate-200 hover:border-emerald-300'
                        } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`}
                        disabled={otpVerifying}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{otpError}</p>
                    </div>
                  )}

                  {otpVerifying && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      onClick={sendOtp}
                      disabled={otpSending}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                    >
                      Didn't receive the code? Resend
                    </button>
                  </div>
                </>
              )}

              {otpVerified && (
                <div className="flex flex-col items-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-emerald-700 font-medium">Email Verified!</p>
                  <p className="text-slate-500 text-sm mt-1">Moving to photo verification...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Photo Verification */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                  <Camera className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Photo Verification</h2>
                <p className="text-slate-600 mt-2">
                  Take a photo to verify your identity
                </p>
              </div>

              {/* Camera / Photo Preview */}
              <div className="flex flex-col items-center">
                {/* Camera View */}
                {isCameraOpen && !capturedPhoto && (
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
                      onClick={() => setCountdown(3)}
                      disabled={!isCameraReady || countdown !== null || faceStatus !== 'ready'}
                      className={`mt-3 ${faceStatus === 'ready' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'} text-white gap-2`}
                    >
                      <Camera className="w-4 h-4" />
                      {countdown !== null ? 'Capturing...' : 'Capture Photo'}
                    </Button>
                  </div>
                )}

                {/* Captured Photo Preview with Face Comparison */}
                {capturedPhoto && !photoVerified && (
                  <div className="flex flex-col items-center">
                    {/* Side by Side Photo Comparison */}
                    {storedPhotoUrl && (
                      <div className="flex items-center gap-4 mb-4">
                        {/* Stored Photo (from application) */}
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-slate-500 mb-2">Application Photo</p>
                          <div className="relative overflow-hidden ring-2 ring-slate-300" style={{ width: '100px', height: '100px', borderRadius: '50%' }}>
                            <img src={storedPhotoUrl} alt="Application" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                          </div>
                        </div>

                        {/* VS indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            faceMatchStatus === 'matched' ? 'bg-emerald-500 text-white' :
                            faceMatchStatus === 'not_matched' ? 'bg-red-500 text-white' :
                            faceMatchStatus === 'comparing' ? 'bg-blue-500 text-white' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {faceMatchStatus === 'comparing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'VS'}
                          </div>
                          {faceMatchScore !== null && (
                            <p className={`text-xs mt-1 font-medium ${faceMatchStatus === 'matched' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {faceMatchScore}%
                            </p>
                          )}
                        </div>

                        {/* Captured Photo (current) */}
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-slate-500 mb-2">Current Photo</p>
                          <div className="relative overflow-hidden ring-2 ring-emerald-500" style={{ width: '100px', height: '100px', borderRadius: '50%' }}>
                            <img src={capturedPhoto} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Single photo if no stored photo */}
                    {!storedPhotoUrl && (
                      <div className="relative overflow-hidden ring-4 ring-emerald-500 mb-4" style={{ width: '150px', height: '150px', borderRadius: '50%' }}>
                        <img src={capturedPhoto} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Match Status */}
                    {faceMatchStatus === 'comparing' && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <p className="text-sm text-blue-700">Comparing faces...</p>
                      </div>
                    )}

                    {faceMatchStatus === 'matched' && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-3">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm text-emerald-700">Face matched! Score: {faceMatchScore}%</p>
                      </div>
                    )}

                    {faceMatchStatus === 'not_matched' && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-700">Face does not match! Score: {faceMatchScore}%</p>
                      </div>
                    )}

                    {faceMatchStatus === 'no_stored_photo' && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <p className="text-sm text-amber-700">No application photo found - verification will be skipped</p>
                      </div>
                    )}

                    {photoError && faceMatchStatus !== 'not_matched' && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3 max-w-xs">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700">{photoError}</p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={retakePhoto}
                        disabled={photoVerifying}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retake
                      </Button>
                      <Button
                        size="sm"
                        onClick={verifyPhoto}
                        disabled={photoVerifying || faceMatchStatus === 'comparing'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {photoVerifying ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Verify & Continue
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Photo Verified Success */}
                {photoVerified && (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-emerald-700 font-semibold text-lg">Verification Complete!</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {photoSkipped ? 'Redirecting to interview...' : 'Identity verified. Redirecting to interview...'}
                    </p>
                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mt-4" />
                  </div>
                )}

                {/* Initial state - no camera */}
                {!isCameraOpen && !capturedPhoto && !photoVerified && (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
                      <User className="w-12 h-12 text-slate-300" />
                    </div>
                    <Button
                      onClick={startCamera}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Open Camera
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3 h-3" />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
