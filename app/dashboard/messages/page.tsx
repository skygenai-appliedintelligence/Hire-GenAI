"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Mail, Phone, User, Loader2, Briefcase, Users2, X, Lightbulb } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [selectedCategory, setSelectedCategory] = useState<'interview' | 'new_job' | null>('interview')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if user has saved any draft on first visit
  useEffect(() => {
    const hasSavedDraft = localStorage.getItem('messagesPageDraftSaved')
    if (!hasSavedDraft) {
      setShowOnboarding(true)
    }
  }, [])

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedCategory')

    if (savedCategory && (savedCategory === 'interview' || savedCategory === 'new_job')) {
      setSelectedCategory(savedCategory as 'interview' | 'new_job')
    }
  }, [])

  // Clear messages when company changes (company-specific data)
  useEffect(() => {
    if (company?.id) {
      // Clear all messages and state for the new company
      setMessages([])
      setNewMessage('')
      setCategoryMessages({ interview: '', new_job: '' })
      setLastSavedDraft(null)
    }
  }, [company?.id])

  // Load messages when category is selected or company is available
  useEffect(() => {
    if (selectedCategory && (company as any)?.id) {
      loadMessages(selectedCategory)
    }
  }, [selectedCategory, company?.id])

  // Auto-adjust textarea height when message or category changes
  useEffect(() => {
    // Small delay to ensure DOM is updated with new content
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      }
    }, 0)
    
    return () => clearTimeout(timer)
  }, [newMessage, selectedCategory])

  // Handle category selection
  const handleCategorySelect = (category: 'interview' | 'new_job') => {
    // Save current message to the current category before switching
    if (selectedCategory && newMessage.trim()) {
      const updatedMessages = {
        ...categoryMessages,
        [selectedCategory]: newMessage
      }
      setCategoryMessages(updatedMessages)
    }

    // Switch to new category
    setSelectedCategory(category)
    
    // Load saved message immediately from memory for instant feedback
    // (loadMessages will update from DB via useEffect)
    if (categoryMessages[category]) {
      setNewMessage(categoryMessages[category])
    } else {
      setNewMessage('') // Clear if no message for this category yet
    }
  }

  const loadMessages = async (category: 'interview' | 'new_job') => {
    if (!(company as any)?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/messages?category=${category}&companyId=${(company as any).id}&includeDrafts=true`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.messages)
        
        // Load the most recent draft into textarea
        const drafts = data.messages.filter((m: any) => m.status === 'draft')
        if (drafts.length > 0) {
          const mostRecentDraft = drafts[0] // Already sorted by created_at DESC
          setNewMessage(mostRecentDraft.content || '')
          
          // Update category messages
          setCategoryMessages(prev => ({
            ...prev,
            [category]: mostRecentDraft.content || ''
          }))
        } else {
          // No draft found - clear the message for this category
          setNewMessage('')
          setCategoryMessages(prev => ({
            ...prev,
            [category]: ''
          }))
        }
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
        // Update category messages with saved content
        setCategoryMessages(prev => ({
          ...prev,
          [categoryToUse]: newMessage
        }))
        
        if (data.message?.id) {
          setLastSavedDraft({ id: data.message.id, category: data.message.category })
        }
        
        // Mark that user has saved a draft - hide onboarding popup
        localStorage.setItem('messagesPageDraftSaved', 'true')
        setShowOnboarding(false)
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
    <div className="space-y-4 px-4 md:px-6 py-6 bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20">
      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Lightbulb className="h-6 w-6 text-emerald-600" />
              </div>
              <DialogTitle>Welcome to Draft Messages</DialogTitle>
            </div>
            <div className="text-base pt-2">
              <div className="space-y-4">
                <div className="text-gray-700">
                  This is your <span className="font-semibold text-gray-900">Draft Message</span> section where you can prepare professional emails to send to candidates.
                </div>
                
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-emerald-600 font-bold">1</div>
                    <div>
                      <div className="font-medium text-gray-900">Choose a Category</div>
                      <div className="text-sm text-gray-600">Select between Interview or New Job messages</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-emerald-600 font-bold">2</div>
                    <div>
                      <div className="font-medium text-gray-900">Compose Your Message</div>
                      <div className="text-sm text-gray-600">Write your email in the text area</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-emerald-600 font-bold">3</div>
                    <div>
                      <div className="font-medium text-gray-900">Save as Draft</div>
                      <div className="text-sm text-gray-600">Your message is automatically saved and persists across sessions</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 italic">
                  💡 Tip: Use <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">Ctrl+Enter</span> to quickly save your draft
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="pt-4">
            <Button
              onClick={() => setShowOnboarding(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Draft and manage candidate communications</p>
        </div>
      </div>

      {/* Tabs for Categories */}
      <Tabs 
        value={selectedCategory || 'interview'} 
        onValueChange={(val) => handleCategorySelect(val as 'interview' | 'new_job')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="interview" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Interview
          </TabsTrigger>
          <TabsTrigger value="new_job" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            New Job
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interview" className="mt-4">
          <Card className="border-blue-100 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  Compose Interview Message
                </h3>
                <Badge variant="outline" className="text-xs">
                  {newMessage.length} chars
                </Badge>
              </div>
              
              {loading ? (
                <div className="py-8">
                  <Spinner size="md" text="Loading interview message..." className="mx-auto" />
                </div>
              ) : (
              <>
              <Textarea
                ref={textareaRef}
                placeholder="Type your interview message here..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  if (selectedCategory) {
                    const updatedMessages = {
                      ...categoryMessages,
                      [selectedCategory]: e.target.value
                    }
                    setCategoryMessages(updatedMessages)
                  }
                  // Auto-expand textarea
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault()
                    saveDraft()
                  }
                }}
                className="min-h-[200px] max-h-[600px] overflow-y-auto focus:ring-2 focus:ring-blue-500 border-gray-200 resize-y"
              />
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">Ctrl+Enter to save</span>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={sending || !newMessage.trim()}
                    onClick={() => {
                      if (selectedCategory) {
                        setNewMessage('')
                        const updatedMessages = {
                          ...categoryMessages,
                          [selectedCategory]: ''
                        }
                        setCategoryMessages(updatedMessages)
                        setLastSavedDraft(null)
                        toast.success('Cleared')
                      }
                    }}
                  >
                    Clear
                  </Button>
                  <Button 
                    size="sm"
                    disabled={sending || !newMessage.trim()}
                    onClick={saveDraft}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sending ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    {sending ? 'Saving...' : 'Save Draft'}
                  </Button>
                </div>
              </div>
              
              {lastSavedDraft && lastSavedDraft.category === 'interview' && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Draft saved
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new_job" className="mt-4">
          <Card className="border-emerald-100 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  Compose Job Message
                </h3>
                <Badge variant="outline" className="text-xs">
                  {newMessage.length} chars
                </Badge>
              </div>
              
              {loading ? (
                <div className="py-8">
                  <Spinner size="md" text="Loading job message..." className="mx-auto" />
                </div>
              ) : (
              <>
              <Textarea
                ref={textareaRef}
                placeholder="Type your job announcement message here..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  if (selectedCategory) {
                    const updatedMessages = {
                      ...categoryMessages,
                      [selectedCategory]: e.target.value
                    }
                    setCategoryMessages(updatedMessages)
                  }
                  // Auto-expand textarea
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault()
                    saveDraft()
                  }
                }}
                className="min-h-[200px] max-h-[600px] overflow-y-auto focus:ring-2 focus:ring-emerald-500 border-gray-200 resize-y"
              />
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">Ctrl+Enter to save</span>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={sending || !newMessage.trim()}
                    onClick={() => {
                      if (selectedCategory) {
                        setNewMessage('')
                        const updatedMessages = {
                          ...categoryMessages,
                          [selectedCategory]: ''
                        }
                        setCategoryMessages(updatedMessages)
                        setLastSavedDraft(null)
                        toast.success('Cleared')
                      }
                    }}
                  >
                    Clear
                  </Button>
                  <Button 
                    size="sm"
                    disabled={sending || !newMessage.trim()}
                    onClick={saveDraft}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {sending ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    {sending ? 'Saving...' : 'Save Draft'}
                  </Button>
                </div>
              </div>
              
              {lastSavedDraft && lastSavedDraft.category === 'new_job' && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  ✓ Draft saved
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
