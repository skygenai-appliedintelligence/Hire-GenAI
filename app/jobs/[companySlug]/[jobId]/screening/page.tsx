"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, CheckCircle, XCircle, Mail, Loader2 } from "lucide-react"

interface ScreeningQuestions {
  enabled: boolean
  overall_experience: number | null
  primary_skill: string | null
  current_location: string | null
  nationality: string | null
  visa_required: boolean
  language_proficiency: string
  current_monthly_salary: number | null
}

interface JobInfo {
  id: string
  title: string
  company_name: string
  location: string
  screening_questions: ScreeningQuestions | null
}

export default function CandidateScreeningPage() {
  const router = useRouter()
  const params = useParams()
  const companySlug = params.companySlug as string
  const jobId = params.jobId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState<JobInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ qualified: boolean; reason: string } | null>(null)

  // Email OTP verification state
  const [emailVerified, setEmailVerified] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  // Form state - nationality defaults to 'indian', visa_required defaults to 'no'
  const [answers, setAnswers] = useState({
    // Basic candidate details
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    // Screening questions
    overall_experience: "",
    primary_skill_experience: "",
    current_location: "",
    nationality: "indian",
    visa_required: "no",
    language_proficiency: "intermediate",
    current_monthly_salary: "",
  })

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/screening`)
        const data = await res.json()
        
        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to load job details")
          return
        }

        setJob(data.job)
        
        // If no screening questions, redirect directly to apply page
        if (!data.job.screening_questions?.enabled) {
          router.replace(`/apply/${companySlug}/${jobId}`)
          return
        }
      } catch (err) {
        setError("Failed to load job details")
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId, companySlug, router])

  // Send OTP to email
  const handleSendOtp = async () => {
    if (!answers.email) {
      setOtpError("Please enter your email address first")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(answers.email)) {
      setOtpError("Please enter a valid email address")
      return
    }

    setSendingOtp(true)
    setOtpError(null)

    try {
      const res = await fetch('/api/screening/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: answers.email, jobId })
      })

      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Failed to send OTP')
        return
      }

      setOtpSent(true)
      setOtpError(null)
    } catch (err) {
      setOtpError('Failed to send OTP. Please try again.')
    } finally {
      setSendingOtp(false)
    }
  }

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP")
      return
    }

    setVerifyingOtp(true)
    setOtpError(null)

    try {
      const res = await fetch('/api/screening/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: answers.email, otp, jobId })
      })

      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Invalid OTP')
        return
      }

      setEmailVerified(true)
      setOtpError(null)
    } catch (err) {
      setOtpError('Failed to verify OTP. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if email is verified
    if (!emailVerified) {
      setError("Please verify your email address before submitting")
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch(`/api/jobs/${jobId}/screening/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            first_name: answers.first_name,
            last_name: answers.last_name,
            email: answers.email,
            phone: answers.phone
          },
          answers: {
            overall_experience: answers.overall_experience ? Number(answers.overall_experience) : null,
            primary_skill_experience: answers.primary_skill_experience || null,
            current_location: answers.current_location || null,
            nationality: answers.nationality || null,
            visa_required: answers.visa_required === "yes",
            language_proficiency: answers.language_proficiency,
            current_monthly_salary: answers.current_monthly_salary ? Number(answers.current_monthly_salary) : null,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to submit answers")
        return
      }

      setResult({
        qualified: data.qualified,
        reason: data.reason,
      })

      // If qualified, redirect to apply page with candidate ID after short delay
      if (data.qualified) {
        setTimeout(() => {
          router.push(`/apply/${companySlug}/${jobId}?candidateId=${data.candidateId}`)
        }, 2000)
      }
    } catch (err) {
      setError("Failed to submit answers")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  // Error state
  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Result screen
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          {result.qualified ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">You are Eligible!</h2>
              <p className="text-slate-600 mb-6">Congratulations! You meet all the screening requirements for this position.</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-emerald-700 font-medium mb-2">What happens next:</p>
                <ul className="text-xs text-emerald-600 space-y-1 text-left">
                  <li>• Redirecting to full application form</li>
                  <li>• Your details will be pre-filled</li>
                  <li>• Complete your application</li>
                </ul>
              </div>
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                <span className="text-sm font-medium">Redirecting to application...</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Not Eligible</h2>
              <p className="text-slate-600 text-sm mb-6">{result.reason}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-700 font-medium">Don't worry!</p>
                <p className="text-xs text-amber-600 mt-1">You can browse other jobs that might be a better fit.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push(`/jobs/${companySlug}/${jobId}`)}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  Back to Job
                </Button>
                <Link href="/">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    Browse Jobs
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const screening = job?.screening_questions

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header with Job Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Before You Apply</h1>
          <p className="text-slate-600 mt-2">Please answer these questions to check if you are eligible for this position.</p>
          {job && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="font-medium text-emerald-800">{job.title}</p>
              <p className="text-sm text-emerald-600">{job.company_name} • {job.location}</p>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Candidate Details */}
            <section>
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Your Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={answers.first_name}
                    onChange={(e) => setAnswers({ ...answers, first_name: e.target.value })}
                    className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={answers.last_name}
                    onChange={(e) => setAnswers({ ...answers, last_name: e.target.value })}
                    className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                    required
                    disabled={submitting}
                  />
                </div>
                {/* Email and OTP in same row */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="email">
                      Email * 
                      {emailVerified && <span className="text-emerald-600 text-xs ml-2 font-medium">✓ Verified</span>}
                    </Label>
                    {otpSent && !emailVerified && (
                      <Label htmlFor="otp" className="text-right">
                        OTP *
                      </Label>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className={`flex-1 ${otpSent && !emailVerified ? 'w-1/2' : 'w-full'}`}>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={answers.email}
                          onChange={(e) => {
                            setAnswers({ ...answers, email: e.target.value })
                            if (emailVerified || otpSent) {
                              setEmailVerified(false)
                              setOtpSent(false)
                              setOtp("")
                              setOtpError(null)
                            }
                          }}
                          className={`border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400 ${emailVerified ? 'bg-emerald-50 border-emerald-300' : ''}`}
                          required
                          disabled={submitting || emailVerified}
                        />
                        {!emailVerified && !otpSent && (
                          <Button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={sendingOtp || !answers.email}
                            className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap px-3"
                            size="sm"
                          >
                            {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* OTP Input - inline with email */}
                    {otpSent && !emailVerified && (
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <Input
                            id="otp"
                            type="text"
                            placeholder="6-digit code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="border-emerald-300 focus:border-emerald-600 focus:ring-emerald-600 text-center tracking-widest font-mono"
                            maxLength={6}
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otp.length !== 6}
                            className="bg-emerald-600 hover:bg-emerald-700 px-3"
                            size="sm"
                          >
                            {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      {otpError && <p className="text-xs text-red-600">{otpError}</p>}
                    </div>
                    <div>
                      {otpSent && !emailVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          className="text-xs text-emerald-600 hover:text-emerald-700 underline"
                        >
                          Resend code
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone - always visible */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={answers.phone}
                    onChange={(e) => setAnswers({ ...answers, phone: e.target.value })}
                    className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
            </section>

            {/* Experience Section */}
            <section>
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Experience & Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="overallExp">Total Years of Experience *</Label>
                  <Input
                    id="overallExp"
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    value={answers.overall_experience}
                    onChange={(e) => setAnswers({ ...answers, overall_experience: e.target.value })}
                    className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                    required
                    disabled={submitting}
                  />
                  {screening?.overall_experience && (
                    <p className="text-xs text-slate-500">Required: {screening.overall_experience}+ years</p>
                  )}
                </div>

                {screening?.primary_skill && (
                  <div className="space-y-2">
                    <Label htmlFor="primarySkill">Experience in Required Skills *</Label>
                    <Input
                      id="primarySkill"
                      placeholder="UiPath - 3 years"
                      value={answers.primary_skill_experience}
                      onChange={(e) => setAnswers({ ...answers, primary_skill_experience: e.target.value })}
                      className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                      required
                      disabled={submitting}
                    />
                    <p className="text-xs text-slate-500">{screening.primary_skill}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Location & Nationality Section */}
            <section>
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Location & Eligibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Current Location *</Label>
                  <Input
                    id="location"
                    placeholder="Bangalore, India"
                    value={answers.current_location}
                    onChange={(e) => setAnswers({ ...answers, current_location: e.target.value })}
                    className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Select
                    value={answers.nationality}
                    onValueChange={(value) => setAnswers({ ...answers, nationality: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="us">US Citizen</SelectItem>
                      <SelectItem value="uk">UK Citizen</SelectItem>
                      <SelectItem value="eu">EU Citizen</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visa */}
              <div className="mt-4 space-y-2">
                <Label>Do you require visa sponsorship? *</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors duration-200">
                    <input
                      type="radio"
                      name="visa"
                      value="yes"
                      checked={answers.visa_required === "yes"}
                      onChange={(e) => setAnswers({ ...answers, visa_required: e.target.value })}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-600"
                      disabled={submitting}
                    />
                    <span className="text-sm font-medium">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors duration-200">
                    <input
                      type="radio"
                      name="visa"
                      value="no"
                      checked={answers.visa_required === "no"}
                      onChange={(e) => setAnswers({ ...answers, visa_required: e.target.value })}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-600"
                      disabled={submitting}
                    />
                    <span className="text-sm font-medium">No</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Language & Salary Section */}
            <section>
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">English Proficiency *</Label>
                  <Select
                    value={answers.language_proficiency}
                    onValueChange={(value) => setAnswers({ ...answers, language_proficiency: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="fluent">Fluent</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                    </SelectContent>
                </Select>
                  {screening?.language_proficiency && (
                    <p className="text-xs text-slate-500">Required: {screening.language_proficiency} or above</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Current Monthly Salary (Optional)</Label>
                  <Input
                    id="salary"
                    type="number"
                    min="0"
                    placeholder="e.g., 150000"
                    value={answers.current_monthly_salary}
                    onChange={(e) => setAnswers({ ...answers, current_monthly_salary: e.target.value })}
                    className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400"
                    disabled={submitting}
                  />
                  <p className="text-xs text-slate-500">Used only to check eligibility.</p>
                </div>
              </div>
            </section>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700">
                <strong>Note:</strong> These questions are used only to check eligibility. If you meet the requirements, you will be redirected to the full application form.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-base py-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Checking Eligibility...
                  </>
                ) : (
                  <>
                    Continue to Application
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* What happens next */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Your answers will be checked against job requirements</li>
            <li>• If eligible, you'll proceed to the full application form</li>
            <li>• Your details will be pre-filled for convenience</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
