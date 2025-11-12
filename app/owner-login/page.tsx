"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Loader } from "lucide-react"

type Step = "email" | "otp" | "restricted"

export default function OwnerLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [otpSent, setOtpSent] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/admin/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.restricted) {
          setStep("restricted")
          setError("")
        } else {
          setError(data.error || "Failed to send OTP")
        }
      } else {
        setSuccess("OTP sent to your email. Check your inbox.")
        setOtpSent(true)
        setStep("otp")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: otp,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to verify OTP")
      } else {
        setSuccess("Login successful! Redirecting...")
        setTimeout(() => {
          router.push("/admin-hiregenai/overview")
        }, 1500)
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep("email")
    setOtp("")
    setError("")
    setSuccess("")
    setOtpSent(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">H</span>
            </div>
            <span className="text-white font-bold text-lg">HireGenAI Admin</span>
          </div>
          <CardTitle className="text-white">Owner Login</CardTitle>
          <CardDescription className="text-slate-400">
            {step === "email" && "Enter your email to receive an OTP"}
            {step === "otp" && "Enter the OTP sent to your email"}
            {step === "restricted" && "Access Restricted"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-3 p-3 bg-emerald-900/20 border border-emerald-700 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-200">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  One-Time Password (OTP)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-2xl tracking-widest disabled:opacity-50"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Check your email for the 6-digit code
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-3 p-3 bg-emerald-900/20 border border-emerald-700 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-200">{success}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEmail}
                  disabled={loading}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === "restricted" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-200 mb-1">Access Restricted</h3>
                  <p className="text-sm text-red-200">
                    This admin panel is only accessible to the owner. If you believe this is an error, please contact support.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleBackToEmail}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Try Another Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
