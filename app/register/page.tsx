"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Mail, Lock, User, Building2, ArrowRight, RefreshCw } from "lucide-react"

export default function RegisterPage() {
  const [step, setStep] = useState<"details" | "otp">("details")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { signUp, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (!fullName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter your full name",
        variant: "destructive",
      })
      return
    }

    if (!companyName.trim()) {
      toast({
        title: "Missing Company",
        description: "Please enter your company name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, companyName })
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }
      
      setOtpSent(true)
      setStep("otp")
      setCountdown(30) // 30 second countdown
      
      toast({
        title: "OTP Sent",
        description: `Check your terminal for the verification code sent to ${email}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length < 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, companyName, fullName })
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to verify OTP')
      }

      // Update auth context with user data
      const result = await signUp(email, Math.random().toString(36).slice(2, 10), companyName, fullName)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error?.message ?? "Registration failed",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Account created successfully! Welcome to HireGenAI.",
        })
      }
    } catch (error) {
      console.error("Registration error:", error)
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
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, companyName })
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to resend OTP')
      }
      
      setCountdown(30)
      toast({
        title: "OTP Resent",
        description: `Check your terminal for the new verification code`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBackToDetails = () => {
    setStep("details")
    setOtpSent(false)
    setOtp("")
    setCountdown(0)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
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
            {step === "details" 
              ? "Create your recruitment automation account" 
              : `Verify your email: ${email}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === "details" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 h-12"
                    placeholder="Enter your full name"
                required
              />
            </div>
              </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 h-12"
                    placeholder="Enter your email address"
                required
              />
            </div>
              </div>

            <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                  Company Name
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 h-12"
                    placeholder="Enter your company name"
                required
              />
            </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-medium" 
                disabled={loading || !email || !fullName.trim() || !companyName.trim()}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
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
                  Check your terminal for the 6-digit OTP
                </p>
            </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-medium" 
                disabled={loading || otp.length < 4}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
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
                  <button
                    type="button"
                    onClick={handleBackToDetails}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    ← Back to details
                  </button>
                </div>
              </div>
          </form>
          )}

          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
