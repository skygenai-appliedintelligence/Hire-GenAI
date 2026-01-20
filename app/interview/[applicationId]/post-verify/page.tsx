"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Check, Loader2, RefreshCw, AlertCircle, User, MoveVertical, Sun, Focus } from "lucide-react"
import * as faceapi from 'face-api.js'

export default function PostInterviewVerifyPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  
  // Face detection state (same as verify page)
  const [faceStatus, setFaceStatus] = useState<'loading' | 'no_face' | 'too_far' | 'not_centered' | 'poor_lighting' | 'blurry' | 'ready'>('loading')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return
    setLoadingModels(true)
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      ])
      setModelsLoaded(true)
      console.log('[PostVerify] Face detection models loaded')
    } catch (err) {
      console.error('Failed to load face detection models:', err)
    }
    setLoadingModels(false)
  }, [modelsLoaded, loadingModels])

  // Check image quality (blur detection) - same as verify page
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
    const isBlurry = variance < 20
    
    return { brightness, isBlurry }
  }, [])

  // Real face detection - same logic as verify page
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isCameraReady || !modelsLoaded || !canvasRef.current) return

    try {
      const video = videoRef.current
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      
      // REAL-TIME BRIGHTNESS CHECK
      const tempCanvas = canvasRef.current
      tempCanvas.width = videoWidth
      tempCanvas.height = videoHeight
      const ctx = tempCanvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight)
        const data = imageData.data
        
        // Calculate average brightness
        let totalBrightness = 0
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          totalBrightness += (r + g + b) / 3
        }
        const avgBrightness = totalBrightness / (data.length / 16)
        
        // Block capture if lighting is poor
        if (avgBrightness < 110) {
          console.log(`[Lighting] Too dark: ${avgBrightness.toFixed(1)} (min: 110)`)
          setFaceStatus('poor_lighting')
          return
        }
        
        // Check for blur using quality function
        const { isBlurry } = checkImageQuality(tempCanvas)
        if (isBlurry) {
          console.log('[Quality] Image is blurry - hold still')
          setFaceStatus('blurry')
          return
        }
      }
      
      // Detect faces
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      ).withFaceLandmarks()

      if (detections.length === 0) {
        setFaceStatus('no_face')
        return
      }

      const face = detections[0]
      
      // Check face size (must be at least 50% of frame height)
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
  }, [isCameraReady, modelsLoaded, checkImageQuality])

  // Run face detection periodically
  useEffect(() => {
    if (!isCameraOpen || !isCameraReady || capturedPhoto || !modelsLoaded) return
    const interval = setInterval(detectFace, 500)
    return () => clearInterval(interval)
  }, [isCameraOpen, isCameraReady, capturedPhoto, modelsLoaded, detectFace])

  // Start camera on mount
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    setCapturedPhoto(null)
    setIsCameraOpen(true)
    setFaceStatus('loading')
    
    // Load face detection models
    await loadModels()
    
    try {
      console.log('Starting camera...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        console.log('Setting video stream...')
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, playing...')
          videoRef.current?.play()
            .then(() => {
              console.log('Video playing successfully')
              setIsCameraReady(true)
            })
            .catch(err => {
              console.error('Error playing video:', err)
              setError('Error starting video stream. Please try again.')
            })
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setError('Could not access camera. Please allow camera permissions and ensure no other app is using it.')
      setIsCameraOpen(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
    setIsCameraReady(false)
  }

  // Handle countdown and capture - same as verify page
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

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      console.error('Cannot capture photo: video or canvas not ready')
      setError('Camera is not ready. Please refresh the page and try again.')
      return
    }
    // Start countdown - capture happens in useEffect above
    setCountdown(3)
  }, [isCameraReady])

  const retakePhoto = () => {
    setCapturedPhoto(null)
    setError(null)
    startCamera()
  }

  const savePhotoAndContinue = async () => {
    if (!capturedPhoto) {
      setError('No photo captured. Please take a photo first.')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      console.log('Saving photo to server...')
      
      // Add a small delay to ensure UI feedback is visible
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const response = await fetch('/api/interview/post-verify/save-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          photo: capturedPhoto
        })
      })
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.ok) {
        console.log('Photo saved successfully!')
        // Redirect to success page
        router.push(`/interview/${encodeURIComponent(applicationId)}/success`)
      } else {
        console.error('API returned error:', data.error)
        setError(data.error || 'Failed to save photo')
      }
    } catch (err: any) {
      console.error('Save photo error:', err)
      setError(err?.message || 'Failed to save photo. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Interview Completed Message */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-6 text-center backdrop-blur-sm">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-emerald-400 mb-2">Your interview has been completed.</h1>
          <p className="text-slate-400">Please take a final verification photo to complete the process.</p>
        </div>

        {/* Photo Capture Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-4">
              <Camera className="h-7 w-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Final Photo Verification</h2>
            <p className="text-slate-400 text-sm mt-1">Take a clear photo of your face</p>
          </div>

          {/* Camera / Photo Display - OVAL SHAPE */}
          <div className="relative aspect-[4/3] bg-slate-800 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
            {/* Oval mask container - ring color changes based on face status */}
            <div className={`relative w-[240px] h-[300px] rounded-full overflow-hidden ring-4 bg-slate-800 ${
              capturedPhoto ? 'ring-emerald-500' :
              faceStatus === 'ready' ? 'ring-emerald-500' :
              faceStatus === 'loading' ? 'ring-slate-500' :
              'ring-red-500'
            }`}>
              {!capturedPhoto ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      width="100%"
                      height="100%"
                      className="absolute inset-0 w-full h-full object-cover bg-black z-10"
                      style={{ 
                        transform: 'scale(1.3) scaleX(-1)',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: isCameraReady ? 'block' : 'none'
                      }}
                    />
                  </div>
                  
                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                      <span className="text-6xl font-bold text-white animate-pulse">{countdown}</span>
                    </div>
                  )}
                  
                  {/* Camera loading */}
                  {(!isCameraReady && isCameraOpen) && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-800">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mx-auto mb-3" />
                        <p className="text-emerald-400 text-sm">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img 
                  src={capturedPhoto} 
                  alt="Captured" 
                  className="absolute inset-0 w-full h-full object-cover" 
                  style={{ transform: 'scale(1.2)' }}
                />
              )}
            </div>

            {/* Face status feedback - same as verify page */}
            {isCameraReady && !capturedPhoto && (
              <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 ${
                faceStatus === 'ready' ? 'bg-emerald-500' :
                faceStatus === 'loading' ? 'bg-slate-600' :
                'bg-red-500'
              }`}>
                {faceStatus === 'loading' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading face detection...</span>
                  </>
                )}
                {faceStatus === 'no_face' && (
                  <>
                    <User className="h-3 w-3" />
                    <span>No face detected</span>
                  </>
                )}
                {faceStatus === 'too_far' && (
                  <>
                    <MoveVertical className="h-3 w-3" />
                    <span>Move closer to camera</span>
                  </>
                )}
                {faceStatus === 'not_centered' && (
                  <>
                    <User className="h-3 w-3" />
                    <span>Center your face in the oval</span>
                  </>
                )}
                {faceStatus === 'poor_lighting' && (
                  <>
                    <Sun className="h-3 w-3" />
                    <span>Improve lighting</span>
                  </>
                )}
                {faceStatus === 'blurry' && (
                  <>
                    <Focus className="h-3 w-3" />
                    <span>Hold still - image blurry</span>
                  </>
                )}
                {faceStatus === 'ready' && (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Ready to capture</span>
                  </>
                )}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!capturedPhoto ? (
              <Button
                onClick={capturePhoto}
                disabled={!isCameraReady || countdown !== null || faceStatus !== 'ready'}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg disabled:opacity-50"
              >
                {countdown !== null ? (
                  <span>Capturing...</span>
                ) : faceStatus !== 'ready' ? (
                  <span className="text-sm">Position your face correctly</span>
                ) : (
                  <>
                    <Camera className="h-5 w-5 mr-2" />
                    Capture Photo
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 h-12"
                  disabled={saving}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={savePhotoAndContinue}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Save & Continue
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Security Note */}
        <p className="text-center text-slate-500 text-xs mt-4">
          🔒 Your photo is securely stored for verification purposes only
        </p>
      </div>
    </div>
  )
}
