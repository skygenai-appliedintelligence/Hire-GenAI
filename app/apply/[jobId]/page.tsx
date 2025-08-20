"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AIInterviewService, type CandidateApplication } from "@/lib/ai-interview-service"
import { JobService } from "@/lib/job-service"
import { Loader2, Send, Briefcase, MapPin, DollarSign, Building2 } from "lucide-react"

export default function ApplyPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [jobLoading, setJobLoading] = useState(true)
  const [job, setJob] = useState<any>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    yearsOfExperience: "",
    technicalSkills: "",
    whyInterested: "",
    impactfulProject: "",
    availability: "",
  })

  const jobId = params.jobId as string

  // Load job details
  useEffect(() => {
    const loadJobDetails = async () => {
      try {
        setJobLoading(true)

        // Try to get job from all companies (since we don't know which company owns it)
        const allCompanies = ["company_1", "company_2"] // Add more as needed
        let foundJob = null

        for (const companyId of allCompanies) {
          const jobData = await JobService.getJob(jobId, companyId)
          if (jobData) {
            foundJob = jobData
            break
          }
        }

        if (!foundJob) {
          // Fallback to mock job data
          foundJob = {
            id: jobId,
            title: "Senior Full Stack Developer",
            company_id: "company_1",
            description: "We are looking for an experienced full stack developer to join our growing team.",
            requirements: "5+ years of experience in React, Node.js, and cloud technologies",
            location: "San Francisco, CA",
            salary_range: "$120,000 - $160,000",
            employment_type: "full-time",
          }
        }

        // Gate by job status: only "active" is open for applications
        if (foundJob && (foundJob.status && ["active", "open"].includes(String(foundJob.status).toLowerCase()))) {
          setJob(foundJob)
        } else {
          setJob(null)
        }
      } catch (error) {
        console.error("Error loading job details:", error)
        toast({
          title: "Error",
          description: "Failed to load job details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setJobLoading(false)
      }
    }

    if (jobId) {
      loadJobDetails()
    }
  }, [jobId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.fullName || !formData.email || !formData.phone) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      // Create unique candidate ID
      const candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create candidate application
      const application: CandidateApplication = {
        id: candidateId,
        jobId: params.jobId,
        ...formData,
        submittedAt: new Date().toISOString(),
        status: "applied",
      }

      // Save application to localStorage
      const existingApplications = JSON.parse(localStorage.getItem("candidateApplications") || "[]")
      existingApplications.push(application)
      localStorage.setItem("candidateApplications", JSON.stringify(existingApplications))

      // Create candidate record for interview pipeline
      const candidateRecord = {
        id: candidateId,
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        status: "qualified",
        pipeline_progress: 0,
        current_stage: 0,
        applied_date: new Date().toISOString(),
        source: "direct_application",
        resume_score: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
        rejection_count: 0,
        last_rejection_date: null,
        jobId: params.jobId, // Ensure jobId is properly set
        application_data: formData,
        stages: [
          { name: "Initial Screening", status: "pending", score: 0, completed_at: null, feedback: null },
          { name: "Technical Interview", status: "pending", score: 0, completed_at: null, feedback: null },
          { name: "HR Round", status: "pending", score: 0, completed_at: null, feedback: null },
          { name: "Final Result", status: "pending", score: 0, completed_at: null, feedback: null },
        ],
        final_recommendation: null,
      }

      // Save candidate to interview candidates list
      const existingCandidates = JSON.parse(localStorage.getItem("interviewCandidates") || "[]")
      existingCandidates.push(candidateRecord)
      localStorage.setItem("interviewCandidates", JSON.stringify(existingCandidates))

      // Trigger AI evaluation
      const jobDescription =
        job?.description || "Senior Full Stack Developer position requiring React, Node.js, and cloud experience"
      const evaluation = await AIInterviewService.evaluateApplication(application, jobDescription)

      // Update application and candidate status based on evaluation
      if (evaluation.qualified) {
        application.status = "qualified"
        candidateRecord.status = "qualified"
        candidateRecord.resume_score = evaluation.score

        // Create interview pipeline
        const pipeline = await AIInterviewService.createInterviewPipeline(candidateId, params.jobId)

        // Save pipeline
        const existingPipelines = JSON.parse(localStorage.getItem("interviewPipelines") || "[]")
        existingPipelines.push(pipeline)
        localStorage.setItem("interviewPipelines", JSON.stringify(existingPipelines))

        // Update stored records
        const updatedApplications = existingApplications.map((app: CandidateApplication) =>
          app.id === candidateId ? application : app,
        )
        localStorage.setItem("candidateApplications", JSON.stringify(updatedApplications))

        const updatedCandidates = existingCandidates.map((cand: any) =>
          cand.id === candidateId ? candidateRecord : cand,
        )
        localStorage.setItem("interviewCandidates", JSON.stringify(updatedCandidates))

        // Save activity log
        const activityLog = {
          id: `activity_${Date.now()}`,
          company_id: job?.company_id || "company_1",
          action: "New Application Received",
          details: {
            candidate_name: formData.fullName,
            job_title: job?.title || "Senior Full Stack Developer",
            status: "qualified",
            source: "direct_application",
          },
          created_at: new Date().toISOString(),
        }

        const activityKey = `activity_logs_${job?.company_id || "company_1"}`
        const existingActivity = JSON.parse(localStorage.getItem(activityKey) || "[]")
        existingActivity.push(activityLog)
        localStorage.setItem(activityKey, JSON.stringify(existingActivity))

        toast({
          title: "Application Successful! 🎉",
          description: `You've been qualified for interviews. Your AI-powered interview process is ready!`,
        })

        // Redirect to interview pipeline
        setTimeout(() => {
          router.push(`/interview-pipeline/${candidateId}`)
        }, 1500)
      } else {
        application.status = "unqualified"
        candidateRecord.status = "rejected"

        // Update stored records
        const updatedApplications = existingApplications.map((app: CandidateApplication) =>
          app.id === candidateId ? application : app,
        )
        localStorage.setItem("candidateApplications", JSON.stringify(updatedApplications))

        const updatedCandidates = existingCandidates.map((cand: any) =>
          cand.id === candidateId ? candidateRecord : cand,
        )
        localStorage.setItem("interviewCandidates", JSON.stringify(updatedCandidates))

        toast({
          title: "Application Received",
          description: evaluation.feedback,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Application submission error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading job details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">This job is not accepting applications</h2>
              <p className="text-gray-600">
                The job you're trying to apply for is On-Hold, Closed, or Cancelled. Please visit the company's jobs
                page to see open roles.
              </p>
              <div className="mt-4">
                <Button onClick={() => window.history.back()}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
            <CardTitle className="text-2xl font-bold">{job.title}</CardTitle>
            <CardDescription className="text-blue-100">
              Join our team and make an impact with your skills and expertise.
            </CardDescription>

            {/* Job Details */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>Company</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>{job.salary_range}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* Job Description */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Briefcase className="w-4 h-4 mr-2" />
                About This Role
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">{job.description}</p>

              <h4 className="font-semibold text-gray-900 mt-4 mb-2">Requirements</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{job.requirements}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Full Name *</span>
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>Email Address *</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>Phone Number *</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Years of Experience *</span>
                </Label>
                <Select
                  value={formData.yearsOfExperience}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, yearsOfExperience: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
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
                <Textarea
                  id="skills"
                  value={formData.technicalSkills}
                  onChange={(e) => setFormData((prev) => ({ ...prev, technicalSkills: e.target.value }))}
                  placeholder="List your technical skills and proficiency levels (e.g., React, Node.js, Python, AWS, etc.)"
                  rows={4}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest" className="flex items-center space-x-2">
                  <span>💡</span>
                  <span>Why are you interested in this role? *</span>
                </Label>
                <Textarea
                  id="interest"
                  value={formData.whyInterested}
                  onChange={(e) => setFormData((prev) => ({ ...prev, whyInterested: e.target.value }))}
                  placeholder="Tell us what excites you about this opportunity and how it aligns with your career goals..."
                  rows={4}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project" className="flex items-center space-x-2">
                  <span>🚀</span>
                  <span>Describe your most impactful project *</span>
                </Label>
                <Textarea
                  id="project"
                  value={formData.impactfulProject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, impactfulProject: e.target.value }))}
                  placeholder="Share details about a project you led or contributed to significantly. Include technologies used, challenges faced, and impact achieved..."
                  rows={5}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability" className="flex items-center space-x-2">
                  <span>📅</span>
                  <span>When can you start? *</span>
                </Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, availability: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
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

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-4 rounded-lg font-semibold shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Application...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your application will be reviewed by our AI system</li>
                <li>• If qualified, you'll be redirected to our automated interview pipeline</li>
                <li>• The interview process includes multiple stages tailored to this role</li>
                <li>• You'll receive real-time feedback and progress updates</li>
                <li>• Final results will be shared with our HR team</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
