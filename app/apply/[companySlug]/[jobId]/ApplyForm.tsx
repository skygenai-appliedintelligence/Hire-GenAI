'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
      if (!fullName || !formData.email || !formData.phone) {
        toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' })
        return
      }

      const candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const application: CandidateApplication = {
        id: candidateId,
        jobId: job.id,
        ...formData,
        fullName,
        submittedAt: new Date().toISOString(),
        status: 'applied',
      }

      const existingApplications = JSON.parse(localStorage.getItem('candidateApplications') || '[]')
      existingApplications.push(application)
      localStorage.setItem('candidateApplications', JSON.stringify(existingApplications))

      const candidateRecord = {
        id: candidateId,
        name: fullName,
        email: formData.email,
        phone: formData.phone,
        status: 'qualified',
        pipeline_progress: 0,
        current_stage: 0,
        applied_date: new Date().toISOString(),
        source: 'direct_application',
        resume_score: Math.floor(Math.random() * 30) + 70,
        rejection_count: 0,
        last_rejection_date: null,
        jobId: job.id,
        application_data: { ...formData, fullName },
        stages: [
          { name: 'Initial Screening', status: 'pending', score: 0, completed_at: null, feedback: null },
          { name: 'Technical Interview', status: 'pending', score: 0, completed_at: null, feedback: null },
          { name: 'HR Round', status: 'pending', score: 0, completed_at: null, feedback: null },
          { name: 'Final Result', status: 'pending', score: 0, completed_at: null, feedback: null },
        ],
        final_recommendation: null,
      }

      const existingCandidates = JSON.parse(localStorage.getItem('interviewCandidates') || '[]')
      existingCandidates.push(candidateRecord)
      localStorage.setItem('interviewCandidates', JSON.stringify(existingCandidates))

      const jobDescription = job?.description || 'Senior Full Stack Developer position requiring React, Node.js, and cloud experience'
      const evaluation = await AIInterviewService.evaluateApplication(application, jobDescription)

      if (evaluation.qualified) {
        application.status = 'qualified'
        candidateRecord.status = 'qualified'
        candidateRecord.resume_score = evaluation.score

        const pipeline = await AIInterviewService.createInterviewPipeline(candidateId, job.id)
        const existingPipelines = JSON.parse(localStorage.getItem('interviewPipelines') || '[]')
        existingPipelines.push(pipeline)
        localStorage.setItem('interviewPipelines', JSON.stringify(existingPipelines))

        const updatedApplications = existingApplications.map((app: CandidateApplication) => (app.id === candidateId ? application : app))
        localStorage.setItem('candidateApplications', JSON.stringify(updatedApplications))

        const updatedCandidates = existingCandidates.map((cand: any) => (cand.id === candidateId ? candidateRecord : cand))
        localStorage.setItem('interviewCandidates', JSON.stringify(updatedCandidates))

        const activityLog = {
          id: `activity_${Date.now()}`,
          company_id: job?.company_id || 'company_1',
          action: 'New Application Received',
          details: {
            candidate_name: formData.fullName,
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
        candidateRecord.status = 'rejected'

        const updatedApplications = existingApplications.map((app: CandidateApplication) => (app.id === candidateId ? application : app))
        localStorage.setItem('candidateApplications', JSON.stringify(updatedApplications))

        const updatedCandidates = existingCandidates.map((cand: any) => (cand.id === candidateId ? candidateRecord : cand))
        localStorage.setItem('interviewCandidates', JSON.stringify(updatedCandidates))

        toast({ title: 'Application Received', description: evaluation.feedback, variant: 'destructive' })
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
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} placeholder="John" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name *</Label>
              <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} placeholder="Doe" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 1111" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" required disabled={loading} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Expected salary</Label>
              <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                <Select value={formData.expectedCurrency} onValueChange={(v) => setFormData((p) => ({ ...p, expectedCurrency: v }))}>
                  <SelectTrigger className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
                <Input inputMode="decimal" value={formData.expectedSalary} onChange={(e) => setFormData((p) => ({ ...p, expectedSalary: e.target.value }))} placeholder="1000" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" />
                <div className="flex items-center text-slate-500 px-2">/month</div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} placeholder="Berlin, Germany" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" />
            </div>
          </div>
        </section>

        {/* Resume & Documents */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Resume & Documents</h3>
          <div className="rounded-md border border-dashed border-slate-300 p-6">
            <label htmlFor="resume" className="block text-center text-slate-600">
              <div className="mb-3">Drag & drop file here</div>
              <div className="inline-flex items-center rounded-md bg-emerald-500 text-white px-3 py-1 text-sm font-semibold">or click to select a file</div>
            </label>
            <input id="resume" name="resume" type="file" className="hidden" onChange={() => { /* keep simple; no upload backend yet */ }} />
          </div>
        </section>

        {/* Cover Letter */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Cover Letter</h3>
          <Textarea id="coverLetter" value={formData.coverLetter} onChange={(e) => setFormData((p) => ({ ...p, coverLetter: e.target.value, whyInterested: e.target.value }))} placeholder="Tell us why you're interested in this role and what makes you a great fit..." rows={5} className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" disabled={loading} />
        </section>

        {/* Additional Information */}
        <section>
          <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" value={formData.linkedinUrl} onChange={(e) => setFormData((p) => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/yourprofile" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio/Website</Label>
              <Input id="portfolio" value={formData.portfolioUrl} onChange={(e) => setFormData((p) => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://yourportfolio.com" className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Available Start Date</Label>
              <Input id="start" type="date" value={formData.availableStartDate} onChange={(e) => setFormData((p) => ({ ...p, availableStartDate: e.target.value, availability: e.target.value }))} className="border-slate-300 focus:border-emerald-600 focus:ring-emerald-600" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input id="relocate" type="checkbox" checked={formData.relocate} onChange={(e) => setFormData((p) => ({ ...p, relocate: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
              <Label htmlFor="relocate" className="cursor-pointer">I am willing to relocate for this position</Label>
            </div>
          </div>
        </section>

        {/* Submit bar */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => history.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-600/90 text-white text-base px-5 py-3 rounded-md font-semibold" disabled={loading}>
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
