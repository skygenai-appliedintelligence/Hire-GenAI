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
  const [faceStatus, setFaceStatus] = useState<'loading' | 'no_face' | 'too_far' | 'not_centered' | 'poor_lighting' | 'ready'>('loading')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  
  // Face comparison state - BINARY only (no score/percentage)
  const [storedPhotoUrl, setStoredPhotoUrl] = useState<string | null>(null)
  const [faceMatchStatus, setFaceMatchStatus] = useState<'pending' | 'comparing' | 'matched' | 'not_matched' | 'no_stored_photo'>('pending')
  const [verificationAttempts, setVerificationAttempts] = useState(0)
  const MAX_VERIFICATION_ATTEMPTS = 10
  
  // Liveness detection state
  const [livenessChecks, setLivenessChecks] = useState<{
    blinkDetected: boolean;
    headMovementDetected: boolean;
    multipleFacesDetected: boolean;
    lastFacePositions: Array<{x: number, y: number}>;
  }>({
    blinkDetected: false, 
    headMovementDetected: false,
    multipleFacesDetected: false,
    lastFacePositions: [] 
  })

  // Camera stabilization state
  const [cameraStabilizing, setCameraStabilizing] = useState(false)
  const [stabilizationCountdown, setStabilizationCountdown] = useState<number | null>(null)
  const [qualityCheck, setQualityCheck] = useState<{
    passed: boolean;
    faceCount: number;
    confidence: number;
    faceSize: number;
    centered: boolean;
    brightness: number;
    message: string;
  } | null>(null)

  // Reference photo descriptor (cached)
  const referenceDescriptorRef = useRef<Float32Array | null>(null)

  // Standardized detector options - SAME for both reference and live photo
  const DETECTOR_OPTIONS = {
    inputSize: 416,
    scoreThreshold: 0.5
  }

  // Verification thresholds
  const VERIFICATION_THRESHOLD = 0.45
  const MIN_CONFIDENCE = 0.6
  const MIN_FACE_SIZE_RATIO = 0.35
  const MAX_CENTER_DEVIATION = 0.10

  // Auto-send OTP on page load - only once (using sessionStorage to survive React Strict Mode double-mount)
  const otpSentRef = useRef(false)
  useEffect(() => {
    if (!applicationId) return
    // Restore OTP state on refresh so inputs don't disappear
    const otpDataKey = `otp_data_${applicationId}`
    const raw = sessionStorage.getItem(otpDataKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          email?: string
          maskedEmail?: string
          candidateName?: string
          ts?: number
        }
        const ts = typeof parsed.ts === 'number' ? parsed.ts : 0
        const isFresh = ts > 0 ? (Date.now() - ts) < 10 * 60 * 1000 : false
        if (isFresh && parsed.email) {
          setOtpSent(true)
          setCandidateEmail(parsed.email)
          setMaskedEmail(parsed.maskedEmail || '')
          setCandidateName(parsed.candidateName || '')
          setCurrentStep(1)
        } else {
          sessionStorage.removeItem(otpDataKey)
        }
      } catch {
        // ignore
      }
    }

    // Check sessionStorage to prevent duplicate OTP sends in React Strict Mode
    const otpSentKey = `otp_sent_${applicationId}`
    const alreadySent = sessionStorage.getItem(otpSentKey)

    // If we already have OTP state restored, don't auto-send again.
    // If not restored (refresh) but flag exists, we should still send again so user isn't stuck.
    if (!otpSentRef.current && (!alreadySent || !sessionStorage.getItem(`otp_data_${applicationId}`))) {
      otpSentRef.current = true
      sessionStorage.setItem(otpSentKey, 'true')
      sendOtp()
    }
  }, [applicationId])

  // Send OTP
  const sendOtp = async () => {
    setOtpSending(true)
    setOtpError(null)
    setOtp(['', '', '', '', '', ''])
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
        // Persist OTP state for refresh
        try {
          sessionStorage.setItem(`otp_data_${applicationId}`, JSON.stringify({
            email: data.email || '',
            maskedEmail: data.maskedEmail || '',
            candidateName: data.candidateName || '',
            ts: Date.now(),
          }))
        } catch {}
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

  // Load and cache reference photo descriptor
  const loadReferenceDescriptor = useCallback(async (): Promise<Float32Array | null> => {
    if (referenceDescriptorRef.current) {
      console.log('[Reference] Using cached descriptor')
      return referenceDescriptorRef.current
    }
    
    if (!storedPhotoUrl) {
      console.log('[Reference] No stored photo URL')
      return null
    }
    
    try {
      console.log('[Reference] Loading reference photo...')
      
      // Load stored image
      let storedImg: HTMLImageElement
      try {
        const response = await fetch(storedPhotoUrl)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        
        storedImg = new Image()
        await new Promise<void>((resolve, reject) => {
          storedImg.onload = () => resolve()
          storedImg.onerror = () => reject(new Error('Failed to load'))
          storedImg.src = blobUrl
        })
      } catch {
        storedImg = new Image()
        storedImg.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          storedImg.onload = () => resolve()
          storedImg.onerror = () => reject(new Error('Failed to load'))
          storedImg.src = storedPhotoUrl
        })
      }
      
      console.log('[Reference] Image loaded:', storedImg.width, 'x', storedImg.height)
      
      // Detect face with SAME detector options
      const detection = await faceapi
        .detectSingleFace(storedImg, new faceapi.TinyFaceDetectorOptions(DETECTOR_OPTIONS))
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      if (!detection) {
        console.error('[Reference] No face detected in reference photo')
        return null
      }
      
      console.log('[Reference] Face detected, confidence:', detection.detection.score.toFixed(3))
      referenceDescriptorRef.current = detection.descriptor
      return detection.descriptor
      
    } catch (err) {
      console.error('[Reference] Error loading reference:', err)
      return null
    }
  }, [storedPhotoUrl])

  // Check image quality (blur, brightness)
  const checkImageQuality = useCallback((canvas: HTMLCanvasElement): { brightness: number; isBlurry: boolean } => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return { brightness: 0, isBlurry: true }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Calculate average brightness
    let totalBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      totalBrightness += (r + g + b) / 3
    }
    const brightness = totalBrightness / (data.length / 4)
    
    // Simple blur detection using Laplacian variance
    let laplacianSum = 0
    const width = canvas.width
    const height = canvas.height
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        const top = (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3
        const bottom = (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3
        const left = (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3
        const right = (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3
        
        const laplacian = Math.abs(4 * center - top - bottom - left - right)
        laplacianSum += laplacian * laplacian
      }
    }
    
    const variance = laplacianSum / ((width - 2) * (height - 2))
    console.log(`[BlurCheck] Laplacian variance: ${variance.toFixed(2)}`)
    const isBlurry = variance < 20 // Reduced threshold - 100 was too strict
    
    return { brightness, isBlurry }
  }, [])

  // Quality gate - validate captured photo before verification
  const runQualityGate = useCallback(async (imageData: string): Promise<{ passed: boolean; error?: string; detection?: any }> => {
    console.log('[QualityGate] Starting quality checks...')
    
    try {
      // Load image
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = imageData
      })
      
      // Check brightness using canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = img.width
      tempCanvas.height = img.height
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0)
        const { brightness, isBlurry } = checkImageQuality(tempCanvas)
        
        console.log(`[QualityGate] Brightness: ${brightness.toFixed(1)}, Blurry: ${isBlurry}`)
        
        if (brightness < 50) {
          setQualityCheck({ passed: false, faceCount: 0, confidence: 0, faceSize: 0, centered: false, brightness, message: 'Image too dark. Please improve lighting.' })
          return { passed: false, error: '📷 Image too dark. Please improve lighting.' }
        }
        
        if (brightness > 220) {
          setQualityCheck({ passed: false, faceCount: 0, confidence: 0, faceSize: 0, centered: false, brightness, message: 'Image too bright. Reduce lighting glare.' })
          return { passed: false, error: '📷 Image too bright. Reduce lighting glare.' }
        }
        
        if (isBlurry) {
          setQualityCheck({ passed: false, faceCount: 0, confidence: 0, faceSize: 0, centered: false, brightness, message: 'Image is blurry. Hold still and try again.' })
          return { passed: false, error: '📷 Image is blurry. Hold still and try again.' }
        }
      }
      
      // Detect all faces
      const detections = await faceapi.detectAllFaces(
        img, 
        new faceapi.TinyFaceDetectorOptions(DETECTOR_OPTIONS)
      ).withFaceLandmarks().withFaceDescriptors()
      
      console.log(`[QualityGate] Faces detected: ${detections.length}`)
      
      // Check face count
      if (detections.length === 0) {
        setQualityCheck({ passed: false, faceCount: 0, confidence: 0, faceSize: 0, centered: false, brightness: 0, message: 'No face detected. Face the camera directly.' })
        return { passed: false, error: '❌ No face detected. Please face the camera directly.' }
      }
      
      if (detections.length > 1) {
        setQualityCheck({ passed: false, faceCount: detections.length, confidence: 0, faceSize: 0, centered: false, brightness: 0, message: 'Multiple faces detected. Only you should be in frame.' })
        return { passed: false, error: '❌ Multiple faces detected. Only you should be in frame.' }
      }
      
      const detection = detections[0]
      const confidence = detection.detection.score
      const faceBox = detection.detection.box
      const faceHeight = faceBox.height
      const faceSizeRatio = faceHeight / img.height
      
      // Check confidence
      if (confidence < MIN_CONFIDENCE) {
        setQualityCheck({ passed: false, faceCount: 1, confidence, faceSize: faceSizeRatio, centered: false, brightness: 0, message: `Low confidence (${(confidence * 100).toFixed(0)}%). Face the camera clearly.` })
        return { passed: false, error: `⚠️ Face not clear (${(confidence * 100).toFixed(0)}% confidence). Please face the camera directly.` }
      }
      
      // Check face size (must be at least 35% of frame)
      if (faceSizeRatio < MIN_FACE_SIZE_RATIO) {
        setQualityCheck({ passed: false, faceCount: 1, confidence, faceSize: faceSizeRatio, centered: false, brightness: 0, message: 'Face too small. Move closer to camera.' })
        return { passed: false, error: '📏 Face too small. Please move closer to the camera.' }
      }
      
      // Check centering (face center should be within ±10% of image center)
      const faceCenterX = faceBox.x + faceBox.width / 2
      const imageCenterX = img.width / 2
      const horizontalDeviation = Math.abs(faceCenterX - imageCenterX) / img.width
      
      if (horizontalDeviation > MAX_CENTER_DEVIATION) {
        setQualityCheck({ passed: false, faceCount: 1, confidence, faceSize: faceSizeRatio, centered: false, brightness: 0, message: 'Face not centered. Align with oval guide.' })
        return { passed: false, error: '↔️ Face not centered. Please align your face with the oval guide.' }
      }
      
      console.log(`[QualityGate] ✅ All checks passed - Confidence: ${(confidence * 100).toFixed(1)}%, Size: ${(faceSizeRatio * 100).toFixed(1)}%, Deviation: ${(horizontalDeviation * 100).toFixed(1)}%`)
      
      setQualityCheck({ passed: true, faceCount: 1, confidence, faceSize: faceSizeRatio, centered: true, brightness: 128, message: 'Quality check passed!' })
      return { passed: true, detection }
      
    } catch (err: any) {
      console.error('[QualityGate] Error:', err)
      return { passed: false, error: err?.message || 'Quality check failed' }
    }
  }, [checkImageQuality])

  // Compare captured photo with reference descriptor - BINARY result only
  const compareFaces = useCallback(async (capturedImageData: string): Promise<{ matched: boolean; distance: number; error?: string }> => {
    if (!storedPhotoUrl) {
      console.log('[FaceCompare] No stored photo URL, skipping comparison')
      return { matched: true, distance: 0 }
    }

    try {
      setFaceMatchStatus('comparing')
      console.log('[FaceCompare] Starting face comparison...')
      
      // Get reference descriptor (cached or load fresh)
      const referenceDescriptor = await loadReferenceDescriptor()
      if (!referenceDescriptor) {
        return { matched: false, distance: 1, error: 'Could not load reference photo. Please contact support.' }
      }
      
      // Load captured image
      const capturedImg = new Image()
      await new Promise<void>((resolve, reject) => {
        capturedImg.onload = () => resolve()
        capturedImg.onerror = () => reject(new Error('Failed to load captured image'))
        capturedImg.src = capturedImageData
      })
      
      // Detect face with SAME detector options as reference
      const capturedDetection = await faceapi
        .detectSingleFace(capturedImg, new faceapi.TinyFaceDetectorOptions(DETECTOR_OPTIONS))
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      if (!capturedDetection) {
        return { matched: false, distance: 1, error: 'No face detected in captured photo. Please retake.' }
      }
      
      const capturedConfidence = capturedDetection.detection.score
      console.log(`[FaceCompare] Captured face confidence: ${capturedConfidence.toFixed(3)}`)
      
      // Check confidence
      if (capturedConfidence < MIN_CONFIDENCE) {
        return { matched: false, distance: 1, error: 'Face not clear enough. Please ensure good lighting and face the camera directly.' }
      }
      
      // Compare using Euclidean distance - BINARY decision only
      const distance = faceapi.euclideanDistance(capturedDetection.descriptor, referenceDescriptor)
      const matched = distance < VERIFICATION_THRESHOLD
      
      // Log for debugging (distance stored in DB but NEVER shown to user)
      console.log(`[FaceCompare] ========== RESULT ==========`)
      console.log(`[FaceCompare] Distance: ${distance.toFixed(4)} (threshold: ${VERIFICATION_THRESHOLD})`)
      console.log(`[FaceCompare] Decision: ${matched ? '✅ VERIFIED' : '❌ NOT VERIFIED'}`)
      console.log(`[FaceCompare] ==============================`)
      
      return { matched, distance }
      
    } catch (err: any) {
      console.error('[FaceCompare] Error:', err)
      return { matched: false, distance: 1, error: err?.message || 'Face comparison failed' }
    }
  }, [storedPhotoUrl, loadReferenceDescriptor])

  // Real face detection using face-api.js with lighting check
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isCameraReady || !modelsLoaded || !canvasRef.current) return

    try {
      const video = videoRef.current
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      
      // REAL-TIME BRIGHTNESS CHECK - Check lighting before allowing capture
      const tempCanvas = canvasRef.current
      tempCanvas.width = videoWidth
      tempCanvas.height = videoHeight
      const ctx = tempCanvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight)
        const data = imageData.data
        
        // Calculate average brightness of the frame
        let totalBrightness = 0
        for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for speed
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          totalBrightness += (r + g + b) / 3
        }
        const avgBrightness = totalBrightness / (data.length / 16)
        
        // Block capture if lighting is poor (brightness < 110)
        // Image 1 showed ~90-100 brightness still looked dark
        if (avgBrightness < 110) {
          console.log(`[Lighting] Too dark: ${avgBrightness.toFixed(1)} (min: 110)`)
          setFaceStatus('poor_lighting')
          return
        }
      }
      
      // Detect faces with landmarks
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      ).withFaceLandmarks()

      if (detections.length === 0) {
        setFaceStatus('no_face')
        return
      }
      
      // Check for multiple faces (potential spoofing attempt)
      if (detections.length > 1) {
        console.warn('[SECURITY] Multiple faces detected during verification!')
        setLivenessChecks(prev => ({ ...prev, multipleFacesDetected: true }))
      }

      const face = detections[0]
      
      // Check face size (must be at least 50% of frame height - user must be CLOSE)
      // Image 2 showed ~40% still looked too far
      const faceHeight = face.detection.box.height
      const faceSizeRatio = faceHeight / videoHeight
      
      console.log(`[FaceSize] Ratio: ${(faceSizeRatio * 100).toFixed(1)}% (min: 50%)`)
      
      if (faceSizeRatio < 0.50) {
        setFaceStatus('too_far')
        return
      }

      // Check if face is centered
      const faceCenterX = face.detection.box.x + face.detection.box.width / 2
      const faceCenterY = face.detection.box.y + face.detection.box.height / 2
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

  // Start camera with stabilization period
  const startCamera = useCallback(async () => {
    setCapturedPhoto(null)
    setPhotoError(null)
    setFaceStatus('loading')
    setFaceMatchStatus('pending')
    setQualityCheck(null)
    setIsCameraOpen(true)
    setCameraStabilizing(true)
    setStabilizationCountdown(2) // 2 second stabilization
    
    // Load models and fetch stored photo in parallel
    await Promise.all([
      loadModels(),
      fetchStoredPhoto()
    ])
    
    // Pre-load reference descriptor
    await loadReferenceDescriptor()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      // Mobile-friendly camera constraints
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const constraints = {
        video: { 
          facingMode: 'user', 
          width: isMobile ? { ideal: 480 } : { ideal: 640 }, 
          height: isMobile ? { ideal: 360 } : { ideal: 480 } 
        },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            // Start stabilization countdown after camera is ready
            console.log('[Camera] Starting 2 second stabilization period...')
            
            // Wait 2 seconds for camera to stabilize
            for (let i = 2; i >= 0; i--) {
              setStabilizationCountdown(i)
              if (i > 0) await new Promise(r => setTimeout(r, 1000))
            }
            
            setCameraStabilizing(false)
            setIsCameraReady(true)
            console.log('[Camera] Stabilization complete, ready for capture')
          } catch (playErr) {
            console.error('Video play error:', playErr)
          }
        }
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      setIsCameraOpen(false)
      setCameraStabilizing(false)
      setPhotoError('Camera access denied. Please allow camera permissions.')
    }
  }, [loadModels, fetchStoredPhoto, loadReferenceDescriptor])

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
    setQualityCheck(null)
    setFaceMatchStatus('pending')
    startCamera()
  }

  // Calculate eye aspect ratio for blink detection
  const calculateEyeAspectRatio = (eyePoints: any[]) => {
    // Ensure we have enough points
    if (eyePoints.length < 6) return 1.0
    
    // Calculate vertical distances
    const v1 = Math.sqrt(
      Math.pow(eyePoints[1].x - eyePoints[5].x, 2) + 
      Math.pow(eyePoints[1].y - eyePoints[5].y, 2)
    )
    const v2 = Math.sqrt(
      Math.pow(eyePoints[2].x - eyePoints[4].x, 2) + 
      Math.pow(eyePoints[2].y - eyePoints[4].y, 2)
    )
    
    // Calculate horizontal distance
    const h = Math.sqrt(
      Math.pow(eyePoints[0].x - eyePoints[3].x, 2) + 
      Math.pow(eyePoints[0].y - eyePoints[3].y, 2)
    )
    
    // Return eye aspect ratio
    return (v1 + v2) / (2.0 * h)
  }

  // Verify photo with quality gate and face comparison
  const verifyPhoto = async () => {
    if (!capturedPhoto) return
    
    // Check if max attempts exceeded
    if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      setPhotoError(`Maximum verification attempts (${MAX_VERIFICATION_ATTEMPTS}) exceeded. Please contact support for assistance.`)
      return
    }
    
    setPhotoVerifying(true)
    setPhotoError(null)
    setVerificationAttempts(prev => prev + 1)
    
    try {
      // STEP 1: Run Quality Gate first
      console.log('[Verify] Step 1: Running quality gate...')
      const qualityResult = await runQualityGate(capturedPhoto)
      
      if (!qualityResult.passed) {
        setPhotoError(qualityResult.error || 'Quality check failed. Please recapture.')
        setPhotoVerifying(false)
        return
      }
      
      console.log('[Verify] Quality gate passed, proceeding to face comparison...')
      
      // STEP 2: Check if reference photo exists
      if (faceMatchStatus === 'no_stored_photo' || !storedPhotoUrl) {
        setFaceMatchStatus('not_matched')
        setPhotoError('No application photo found for verification. Please contact support for manual verification.')
        console.warn(`[SECURITY] Verification attempted without stored photo for applicationId: ${applicationId}`)
        
        await fetch('/api/interview/verify/security-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            applicationId,
            alertType: 'missing_photo',
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.error('Failed to send security alert:', err))
        
        return
      }

      // STEP 3: Compare faces using cached reference descriptor - BINARY result
      console.log('[Verify] Step 2: Comparing faces...')
      const result = await compareFaces(capturedPhoto)
      
      // Handle specific errors
      if (result.error) {
        setFaceMatchStatus('not_matched')
        const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - verificationAttempts
        setPhotoError(`${result.error} (${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining)`)
        return
      }
      
      if (result.matched) {
        // VERIFIED - face matches
        setFaceMatchStatus('matched')
        setPhotoVerified(true)
        
        // Save verification result to database (distance for logs, NEVER shown to user)
        await fetch('/api/interview/verify/compare-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            applicationId, 
            verified: true, 
            distance: result.distance, // Store distance for internal logs only
            attempts: verificationAttempts,
            capturedPhotoUrl: capturedPhoto
          })
        })
        
        // Redirect to interview after success
        setTimeout(() => {
          router.push(`/interview/${applicationId}`)
        }, 1500)
      } else {
        // NOT VERIFIED - face does not match (BINARY decision, no percentages)
        setFaceMatchStatus('not_matched')
        const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - verificationAttempts
        
        if (attemptsLeft <= 0) {
          setPhotoError(`Verification failed. Face does not match the application photo. Maximum attempts exceeded. Please contact support.`)
        } else {
          setPhotoError(`Face does not match the application photo. Please ensure you are the same person who applied. (${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining)`)
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
                    {/* Camera Stabilization / Face Detection Status */}
                    <div className={`w-full max-w-xs mb-3 p-2 rounded-lg text-center text-sm font-medium ${
                      cameraStabilizing ? 'bg-blue-100 text-blue-700' :
                      faceStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                      faceStatus === 'loading' ? 'bg-slate-100 text-slate-600' :
                      faceStatus === 'poor_lighting' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {cameraStabilizing && (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Camera stabilizing... {stabilizationCountdown}s
                        </span>
                      )}
                      {!cameraStabilizing && faceStatus === 'loading' && <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Detecting face...</span>}
                      {!cameraStabilizing && faceStatus === 'no_face' && '👀 Look directly at the camera'}
                      {!cameraStabilizing && faceStatus === 'too_far' && '📏 Move CLOSER to fill the oval'}
                      {!cameraStabilizing && faceStatus === 'not_centered' && '↔️ Center your face in the oval'}
                      {!cameraStabilizing && faceStatus === 'poor_lighting' && '💡 Lighting too dark! Turn on lights or move to brighter area'}
                      {!cameraStabilizing && faceStatus === 'ready' && '✅ Perfect! Ready to capture'}
                    </div>

                    {/* Camera with Face Guide - Oval shape */}
                    <div className="relative">
                      <div 
                        className={`relative overflow-hidden bg-black transition-all duration-300 ${
                          cameraStabilizing ? 'ring-4 ring-blue-400' :
                          faceStatus === 'ready' ? 'ring-4 ring-emerald-500' : 
                          faceStatus === 'poor_lighting' ? 'ring-4 ring-red-500' : 'ring-4 ring-amber-400'
                        }`} 
                        style={{ width: '220px', height: '280px', borderRadius: '50%' }}
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                        
                        {/* Stabilization Overlay */}
                        {cameraStabilizing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                              <span className="text-white text-sm">Stabilizing...</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Capture Countdown Overlay */}
                        {countdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <span className="text-6xl font-bold text-white animate-pulse">{countdown}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Face positioning guide text */}
                      {!cameraStabilizing && faceStatus !== 'ready' && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Fill the oval with your face
                        </div>
                      )}
                    </div>

                    {/* Capture Instructions */}
                    <div className="mt-4 text-xs text-slate-500 text-center max-w-xs space-y-1">
                      <p className="font-medium">📸 For best results:</p>
                      <p>• Move close so your face fills the oval</p>
                      <p>• Ensure good lighting on your face</p>
                      <p>• Look directly at the camera</p>
                    </div>

                    <Button
                      onClick={() => setCountdown(3)}
                      disabled={!isCameraReady || cameraStabilizing || countdown !== null || faceStatus !== 'ready'}
                      className={`mt-4 ${!cameraStabilizing && faceStatus === 'ready' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'} text-white gap-2`}
                    >
                      <Camera className="w-4 h-4" />
                      {cameraStabilizing ? 'Stabilizing...' : countdown !== null ? 'Capturing...' : 'Capture Photo'}
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

                        {/* VS indicator - NO percentages shown */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                            faceMatchStatus === 'matched' ? 'bg-emerald-500 text-white' :
                            faceMatchStatus === 'not_matched' ? 'bg-red-500 text-white' :
                            faceMatchStatus === 'comparing' ? 'bg-blue-500 text-white' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {faceMatchStatus === 'comparing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                             faceMatchStatus === 'matched' ? <Check className="w-5 h-5" /> :
                             faceMatchStatus === 'not_matched' ? <AlertTriangle className="w-5 h-5" /> : 'VS'}
                          </div>
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
                        <p className="text-sm text-emerald-700 font-medium">Face verified successfully!</p>
                      </div>
                    )}

                    {faceMatchStatus === 'not_matched' && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-700">Face does not match the application photo</p>
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
