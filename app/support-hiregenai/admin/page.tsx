"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  MessageCircle, 
  CheckCircle, 
  Send, 
  X, 
  Clock,
  Image as ImageIcon,
  Users,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Shield,
  RefreshCw,
  Loader2,
  Building2,
  Mail,
  Lightbulb
} from "lucide-react"

interface Message {
  id: string
  sender_type: "customer" | "support" | "system"
  sender_name?: string
  sender_email?: string
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

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-700" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" }
]

const STATUS_STYLES: Record<string, { bg: string, text: string, label: string }> = {
  "open": { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Open" },
  "in_progress": { bg: "bg-blue-500/20", text: "text-blue-400", label: "In Progress" },
  "waiting_customer": { bg: "bg-purple-500/20", text: "text-purple-400", label: "Awaiting Reply" },
  "resolved": { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Resolved" },
  "closed": { bg: "bg-slate-500/20", text: "text-slate-400", label: "Closed" }
}

export default function SupportAdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"open" | "resolved" | "feedback">("open")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [resolvedFilter, setResolvedFilter] = useState<"all" | "feedback" | "tickets">("all")
  const [resolvedCounts, setResolvedCounts] = useState({
    all: 0,
    feedback: 0,
    tickets: 0
  })
  const [replyText, setReplyText] = useState("")
  const [replyScreenshot, setReplyScreenshot] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const replyFileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load all tickets from database (admin view)
  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/support/tickets?admin=true")
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

  // Load tickets on mount
  useEffect(() => {
    loadTickets()
  }, [])

  // Refresh tickets periodically (every 15 seconds for admin)
  useEffect(() => {
    const interval = setInterval(loadTickets, 15000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedTicket?.messages])

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

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed")
      return
    }

    if (file.size > 1024 * 1024) {
      alert("File size must be less than 1MB")
      return
    }

    // Upload to Vercel Blob
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const res = await fetch("/api/support/upload", {
        method: "POST",
        body: formData
      })
      
      const data = await res.json()
      if (data.success) {
        setReplyScreenshot(data.url)
      } else {
        alert(data.error || "Failed to upload screenshot")
      }
    } catch (error) {
      console.error("Screenshot upload error:", error)
      alert("Failed to upload screenshot")
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
          senderType: "support",
          senderName: "Support Team",
          message: replyText.trim(),
          screenshot: replyScreenshot
        })
      })

      const data = await res.json()
      if (data.success) {
        await loadTicketDetail(selectedTicket.id)
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

  const handleResolveTicket = async () => {
    if (!selectedTicket) return

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" })
      })

      const data = await res.json()
      if (data.success) {
        setSelectedTicket(null)
        setActiveTab("resolved")
        loadTickets()
      }
    } catch (error) {
      console.error("Error resolving ticket:", error)
    }
  }

  const openTickets = tickets.filter(t => ["open", "in_progress", "waiting_customer"].includes(t.status) && (t as any).type !== "feedback")
  const allResolvedTickets = tickets.filter(t => ["resolved", "closed"].includes(t.status))
  const feedbackItems = tickets.filter(t => (t as any).type === "feedback" && ["open", "in_progress", "waiting_customer"].includes(t.status))
  
  // Apply filter to resolved tickets
  const resolvedTickets = resolvedFilter === "all" 
    ? allResolvedTickets 
    : resolvedFilter === "feedback"
    ? allResolvedTickets.filter(t => (t as any).type === "feedback")
    : allResolvedTickets.filter(t => (t as any).type !== "feedback")

  // Update resolved counts when tickets change
  useEffect(() => {
    const allResolved = tickets.filter(t => ["resolved", "closed"].includes(t.status))
    const feedbackCount = allResolved.filter(t => (t as any).type === "feedback").length
    const ticketsCount = allResolved.filter(t => (t as any).type !== "feedback").length
    setResolvedCounts({
      all: allResolved.length,
      feedback: feedbackCount,
      tickets: ticketsCount
    })
  }, [tickets])

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

  // No authentication check needed
  
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Admin Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Support Admin</h1>
                <p className="text-sm text-slate-400">Manage customer tickets</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Inbox className="w-5 h-5" />
                <span className="text-sm">{openTickets.length} open</span>
              </div>
              <button
                onClick={() => router.push("/support-hiregenai")}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                Customer View
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tickets.length}</p>
                <p className="text-sm text-slate-400">Total Tickets</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{openTickets.length}</p>
                <p className="text-sm text-slate-400">Open Tickets</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{resolvedTickets.length}</p>
                <p className="text-sm text-slate-400">Resolved</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {tickets.filter(t => t.priority === "urgent" && t.status === "open" && (t as any).type !== "feedback").length}
                </p>
                <p className="text-sm text-slate-400">Urgent</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{feedbackItems.length}</p>
                <p className="text-sm text-slate-400">Feedback</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg mb-6 w-fit border border-slate-700">
          <button
            onClick={() => { setActiveTab("open"); setSelectedTicket(null); setResolvedFilter("all"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "open" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Open Tickets
            {openTickets.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === "open" ? "bg-emerald-500" : "bg-slate-700"
              }`}>
                {openTickets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("resolved"); setSelectedTicket(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "resolved" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Resolved
            {resolvedTickets.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === "resolved" ? "bg-emerald-500" : "bg-slate-700"
              }`}>
                {resolvedTickets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab("feedback"); setSelectedTicket(null); setResolvedFilter("all"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "feedback" 
                ? "bg-amber-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Feedback
            {feedbackItems.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === "feedback" ? "bg-amber-500" : "bg-slate-700"
              }`}>
                {feedbackItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-4 gap-6">
          {/* Tickets List */}
          <div className="col-span-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="font-semibold text-white">
                {activeTab === "open" ? "Open Tickets" : activeTab === "resolved" ? "Resolved Tickets" : "Product Feedback"}
              </h2>
              {activeTab === "resolved" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setResolvedFilter("all")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      resolvedFilter === "all"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    All ({resolvedCounts.all})
                  </button>
                  <button
                    onClick={() => setResolvedFilter("feedback")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      resolvedFilter === "feedback"
                        ? "bg-amber-500 text-white"
                        : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    }`}
                  >
                    Feedback ({resolvedCounts.feedback})
                  </button>
                  <button
                    onClick={() => setResolvedFilter("tickets")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      resolvedFilter === "tickets"
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    }`}
                  >
                    Tickets ({resolvedCounts.tickets})
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
              {(activeTab === "open" ? openTickets : activeTab === "resolved" ? resolvedTickets : feedbackItems).length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    {activeTab === "open" ? (
                      <MessageCircle className="w-6 h-6 text-slate-500" />
                    ) : activeTab === "resolved" ? (
                      <CheckCircle className="w-6 h-6 text-slate-500" />
                    ) : (
                      <Lightbulb className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">
                    {activeTab === "open" ? "No open tickets" : activeTab === "resolved" ? "No resolved tickets" : "No feedback received"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {(activeTab === "open" ? openTickets : activeTab === "resolved" ? resolvedTickets : feedbackItems).map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => loadTicketDetail(ticket.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id 
                          ? "bg-slate-700" 
                          : "hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {activeTab === "feedback" ? (
                          <>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                              Feedback
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              ticket.status === "open" 
                                ? "bg-yellow-500/20 text-yellow-400" 
                                : ticket.status === "in_progress"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}>
                              {ticket.status === "open" ? "New" : ticket.status === "in_progress" ? "Reviewing" : "Reviewed"}
                            </span>
                          </>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-mono">{ticket.ticket_number}</span>
                      </div>
                      <h3 className="font-medium text-white text-sm line-clamp-1">{ticket.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-400">{ticket.user_email}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(ticket.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="col-span-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
            {!selectedTicket ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Select a ticket</h3>
                  <p className="text-slate-400 text-sm">Choose a ticket from the list to view details</p>
                </div>
              </div>
            ) : (
              <>
                {/* Ticket Header */}
                <div className="p-2 border-b border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-slate-400">{selectedTicket.ticket_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityStyle(selectedTicket.priority)}`}>
                          {selectedTicket.priority}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[selectedTicket.status]?.bg || "bg-slate-600"} ${STATUS_STYLES[selectedTicket.status]?.text || "text-slate-300"}`}>
                          {STATUS_STYLES[selectedTicket.status]?.label || selectedTicket.status}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-white">{selectedTicket.title}</h2>
                      <p className="text-xs text-slate-400">{selectedTicket.category}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />
                        <span>{selectedTicket.user_email}</span>
                      </div>
                    </div>
                    {!["resolved", "closed"].includes(selectedTicket.status) && (
                      <button
                        onClick={handleResolveTicket}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium whitespace-nowrap"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-900">
                  {selectedTicket.messages?.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex ${msg.sender_type === "support" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${
                          msg.sender_type === "support"
                            ? "bg-emerald-600 text-white"
                            : msg.sender_type === "system"
                            ? "bg-slate-700 text-slate-300 text-center text-sm italic max-w-full"
                            : "bg-slate-700 text-white"
                        }`}
                        style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                      >
                        {msg.sender_type === "customer" && (
                          <div className="text-xs font-medium text-blue-400 mb-1">
                            {msg.sender_name || "Customer"}
                          </div>
                        )}
                        {msg.sender_type === "support" && (
                          <div className="text-xs font-medium text-emerald-200 mb-1">You</div>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>
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
                          msg.sender_type === "support" ? "text-emerald-200" : "text-slate-400"
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
                  <div className="p-2 border-t border-slate-700">
                    {replyScreenshot && (
                      <div className="mb-2 relative inline-block">
                        <img 
                          src={replyScreenshot} 
                          alt="Screenshot preview" 
                          className="max-w-[80px] max-h-[50px] rounded border border-slate-600"
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
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => replyFileInputRef.current?.click()}
                        className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                        title="Attach screenshot"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-full text-white text-sm placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                        className="p-1.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {["resolved", "closed"].includes(selectedTicket.status) && (
                  <div className="p-4 border-t border-slate-700 bg-slate-700/50 text-center">
                    <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      This ticket has been {selectedTicket.status}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
