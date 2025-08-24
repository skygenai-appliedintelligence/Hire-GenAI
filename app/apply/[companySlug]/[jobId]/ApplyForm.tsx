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
    fullName: '',
    email: '',
    phone: '',
    yearsOfExperience: '',
    technicalSkills: '',
    whyInterested: '',
    impactfulProject: '',
    availability: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.fullName || !formData.email || !formData.phone) {
        toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' })
        return
      }

      const candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const application: CandidateApplication = {
        id: candidateId,
        jobId: job.id,
        ...formData,
        submittedAt: new Date().toISOString(),
        status: 'applied',
      }

      const existingApplications = JSON.parse(localStorage.getItem('candidateApplications') || '[]')
      existingApplications.push(application)
      localStorage.setItem('candidateApplications', JSON.stringify(existingApplications))

      const candidateRecord = {
        id: candidateId,
        name: formData.fullName,
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
        application_data: formData,
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
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="flex items-center space-x-2">
            <span>👤</span>
            <span>Full Name *</span>
          </Label>
          <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Enter your full name" className="border-gray-300 focus:border-black focus:ring-black" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center space-x-2">
            <span>📧</span>
            <span>Email Address *</span>
          </Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} placeholder="your.email@example.com" className="border-gray-300 focus:border-black focus:ring-black" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center space-x-2">
            <span>📞</span>
            <span>Phone Number *</span>
          </Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+1 (555) 123-4567" className="border-gray-300 focus:border-black focus:ring-black" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience" className="flex items-center space-x-2">
            <span>🎯</span>
            <span>Years of Experience *</span>
          </Label>
          <Select value={formData.yearsOfExperience} onValueChange={(value) => setFormData((prev) => ({ ...prev, yearsOfExperience: value }))} disabled={loading}>
            <SelectTrigger className="border-gray-300 focus:border-black focus:ring-black">
              <SelectValue placeholder="Select your experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-1">0-1 years</SelectItem>
              <SelectItem value="2-3">2-3 years</SelectItem>
              <SelectItem value="4-5">4-5 years</SelectItem>
              <SelectItem value="6-8">6-8 years</SelectItem>
              <SelectItem value="9+">9+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skills" className="flex items-center space-x-2">
            <span>💻</span>
            <span>Technical Skills *</span>
          </Label>
          <Textarea id="skills" value={formData.technicalSkills} onChange={(e) => setFormData((prev) => ({ ...prev, technicalSkills: e.target.value }))} placeholder="List your technical skills and proficiency levels (e.g., React, Node.js, Python, AWS, etc.)" rows={4} className="border-gray-300 focus:border-black focus:ring-black" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interest" className="flex items-center space-x-2">
            <span>💡</span>
            <span>Why are you interested in this role? *</span>
          </Label>
          <Textarea id="interest" value={formData.whyInterested} onChange={(e) => setFormData((prev) => ({ ...prev, whyInterested: e.target.value }))} placeholder="Tell us what excites you about this opportunity and how it aligns with your career goals..." rows={4} className="border-gray-300 focus:border-black focus:ring-black" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project" className="flex items-center space-x-2">
            <span>🚀</span>
            <span>Describe your most impactful project *</span>
          </Label>
          <Textarea id="project" value={formData.impactfulProject} onChange={(e) => setFormData((prev) => ({ ...prev, impactfulProject: e.target.value }))} placeholder="Share details about a project you led or contributed to significantly. Include technologies used, challenges faced, and impact achieved..." rows={5} className="border-gray-300 focus:border-black focus:ring-black" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability" className="flex items-center space-x-2">
            <span>📅</span>
            <span>When can you start? *</span>
          </Label>
          <Select value={formData.availability} onValueChange={(value) => setFormData((prev) => ({ ...prev, availability: value }))} disabled={loading}>
            <SelectTrigger className="border-gray-300 focus:border-black focus:ring-black">
              <SelectValue placeholder="Select your availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediately">Immediately</SelectItem>
              <SelectItem value="2-weeks">2 weeks notice</SelectItem>
              <SelectItem value="1-month">1 month notice</SelectItem>
              <SelectItem value="2-months">2 months notice</SelectItem>
              <SelectItem value="negotiable">Negotiable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white text-base py-3 rounded-md font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Apply now
            </>
          )}
        </Button>
      </form>
      <div className="mt-6 p-4 bg-gray-50 rounded-md border">
        <h4 className="font-semibold mb-2">What happens next?</h4>
        <ul className="text-sm text-gray-700 space-y-1">
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
