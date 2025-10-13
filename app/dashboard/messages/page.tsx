"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Mail, Phone, User, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  recipientEmail: string
  recipientName?: string
  category: 'interview' | 'new_job' | 'general'
  subject: string
  content: string
  status: string
  sentAt?: string
  createdAt: string
}

export default function MessagesPage() {
  const { company } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState<'interview' | 'new_job' | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  // Category-specific messages to maintain separate drafts for each category
  const [categoryMessages, setCategoryMessages] = useState<{
    interview: string
    new_job: string
  }>({
    interview: "",
    new_job: ""
  })
  // Draft-only mode: no recipient/subject inputs
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [lastSavedDraft, setLastSavedDraft] = useState<{ id: string; category: 'interview' | 'new_job' | 'general' } | null>(null)

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedCategory')

    if (savedCategory && (savedCategory === 'interview' || savedCategory === 'new_job')) {
      setSelectedCategory(savedCategory as 'interview' | 'new_job')
    }
  }, [])

  // Reset messages and clear localStorage when company changes
  useEffect(() => {
    if (company?.id) {
      // Clear previous company's data
      setMessages([])
      setNewMessage("")
      setCategoryMessages({ interview: "", new_job: "" })
      setSelectedCategory(null)
      setLastSavedDraft(null)

      // Clear localStorage to prevent data leakage between accounts
      localStorage.removeItem('selectedCategory')

      // Load messages for current company
      if (selectedCategory) {
        loadMessages(selectedCategory)
      }
    }
  }, [company?.id])

  // Load messages when category is selected
  useEffect(() => {
    if (selectedCategory && (company as any)?.id) {
      loadMessages(selectedCategory)
      // Load the message for the selected category
      setNewMessage(categoryMessages[selectedCategory])
    }
  }, [selectedCategory, categoryMessages, company?.id])

  // Handle category selection
  const handleCategorySelect = (category: 'interview' | 'new_job') => {
    // Save current message to the current category before switching
    if (selectedCategory && newMessage.trim()) {
      const updatedMessages = {
        ...categoryMessages,
        [selectedCategory]: newMessage
      }
      setCategoryMessages(updatedMessages)
      // Don't save to localStorage anymore - only keep in memory for current session
    }

    // Switch to new category
    setSelectedCategory(category)
  }

  const loadMessages = async (category: 'interview' | 'new_job') => {
    if (!(company as any)?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/messages?category=${category}&companyId=${(company as any).id}`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.messages)
      } else {
        toast.error('Failed to load messages')
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const saveDraft = async () => {
    const categoryToUse = selectedCategory || 'interview'
    if (!newMessage.trim()) {
      toast.error('Write a message to save draft')
      return
    }

    if (!(company as any)?.id) {
      toast.error('Company not found')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: categoryToUse,
          content: newMessage,
          status: 'draft',
          companyId: (company as any).id
        })
      })

      const data = await response.json()
      if (data.success) {
        console.log('Draft saved:', data)
        toast.success('Draft saved')
        // Keep the message in the input box so user can continue editing
        // setNewMessage('') // Removed this line
        // Reload
        loadMessages(categoryToUse)
        if (data.message?.id) {
          setLastSavedDraft({ id: data.message.id, category: data.message.category })
        }
      } else {
        console.error('Draft save failed:', data)
        toast.error(data.error || 'Failed to save draft')
      }
    } catch (err) {
      console.error('Error saving draft:', err)
      toast.error('Failed to save draft')
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "read":
        return "bg-purple-100 text-purple-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Manage candidate communications and outreach</p>
        </div>
        <Button className="linkedin-button">
          <MessageSquare className="h-4 w-4 mr-2" />
          Compose Message
        </Button>
      </div>

      {/* Message Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedCategory === 'interview' ? 'ring-2 ring-blue-500 bg-blue-50' : 'linkedin-card'
          }`}
          onClick={() => handleCategorySelect('interview')}
        >
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">Interview</h3>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedCategory === 'new_job' ? 'ring-2 ring-blue-500 bg-blue-50' : 'linkedin-card'
          }`}
          onClick={() => handleCategorySelect('new_job')}
        >
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">New Job ID</h3>
          </CardContent>
        </Card>
      </div>

      {/* Inbox Section */}
      <Card className="linkedin-card">
        <CardHeader>
          <CardTitle className="text-lg">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Enhanced Message Input Area */}
          <div className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-lg font-semibold text-gray-800">Compose Message</label>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Category: {selectedCategory === 'interview' ? 'Interview Messages' : selectedCategory === 'new_job' ? 'Job Messages' : 'Select Category'}</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Message *</label>
              <Textarea
                placeholder={selectedCategory ? "Type your message here..." : "Select a category first to start typing..."}
                value={newMessage}
                onChange={(e) => {
                  if (!selectedCategory) {
                    toast.error('Select the category first.')
                    return
                  }
                  setNewMessage(e.target.value)
                  // Also update the category-specific message in memory only
                  const updatedMessages = {
                    ...categoryMessages,
                    [selectedCategory]: e.target.value
                  }
                  setCategoryMessages(updatedMessages)
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault()
                    saveDraft()
                  }
                }}
                rows={10}
                className="linkedin-input text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedCategory}
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{newMessage.length} characters</span>
                <span>•</span>
                <span>Press Ctrl+Enter to send</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  className="px-4"
                  disabled={sending || !newMessage.trim() || !selectedCategory}
                  onClick={() => {
                    if (selectedCategory) {
                      setNewMessage('')
                      const updatedMessages = {
                        ...categoryMessages,
                        [selectedCategory]: ''
                      }
                      setCategoryMessages(updatedMessages)
                      setLastSavedDraft(null)
                      toast.success('Message cleared')
                    }
                  }}
                >
                  Clear
                </Button>
                <Button 
                  variant="outline" 
                  className="px-8"
                  disabled={sending}
                  onClick={saveDraft}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {sending ? 'Saving…' : 'Save Draft'}
                </Button>
                {lastSavedDraft && (
                  <span className="text-xs text-gray-500">Last draft: {lastSavedDraft.id} ({lastSavedDraft.category})</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
