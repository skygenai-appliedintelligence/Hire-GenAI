"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Lock, RefreshCw, ArrowLeft } from "lucide-react"

export default function VerifyPage() {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const to = searchParams.get('to')
  const type = searchParams.get('type') as 'email' | 'phone'

  useEffect(() => {
    if (!to || !type) {
      router.push('/start')
      return
    }
  }, [to, type, router])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const payload = type === "email" ? { email: to, otp } : { phone: to, otp }
      
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to verify OTP')
      }
      
      toast({
        title: "Success",
        description: "Your account has been verified!",
      })
      
      // Redirect to set password or login
      router.push(`/set-password?userId=${data.userId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    
    setLoading(true)
    try {
      const payload = type === "email" ? { email: to } : { phone: to }
      
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend OTP')
      }
      
      setCountdown(30)
      toast({
        title: "OTP Resent",
        description: `Check your ${type} for the new verification code`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend OTP",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!to || !type) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <Link href="/">
            <CardTitle className="text-3xl font-bold mb-2">
              <span className="text-slate-800">Hire</span>
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">GenAI</span>
            </CardTitle>
          </Link>
          <CardDescription className="text-slate-600">
            Enter the verification code sent to your {type}
          </CardDescription>
          <p className="text-sm text-slate-500 mt-2">
            {to}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium text-slate-700">
                Verification Code
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-10 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 h-12 text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Check your {type} for the 6-digit OTP
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-medium" 
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0 || loading}
                className="text-sm text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
              
              <div>
                <Link
                  href="/start"
                  className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back to start
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
