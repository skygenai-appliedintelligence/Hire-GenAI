"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FormData {
  // Mandatory fields
  jobTitle: string
  locationType: string
  cityCountry: string
  employmentType: string
  jobSummary: string
  keyResponsibilities: string
  requiredQualifications: string
  experienceRequired: string
  skillsRequired: string
  howToApply: string
  
  // Optional fields
  companyOverview: string
  teamStructure: string
  toolsTechStack: string
  salaryMin: string
  salaryMax: string
  perksAndBenefits: string
  preferredQualifications: string
  travelRequirements: string
  diversityStatement: string
  careerPath: string
  jobPostingDate: string
  jobClosingDate: string
}

export default function CreateJDPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    // Mandatory fields
    jobTitle: "",
    locationType: "",
    cityCountry: "",
    employmentType: "",
    jobSummary: "",
    keyResponsibilities: "",
    requiredQualifications: "",
    experienceRequired: "",
    skillsRequired: "",
    howToApply: "",
    
    // Optional fields
    companyOverview: "",
    teamStructure: "",
    toolsTechStack: "",
    salaryMin: "",
    salaryMax: "",
    perksAndBenefits: "",
    preferredQualifications: "",
    travelRequirements: "",
    diversityStatement: "",
    careerPath: "",
    jobPostingDate: "",
    jobClosingDate: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Mandatory field validation
    const mandatoryFields = [
      'jobTitle', 'locationType', 'employmentType', 'jobSummary',
      'keyResponsibilities', 'requiredQualifications', 'experienceRequired',
      'skillsRequired', 'howToApply'
    ]

    mandatoryFields.forEach(field => {
      if (!formData[field as keyof FormData].trim()) {
        newErrors[field] = "This field is required"
      }
    })

    // City/Country validation for non-remote positions
    if (formData.locationType && formData.locationType !== "Remote" && !formData.cityCountry.trim()) {
      newErrors.cityCountry = "City/Country is required for non-remote positions"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = () => {
    const mandatoryFields = [
      'jobTitle', 'locationType', 'employmentType', 'jobSummary',
      'keyResponsibilities', 'requiredQualifications', 'experienceRequired',
      'skillsRequired', 'howToApply'
    ]

    const allMandatoryFilled = mandatoryFields.every(field => 
      formData[field as keyof FormData].trim() !== ""
    )

    // Check city/country for non-remote positions
    const cityCountryValid = formData.locationType === "Remote" || 
      (formData.locationType && formData.cityCountry.trim() !== "")

    return allMandatoryFilled && cityCountryValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        jobTitle: formData.jobTitle,
        company: formData.company || 'Company',
        location: formData.cityCountry || (formData.locationType ?? 'Remote'),
        jobType: formData.employmentType,
        description: formData.jobSummary,
        requirements: formData.requiredQualifications,
        responsibilities: formData.keyResponsibilities,
        benefits: formData.benefits,
        salaryRange: formData.salary,
        interviewRounds: [],
        platforms: [],
      }
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to create job')
      }

      router.push('/dashboard/jobs')
    } catch (error) {
      console.error("Error creating job:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Job Description</h1>
        <p className="text-gray-600">Fill out the form below to create a comprehensive job posting</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Mandatory Fields Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🔹 Mandatory Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Title */}
              <div className="md:col-span-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">
                  Job Title *
                </Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className={errors.jobTitle ? "border-red-500" : ""}
                />
                {errors.jobTitle && <p className="text-red-500 text-sm mt-1">{errors.jobTitle}</p>}
              </div>

              {/* Location Type */}
              <div>
                <Label htmlFor="locationType" className="text-sm font-medium text-gray-700">
                  Location Type *
                </Label>
                <Select value={formData.locationType} onValueChange={(value) => handleInputChange('locationType', value)}>
                  <SelectTrigger className={errors.locationType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
                {errors.locationType && <p className="text-red-500 text-sm mt-1">{errors.locationType}</p>}
              </div>

              {/* City/Country - Only show if not Remote */}
              {formData.locationType && formData.locationType !== "Remote" && (
                <div>
                  <Label htmlFor="cityCountry" className="text-sm font-medium text-gray-700">
                    City/Country *
                  </Label>
                  <Input
                    id="cityCountry"
                    value={formData.cityCountry}
                    onChange={(e) => handleInputChange('cityCountry', e.target.value)}
                    placeholder="e.g. Singapore, Singapore"
                    className={errors.cityCountry ? "border-red-500" : ""}
                  />
                  {errors.cityCountry && <p className="text-red-500 text-sm mt-1">{errors.cityCountry}</p>}
                </div>
              )}

              {/* Employment Type */}
              <div>
                <Label htmlFor="employmentType" className="text-sm font-medium text-gray-700">
                  Employment Type *
                </Label>
                <Select value={formData.employmentType} onValueChange={(value) => handleInputChange('employmentType', value)}>
                  <SelectTrigger className={errors.employmentType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
                {errors.employmentType && <p className="text-red-500 text-sm mt-1">{errors.employmentType}</p>}
              </div>

              {/* Experience Required */}
              <div>
                <Label htmlFor="experienceRequired" className="text-sm font-medium text-gray-700">
                  Experience Required *
                </Label>
                <Input
                  id="experienceRequired"
                  value={formData.experienceRequired}
                  onChange={(e) => handleInputChange('experienceRequired', e.target.value)}
                  placeholder="e.g. 3+ years in software development"
                  className={errors.experienceRequired ? "border-red-500" : ""}
                />
                {errors.experienceRequired && <p className="text-red-500 text-sm mt-1">{errors.experienceRequired}</p>}
              </div>
            </div>

            {/* Job Summary */}
            <div>
              <Label htmlFor="jobSummary" className="text-sm font-medium text-gray-700">
                Job Summary *
              </Label>
              <Textarea
                id="jobSummary"
                value={formData.jobSummary}
                onChange={(e) => handleInputChange('jobSummary', e.target.value)}
                placeholder="Provide a brief overview of the role and what the candidate will be doing..."
                rows={4}
                className={errors.jobSummary ? "border-red-500" : ""}
              />
              {errors.jobSummary && <p className="text-red-500 text-sm mt-1">{errors.jobSummary}</p>}
            </div>

            {/* Key Responsibilities */}
            <div>
              <Label htmlFor="keyResponsibilities" className="text-sm font-medium text-gray-700">
                Key Responsibilities *
              </Label>
              <Textarea
                id="keyResponsibilities"
                value={formData.keyResponsibilities}
                onChange={(e) => handleInputChange('keyResponsibilities', e.target.value)}
                placeholder="• Develop and maintain web applications&#10;• Collaborate with cross-functional teams&#10;• Write clean, maintainable code..."
                rows={5}
                className={errors.keyResponsibilities ? "border-red-500" : ""}
              />
              {errors.keyResponsibilities && <p className="text-red-500 text-sm mt-1">{errors.keyResponsibilities}</p>}
            </div>

            {/* Required Qualifications */}
            <div>
              <Label htmlFor="requiredQualifications" className="text-sm font-medium text-gray-700">
                Required Qualifications *
              </Label>
              <Textarea
                id="requiredQualifications"
                value={formData.requiredQualifications}
                onChange={(e) => handleInputChange('requiredQualifications', e.target.value)}
                placeholder="• Bachelor's degree in Computer Science or related field&#10;• Strong proficiency in JavaScript and React&#10;• Experience with REST APIs..."
                rows={4}
                className={errors.requiredQualifications ? "border-red-500" : ""}
              />
              {errors.requiredQualifications && <p className="text-red-500 text-sm mt-1">{errors.requiredQualifications}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skills Required */}
              <div>
                <Label htmlFor="skillsRequired" className="text-sm font-medium text-gray-700">
                  Skills Required *
                </Label>
                <Input
                  id="skillsRequired"
                  value={formData.skillsRequired}
                  onChange={(e) => handleInputChange('skillsRequired', e.target.value)}
                  placeholder="JavaScript, React, Node.js, SQL, Git"
                  className={errors.skillsRequired ? "border-red-500" : ""}
                />
                {errors.skillsRequired && <p className="text-red-500 text-sm mt-1">{errors.skillsRequired}</p>}
              </div>

              {/* How to Apply */}
              <div>
                <Label htmlFor="howToApply" className="text-sm font-medium text-gray-700">
                  How to Apply *
                </Label>
                <Input
                  id="howToApply"
                  value={formData.howToApply}
                  onChange={(e) => handleInputChange('howToApply', e.target.value)}
                  placeholder="Send resume to jobs@company.com"
                  className={errors.howToApply ? "border-red-500" : ""}
                />
                {errors.howToApply && <p className="text-red-500 text-sm mt-1">{errors.howToApply}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Fields Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🔸 Recommended Extras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Overview */}
            <div>
              <Label htmlFor="companyOverview" className="text-sm font-medium text-gray-700">
                Company Overview
              </Label>
              <Textarea
                id="companyOverview"
                value={formData.companyOverview}
                onChange={(e) => handleInputChange('companyOverview', e.target.value)}
                placeholder="Tell candidates about your company, mission, and culture..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Structure */}
              <div>
                <Label htmlFor="teamStructure" className="text-sm font-medium text-gray-700">
                  Team Structure
                </Label>
                <Input
                  id="teamStructure"
                  value={formData.teamStructure}
                  onChange={(e) => handleInputChange('teamStructure', e.target.value)}
                  placeholder="e.g. 5-person engineering team"
                />
              </div>

              {/* Tools & Tech Stack */}
              <div>
                <Label htmlFor="toolsTechStack" className="text-sm font-medium text-gray-700">
                  Tools & Tech Stack
                </Label>
                <Input
                  id="toolsTechStack"
                  value={formData.toolsTechStack}
                  onChange={(e) => handleInputChange('toolsTechStack', e.target.value)}
                  placeholder="React, AWS, Docker, Kubernetes"
                />
              </div>

              {/* Salary Range */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Salary Range</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.salaryMin}
                    onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                    placeholder="Min (e.g. 80000)"
                    type="number"
                  />
                  <Input
                    value={formData.salaryMax}
                    onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                    placeholder="Max (e.g. 120000)"
                    type="number"
                  />
                </div>
              </div>

              {/* Travel Requirements */}
              <div>
                <Label htmlFor="travelRequirements" className="text-sm font-medium text-gray-700">
                  Travel Requirements
                </Label>
                <Input
                  id="travelRequirements"
                  value={formData.travelRequirements}
                  onChange={(e) => handleInputChange('travelRequirements', e.target.value)}
                  placeholder="e.g. 10% travel required"
                />
              </div>

              {/* Job Dates */}
              <div>
                <Label htmlFor="jobPostingDate" className="text-sm font-medium text-gray-700">
                  Job Posting Date
                </Label>
                <Input
                  id="jobPostingDate"
                  type="date"
                  value={formData.jobPostingDate}
                  onChange={(e) => handleInputChange('jobPostingDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="jobClosingDate" className="text-sm font-medium text-gray-700">
                  Job Closing Date
                </Label>
                <Input
                  id="jobClosingDate"
                  type="date"
                  value={formData.jobClosingDate}
                  onChange={(e) => handleInputChange('jobClosingDate', e.target.value)}
                />
              </div>
            </div>

            {/* Perks & Benefits */}
            <div>
              <Label htmlFor="perksAndBenefits" className="text-sm font-medium text-gray-700">
                Perks & Benefits
              </Label>
              <Textarea
                id="perksAndBenefits"
                value={formData.perksAndBenefits}
                onChange={(e) => handleInputChange('perksAndBenefits', e.target.value)}
                placeholder="• Health insurance&#10;• Flexible working hours&#10;• Professional development budget..."
                rows={4}
              />
            </div>

            {/* Preferred Qualifications */}
            <div>
              <Label htmlFor="preferredQualifications" className="text-sm font-medium text-gray-700">
                Preferred Qualifications
              </Label>
              <Textarea
                id="preferredQualifications"
                value={formData.preferredQualifications}
                onChange={(e) => handleInputChange('preferredQualifications', e.target.value)}
                placeholder="• Master's degree preferred&#10;• Experience with cloud platforms&#10;• Open source contributions..."
                rows={3}
              />
            </div>

            {/* Diversity Statement */}
            <div>
              <Label htmlFor="diversityStatement" className="text-sm font-medium text-gray-700">
                Diversity Statement
              </Label>
              <Textarea
                id="diversityStatement"
                value={formData.diversityStatement}
                onChange={(e) => handleInputChange('diversityStatement', e.target.value)}
                placeholder="We are an equal opportunity employer committed to diversity and inclusion..."
                rows={3}
              />
            </div>

            {/* Career Path */}
            <div>
              <Label htmlFor="careerPath" className="text-sm font-medium text-gray-700">
                Career Path / Growth Opportunities
              </Label>
              <Textarea
                id="careerPath"
                value={formData.careerPath}
                onChange={(e) => handleInputChange('careerPath', e.target.value)}
                placeholder="Opportunities for advancement to Senior Engineer, Tech Lead, or Engineering Manager roles..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="px-8 py-2 text-lg font-medium"
          >
            {isSubmitting ? "Creating Agent..." : "Create Agent"}
          </Button>
        </div>
      </form>
    </div>
  )
}
