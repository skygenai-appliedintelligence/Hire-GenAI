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
import { useAuth } from "@/contexts/auth-context"

export default function CreateJobPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company, user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTab, setCurrentTab] = useState("basic")
  const lastSyncedTabRef = useRef<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    jobTitle: "",
    company: "",
    location: "",
    jobType: "full-time", // maps Work Arrangement
    experienceLevel: "entry", // maps Level/Seniority

    // New sections: Requirements
    education: "",
    years: "",
    technical: "",
    domain: "",
    soft: "",
    languages: "",
    mustHave: "",
    niceToHave: "",

    // New section: Responsibilities
    day: "",
    project: "",
    collaboration: "",
    scope: "",

    // New section: Compensation
    salaryMin: "",
    salaryMax: "",
    period: "Monthly",
    bonus: "",
    perks: "",
    timeOff: "",

    // New section: Logistics
    joining: "",
    travel: "",
    visa: "",

    // Legacy fields kept for API compatibility (will be compiled before submit)
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

  // Initialize tab from URL once on mount to avoid feedback loops
  useEffect(() => {
    const t = searchParams.get('tab')
    const allowed = ['basic', 'requirements', 'responsibilities', 'compensation', 'logistics', 'interview', 'platforms']
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
      // Compile description and requirements from new sections to match API contract
      const compiledRequirementsParts: string[] = []
      if (formData.education) compiledRequirementsParts.push(`Education: ${formData.education}`)
      if (formData.years) compiledRequirementsParts.push(`Experience: ${formData.years}`)
      if (formData.technical) compiledRequirementsParts.push(`Technical: ${formData.technical}`)
      if (formData.domain) compiledRequirementsParts.push(`Domain: ${formData.domain}`)
      if (formData.soft) compiledRequirementsParts.push(`Soft Skills: ${formData.soft}`)
      if (formData.languages) compiledRequirementsParts.push(`Languages: ${formData.languages}`)
      if (formData.mustHave) compiledRequirementsParts.push(`Must-have:\n${formData.mustHave}`)
      if (formData.niceToHave) compiledRequirementsParts.push(`Nice-to-have:\n${formData.niceToHave}`)
      const compiledRequirements = compiledRequirementsParts.join('\n\n')

      const compiledDescriptionParts: string[] = []
      if (formData.day) compiledDescriptionParts.push(`Day-to-day:\n${formData.day}`)
      if (formData.project) compiledDescriptionParts.push(`Projects/Strategic:\n${formData.project}`)
      if (formData.collaboration) compiledDescriptionParts.push(`Collaboration:\n${formData.collaboration}`)
      if (formData.scope) compiledDescriptionParts.push(`Decision-making scope:\n${formData.scope}`)
      const compensationBits: string[] = []
      if (formData.salaryMin || formData.salaryMax) {
        const min = formData.salaryMin ? Number(formData.salaryMin) : undefined
        const max = formData.salaryMax ? Number(formData.salaryMax) : undefined
        const range = [min, max].filter(v => typeof v === 'number' && !Number.isNaN(v as number)) as number[]
        if (range.length > 0) compensationBits.push(`Salary: ${range.join(' - ')} (${formData.period || 'Monthly'})`)
      }
      if (formData.bonus) compensationBits.push(`Bonus/Incentives: ${formData.bonus}`)
      if (formData.perks) compensationBits.push(`Perks: ${formData.perks}`)
      if (formData.timeOff) compensationBits.push(`Time Off: ${formData.timeOff}`)
      if (compensationBits.length) compiledDescriptionParts.push(compensationBits.join('\n'))
      const logisticsBits: string[] = []
      if (formData.joining) logisticsBits.push(`Joining timeline: ${formData.joining}`)
      if (formData.travel) logisticsBits.push(`Travel: ${formData.travel}`)
      if (formData.visa) logisticsBits.push(`Visa/Work auth: ${formData.visa}`)
      if (logisticsBits.length) compiledDescriptionParts.push(logisticsBits.join('\n'))
      const compiledDescription = compiledDescriptionParts.join('\n\n')

      // Basic mandatory checks
      if (!formData.jobTitle || !formData.location || !formData.jobType) {
        alert('Please complete required fields: Job Title, Location, Work Arrangement.')
        setIsSubmitting(false)
        return
      }

      // Optional sanity check for salary range
      const minNum = formData.salaryMin ? Number(formData.salaryMin) : undefined
      const maxNum = formData.salaryMax ? Number(formData.salaryMax) : undefined
      if (typeof minNum === 'number' && typeof maxNum === 'number' && !Number.isNaN(minNum) && !Number.isNaN(maxNum) && minNum > maxNum) {
        alert('Salary Min should not exceed Salary Max.')
        setIsSubmitting(false)
        return
      }

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: compiledDescription || formData.description || '',
          requirements: compiledRequirements || formData.requirements || '',
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
        <h1 className="text-3xl font-bold">Create New Job</h1>
        <p className="text-gray-600 mt-2">Fill out the details to create a comprehensive job posting</p>
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
          <TabsList className="w-full flex flex-wrap items-center justify-between gap-2 p-1 rounded-lg border bg-muted/40 text-muted-foreground my-2 h-[56px]">
            <TabsTrigger value="basic" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Basic Info</TabsTrigger>
            <TabsTrigger value="requirements" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Requirements</TabsTrigger>
            <TabsTrigger value="responsibilities" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Responsibilities</TabsTrigger>
            <TabsTrigger value="compensation" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Compensation</TabsTrigger>
            <TabsTrigger value="logistics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Logistics</TabsTrigger>
            <TabsTrigger value="interview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Interview Process</TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 text-sm rounded-md whitespace-nowrap">Platforms</TabsTrigger>
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
                    <Label htmlFor="jobType">Work Arrangement *</Label>
                    <Select value={formData.jobType} onValueChange={(value) => handleInputChange('jobType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work arrangement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Job Level / Seniority</Label>
                  <Select value={formData.experienceLevel} onValueChange={(value) => handleInputChange('experienceLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="mid">Mid</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Requirements
                </CardTitle>
                <CardDescription>
                  Describe the background and skills expected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="education">Educational Background</Label>
                    <Input id="education" placeholder="e.g., BSc CS; Azure Certs" value={formData.education} onChange={(e)=>handleInputChange('education', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years">Years of Experience</Label>
                    <Input id="years" placeholder="e.g., 5–8 years (min 5)" value={formData.years} onChange={(e)=>handleInputChange('years', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technical">Technical Skills</Label>
                  <Textarea id="technical" placeholder="Hard skills, tools, languages, platforms" value={formData.technical} onChange={(e)=>handleInputChange('technical', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Knowledge</Label>
                  <Textarea id="domain" placeholder="Industry-specific expertise" value={formData.domain} onChange={(e)=>handleInputChange('domain', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soft">Soft Skills</Label>
                  <Textarea id="soft" placeholder="Communication, leadership, problem-solving, adaptability" value={formData.soft} onChange={(e)=>handleInputChange('soft', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input id="languages" placeholder="e.g., English (required), Mandarin (nice-to-have)" value={formData.languages} onChange={(e)=>handleInputChange('languages', e.target.value)} />
                  </div>
                  <div className="space-y-2"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mustHave">Must‑Have Skills</Label>
                    <Textarea id="mustHave" placeholder="List must-haves, one per line" value={formData.mustHave} onChange={(e)=>handleInputChange('mustHave', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="niceToHave">Nice‑to‑Have Skills</Label>
                    <Textarea id="niceToHave" placeholder="List nice-to-haves, one per line" value={formData.niceToHave} onChange={(e)=>handleInputChange('niceToHave', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responsibilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Responsibilities
                </CardTitle>
                <CardDescription>
                  Outline what the role will do
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Day‑to‑Day Duties</Label>
                  <Textarea id="day" placeholder="Regular tasks (one per line)" value={formData.day} onChange={(e)=>handleInputChange('day', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project">Project / Strategic Duties</Label>
                  <Textarea id="project" placeholder="Long‑term contributions (one per line)" value={formData.project} onChange={(e)=>handleInputChange('project', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collaboration">Team Collaboration / Stakeholders</Label>
                  <Textarea id="collaboration" placeholder="Cross‑functional interactions (one per line)" value={formData.collaboration} onChange={(e)=>handleInputChange('collaboration', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Decision‑Making Scope</Label>
                  <Textarea id="scope" placeholder="Budget, people management, strategic influence" value={formData.scope} onChange={(e)=>handleInputChange('scope', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Compensation & Benefits
                </CardTitle>
                <CardDescription>
                  Share ranges only if you intend to publish them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Salary Min</Label>
                    <Input id="salaryMin" type="number" placeholder="e.g., 6000" value={formData.salaryMin} onChange={(e)=>handleInputChange('salaryMin', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Salary Max</Label>
                    <Input id="salaryMax" type="number" placeholder="e.g., 9000" value={formData.salaryMax} onChange={(e)=>handleInputChange('salaryMax', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select value={formData.period} onValueChange={(value)=>handleInputChange('period', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus">Bonus / Incentives</Label>
                  <Input id="bonus" placeholder="e.g., 10% annual bonus; RSUs" value={formData.bonus} onChange={(e)=>handleInputChange('bonus', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perks">Perks & Benefits</Label>
                  <Textarea id="perks" placeholder="Health, insurance, stock options, learning budget, wellness" value={formData.perks} onChange={(e)=>handleInputChange('perks', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeOff">Time Off Policy</Label>
                  <Input id="timeOff" placeholder="e.g., 18 AL, sick leave, parental leave" value={formData.timeOff} onChange={(e)=>handleInputChange('timeOff', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Logistics
                </CardTitle>
                <CardDescription>
                  Final details to help candidates plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="joining">Joining Timeline</Label>
                    <Input id="joining" placeholder="e.g., Within 30 days" value={formData.joining} onChange={(e)=>handleInputChange('joining', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel">Travel Requirements</Label>
                    <Input id="travel" placeholder="e.g., Up to 20%" value={formData.travel} onChange={(e)=>handleInputChange('travel', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visa">Work Authorization / Visa</Label>
                  <Input id="visa" placeholder="e.g., Open to sponsorship / PR required" value={formData.visa} onChange={(e)=>handleInputChange('visa', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Interview Process
                </CardTitle>
                <CardDescription>
                  Configure the interview rounds and process for this position
                </CardDescription>
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
                formData.interviewRounds.length === 0
              }
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Job...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Job & Setup Agents
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
