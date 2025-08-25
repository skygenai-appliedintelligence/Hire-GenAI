"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2, Users, Briefcase, Target, CheckCircle, Clock, Bot } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"

export default function CreateJobPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company, user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTab, setCurrentTab] = useState("basic")
  const lastSyncedTabRef = useRef<string | null>(null)
  const [applyEnabled, setApplyEnabled] = useState<boolean>(true)
  
  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    jobTitle: "",
    company: "",
    location: "",
    jobType: "full-time",
    experienceLevel: "entry",
    
    // Job Details
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: "",
    salaryRange: "",
    
    // Interview Process
    interviewRounds: [] as string[],
    
    // Platform Selection
    platforms: [] as string[],
  })

  // Prefill when editing: if jobId is present in URL, fetch job and populate form
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return
    ;(async () => {
      try {
        // Try localStorage first for instant prefill
        const draft = typeof window !== 'undefined' ? localStorage.getItem('editJobDraft') : null
        if (draft) {
          const j = JSON.parse(draft)
          if (j?.id === jobId) {
            setFormData(prev => ({
              ...prev,
              jobTitle: j.title || prev.jobTitle,
              company: company?.name || prev.company,
              location: j.location || prev.location,
              jobType: j.employment_type || prev.jobType,
              description: j.description || prev.description,
              requirements: j.requirements || prev.requirements,
              salaryRange: j.salary_range || prev.salaryRange,
              interviewRounds: Array.isArray(j.interview_rounds) ? j.interview_rounds : prev.interviewRounds,
            }))
          }
        }
        // Also fetch from API to ensure latest (requires company query param)
        if (company?.name) {
          const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company.name)}`)
          const data = await res.json().catch(() => ({}))
          if (res.ok && data?.job) {
            const j = data.job
            setFormData(prev => ({
              ...prev,
              jobTitle: j.title || prev.jobTitle,
              company: company?.name || prev.company,
              location: j.location || prev.location,
              jobType: j.employment_type || prev.jobType,
              description: j.description_md || j.summary || j.description || prev.description,
              requirements: j.responsibilities_md || j.requirements || prev.requirements,
              benefits: j.benefits_md || prev.benefits,
              salaryRange: j.salary_level || j.salary_label || j.salary_range || prev.salaryRange,
              interviewRounds: Array.isArray(j.interview_rounds) ? j.interview_rounds : prev.interviewRounds,
            }))
          }
        }
      } catch (e) {
        console.warn('Prefill failed:', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, company?.name])

  // Initialize tab from URL once on mount to avoid feedback loops
  useEffect(() => {
    const t = searchParams.get('tab')
    const allowed = ['basic', 'details', 'interview', 'platforms']
    const next = t && allowed.includes(t) ? t : 'basic'
    lastSyncedTabRef.current = next
    setCurrentTab(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fill company from auth context
  useEffect(() => {
    if (company?.name) {
      setFormData(prev => ({ ...prev, company: company.name }))
    }
  }, [company?.name])

  // Read persisted Apply Form toggle for this jobId (edit flow only)
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return
    try {
      const saved = localStorage.getItem(`applyFormEnabled:${jobId}`)
      if (saved !== null) setApplyEnabled(saved === 'true')
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const prevArr = (prev[field as keyof typeof prev] as string[]) || []
      const set = new Set(prevArr)
      if (checked) {
        set.add(value)
      } else {
        set.delete(value)
      }
      const nextArr = Array.from(set)
      // Avoid unnecessary state updates
      if (prevArr.length === nextArr.length && prevArr.every((v, i) => v === nextArr[i])) {
        return prev
      }
      const next = { ...prev, [field]: nextArr }
      // If we updated interviewRounds, also persist a mapping of round -> skills to localStorage
      if (field === 'interviewRounds') {
        try {
          const mapping: Record<string, string[]> = {}
          nextArr.forEach(r => {
            const cfg = (agentConfigurations as any)[r]
            if (cfg && Array.isArray(cfg.skills)) mapping[r] = cfg.skills
          })
          localStorage.setItem('selectedRoundSkills', JSON.stringify(mapping))
        } catch {}
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Client-side guard to match API required fields
      if (!formData.description.trim() || !formData.requirements.trim()) {
        alert('Please fill in Description and Requirements before creating the job.')
        setIsSubmitting(false)
        return
      }
      const jobId = searchParams.get('jobId')
      if (jobId) {
        // Edit flow: PATCH existing job
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company?.name || '')}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.jobTitle,
            location: formData.location,
            employment_type: formData.jobType,
            experience_level: formData.experienceLevel,
            description_md: formData.description,
            responsibilities_md: formData.requirements,
            benefits_md: formData.benefits,
            salary_level: formData.salaryRange,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to update job')
        }
        try { localStorage.removeItem('editJobDraft') } catch {}
        router.push('/dashboard/jobs')
      } else {
        // Create flow: POST new job
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            companyId: company?.id, // Pass companyId directly
            createdBy: user?.id || null,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to create job')
        }

        // Store minimal info for downstream pages
        const jobData = {
          ...formData,
          id: data.jobId,
          createdAt: new Date().toISOString(),
        }
        localStorage.setItem('newJobData', JSON.stringify(jobData))
        localStorage.setItem('selectedInterviewRounds', JSON.stringify(formData.interviewRounds))

        // Derive selectedAgents from the number of selected interview rounds
        const agentsCount = Array.isArray(formData.interviewRounds) ? formData.interviewRounds.length : 0
        const selectedAgents = Array.from({ length: agentsCount }, (_, i) => i + 1) // [1,2,3,...]
        localStorage.setItem('selectedAgents', JSON.stringify(selectedAgents))

        // Redirect to the Selected Agents page with jobId and default tab=1
        router.push(`/selected-agents?jobId=${encodeURIComponent(data.jobId)}&tab=1`)
      }
    } catch (error) {
      console.error('Error creating job:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Detailed agent catalog (aligned with /dashboard/agents/create design)
  const agentConfigurations = {
    "Phone Screening": {
      name: "Screening Agent",
      description: "Initial candidate screening and basic qualification assessment",
      duration: "15 minutes",
      skills: ["Communication", "Basic Qualifications", "Cultural Fit"],
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    "Technical Assessment": {
      name: "Technical Agent",
      description: "Coding skills, algorithms, and technical problem-solving evaluation",
      duration: "30 minutes",
      skills: ["Coding Skills", "Algorithm Knowledge", "Problem Solving"],
      color: "bg-green-100 text-green-800 border-green-200",
    },
    "System Design": {
      name: "System Design Agent",
      description: "Architecture design, scalability, and system thinking assessment",
      duration: "30 minutes",
      skills: ["System Architecture", "Scalability", "Database Design"],
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    "Behavioral Interview": {
      name: "Behavioral Agent",
      description: "Leadership, teamwork, and soft skills evaluation",
      duration: "30 minutes",
      skills: ["Leadership", "Team Collaboration", "Communication"],
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    "Final Round": {
      name: "Final Round Agent",
      description: "Comprehensive evaluation and final decision making",
      duration: "30 minutes",
      skills: ["Overall Assessment", "Cultural Fit", "Decision Making"],
      color: "bg-red-100 text-red-800 border-red-200",
    },
  } as const

  const platformOptions = [
    "LinkedIn",
    "Indeed", 
    "Glassdoor",
    "AngelList",
    "Company Website"
  ]

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{searchParams.get('jobId') ? 'Edit Job' : 'Create New Job'}</h1>
        <p className="text-gray-600 mt-2">{searchParams.get('jobId') ? 'Review and update the job details' : 'Fill out the details to create a comprehensive job posting'}</p>

        {/* Top bar toggle to enable/disable Apply Form globally */}
        <div className="mt-4 flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm">
            <div className="font-medium">Apply Form</div>
            <div className="text-gray-500">This controls Apply Form availability for this job only</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${applyEnabled ? 'text-emerald-600' : 'text-red-600'}`}>
              {applyEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={applyEnabled}
              onCheckedChange={(val) => {
                setApplyEnabled(val)
                try {
                  const jobId = searchParams.get('jobId')
                  if (jobId) {
                    localStorage.setItem(`applyFormEnabled:${jobId}`, String(val))
                  }
                } catch {}
              }}
              aria-label="Toggle Apply Form availability"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs
          value={currentTab}
          onValueChange={(val) => {
            if (val !== currentTab) setCurrentTab(val)
            const currentUrlTab = searchParams.get('tab')
            if (currentUrlTab !== val) {
              const sp = new URLSearchParams(Array.from(searchParams.entries()))
              sp.set('tab', val)
              lastSyncedTabRef.current = val
              router.replace(`${pathname}?${sp.toString()}`)
            }
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Job Details</TabsTrigger>
            <TabsTrigger value="interview">Interview Process</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the fundamental details about the job position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Senior Software Engineer"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      placeholder={company?.name || 'Loading company...'}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type *</Label>
                    <Select value={formData.jobType} onValueChange={(value) => handleInputChange('jobType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level *</Label>
                  <Select value={formData.experienceLevel} onValueChange={(value) => handleInputChange('experienceLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                      <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                      <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Job Details
                </CardTitle>
                <CardDescription>
                  Provide detailed information about the role and requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the role, team, and what the candidate will be working on..."
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements *</Label>
                  <Textarea
                    id="requirements"
                    placeholder="List the required skills, experience, and qualifications..."
                    className="min-h-[120px]"
                    value={formData.requirements}
                    onChange={(e) => handleInputChange('requirements', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Key Responsibilities</Label>
                  <Textarea
                    id="responsibilities"
                    placeholder="Outline the main responsibilities and duties..."
                    className="min-h-[100px]"
                    value={formData.responsibilities}
                    onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="benefits">Benefits & Perks</Label>
                    <Textarea
                      id="benefits"
                      placeholder="Health insurance, 401k, flexible hours..."
                      value={formData.benefits}
                      onChange={(e) => handleInputChange('benefits', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryRange">Salary Range</Label>
                    <Input
                      id="salaryRange"
                      placeholder="e.g. $120,000 - $150,000"
                      value={formData.salaryRange}
                      onChange={(e) => handleInputChange('salaryRange', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interview" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Interview Process
                    </CardTitle>
                    <CardDescription>
                      Configure the interview rounds and process for this position
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Select Agents *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(agentConfigurations).map(([round, cfg]) => {
                      const checked = formData.interviewRounds.includes(round)
                      return (
                        <Card
                          key={round}
                          className={`transition-all duration-200 ${checked ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}`}
                          onClick={() => handleArrayChange('interviewRounds', round, !checked)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => handleArrayChange('interviewRounds', round, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Bot className="w-5 h-5 text-blue-500" />
                              </div>
                              <Badge className={cfg.color}>{round}</Badge>
                            </div>
                            <CardTitle className="text-lg">{cfg.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {cfg.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>{cfg.duration}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-gray-600">
                                <Briefcase className="w-4 h-4 mr-2" />
                                <span>Key Skills:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {cfg.skills.map((skill, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Platform Selection
                </CardTitle>
                <CardDescription>
                  Choose where you want to publish this job posting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Publishing Platforms *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {platformOptions.map((platform) => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform}
                          checked={formData.platforms.includes(platform)}
                          onCheckedChange={(checked) => 
                            handleArrayChange('platforms', platform, checked as boolean)
                          }
                        />
                        <Label htmlFor={platform} className="text-sm font-normal">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.platforms.map((platform) => (
                        <Badge key={platform} variant="outline">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            * Required fields
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isSubmitting ||
                !formData.jobTitle ||
                !company?.name ||
                !formData.location ||
                !formData.jobType ||
                !formData.experienceLevel ||
                !formData.description.trim() ||
                !formData.requirements.trim() ||
                formData.interviewRounds.length === 0
              }
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {searchParams.get('jobId') ? 'Saving Changes...' : 'Creating Job...'}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {searchParams.get('jobId') ? 'Save Changes' : 'Create Job & Setup Agents'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
