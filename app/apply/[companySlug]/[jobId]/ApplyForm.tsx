'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { AIInterviewService, type CandidateApplication } from '@/lib/ai-interview-service'
import { Loader2, Send, Plus, X } from 'lucide-react'

export default function ApplyForm({ job, isJobOpen = true }: { job: any; isJobOpen?: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const appRootRef = useRef<HTMLDivElement | null>(null)
  const [resumeMeta, setResumeMeta] = useState<{ name: string; size: number; type: string; url?: string } | null>(null)
  const [uploadedResume, setUploadedResume] = useState<any>(null)
  const [parsedResume, setParsedResume] = useState<any>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsingOpen, setParsingOpen] = useState(false)
  const [parseStep, setParseStep] = useState<'idle' | 'uploading' | 'parsing' | 'evaluating' | 'finalizing'>('idle')
  const [formData, setFormData] = useState({
    // General info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    expectedCurrency: 'USD',
    expectedSalary: '',
    location: '',
    // Experience
    yearsOfExperience: '',
    technicalSkills: '',
    // Cover letter
    coverLetter: '',
    // Additional info
    linkedinUrl: '',
    portfolioUrl: '',
    availableStartDate: '',
    relocate: false,
    // Legacy fields kept for compatibility with evaluation & pipeline
    fullName: '',
    whyInterested: '',
    impactfulProject: '',
    availability: '',
  })

  // Language and proficiency state
  const [languages, setLanguages] = useState<Array<{ language: string; proficiency: string }>>([{ language: '', proficiency: '' }])

  const languageOptions = [
    'English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese (Mandarin)', 'Chinese (Cantonese)',
    'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian', 'Dutch', 'Turkish',
    'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
    'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Polish', 'Ukrainian', 'Swedish',
    'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Czech', 'Romanian', 'Hungarian'
  ]

  const proficiencyLevels = [
    { value: 'native', label: 'Native / Bilingual' },
    { value: 'fluent', label: 'Fluent' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'basic', label: 'Basic' },
  ]

  const addLanguage = () => {
    setLanguages([...languages, { language: '', proficiency: '' }])
  }

  const removeLanguage = (index: number) => {
    if (languages.length > 1) {
      setLanguages(languages.filter((_, i) => i !== index))
    }
  }

  const updateLanguage = (index: number, field: 'language' | 'proficiency', value: string) => {
    const updated = [...languages]
    updated[index][field] = value
    setLanguages(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Ensure parsing overlay remains visible during upload/parse
    if (resumeFile || resumeMeta) {
      setParsingOpen(true)
      // Determine initial step: if we have a local file to upload, start at uploading; else go to parsing
      setParseStep(resumeFile ? 'uploading' : 'parsing')
    }

    try {
      const fullName = formData.fullName || `${formData.firstName} ${formData.lastName}`.trim()
      // Validate all inputs except cover letter
      const missing: string[] = []
      if (!formData.firstName.trim()) missing.push('First name')
      if (!formData.lastName.trim()) missing.push('Last name')
      if (!formData.email.trim()) missing.push('Email')
      if (!formData.phone.trim()) missing.push('Phone')
      // Expected salary and location
      if (!formData.expectedSalary.trim()) missing.push('Expected salary')
      if (!formData.location.trim()) missing.push('Location')
      // Additional info (LinkedIn and Portfolio optional)
      if (!formData.availableStartDate.trim()) missing.push('Available start date')
      // Resume required
      if (!resumeFile && !resumeMeta) missing.push('Resume')

      if (!fullName) missing.push('Full name')

      if (missing.length > 0) {
        toast({ title: 'Missing Information', description: `Please fill: ${missing.join(', ')}.`, variant: 'destructive' })
        setLoading(false)
        return
      }

      // Upload resume first
      let resumeUploadResult: any = null
      let parsedResumeData: any = null
      
      if (resumeFile) {
        try {
          const candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const fd = new FormData()
          fd.append('file', resumeFile)
          fd.append('candidateId', candidateId)

          const res = await fetch('/api/resumes/upload', { 
            method: 'POST', 
            body: fd 
          })
          
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err?.error || 'Failed to upload resume')
          }
          
          resumeUploadResult = await res.json()
          setUploadedResume(resumeUploadResult)
          
          toast({ 
            title: 'Resume uploaded successfully!', 
            description: `${resumeUploadResult.filename} uploaded to cloud storage` 
          })

          // Note: We'll parse the resume AFTER application is created
          // so we can save the parsed text to the applications table
        } catch (err: any) {
          console.error('Resume upload failed:', err)
          toast({ title: 'Upload failed', description: err?.message || 'Could not upload resume. Please try again.', variant: 'destructive' })
          setLoading(false)
          setParsingOpen(false)
          return
        }
      }

      // Use the candidate ID from resume upload
      const candidateId = resumeUploadResult?.candidateId || `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const application: CandidateApplication = {
        id: candidateId,
        jobId: job.id,
        ...formData,
        fullName,
        submittedAt: new Date().toISOString(),
        status: 'applied',
        resumeUrl: resumeUploadResult?.fileUrl,
        // Include parsed resume data for evaluation
        parsedResume: parsedResumeData,
      }

      // Persist into DB applications table (server-side) so analytics can use real data
      try {
        // Filter out empty language entries
        const validLanguages = languages.filter(l => l.language && l.proficiency)
        
        const submitPayload = {
          jobId: job.id,
          candidate: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            fullName,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
            expectedSalary: formData.expectedSalary,
            salaryCurrency: formData.expectedCurrency,
            salaryPeriod: 'month',
            linkedinUrl: formData.linkedinUrl || null,
            portfolioUrl: formData.portfolioUrl || null,
            availableStartDate: formData.availableStartDate || null,
            willingToRelocate: formData.relocate || false,
            languages: validLanguages,
          },
          resume: resumeUploadResult?.fileUrl
            ? {
                url: resumeUploadResult.fileUrl,
                name: resumeUploadResult.filename || resumeMeta?.name || 'resume',
                type: resumeFile?.type || resumeMeta?.type,
                size: resumeFile?.size || resumeMeta?.size,
              }
            : (resumeMeta
                ? {
                    url: (resumeMeta as any).url, // optional if available
                    name: resumeMeta.name,
                    type: resumeMeta.type,
                    size: resumeMeta.size,
                  }
                : null),
          source: 'direct_application',
          meta: {
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          },
        }

        const submitRes = await fetch('/api/applications/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitPayload),
        })
        const submitData = await submitRes.json().catch(() => ({}))
        if (!submitRes.ok || submitData?.error) {
          console.warn('Application DB submit failed:', submitData?.error)
        }

        // Parse and evaluate resume if uploaded; otherwise evaluate using form fields
        let resumeTextForEval = ''
        if (resumeFile && submitData?.applicationId) {
          try {
            // Step 1: Parse resume to extract text
            setParseStep('parsing')
            const parseFormData = new FormData()
            if (resumeFile) {
              parseFormData.append('file', resumeFile)
            }
            parseFormData.append('applicationId', submitData.applicationId)
            if (submitData.candidateId) {
              parseFormData.append('candidateId', submitData.candidateId)
            }

            const parseRes = await fetch('/api/resumes/parse', {
              method: 'POST',
              body: parseFormData,
            })

            if (parseRes.ok) {
              const parseData = await parseRes.json()
              const resumeText = parseData.parsed?.rawText || ''
              resumeTextForEval = resumeText

              // Keep parsed object for UI if needed
              parsedResumeData = parseData.parsed
              setParsedResume(parsedResumeData)
            }
          } catch (err) {
            console.warn('Resume parsing failed (non-fatal):', err)
          }
        }

        // If parsing produced little/empty text, build a fallback from form fields to avoid 0 scores
        if (!resumeTextForEval || resumeTextForEval.trim().length < 50) {
          const fallbackParts = [
            `[Name] ${fullName}`,
            `[Email] ${formData.email}`,
            `[Phone] ${formData.phone}`,
            `[Location] ${formData.location || ''}`,
            `[Technical Skills] ${formData.technicalSkills || ''}`,
            `[Why Interested] ${formData.whyInterested || ''}`,
            `[Impactful Project] ${formData.impactfulProject || ''}`,
          ]
          resumeTextForEval = fallbackParts.filter(Boolean).join('\n')
        }

        // Step 2: Evaluate CV against JD using a balanced rubric (always run; JD-based scoring)
        try {
          setParseStep('evaluating')
          console.log('[Application] Calling evaluation API with companyId:', job?.company_id)
          console.log('[Application] Job object keys:', Object.keys(job || {}))
          const evalRes = await fetch('/api/applications/evaluate-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId: submitData?.applicationId,
              resumeText: resumeTextForEval,
              jobDescription: job?.description || '',
              passThreshold: 40,
              companyId: job?.company_id,
            })
          })

          if (evalRes.ok) {
            const evalData = await evalRes.json()
            console.log('[Application] CV Evaluation:', evalData.evaluation)

            // Attach evaluation to parsedResumeData if present for any downstream UI
            if (parsedResumeData) {
              parsedResumeData = { ...parsedResumeData, evaluation: evalData.evaluation }
              setParsedResume(parsedResumeData)
            }
          }
          setParseStep('finalizing')
        } catch (err) {
          console.warn('CV evaluation failed (non-fatal):', err)
        }
      } catch (err) {
        console.warn('Application DB submit error:', err)
      }

      // All applications are accepted regardless of evaluation
      application.status = 'applied'

      // Save to localStorage
      const candidatesKey = 'candidates'
      const existingCandidates = JSON.parse(localStorage.getItem(candidatesKey) || '[]')
      const newCandidates = [...existingCandidates.filter((c: any) => c.id !== candidateId), application]
      localStorage.setItem(candidatesKey, JSON.stringify(newCandidates))

      // Log activity
      const activityLog = {
        id: `activity_${Date.now()}`,
        company_id: job?.company_id || 'company_1',
        action: 'New Application Received',
        details: {
          candidate_name: fullName,
          job_title: job?.title || 'Position',
          status: 'applied',
          source: 'direct_application',
        },
        created_at: new Date().toISOString(),
      }

      const activityKey = `activity_logs_${job?.company_id || 'company_1'}`
      const existingActivity = JSON.parse(localStorage.getItem(activityKey) || '[]')
      existingActivity.push(activityLog)
      localStorage.setItem(activityKey, JSON.stringify(existingActivity))

      toast({ 
        title: 'Application Submitted Successfully! 🎉', 
        description: `Redirecting to confirmation page...`,
        duration: 2000
      })

      // Redirect to success page
      setTimeout(() => {
        const companySlug = window.location.pathname.split('/')[2] || 'tata'
        router.push(`/apply/success?jobTitle=${encodeURIComponent(job?.title || 'this position')}&company=${companySlug}`)
      }, 1500)
    } catch (error: any) {
      console.error('Application submission error:', error)
      toast({ title: 'Error', description: error.message || 'Failed to submit application. Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
      setParsingOpen(false)
      setParseStep('idle')
    }
  }

  // Body scroll lock & background inert handling
  useEffect(() => {
    if (parsingOpen) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // Set inert on background container for assistive tech and pointer events
      const root = appRootRef.current
      if (root) root.setAttribute('inert', '')
      return () => {
        document.body.style.overflow = original
        if (root) root.removeAttribute('inert')
      }
    }
  }, [parsingOpen])

  // If overlay was opened optimistically on file select but no submit is running,
  // auto-close after a short delay to prevent getting stuck pre-submit.
  useEffect(() => {
    if (parsingOpen && !loading) {
      const t = setTimeout(() => {
        setParsingOpen(false)
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [parsingOpen, loading])

  return (
    <div className="max-w-3xl mx-auto relative" ref={appRootRef} aria-hidden={parsingOpen ? 'true' : undefined}>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Information */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">General Information (all required)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} placeholder="John" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name *</Label>
              <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} placeholder="Doe" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 1111" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Expected salary *</Label>
              <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                <Select value={formData.expectedCurrency} onValueChange={(v) => setFormData((p) => ({ ...p, expectedCurrency: v }))}>
                  <SelectTrigger className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
                <Input inputMode="decimal" value={formData.expectedSalary} onChange={(e) => setFormData((p) => ({ ...p, expectedSalary: e.target.value }))} placeholder="1000" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
                <div className="flex items-center text-slate-500 px-2">/month</div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} placeholder="Berlin, Germany" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
            </div>
          </div>
        </section>

        {/* Resume & Documents */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Resume & Documents (required)</h3>
          <div
            className={`rounded-md border border-dashed p-6 cursor-pointer active:cursor-wait shadow-sm hover:shadow-lg ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden emerald-glow ${isDragging ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-300 hover:border-emerald-400/70 hover:bg-emerald-50/40'}`}
            role="button"
            aria-label="Upload resume"
            aria-required="true"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0]
              if (!f) return
              const maxSize = 10 * 1024 * 1024 // 10MB
              const allowed = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
              ]
              if (f.size > maxSize) {
                toast({ title: 'File too large', description: 'Max 10MB allowed.', variant: 'destructive' })
                return
              }
              if (f.type && !allowed.includes(f.type)) {
                // allow if extension matches even if type missing
                const okExt = /\.(pdf|doc|docx|txt)$/i.test(f.name)
                if (!okExt) {
                  toast({ title: 'Unsupported file', description: 'Please upload PDF, DOC, DOCX, or TXT.', variant: 'destructive' })
                  return
                }
              }
              setResumeFile(f)
              setResumeMeta({ name: f.name, size: f.size, type: f.type || 'file' })
              // Optimistic parsing overlay on selection
              setParsingOpen(true)
              toast({ title: 'File selected', description: `${f.name} (${Math.round(f.size / 1024)} KB)` })
            }}
          >
            <div className="block text-center text-slate-600 select-none pointer-events-none">
              <div className="mb-3">Drag & drop file here</div>
              <div className="inline-flex items-center rounded-md bg-emerald-600 text-white px-3 py-1 text-sm font-semibold">or click to select a file</div>
            </div>
            <input
              ref={fileInputRef}
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setResumeFile(f)
                  setResumeMeta({ name: f.name, size: f.size, type: f.type || 'file' })
                  // Optimistic parsing overlay on selection
                  setParsingOpen(true)
                  toast({ title: 'File selected', description: `${f.name} (${Math.round(f.size / 1024)} KB)` })
                }
              }}
            />
            {resumeMeta && (
              <div className="mt-3 text-sm text-slate-700 flex items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">{resumeMeta.name}</span>
                <span className="text-slate-400">•</span>
                <span>{Math.round(resumeMeta.size / 1024)} KB</span>
                {uploadedResume && (
                  <a
                    href={uploadedResume.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100"
                  >
                    📄 Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setResumeFile(null)
                    setResumeMeta(null)
                    setUploadedResume(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    toast({ title: 'Removed', description: 'Resume selection cleared.' })
                  }}
                  className="ml-2 inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                  aria-label="Remove selected resume"
                >
                  × Remove
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Cover Letter */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Cover Letter</h3>
          <Textarea id="coverLetter" value={formData.coverLetter} onChange={(e) => setFormData((p) => ({ ...p, coverLetter: e.target.value, whyInterested: e.target.value }))} placeholder="Tell us why you're interested in this role and what makes you a great fit..." rows={5} className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" disabled={loading} />
        </section>

        {/* Language and Proficiency */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Language and Proficiency Levels</h3>
          <div className="space-y-3">
            {languages.map((lang, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div className="space-y-2">
                  <Label htmlFor={`language-${index}`}>Language</Label>
                  <Select 
                    value={lang.language} 
                    onValueChange={(v) => updateLanguage(index, 'language', v)}
                    disabled={loading}
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`proficiency-${index}`}>Proficiency Level</Label>
                  <Select 
                    value={lang.proficiency} 
                    onValueChange={(v) => updateLanguage(index, 'proficiency', v)}
                    disabled={loading}
                  >
                    <SelectTrigger className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400">
                      <SelectValue placeholder="Select proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      {proficiencyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeLanguage(index)}
                  disabled={loading || languages.length === 1}
                  className="border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors duration-200"
                  title="Remove language"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addLanguage}
              disabled={loading}
              className="mt-2 border-slate-300 text-emerald-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Language
            </Button>
          </div>
        </section>

        {/* Additional Information */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" value={formData.linkedinUrl} onChange={(e) => setFormData((p) => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/yourprofile" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio/Website</Label>
              <Input id="portfolio" value={formData.portfolioUrl} onChange={(e) => setFormData((p) => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://yourportfolio.com" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Available Start Date *</Label>
              <Input id="start" type="date" value={formData.availableStartDate} onChange={(e) => setFormData((p) => ({ ...p, availableStartDate: e.target.value, availability: e.target.value }))} className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600 transition-colors duration-200 hover:border-emerald-400" required disabled={loading} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input id="relocate" type="checkbox" checked={formData.relocate} onChange={(e) => setFormData((p) => ({ ...p, relocate: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 transition-transform duration-150 hover:scale-105" />
              <Label htmlFor="relocate" className="cursor-pointer">I am willing to relocate for this position</Label>
            </div>
          </div>
        </section>

        {/* Submit bar */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200" onClick={() => history.back()} disabled={loading || !isJobOpen}>
            Cancel
          </Button>
          <Button type="submit" className={`text-white text-base px-5 py-3 rounded-md font-semibold shadow-lg hover:shadow-2xl ring-1 ring-transparent ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden ${isJobOpen ? 'bg-emerald-600 hover:bg-emerald-600/90 hover:ring-emerald-300 emerald-glow' : 'bg-slate-400 cursor-not-allowed opacity-60'}`} disabled={loading || !isJobOpen} title={!isJobOpen ? 'This position is not accepting applications' : ''}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : !isJobOpen ? (
              <>
                <Send className="w-5 h-5 mr-2" />
                Position {job.status?.toLowerCase() === 'on_hold' ? 'On Hold' : job.status?.toLowerCase() === 'closed' ? 'Closed' : 'Closed'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      </form>

      {parsingOpen && (
        <ParsingOverlay step={parseStep} />
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-md border">
        <h4 className="font-semibold mb-2">What happens next?</h4>
        <ul className="text-sm text-slate-700 space-y-1">
          <li>• Your application will be reviewed by our AI system</li>
          <li>• If qualified, you'll be redirected to our automated interview pipeline</li>
          <li>• The interview process includes multiple stages tailored to this role</li>
          <li>• You'll receive real-time feedback and progress updates</li>
          <li>• Final results will be shared with our HR team</li>
        </ul>
      </div>
    </div>
  )
}

// Accessible, non-dismissible parsing overlay
function ParsingOverlay({ step }: { step: 'idle' | 'uploading' | 'parsing' | 'evaluating' | 'finalizing' }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  useEffect(() => {
    // Focus the dialog container
    const t = setTimeout(() => {
      containerRef.current?.focus()
    }, 0)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Non-dismissable
        e.preventDefault()
        e.stopPropagation()
      } else if (e.key === 'Tab') {
        const root = containerRef.current
        if (!root) return
        const focusables = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector))
        if (focusables.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || active === root) {
            e.preventDefault(); last.focus()
          }
        } else {
          if (active === last) {
            e.preventDefault(); first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" aria-hidden="true" />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resume-parse-title"
        aria-describedby="resume-parse-desc"
        tabIndex={0}
        className="relative w-[90%] max-w-md rounded-2xl border border-white/20 bg-white/70 dark:bg-slate-900/60 shadow-2xl backdrop-blur-xl p-6 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ring-offset-2 ring-offset-white/50
        transform transition-all duration-200 ease-out scale-95 opacity-0 data-[show=true]:scale-100 data-[show=true]:opacity-100"
        data-show
      >
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="p-3 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-pulse">
              <svg className="w-6 h-6 text-emerald-600 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </div>
          </div>
          <div>
            <h2 id="resume-parse-title" className="text-slate-900 dark:text-white font-semibold text-lg">We’re parsing your resume — kindly wait</h2>
            <p id="resume-parse-desc" className="text-slate-600 dark:text-slate-300 text-sm mt-1">This takes ~10–20 seconds.</p>
          </div>
        </div>

        {/* Flipkart-style horizontal stepper */}
        <div className="mt-6" aria-live="polite">
          {(() => {
            const steps = [
              { key: 'uploading', label: 'Uploaded resume' },
              { key: 'parsing', label: 'Resume parsing' },
              { key: 'evaluating', label: 'Evaluation' },
              { key: 'finalizing', label: 'Finalizing' },
            ] as const
            const order: Record<'idle'|'uploading'|'parsing'|'evaluating'|'finalizing', number> = { idle: -1, uploading: 0, parsing: 1, evaluating: 2, finalizing: 3 }
            const curIndex = order[step] ?? -1
            return (
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  {steps.map((s, i) => {
                    const myIndex = order[s.key]
                    const status = myIndex < curIndex ? 'done' : myIndex === curIndex ? 'active' : 'pending'
                    const circleClasses = status === 'done'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : status === 'active'
                      ? 'bg-white text-emerald-700 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                      : 'bg-white text-slate-400 border-slate-300'
                    const lineClasses = myIndex < curIndex
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                    return (
                      <div key={s.key} className="flex-1 flex flex-col items-center min-w-0">
                        <div className="flex items-center w-full">
                          {/* Left connector */}
                          {i !== 0 && (
                            <div className={`h-1 flex-1 ${lineClasses}`} aria-hidden="true" />
                          )}
                          {/* Circle */}
                          <div
                            className={`flex items-center justify-center h-8 w-8 rounded-full border text-xs font-semibold transition-all ${circleClasses}`}
                            aria-current={status === 'active' ? 'step' : undefined}
                          >
                            {status === 'done' ? '✓' : i + 1}
                          </div>
                          {/* Right connector */}
                          {i !== steps.length - 1 && (
                            <div className={`h-1 flex-1 ${lineClasses}`} aria-hidden="true" />
                          )}
                        </div>
                        <div className="mt-2 text-[11px] sm:text-xs font-medium text-center text-slate-600 dark:text-slate-300 truncate max-w-[6.5rem] sm:max-w-none">
                          {s.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
