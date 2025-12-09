"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { X, RefreshCw } from "lucide-react"

interface LoginModalProps {
  open: boolean
  onClose: () => void
  defaultTab?: "demo" | "signin"
}

export function LoginModal({ open, onClose, defaultTab = "signin" }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<"demo" | "signin">(defaultTab)
  const [step, setStep] = useState<"email" | "otp">("email")
  const [demoStep, setDemoStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [demoEmail, setDemoEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [demoOtp, setDemoOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [demoCountdown, setDemoCountdown] = useState(0)
  const { setAuthSession } = useAuth() as any
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  useEffect(() => {
    if (demoCountdown > 0) {
      const t = setTimeout(() => setDemoCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [demoCountdown])

  useEffect(() => {
    if (!open) {
      setActiveTab("signin")
      setStep("email")
      setDemoStep("email")
      setEmail("")
      setDemoEmail("")
      setOtp("")
      setDemoOtp("")
      setCountdown(0)
      setDemoCountdown(0)
    } else {
      setActiveTab(defaultTab)
    }
  }, [open, defaultTab])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send OTP")
      }
      toast({ title: "OTP sent", description: "Check console for OTP in development" })
      setStep("otp")
      setCountdown(30)
    } catch (err: any) {
      toast({ title: "Login error", description: err?.message || "Failed to send OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/otp/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to verify OTP")
      }
      if (data.user && data.company) {
        setAuthSession(data.user, data.company)
      }
      toast({ title: "Welcome back!", description: "Login successful" })
      onClose()
      // ensure state commit is observed
      await Promise.resolve()
      router.push("/dashboard")
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to verify OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to resend OTP")
      toast({ title: "OTP resent", description: "Use the latest code" })
      setCountdown(30)
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to resend OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDemoSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoEmail || !demoEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setDemoLoading(true)
    try {
      // For demo, we'll use a mock OTP service or the same endpoint
      const res = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, demo: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send OTP")
      }
      toast({ 
        title: "Demo OTP sent", 
        description: "Check console for OTP in development mode" 
      })
      setDemoStep("otp")
      setDemoCountdown(30)
    } catch (err: any) {
      toast({ 
        title: "Demo OTP error", 
        description: err?.message || "Failed to send demo OTP", 
        variant: "destructive" 
      })
    } finally {
      setDemoLoading(false)
    }
  }

  const handleDemoVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoOtp || demoOtp.length < 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the verification code",
        variant: "destructive",
      })
      return
    }

    setDemoLoading(true)
    try {
      // For demo, we can either verify the OTP or just proceed to dashboard
      const res = await fetch("/api/otp/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, otp: demoOtp, demo: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to verify demo OTP")
      }
      
      // For demo mode, we might want to set a demo session
      if (data.user && data.company) {
        setAuthSession(data.user, data.company)
      }
      
      toast({ 
        title: "Demo access granted!", 
        description: "Welcome to the HireGenAI demo" 
      })
      onClose()
      await Promise.resolve()
      router.push("/dashboard")
    } catch (err: any) {
      toast({ 
        title: "Demo verification error", 
        description: err?.message || "Failed to verify demo OTP", 
        variant: "destructive" 
      })
    } finally {
      setDemoLoading(false)
    }
  }

  const handleDemoResend = async () => {
    if (demoCountdown > 0) return
    setDemoLoading(true)
    try {
      const res = await fetch("/api/otp/send-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, demo: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to resend demo OTP")
      toast({ title: "Demo OTP resent", description: "Use the latest code" })
      setDemoCountdown(30)
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to resend demo OTP", variant: "destructive" })
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">Sign in</DialogTitle>
          <DialogDescription className="text-slate-600">
            Choose how you want to explore HireGenAI
          </DialogDescription>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "demo" | "signin")} className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
              <TabsTrigger 
                value="signin" 
                className="text-sm font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="demo" 
                className="text-sm font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent"
              >
                Demo Sign In
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="px-6 pb-6 mt-0">
            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" 
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm font-medium text-slate-700">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-center font-mono tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" 
                  disabled={loading || otp.length < 4}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign in"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={handleResend} 
                  disabled={loading || countdown > 0}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-slate-700"
                  onClick={() => setStep("email")}
                >
                  ← Back to email
                </Button>
              </form>
            )}
          </TabsContent>

          {/* Demo Sign In Tab */}
          <TabsContent value="demo" className="px-6 pb-6 mt-0">
            {demoStep === "email" ? (
              <>
                {/* Info Card */}
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 mb-6">
                  <p className="font-semibold text-emerald-900 text-sm mb-1">Instant access to the product demo</p>
                  <p className="text-emerald-800/80 text-sm">
                    Use our shared demo credentials to explore the platform without creating an account.
                  </p>
                </div>

                <form onSubmit={handleDemoSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="demo-email" className="text-sm font-medium text-slate-700">Email</Label>
                    <Input
                      id="demo-email"
                      type="email"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    disabled={demoLoading || !demoEmail}
                  >
                    {demoLoading ? (
                      <>
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <form onSubmit={handleDemoVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-otp" className="text-sm font-medium text-slate-700">Enter Demo OTP</Label>
                  <Input
                    id="demo-otp"
                    type="text"
                    value={demoOtp}
                    onChange={(e) => setDemoOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="h-11 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 text-center font-mono tracking-widest"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-slate-500 text-center">
                    Check your terminal for the demo OTP
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium" 
                  disabled={demoLoading || demoOtp.length < 4}
                >
                  {demoLoading ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Continue to demo"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={handleDemoResend} 
                  disabled={demoLoading || demoCountdown > 0}
                >
                  {demoCountdown > 0 ? `Resend in ${demoCountdown}s` : "Resend Demo OTP"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-slate-700"
                  onClick={() => setDemoStep("email")}
                >
                  ← Back to email
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
