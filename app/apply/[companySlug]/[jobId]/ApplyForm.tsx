'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { AIInterviewService, type CandidateApplication } from '@/lib/ai-interview-service'
import { Loader2, Send } from 'lucide-react'

export default function ApplyForm({ job }: { job: any }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [resumeMeta, setResumeMeta] = useState<{ name: string; size: number; type: string; url?: string } | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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

      // candidateId will be assigned after backend persistence
      let candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // If a resume file is selected, upload it first
      let uploadedResume: { name: string; size: number; type: string; url: string } | null = null
      if (resumeFile) {
        try {
          const fd = new FormData()
          fd.append('file', resumeFile)
          const res = await fetch('/api/uploads', { method: 'POST', body: fd })
          if (!res.ok) throw new Error('Upload failed')
          const data = await res.json()
          uploadedResume = { name: data.name, size: data.size, type: data.type, url: data.url }
        } catch (err) {
          console.error(err)
          toast({ title: 'Upload failed', description: 'Please try again or use a smaller file.', variant: 'destructive' })
          setLoading(false)
          return
        }
      }

      const application: CandidateApplication = {
        id: candidateId,
        jobId: job.id,
        ...formData,
        fullName,
        submittedAt: new Date().toISOString(),
        status: 'applied',
        ...((uploadedResume || resumeMeta) ? { resume: (uploadedResume || resumeMeta) as any } : {}),
      }

      // Persist to backend: candidates, files link, and applications
      try {
        const res = await fetch('/api/applications/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job.id,
            candidate: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              fullName,
              email: formData.email,
              phone: formData.phone,
              location: formData.location,
            },
            resume: uploadedResume || resumeMeta,
            source: 'direct_application',
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Failed to save application')
        }
        const { candidateId: savedCandidateId } = await res.json()
        if (savedCandidateId) {
          candidateId = savedCandidateId
          application.id = savedCandidateId
        }
      } catch (err: any) {
        console.error('Backend persistence failed:', err)
        toast({ title: 'Submission failed', description: err?.message || 'Could not save your application. Please try again.', variant: 'destructive' })
        setLoading(false)
        return
      }

      const jobDescription = job?.description || 'Senior Full Stack Developer position requiring React, Node.js, and cloud experience'
      // Use server API to evaluate via OpenAI when available
      let evaluation: { qualified: boolean; score: number; reasoning: string; feedback: string }
      try {
        const res = await fetch('/api/applications/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ application, jobDescription }),
        })
        if (!res.ok) throw new Error('Evaluation failed')
        const data = await res.json()
        evaluation = data?.result || { qualified: false, score: 0, reasoning: '', feedback: 'Evaluation failed.' }
      } catch {
        // Fallback to local evaluation (mock) if API fails
        evaluation = await AIInterviewService.evaluateApplication(application, jobDescription)
      }

      if (evaluation.qualified) {
        application.status = 'qualified'

        // Create interview pipeline (local UX flow)
        const pipeline = await AIInterviewService.createInterviewPipeline(candidateId, job.id)
        const existingPipelines = JSON.parse(localStorage.getItem('interviewPipelines') || '[]')
        existingPipelines.push(pipeline)
        localStorage.setItem('interviewPipelines', JSON.stringify(existingPipelines))

        const activityLog = {
          id: `activity_${Date.now()}`,
          company_id: job?.company_id || 'company_1',
          action: 'New Application Received',
          details: {
            candidate_name: fullName,
            job_title: job?.title || 'Senior Full Stack Developer',
            status: 'qualified',
            source: 'direct_application',
          },
          created_at: new Date().toISOString(),
        }

        const activityKey = `activity_logs_${job?.company_id || 'company_1'}`
        const existingActivity = JSON.parse(localStorage.getItem(activityKey) || '[]')
        existingActivity.push(activityLog)
        localStorage.setItem(activityKey, JSON.stringify(existingActivity))

        toast({ title: 'Application Successful! 🎉', description: `You've been qualified for interviews. Your AI-powered interview process is ready!` })

        setTimeout(() => {
          router.push(`/interview-pipeline/${candidateId}`)
        }, 1500)
      } else {
        application.status = 'unqualified'

        // Persist evaluation details for a dedicated result page
        try {
          const evaluationsKey = 'applicationEvaluations'
          const evalList = JSON.parse(localStorage.getItem(evaluationsKey) || '[]')
          const evalRecord = {
            candidateId,
            jobId: job.id,
            jobTitle: job?.title || 'Your job',
            candidateName: fullName,
            createdAt: new Date().toISOString(),
            qualified: evaluation.qualified,
            score: evaluation.score,
            reasoning: evaluation.reasoning,
            feedback: evaluation.feedback,
          }
          const newList = [...evalList.filter((e: any) => e.candidateId !== candidateId), evalRecord]
          localStorage.setItem(evaluationsKey, JSON.stringify(newList))
        } catch {}

        toast({ title: 'Application Received', description: evaluation.feedback, variant: 'destructive' })

        // Navigate to the Not Qualified page to show detailed analysis
        setTimeout(() => {
          router.push(`/apply/not-qualified?candidateId=${encodeURIComponent(candidateId)}`)
        }, 900)
      }
    } catch (error: any) {
      console.error('Application submission error:', error)
      toast({ title: 'Error', description: error.message || 'Failed to submit application. Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
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
                  toast({ title: 'File selected', description: `${f.name} (${Math.round(f.size / 1024)} KB)` })
                }
              }}
            />
            {resumeMeta && (
              <div className="mt-3 text-sm text-slate-700 flex items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">{resumeMeta.name}</span>
                <span className="text-slate-400">•</span>
                <span>{Math.round(resumeMeta.size / 1024)} KB</span>
                <button
                  type="button"
                  onClick={() => {
                    setResumeFile(null)
                    setResumeMeta(null)
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
          <Button type="button" variant="outline" className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200" onClick={() => history.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-600/90 text-white text-base px-5 py-3 rounded-md font-semibold shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow motion-safe:duration-300 overflow-hidden emerald-glow" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
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
