"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Mail, User, Building2, Lock, ArrowRight, RefreshCw } from "lucide-react"

interface SignupModalProps {
  open: boolean
  onClose: () => void
}

export function SignupModal({ open, onClose }: SignupModalProps) {
  const [step, setStep] = useState<"details" | "otp">("details")
  const [formData, setFormData] = useState({
    email: "",
    companyName: "",
    fullName: "",
    otp: "",
  })
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const { toast } = useToast()
  const { signInWithEmail } = useAuth()

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const onChange = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName.trim() || !formData.companyName.trim() || !formData.email.includes("@")) {
      toast({ title: "Missing details", description: "Please fill in name, company and a valid email", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, fullName: formData.fullName, companyName: formData.companyName }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to send OTP")
      setStep("otp")
      setCountdown(30)
      toast({ title: "OTP sent", description: `Check the terminal for your code` })
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to send OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.otp.length < 4) {
      toast({ title: "Invalid OTP", description: "Enter the 6-digit code", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp: formData.otp, companyName: formData.companyName, fullName: formData.fullName }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to verify OTP")

      // Update client session
      const result = await signInWithEmail(formData.email)
      if (result.error) throw new Error(result.error.message)

      toast({ title: "Account created", description: "Welcome to HireGenAI" })
        onClose()
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
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, fullName: formData.fullName, companyName: formData.companyName }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to resend OTP")
      setCountdown(30)
      toast({ title: "OTP resent", description: "Check the terminal for the new code" })
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to resend OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Join HireGenAI</DialogTitle>
          <DialogDescription className="text-center">
            {step === "details" ? "Create your account and start hiring smarter" : `Verify your email: ${formData.email}`}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input id="fullName" type="text" value={formData.fullName} onChange={onChange("fullName")} className="pl-9" required />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input id="companyName" type="text" value={formData.companyName} onChange={onChange("companyName")} className="pl-9" required />
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input id="email" type="email" value={formData.email} onChange={onChange("email")} className="pl-9" required />
              </div>
          </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending OTP...</>) : (<>Continue<ArrowRight className="h-4 w-4 ml-2" /></>)}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input id="otp" type="text" value={formData.otp} onChange={onChange("otp")} className="pl-9 text-center tracking-widest font-mono" placeholder="000000" maxLength={6} required />
          </div>
              <p className="text-xs text-slate-500 text-center">Check the terminal for your 6-digit OTP</p>
          </div>

            <Button type="submit" className="w-full" disabled={loading || formData.otp.length < 4}>
              {loading ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Verifying...</>) : ("Create Account")}
          </Button>

            <div className="text-center space-y-2">
              <button type="button" onClick={handleResend} disabled={countdown > 0 || loading} className="text-emerald-600 hover:text-emerald-700 disabled:text-slate-400">
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
              <div>
                <button type="button" onClick={() => setStep("details")} className="text-slate-500 hover:text-slate-700">
                  ← Back to details
                </button>
              </div>
            </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
