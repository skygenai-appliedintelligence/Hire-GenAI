"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { ArrowLeft, Building2, MapPin, DollarSign, Clock, Users, Briefcase, Target, CheckCircle } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"

export default function CreateJobPage() {
  const router = useRouter()
  const { company, user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTab, setCurrentTab] = useState("basic")
  
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
    interviewDuration: "",
    
    // Platform Selection
    platforms: [] as string[],
  })

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
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field as keyof typeof prev] as string[], value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }))
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
    } catch (error) {
      console.error('Error creating job:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const interviewRoundOptions = [
    "Phone Screening",
    "Technical Assessment", 
    "System Design",
    "Behavioral Interview",
    "Final Round"
  ]

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
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
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
                  <Label>Interview Rounds *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {interviewRoundOptions.map((round) => (
                      <div key={round} className="flex items-center space-x-2">
                        <Checkbox
                          id={round}
                          checked={formData.interviewRounds.includes(round)}
                          onCheckedChange={(checked) => 
                            handleArrayChange('interviewRounds', round, checked as boolean)
                          }
                        />
                        <Label htmlFor={round} className="text-sm font-normal">
                          {round}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.interviewRounds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.interviewRounds.map((round) => (
                        <Badge key={round} variant="secondary">
                          {round}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewDuration">Expected Interview Duration</Label>
                  <Select value={formData.interviewDuration} onValueChange={(value) => handleInputChange('interviewDuration', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="45min">45 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="1.5hours">1.5 hours</SelectItem>
                      <SelectItem value="2hours">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
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
