"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { X, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: {
    id: string
    candidateName: string
    email: string
    appliedJD: string
    jobId: string
  }
  company?: {
    id: string
    name: string
  } | null
  onSendEmail: (message: string, category: 'interview' | 'new_job') => Promise<void>
}

export default function SendEmailModal({ isOpen, onClose, candidate, company, onSendEmail }: SendEmailModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'interview' | 'new_job'>('interview')
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
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
  }>({
    companyName: "",
    userJobTitle: "",
    interviewLink: ""
  })

  // Load saved messages and company data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSavedMessages()
      loadCompanyData()
    }
  }, [isOpen])

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
      // Generate the actual interview link using the same format as the API
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const interviewLink = `${baseUrl}/interview/${encodeURIComponent(candidate.id)}/start`
      
      // Try to get company data from localStorage (saved from auth context)
      const savedCompanyData = localStorage.getItem('companyData')
      let companyName = "TATA" // Correct company name
      let userJobTitle = "HR Manager"
      
      if (savedCompanyData) {
        try {
          const parsed = JSON.parse(savedCompanyData)
          companyName = parsed.name || companyName
          userJobTitle = parsed.userRole || userJobTitle
        } catch (e) {
          console.error('Error parsing company data:', e)
        }
      }
      
      setCompanyData({
        companyName,
        userJobTitle,
        interviewLink
      })
    } catch (error) {
      console.error('Error loading company data:', error)
      // Fallback to defaults with correct company name
      const baseUrl = "http://localhost:3000"
      setCompanyData({
        companyName: "TATA",
        userJobTitle: "HR Manager", 
        interviewLink: `${baseUrl}/interview/${encodeURIComponent(candidate.id)}/start`
      })
    }
  }

  const replacePlaceholders = (text: string): string => {
    if (!text) return ""
    
    return text
      .replace(/\[Job Title\]/g, candidate.appliedJD)
      .replace(/\[Company Name\]/g, companyData.companyName)
      .replace(/\[Candidate Name\]/g, candidate.candidateName)
      .replace(/\[Insert Meeting Link\]/g, companyData.interviewLink)
      .replace(/\[Your Job Title\]/g, companyData.userJobTitle)
  }

  const handleCategorySelect = (category: 'interview' | 'new_job') => {
    setSelectedCategory(category)
    const rawMessage = savedMessages[category] || ""
    const processedMessage = replacePlaceholders(rawMessage)
    setMessage(processedMessage)
  }

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSending(true)
    try {
      await onSendEmail(message, selectedCategory)
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
              <p><strong>Position:</strong> {candidate.appliedJD}</p>
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
