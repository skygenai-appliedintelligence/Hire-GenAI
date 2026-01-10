"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { 
  Plus, 
  MessageCircle, 
  CheckCircle, 
  Send, 
  Upload, 
  X, 
  Calendar,
  Clock,
  AlertCircle,
  ChevronLeft,
  Image as ImageIcon,
  RefreshCw,
  Loader2,
  Headphones,
  TicketIcon,
  Menu,
  XIcon,
  Lightbulb,
  Star,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Message {
  id: string
  sender_type: "customer" | "support" | "system"
  sender_name?: string
  message: string
  screenshot_url?: string
  created_at: string
}

interface Ticket {
  id: string
  ticket_number: string
  title: string
  category: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed"
  user_email: string
  user_name?: string
  assigned_to?: string
  first_response_at?: string
  resolved_at?: string
  messages: Message[]
  message_count?: number
  first_message?: string
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  "Account & Billing",
  "Job Posting",
  "Candidate Management",
  "Interview Issues",
  "Technical Problem",
  "Feature Request",
  "Other"
]

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700", dot: "bg-red-500" }
]

const STATUS_STYLES: Record<string, { bg: string, text: string, label: string }> = {
  "open": { bg: "bg-yellow-100", text: "text-yellow-700", label: "Open" },
  "in_progress": { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
  "waiting_customer": { bg: "bg-purple-100", text: "text-purple-700", label: "Awaiting Reply" },
  "resolved": { bg: "bg-emerald-100", text: "text-emerald-700", label: "Resolved" },
  "closed": { bg: "bg-gray-100", text: "text-gray-700", label: "Closed" }
}

export default function SupportPage() {
  const { user, company, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab") || "new"
  const [activeTab, setActiveTab] = useState<"new" | "open" | "resolved" | "feedback">(tabParam as any)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyScreenshot, setReplyScreenshot] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // New ticket form state
  const [newTicket, setNewTicket] = useState({
    type: "support" as "support" | "feedback",
    title: "",
    category: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    description: "",
    screenshot: null as string | null
  })

  // Load tickets from database
  const loadTickets = async () => {
    if (!company?.id) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/support/tickets?companyId=${company.id}`)
      const data = await res.json()
      if (data.success) {
        setTickets(data.tickets)
      }
    } catch (error) {
      console.error("Failed to load tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync URL with tab changes and redirect base URL to ?tab=new
  useEffect(() => {
    if (!tabParam) {
      // If no tab parameter, redirect to ?tab=new
      router.replace('/support-hiregenai?tab=new')
    } else {
      setActiveTab(tabParam as any)
    }
  }, [tabParam])

  // Update URL when tab changes
  const handleTabChange = (tab: "new" | "open" | "resolved" | "feedback") => {
    setActiveTab(tab)
    router.push(`/support-hiregenai?tab=${tab}`)
    setSelectedTicket(null)
  }

  // Load tickets on mount and when company changes
  useEffect(() => {
    if (company?.id) {
      loadTickets()
    }
  }, [company?.id])

  // Refresh ticket data periodically (every 30 seconds)
  useEffect(() => {
    if (!company?.id) return
    const interval = setInterval(loadTickets, 30000)
    return () => clearInterval(interval)
  }, [company?.id])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedTicket?.messages])

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, isReply = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed")
      return
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      alert("File size must be less than 1MB")
      return
    }

    // Upload to Vercel Blob
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const res = await fetch("/api/support/upload", {
        method: "POST",
        body: formData
      })
      
      const data = await res.json()
      if (data.success) {
        if (isReply) {
          setReplyScreenshot(data.url)
        } else {
          setNewTicket(prev => ({ ...prev, screenshot: data.url }))
        }
      } else {
        alert(data.error || "Failed to upload screenshot")
      }
    } catch (error) {
      console.error("Screenshot upload error:", error)
      alert("Failed to upload screenshot")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.category || !newTicket.description.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company?.id,
          userId: user?.id,
          userEmail: user?.email,
          userName: (user as any)?.name || user?.email?.split("@")[0],
          type: newTicket.type,
          title: newTicket.title.trim(),
          category: newTicket.category,
          priority: newTicket.priority,
          description: newTicket.description.trim(),
          screenshot: newTicket.screenshot
        })
      })

      const data = await res.json()
      if (data.success) {
        setNewTicket({ type: "support", title: "", category: "", priority: "medium", description: "", screenshot: null })
        await loadTickets()
        // Redirect based on ticket type
        if (newTicket.type === "feedback") {
          handleTabChange("feedback")
        } else {
          handleTabChange("open")
        }
        // Keep spinner for a moment to show completion
        setTimeout(() => {
          setIsSubmitting(false)
        }, 500)
      } else {
        alert(data.error || "Failed to create ticket")
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      alert("Failed to create ticket. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "customer",
          senderName: (user as any)?.name || user?.email?.split("@")[0],
          senderEmail: user?.email,
          message: replyText.trim(),
          screenshot: replyScreenshot
        })
      })

      const data = await res.json()
      if (data.success) {
        // Refresh ticket details
        const ticketRes = await fetch(`/api/support/tickets/${selectedTicket.id}`)
        const ticketData = await ticketRes.json()
        if (ticketData.success) {
          setSelectedTicket(ticketData.ticket)
        }
        setReplyText("")
        setReplyScreenshot(null)
        loadTickets()
      }
    } catch (error) {
      console.error("Error sending reply:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleScheduleMeeting = async () => {
    if (!selectedTicket) return

    const meetingLink = `https://meet.hiregenai.com/${selectedTicket.ticket_number}-${Date.now()}`
    
    try {
      await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "customer",
          senderName: (user as any)?.name || user?.email?.split("@")[0],
          senderEmail: user?.email,
          message: `📅 Meeting requested. Please join: ${meetingLink}`
        })
      })

      // Refresh ticket
      const ticketRes = await fetch(`/api/support/tickets/${selectedTicket.id}`)
      const ticketData = await ticketRes.json()
      if (ticketData.success) {
        setSelectedTicket(ticketData.ticket)
      }
      loadTickets()
    } catch (error) {
      console.error("Error scheduling meeting:", error)
    }
  }

  // Load single ticket with messages
  const loadTicketDetail = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error("Failed to load ticket:", error)
    }
  }

  const openTickets = tickets.filter(t => ["open", "in_progress", "waiting_customer"].includes(t.status) && (t as any).type !== "feedback")
  const resolvedTickets = tickets.filter(t => ["resolved", "closed"].includes(t.status) && (t as any).type !== "feedback")
  const feedbackItems = tickets.filter(t => (t as any).type === "feedback")

  const getPriorityStyle = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority)?.color || "bg-gray-100 text-gray-700"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed top-0 left-64 right-0 bottom-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 h-screen w-64 bg-white z-50 md:hidden transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
                <p className="text-gray-600 mt-1">Get help with HireGenAI</p>
              </div>
            </div>

            {/* Tabs - Horizontal scroll on mobile */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-max sm:w-fit">
                <button
                  onClick={() => handleTabChange("new")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "new" 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  New
                </button>
                <button
                  onClick={() => handleTabChange("open")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "open" 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Open
                  {openTickets.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                      {openTickets.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange("resolved")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "resolved" 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Resolved
                  {resolvedTickets.length > 0 && (
                    <span className="bg-gray-200 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                      {resolvedTickets.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange("feedback")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "feedback" 
                      ? "bg-white text-emerald-700 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Feedback
                  {feedbackItems.filter(f => f.status === "open").length > 0 && (
                    <span className="bg-amber-100 text-amber-700 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                      {feedbackItems.filter(f => f.status === "open").length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* New Ticket Form */}
            {activeTab === "new" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  {newTicket.type === "support" ? "Create New Support Ticket" : "Submit Product Feedback"}
                </h2>
                
                <div className="space-y-5">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={newTicket.type}
                      onValueChange={(value) => setNewTicket(prev => ({ ...prev, type: value as "support" | "feedback" }))}
                    >
                      <SelectTrigger className="w-full px-3 sm:px-4 py-2.5 h-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm sm:text-base">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg z-[100]">
                        <SelectItem value="support" className="cursor-pointer hover:bg-gray-100">Support Request</SelectItem>
                        <SelectItem value="feedback" className="cursor-pointer hover:bg-gray-100">Product Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {newTicket.type === "support" 
                        ? "Need help with an issue? Submit a support ticket." 
                        : "Have ideas or suggestions? Share your product feedback."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newTicket.type === "support" ? "Title" : "Feedback Title"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={newTicket.type === "support" ? "Brief description of your issue" : "What feature or improvement would you like to suggest?"}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={newTicket.category}
                        onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="w-full px-3 sm:px-4 py-2.5 h-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm sm:text-base">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg z-[100] max-h-[200px]">
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="cursor-pointer hover:bg-gray-100">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {newTicket.type === "support" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <Select
                        value={newTicket.priority}
                        onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as any }))}
                      >
                        <SelectTrigger className="w-full px-3 sm:px-4 py-2.5 h-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm sm:text-base">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg z-[100]">
                          {PRIORITIES.map(p => (
                            <SelectItem key={p.value} value={p.value} className="cursor-pointer hover:bg-gray-100">{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newTicket.type === "support" ? "Description" : "Feedback Details"} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={newTicket.type === "support" ? "Please describe your issue in detail..." : "Tell us about your idea, suggestion, or feedback..."}
                      rows={5}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Screenshot (optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleScreenshotUpload(e)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Screenshot
                          </>
                        )}
                      </button>
                      <span className="text-sm text-gray-500">Max 1MB, images only</span>
                    </div>
                    {newTicket.screenshot && (
                      <div className="mt-3 relative inline-block">
                        <img 
                          src={newTicket.screenshot} 
                          alt="Screenshot preview" 
                          className="max-w-xs rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => setNewTicket(prev => ({ ...prev, screenshot: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleCreateTicket}
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {newTicket.type === "support" ? "Submitting..." : "Submitting..."}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {newTicket.type === "support" ? "Submit Ticket" : "Submit Feedback"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Open/Resolved Tickets List */}
            {(activeTab === "open" || activeTab === "resolved") && !selectedTicket && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {(activeTab === "open" ? openTickets : resolvedTickets).length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {activeTab === "open" ? (
                        <MessageCircle className="w-8 h-8 text-gray-400" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {activeTab} tickets
                    </h3>
                    <p className="text-gray-500">
                      {activeTab === "open" 
                        ? "You don't have any open support tickets." 
                        : "No resolved tickets yet."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {(activeTab === "open" ? openTickets : resolvedTickets).map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => loadTicketDetail(ticket.id)}
                        className="p-3 md:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs md:text-sm font-mono text-gray-500">{ticket.ticket_number}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]?.bg || "bg-gray-100"} ${STATUS_STYLES[ticket.status]?.text || "text-gray-600"}`}>
                                {STATUS_STYLES[ticket.status]?.label || ticket.status}
                              </span>
                            </div>
                            <h3 className="font-medium text-gray-900 text-sm md:text-base">{ticket.title}</h3>
                            <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-1">
                              {ticket.first_message || ticket.category}
                            </p>
                          </div>
                          <div className="text-right text-xs md:text-sm text-gray-500">
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden sm:inline">{formatDate(ticket.updated_at)}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {ticket.message_count || 0} messages
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ticket Detail View */}
            {selectedTicket && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
                {/* Ticket Header */}
                <div className="p-3 md:p-4 border-b border-gray-200">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2 text-xs"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back
                  </button>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">{selectedTicket.ticket_number}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[selectedTicket.status]?.bg || "bg-gray-100"} ${STATUS_STYLES[selectedTicket.status]?.text || "text-gray-600"}`}>
                          {STATUS_STYLES[selectedTicket.status]?.label || selectedTicket.status}
                        </span>
                      </div>
                      <h2 className="text-base md:text-lg font-semibold text-gray-900 break-words">{selectedTicket.title}</h2>
                      <p className="text-xs text-gray-500">{selectedTicket.category}</p>
                    </div>
                    {!["resolved", "closed"].includes(selectedTicket.status) && (
                      <button
                        onClick={handleScheduleMeeting}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium whitespace-nowrap"
                      >
                        <Calendar className="w-3 h-3" />
                        Schedule
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-gray-50" style={{ minHeight: "300px" }}>
                  {selectedTicket.messages?.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex ${msg.sender_type === "customer" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender_type === "customer"
                            ? "bg-emerald-500 text-white"
                            : msg.sender_type === "system"
                            ? "bg-gray-200 text-gray-600 text-center text-sm italic max-w-full"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}
                        style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                      >
                        {msg.sender_type === "support" && (
                          <div className="text-xs font-medium text-emerald-600 mb-1">Support Team</div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        {msg.screenshot_url && (
                          <div className="mt-2">
                            <img 
                              src={msg.screenshot_url} 
                              alt="Screenshot" 
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.screenshot_url, "_blank")}
                            />
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${
                          msg.sender_type === "customer" ? "text-emerald-100" : "text-gray-400"
                        }`}>
                          {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Box */}
                {!["resolved", "closed"].includes(selectedTicket.status) && (
                  <div className="p-2 border-t border-gray-200 bg-white">
                    {replyScreenshot && (
                      <div className="mb-2 relative inline-block">
                        <img 
                          src={replyScreenshot} 
                          alt="Screenshot preview" 
                          className="max-w-[100px] max-h-[60px] rounded border border-gray-200"
                        />
                        <button
                          onClick={() => setReplyScreenshot(null)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={replyFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleScreenshotUpload(e, true)}
                        className="hidden"
                      />
                      <button
                        onClick={() => replyFileInputRef.current?.click()}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="Attach screenshot"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-full text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendReply()
                          }
                        }}
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        className="p-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {["resolved", "closed"].includes(selectedTicket.status) && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
                    <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      This ticket has been {selectedTicket.status}
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Feedback Tab Content */}
            {activeTab === "feedback" && !selectedTicket && (
              <div className="space-y-6">
                {/* Feedback Header */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <Lightbulb className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Your Product Feedback</h2>
                      <p className="text-gray-600 mt-1">
                        Track all your submitted feedback and suggestions. We review every piece of feedback to improve HireGenAI.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feedback List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {feedbackItems.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lightbulb className="w-8 h-8 text-amber-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback submitted yet</h3>
                      <p className="text-gray-500 mb-4">
                        Have ideas or suggestions? Share your product feedback with us!
                      </p>
                      <button
                        onClick={() => {
                          setNewTicket(prev => ({ ...prev, type: "feedback" }))
                          setActiveTab("new")
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Submit Feedback
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {feedbackItems.map(feedback => (
                        <div
                          key={feedback.id}
                          onClick={() => loadTicketDetail(feedback.id)}
                          className="p-4 hover:bg-amber-50/50 cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-xs font-mono text-gray-500">{feedback.ticket_number}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  Feedback
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[feedback.status]?.bg || "bg-gray-100"} ${STATUS_STYLES[feedback.status]?.text || "text-gray-600"}`}>
                                  {STATUS_STYLES[feedback.status]?.label || feedback.status}
                                </span>
                              </div>
                              <h3 className="font-medium text-gray-900">{feedback.title}</h3>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {feedback.first_message || feedback.category}
                              </p>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div className="flex items-center gap-1 justify-end">
                                <Clock className="w-4 h-4" />
                                {formatDate(feedback.created_at)}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {feedback.category}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
