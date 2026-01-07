"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { X, Send, Loader2, Users } from "lucide-react"
import { toast } from "sonner"

interface CandidateData {
  id: string
  candidateName: string
  email: string
  appliedJD: string
  jobId: string
  jobTitle?: string
}

interface SendBulkEmailModalProps {
  isOpen: boolean
  onClose: () => void
  candidates: CandidateData[]
  company?: {
    id: string
    name: string
  } | null
  user?: {
    id: string
    full_name: string
    email: string
  } | null
  onSendBulkEmail: (candidates: CandidateData[], message: string, category: 'interview' | 'new_job') => Promise<void>
}

export default function SendBulkEmailModal({ 
  isOpen, 
  onClose, 
  candidates, 
  company, 
  user, 
  onSendBulkEmail 
}: SendBulkEmailModalProps) {
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
    recruiterName: string
  }>({
    companyName: "",
    userJobTitle: "",
    recruiterName: ""
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
      // For bulk email, we show template with placeholders that will be replaced per-candidate
      setMessage(savedMessages[selectedCategory])
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
        recruiterName
      })
    } catch (error) {
      console.error('Error loading company data:', error)
      setCompanyData({
        companyName: (company as any)?.name || "",
        userJobTitle: "HR Manager", 
        recruiterName: user?.full_name || ""
      })
    }
  }

  const handleCategorySelect = (category: 'interview' | 'new_job') => {
    setSelectedCategory(category)
    const rawMessage = savedMessages[category] || ""
    setMessage(rawMessage)
  }

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSending(true)
    try {
      await onSendBulkEmail(candidates, message, selectedCategory)
      onClose()
      toast.success(`Emails sent successfully to ${candidates.length} candidates!`)
    } catch (error) {
      toast.error('Failed to send emails')
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
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Send Email to {candidates.length} Candidates
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Candidates Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Selected Candidates ({candidates.length}):</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {candidates.map((c) => (
                  <p key={c.id} className="text-xs">
                    • {c.candidateName} ({c.email}) - {c.jobTitle || c.appliedJD}
                  </p>
                ))}
              </div>
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">Message Template</label>
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
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Note: Placeholders like [Candidate Name], [Job Title], [Insert Meeting Link] will be replaced individually for each candidate.
            </p>
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
                  Sending to {candidates.length}...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to All ({candidates.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
