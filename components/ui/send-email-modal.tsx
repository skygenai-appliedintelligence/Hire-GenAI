"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { X, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getAppUrl, getInterviewStartLink, getAppLink } from "@/lib/utils/url"

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: {
    id: string
    candidateName: string
    email: string
    appliedJD: string
    jobId: string
    jobTitle?: string
  }
  company?: {
    id: string
    name: string
  } | null
  user?: {
    id: string
    full_name: string
    email: string
  } | null
  onSendEmail: (message: string, category: 'interview' | 'new_job') => Promise<void>
}

export default function SendEmailModal({ isOpen, onClose, candidate, company, user, onSendEmail }: SendEmailModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'interview' | 'new_job'>('interview')
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState("")
  const [jobTitleError, setJobTitleError] = useState(false)
  const [savedMessages, setSavedMessages] = useState<{
    interview: string
    new_job: string
  }>({
    interview: "",
    new_job: ""
  })
  const [companyData, setCompanyData] = useState<{
    companyName: string
    userJobTitle: string
    interviewLink: string
    recruiterName: string
  }>({
    companyName: "",
    userJobTitle: "",
    interviewLink: "",
    recruiterName: ""
  })
  const [availableJobs, setAvailableJobs] = useState<{ id: string; title: string; status: string }[]>([])
  const [matchedJob, setMatchedJob] = useState<{ id: string; title: string; applyLink: string } | null>(null)
  const [searchingJob, setSearchingJob] = useState(false)

  // Load saved messages and company data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSavedMessages()
      loadCompanyData()
      loadAvailableJobs()
    }
  }, [isOpen])

  // Search for matching job when job title changes
  useEffect(() => {
    if (selectedCategory === 'new_job' && newJobTitle.trim()) {
      searchMatchingJob(newJobTitle.trim())
    } else {
      setMatchedJob(null)
    }
  }, [newJobTitle, selectedCategory, availableJobs])

  // Update message when category changes
  useEffect(() => {
    if (isOpen && savedMessages[selectedCategory]) {
      const processedMessage = replacePlaceholders(savedMessages[selectedCategory])
      setMessage(processedMessage)
    }
  }, [selectedCategory, savedMessages, companyData])

  const loadSavedMessages = async () => {
    try {
      const companyId = (company as any)?.id
      
      if (!companyId) {
        console.warn('No company ID found, cannot load messages')
        return
      }

      // Fetch messages for both categories
      const [interviewRes, jobRes] = await Promise.all([
        fetch(`/api/messages?category=interview&companyId=${companyId}&includeDrafts=true`),
        fetch(`/api/messages?category=new_job&companyId=${companyId}&includeDrafts=true`)
      ])

      const interviewData = await interviewRes.json()
      const jobData = await jobRes.json()

      const messages = {
        interview: "",
        new_job: ""
      }

      // Get the most recent draft for each category
      if (interviewData.success && interviewData.messages?.length > 0) {
        const drafts = interviewData.messages.filter((m: any) => m.status === 'draft')
        if (drafts.length > 0) {
          messages.interview = drafts[0].content || ""
        }
      }

      if (jobData.success && jobData.messages?.length > 0) {
        const drafts = jobData.messages.filter((m: any) => m.status === 'draft')
        if (drafts.length > 0) {
          messages.new_job = drafts[0].content || ""
        }
      }

      setSavedMessages(messages)
    } catch (error) {
      console.error('Error loading saved messages:', error)
    }
  }

  const loadCompanyData = async () => {
    try {
      // Generate the actual interview link using dynamic URL
      const interviewLink = getInterviewStartLink(candidate.id)
      
      // Prefer company prop, then enhance from localStorage if available
      const savedCompanyData = localStorage.getItem('companyData')
      let companyName = (company as any)?.name || ""
      let userJobTitle = "HR Manager"
      let recruiterName = user?.full_name || ""
      
      if (savedCompanyData) {
        try {
          const parsed = JSON.parse(savedCompanyData)
          companyName = companyName || parsed.name || ""
          userJobTitle = parsed.userRole || userJobTitle
        } catch (e) {
          console.error('Error parsing company data:', e)
        }
      }
      
      setCompanyData({
        companyName,
        userJobTitle,
        interviewLink,
        recruiterName
      })
    } catch (error) {
      console.error('Error loading company data:', error)
      // Fallback to defaults with correct company name
      setCompanyData({
        companyName: (company as any)?.name || "",
        userJobTitle: "HR Manager", 
        interviewLink: getInterviewStartLink(candidate.id),
        recruiterName: user?.full_name || ""
      })
    }
  }

  const loadAvailableJobs = async () => {
    try {
      const companyId = (company as any)?.id
      if (!companyId) return

      const res = await fetch(`/api/jobs/titles?companyId=${companyId}`)
      const data = await res.json()
      
      if (data.ok && data.jobs) {
        setAvailableJobs(data.jobs)
      }
    } catch (error) {
      console.error('Error loading available jobs:', error)
    }
  }

  const searchMatchingJob = (searchTitle: string) => {
    setSearchingJob(true)
    
    // Find job that matches the title (case-insensitive)
    const normalizedSearch = searchTitle.toLowerCase().trim()
    const matched = availableJobs.find(job => 
      job.title.toLowerCase().trim() === normalizedSearch ||
      job.title.toLowerCase().trim().includes(normalizedSearch) ||
      normalizedSearch.includes(job.title.toLowerCase().trim())
    )

    if (matched) {
      // Generate the apply link using dynamic URL
      const companySlug = (company?.name || '').toLowerCase().replace(/\s+/g, '-')
      const applyLink = getAppLink(`/jobs/${companySlug}/${matched.id}`)
      
      setMatchedJob({
        id: matched.id,
        title: matched.title,
        applyLink
      })
    } else {
      setMatchedJob(null)
    }
    
    setSearchingJob(false)
  }

  const replacePlaceholders = (text: string): string => {
    if (!text) return ""
    
    const jobTitle = candidate.jobTitle || candidate.appliedJD || "N/A"
    
    return text
      .replace(/\[Job Title\]/g, jobTitle)
      .replace(/\[Role Name\]/g, jobTitle)
      .replace(/\[Company Name\]/g, companyData.companyName)
      .replace(/\[Candidate Name\]/g, candidate.candidateName)
      .replace(/\[Insert Meeting Link\]/g, companyData.interviewLink)
      .replace(/\[Your Job Title\]/g, companyData.userJobTitle)
      .replace(/\[Date\]/g, "Valid for 48 hours")
      .replace(/\[Your Name\]/g, companyData.recruiterName || "Recruitment Team")
      .replace(/\[Your Designation\]/g, companyData.userJobTitle)
  }

  const handleCategorySelect = (category: 'interview' | 'new_job') => {
    setSelectedCategory(category)
    const rawMessage = savedMessages[category] || ""
    const processedMessage = replacePlaceholders(rawMessage)
    setMessage(processedMessage)
    // Clear job title error when switching tabs
    setJobTitleError(false)
  }

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    // Validate Job Title is required for New Job category
    if (selectedCategory === 'new_job' && !newJobTitle.trim()) {
      setJobTitleError(true)
      toast.error('Please enter a Job Title for the new job opportunity')
      return
    }

    setSending(true)
    try {
      // Get user's first name from email or full name
      let userName = ""
      if (user?.full_name) {
        userName = user.full_name.split(' ')[0]
      } else if (user?.email) {
        const emailParts = user.email.split('@')[0].split('+')
        const emailName = emailParts[0]
        userName = emailName.replace(/[0-9]/g, '').replace(/^\w/, c => c.toUpperCase())
      }

      // For new_job category, replace placeholders with job details
      let finalMessage = message
      
      // Replace [Your Name] with user's name
      finalMessage = finalMessage.replace(/\[Your Name\]/g, userName || "Recruitment Team")
      
      if (selectedCategory === 'new_job' && newJobTitle.trim()) {
        finalMessage = finalMessage.replace(/\[Job Title\]/g, newJobTitle.trim())
        
        // Replace apply link placeholder if we have a matched job
        if (matchedJob?.applyLink) {
          finalMessage = finalMessage
            .replace(/\[Apply Link\]/g, matchedJob.applyLink)
            .replace(/\[Apply Now Link\]/g, matchedJob.applyLink)
            .replace(/\[Application Link\]/g, matchedJob.applyLink)
        }
      }

      await onSendEmail(finalMessage, selectedCategory)
      onClose()
      toast.success('Email sent successfully!')
    } catch (error) {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setMessage("")
    setSelectedCategory('interview')
    setNewJobTitle("")
    setJobTitleError(false)
    setMatchedJob(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Send Email to {candidate.candidateName}</span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <p><strong>Email:</strong> {candidate.email}</p>
              <p><strong>Position:</strong> {candidate.jobTitle || candidate.appliedJD || 'N/A'}</p>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Message Type</label>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === 'interview' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleCategorySelect('interview')}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="text-sm font-semibold text-gray-900">Interview</h3>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === 'new_job' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleCategorySelect('new_job')}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="text-sm font-semibold text-gray-900">New Job</h3>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Job Title Input - Only for New Job category */}
          {selectedCategory === 'new_job' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter the job title for this opportunity"
                value={newJobTitle}
                onChange={(e) => {
                  setNewJobTitle(e.target.value)
                  if (e.target.value.trim()) setJobTitleError(false)
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  jobTitleError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {jobTitleError && (
                <p className="text-xs text-red-500 mt-1">Job Title is required for sending new job emails</p>
              )}
              
              {/* Show matched job info */}
              {newJobTitle.trim() && (
                <div className={`mt-2 p-2 rounded text-xs ${
                  matchedJob 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  {searchingJob ? (
                    <span className="text-gray-600">Searching for matching job...</span>
                  ) : matchedJob ? (
                    <div>
                      <p className="text-green-700 font-medium">✓ Job Found: {matchedJob.title}</p>
                      <p className="text-green-600 mt-1">
                        <strong>Apply Link:</strong>{' '}
                        <a href={matchedJob.applyLink} target="_blank" rel="noopener noreferrer" className="underline break-all">
                          {matchedJob.applyLink}
                        </a>
                      </p>
                      <p className="text-green-600 mt-1 text-[11px]">This link will be automatically included in the email.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-amber-700 font-medium">⚠ No matching job found for "{newJobTitle}"</p>
                      <p className="text-amber-600 mt-1">Please ensure the job title matches an existing job in your dashboard, or create the job first.</p>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                <strong>Note:</strong> Job Title is mandatory. The Apply Link and other job details will be auto-fetched from your job listings.
              </p>
            </div>
          )}

          {/* Message Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Message</label>
            <Textarea
              placeholder={savedMessages[selectedCategory] ? "Message loaded from drafts..." : "No saved message found for this category"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">{message.length} characters</span>
              <div className="flex items-center space-x-2">
                {savedMessages[selectedCategory] && (
                  <span className="text-xs text-green-600">✓ Message loaded from drafts</span>
                )}
                {message.includes(candidate.candidateName) && (
                  <span className="text-xs text-blue-600">✓ Placeholders replaced</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={sending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
