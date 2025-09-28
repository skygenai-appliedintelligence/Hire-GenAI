"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  MapPin,
  FileText,
  User2,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  Home,
  Mail,
  Lock,
  RefreshCw,
} from "lucide-react"

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Hospitality",
  "Other",
]

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
]

const countries = ["United States", "India", "United Kingdom", "Canada", "Australia", "Germany", "France", "Other"]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    // step 1
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
    companyDescription: "",
    // step 2
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    // step 3
    legalCompanyName: "",
    taxId: "",
    registrationNumber: "",
    // step 4
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    // step 5 - consent
    agreeTos: false,
    agreePrivacy: false,
    agreeMarketing: false,
  })

  // OTP state (Step 4)
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpLoading, setOtpLoading] = useState(false)

  const totalSteps = 5
  const progressPct = useMemo(() => Math.round(((step - 1) / (totalSteps - 1)) * 100), [step])

  const next = () => setStep((s) => Math.min(totalSteps, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  const onField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value
    setForm((f) => ({ ...f, [key]: value as any }))
  }

  // Countdown timer for resend
  React.useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  // If verified, stop any countdown and freeze controls
  React.useEffect(() => {
    if (otpVerified && countdown !== 0) {
      setCountdown(0)
    }
  }, [otpVerified, countdown])

  // Handlers for OTP
  const handleSendOtp = async () => {
    if (!form.email || !form.firstName || !form.lastName) return
    setOtpLoading(true)
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim()
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, fullName, companyName: form.companyName })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to send OTP')
      setOtpSent(true)
      setCountdown(30)
    } catch (e) {
      console.error('Send OTP failed', e)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || !form.email) return
    setOtpLoading(true)
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim()
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp, companyName: form.companyName, fullName })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to verify OTP')
      setOtpVerified(true)
      setCountdown(0)
    } catch (e) {
      console.error('Verify OTP failed', e)
    } finally {
      setOtpLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: integrate with your OTP/signup flow if needed
    console.log("Signup data", form)
    router.push("/dashboard")

  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <nav className="flex items-center text-sm text-slate-600 gap-2">
            <Home className="w-4 h-4" />
            <Link href="/" className="hover:text-emerald-600">Home</Link>
            <span className="text-slate-400">/</span>
            <span className="font-bold">
              <Link href="/signup" className="hover:text-emerald-600">
                <span className="text-slate-800">Hire</span>
                <span className="sr-text-gradient">GenAI</span>
              </Link>
            </span>
          </nav>
          <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700 bg-emerald-50">Step {step} of {totalSteps}</Badge>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Company Registration</h1>
        <p className="text-slate-600 mt-1">Complete all steps to set up your HireGenAI account</p>

        <form onSubmit={onSubmit} className="mt-6">
          {step === 1 && (
            <div className="max-w-2xl md:max-w-3xl mx-auto">
            <Card className="sr-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Company Information</CardTitle>
                <CardDescription>Tell us about your company and what you do</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" value={form.companyName} onChange={onField("companyName")} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                      <SelectTrigger id="industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {industries.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select value={form.companySize} onValueChange={(v) => setForm((f) => ({ ...f, companySize: v }))}>
                      <SelectTrigger id="companySize"><SelectValue placeholder="Select company size" /></SelectTrigger>
                      <SelectContent>
                        {companySizes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" placeholder="https://www.example.com" value={form.website} onChange={onField("website")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea id="companyDescription" placeholder="Brief description of your company and what you do..." value={form.companyDescription} onChange={onField("companyDescription")} />
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl md:max-w-3xl mx-auto">
            <Card className="sr-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Contact Information</CardTitle>
                <CardDescription>Where is your company located?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input id="street" value={form.street} onChange={onField("street")} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} onChange={onField("city")} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input id="state" value={form.state} onChange={onField("state")} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP/Postal Code *</Label>
                    <Input id="postalCode" value={form.postalCode} onChange={onField("postalCode")} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select value={form.country} onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}>
                      <SelectTrigger id="country"><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" value={form.phone} onChange={onField("phone")} />
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-2xl md:max-w-3xl mx-auto">
            <Card className="sr-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl">Legal Information</CardTitle>
                <CardDescription>Legal details for compliance and verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="legalCompanyName">Legal Company Name *</Label>
                  <Input id="legalCompanyName" value={form.legalCompanyName} onChange={onField("legalCompanyName")} required />
                  <p className="text-xs text-slate-500">This should match your official business registration</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN</Label>
                    <Input id="taxId" value={form.taxId} onChange={onField("taxId")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Business Registration Number</Label>
                    <Input id="registrationNumber" value={form.registrationNumber} onChange={onField("registrationNumber")} />
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                  This information is used for verification purposes and is kept secure and confidential.
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-2xl md:max-w-3xl mx-auto">
            <Card className="sr-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <User2 className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Admin Account</CardTitle>
                <CardDescription>Set up the primary administrator account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={form.firstName} onChange={onField("firstName")} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={form.lastName} onChange={onField("lastName")} required />
                  </div>
                </div>
                {/* Email + OTP Combined */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={form.email} onChange={onField("email")} required disabled={otpVerified} />
                  {!otpVerified && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                      <div className="md:col-span-3">
                        <p className="text-xs text-slate-500">We'll send a verification code to this email.</p>
                      </div>
                      <div className="md:col-span-1">
                        <Button type="button" variant="outline" disabled={otpLoading || countdown > 0 || !form.email} onClick={handleSendOtp} className="w-full">
                          {otpLoading && countdown === 0 ? (
                            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Send</>
                          ) : countdown > 0 ? (
                            <>Resend {countdown}s</>
                          ) : (
                            <>Send Code</>
                          )}
                        </Button>
                      </div>
                      <div className="md:col-span-1">
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                          <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" maxLength={6} className="pl-9 text-center tracking-widest font-mono" />
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <Button type="button" disabled={otpLoading || otp.length < 4} onClick={handleVerifyOtp} className="w-full">
                          {otpLoading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {otpVerified ? (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">Email verified successfully.</div>
                  ) : (otpSent ? (
                    <p className="text-xs text-slate-500">Enter the 6-digit code we sent to {form.email}. In development, check terminal logs for the code.</p>
                  ) : null)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" placeholder="CEO, HR Director, etc." value={form.jobTitle} onChange={onField("jobTitle")} />
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {step === 5 && (
            <div className="max-w-2xl md:max-w-3xl mx-auto">
            <Card className="sr-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Review & Complete</CardTitle>
                <CardDescription>Review your information and complete registration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-3">Company Summary</h3>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div><span className="text-slate-500">Company:</span> {form.companyName || "—"}</div>
                      <div><span className="text-slate-500">Industry:</span> {form.industry || "—"}</div>
                      <div><span className="text-slate-500">Size:</span> {form.companySize || "—"}</div>
                      <div><span className="text-slate-500">Location:</span> {[form.city, form.state].filter(Boolean).join(', ') || "—"}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-3">Administrator</h3>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div><span className="text-slate-500">Name:</span> {[form.firstName, form.lastName].filter(Boolean).join(' ') || "—"}</div>
                      <div><span className="text-slate-500">Email:</span> {form.email || "—"}</div>
                      <div><span className="text-slate-500">Title:</span> {form.jobTitle || "Not specified"}</div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <input id="tos" type="checkbox" className="h-4 w-4" checked={form.agreeTos} onChange={(e) => setForm(f => ({...f, agreeTos: e.target.checked}))} />
                    <label htmlFor="tos">I agree to the <a className="text-emerald-600 hover:underline" href="#">Terms of Service</a> and <a className="text-emerald-600 hover:underline" href="#">Privacy Policy</a> *</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <input id="privacy" type="checkbox" className="h-4 w-4" checked={form.agreePrivacy} onChange={(e) => setForm(f => ({...f, agreePrivacy: e.target.checked}))} />
                    <label htmlFor="privacy">I consent to the processing of my personal data as described in the Privacy Policy *</label>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <input id="marketing" type="checkbox" className="h-4 w-4" checked={form.agreeMarketing} onChange={(e) => setForm(f => ({...f, agreeMarketing: e.target.checked}))} />
                    <label htmlFor="marketing">I would like to receive product updates and marketing communications (optional)</label>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={prev} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            {step < totalSteps ? (
              <Button type="button" className="sr-button-primary" onClick={next}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" className="sr-button-primary" disabled={!form.agreeTos || !form.agreePrivacy}>
                Complete Registration
              </Button>
            )}
          </div>
        </form>

        <div className="text-center text-sm text-slate-500 mt-8">
          Need help? <a className="text-emerald-600 hover:underline" href="#">Contact our support team</a>
        </div>
      </div>
    </div>
  )
}
