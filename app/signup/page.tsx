"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Star,
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

// Country mapping: Display Name -> ISO Code
const countryOptions = [
  { name: "United States", code: "US" },
  { name: "India", code: "IN" },
  { name: "United Kingdom", code: "GB" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Singapore", code: "SG" },
  { name: "UAE", code: "AE" },
  { name: "Other", code: "XX" },
]

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Map steps <-> section slugs for readable URLs
  const stepToSection = (s: number) => (
    s === 1 ? 'company' :
    s === 2 ? 'contact' :
    s === 3 ? 'legal' :
    s === 4 ? 'admin' :
    'review'
  )
  const sectionToStep = (sec?: string | null) => {
    switch ((sec || '').toLowerCase()) {
      case 'company': return 1
      case 'contact': return 2
      case 'legal': return 3
      case 'admin': return 4
      case 'review': return 5
      default: return 1
    }
  }

  // Initialize step from URL on first render and when section changes
  useEffect(() => {
    const sec = searchParams?.get('section')
    const target = sectionToStep(sec)
    setStep(target)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Update URL whenever step changes (but avoid infinite loop)
  useEffect(() => {
    const currentSection = searchParams?.get('section')
    const expectedSection = stepToSection(step)
    
    // Only update URL if it doesn't match current step
    if (currentSection !== expectedSection) {
      router.replace(`/signup?section=${expectedSection}`, { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentSection = searchParams?.get('section')
      if (currentSection) {
        const newStep = sectionToStep(currentSection)
        if (newStep && newStep !== step) {
          setStep(newStep)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [searchParams, step])

  const next = () => {
    // Validate current step before proceeding
    if (step === 1) {
      // Company Information - all fields marked with * are required
      if (!form.companyName || !form.industry || !form.companySize) {
        alert('Please fill in all required fields marked with *')
        return
      }
    } else if (step === 2) {
      // Contact Information - all fields marked with * are required
      if (!form.street || !form.city || !form.state || !form.postalCode || !form.country) {
        alert('Please fill in all required fields marked with *')
        return
      }
    } else if (step === 3) {
      // Legal Information - Legal Company Name is required
      if (!form.legalCompanyName) {
        alert('Please fill in the Legal Company Name marked with *')
        return
      }
    } else if (step === 4) {
      // Admin Account - name and email are required
      if (!form.firstName || !form.lastName || !form.email) {
        alert('Please fill in all required fields marked with *')
        return
      }
    }
    setStep((s) => Math.min(totalSteps, s + 1))
  }
  const prev = () => {
    if (step > 1) {
      const newStep = step - 1
      setStep(newStep)
      const newSection = stepToSection(newStep)
      router.replace(`/signup?section=${newSection}`, { scroll: false })
    }
  }

  // Check if current step's required fields are filled
  const isStepValid = () => {
    if (step === 1) {
      // Company Information - all fields marked with * are required
      return !!(form.companyName && form.industry && form.companySize)
    } else if (step === 2) {
      // Contact Information - all fields marked with * are required
      return !!(form.street && form.city && form.state && form.postalCode && form.country)
    } else if (step === 3) {
      // Legal Information - Legal Company Name is required
      return !!form.legalCompanyName
    } else if (step === 4) {
      // Admin Account - name and email are required
      return !!(form.firstName && form.lastName && form.email)
    }
    return true // Step 5 doesn't need validation for Next button (it's the submit button)
  }

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
      // Just verify the OTP is valid, don't create user/company yet
      // That will happen in onSubmit with all the form data
      const res = await fetch('/api/otp/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp, purpose: 'signup' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to verify OTP')
      setOtpVerified(true)
      setCountdown(0)
    } catch (e) {
      console.error('Verify OTP failed', e)
      alert(e instanceof Error ? e.message : 'Failed to verify OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otpVerified) {
      alert('Please verify your email first')
      return
    }

    if (!form.agreeTos || !form.agreePrivacy) {
      alert('Please agree to Terms of Service and Privacy Policy')
      return
    }

    try {
      const res = await fetch('/api/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          otp: otp,
          // Step 1: Company Information
          companyName: form.companyName,
          industry: form.industry,
          companySize: form.companySize,
          website: form.website,
          companyDescription: form.companyDescription,
          // Step 2: Contact Information
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone,
          // Step 3: Legal Information
          legalCompanyName: form.legalCompanyName,
          taxId: form.taxId,
          registrationNumber: form.registrationNumber,
          // Step 4: Admin Account
          firstName: form.firstName,
          lastName: form.lastName,
          jobTitle: form.jobTitle,
          // Step 5: Consent
          agreeTos: form.agreeTos,
          agreePrivacy: form.agreePrivacy,
        })
      })

      const data = await res.json().catch(() => ({}))
      
      if (!res.ok || data?.error) {
        throw new Error(data?.error || 'Signup failed')
      }

      // Store session token if needed
      if (data.session?.refreshToken) {
        localStorage.setItem('refreshToken', data.session.refreshToken)
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      console.error('Signup error:', error)
      alert(error?.message || 'Failed to complete signup. Please try again.')
    }
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
                        {countryOptions.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
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
                      <div><span className="text-slate-500">Location:</span> {[form.city, form.state, countryOptions.find(c => c.code === form.country)?.name].filter(Boolean).join(', ') || "—"}</div>
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
              <Button type="button" className="sr-button-primary" onClick={next} disabled={!isStepValid()}>
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

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
            {/* Left Section - Brand Block */}
            <div className="md:col-span-3">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
              </p>
              <p className="text-slate-400 mb-6 text-sm font-medium">
                Email: <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@hire-genai.com</a>
              </p>
              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/hire-genai" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/demo-en" className="hover:text-emerald-400 transition-colors">
                    Try the Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      const element = document.getElementById('assessment');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-left w-full"
                  >
                    Assessment
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      const element = document.getElementById('faq');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-left w-full"
                  >
                    FAQs
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-emerald-400 transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book-meeting" className="hover:text-emerald-400 transition-colors">
                    Book a Meeting
                  </Link>
                </li>
                <li>
                  <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Section - Badges Block */}
            <div className="md:col-span-3">
              <div className="space-y-4">
                {/* Trustpilot Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
                </div>

                {/* GDPR Compliant Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                  </div>
                  <p className="text-xs text-slate-400">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2024 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
