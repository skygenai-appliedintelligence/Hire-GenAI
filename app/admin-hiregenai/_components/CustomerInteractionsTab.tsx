"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Mail, 
  Calendar, 
  Building2, 
  Phone, 
  Clock, 
  User, 
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  CalendarClock
} from "lucide-react"

interface ContactMessage {
  id: string
  full_name: string
  work_email: string
  company_name: string
  phone_number: string | null
  subject: string
  message: string
  status: string
  created_at: string
  updated_at: string
  admin_notes?: string
}

interface MeetingBooking {
  id: string
  full_name: string
  work_email: string
  company_name: string
  phone_number: string | null
  meeting_date: string | null
  meeting_time: string | null
  meeting_end_time: string | null
  duration_minutes: number
  timezone: string
  meeting_location: string
  meeting_link: string | null
  notes: string | null
  status: string
  created_at: string
  updated_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  admin_notes?: string
}

const contactStatusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  read: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  responded: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  spam: "bg-red-500/20 text-red-400 border-red-500/30",
  archived: "bg-slate-600/20 text-slate-500 border-slate-600/30"
}

const meetingStatusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  confirmed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  no_show: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  rescheduled: "bg-purple-500/20 text-purple-400 border-purple-500/30"
}

export default function CustomerInteractionsTab() {
  const [activeTab, setActiveTab] = useState("contacts")
  const [contacts, setContacts] = useState<ContactMessage[]>([])
  const [meetings, setMeetings] = useState<MeetingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const [contactFilter, setContactFilter] = useState("all")
  const [meetingFilter, setMeetingFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [contactStats, setContactStats] = useState({ total: 0, new: 0, responded: 0 })
  const [meetingStats, setMeetingStats] = useState({ total: 0, scheduled: 0, completed: 0 })
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadContacts(), loadMeetings()])
    setLoading(false)
  }

  const loadContacts = async () => {
    try {
      const res = await fetch("/api/contact?limit=100")
      const data = await res.json()
      if (data.success) {
        setContacts(data.data || [])
        // Calculate stats
        const total = data.data?.length || 0
        const newCount = data.data?.filter((c: ContactMessage) => c.status === 'new').length || 0
        const respondedCount = data.data?.filter((c: ContactMessage) => c.status === 'responded').length || 0
        setContactStats({ total, new: newCount, responded: respondedCount })
      }
    } catch (error) {
      console.error("Failed to load contacts:", error)
    }
  }

  const loadMeetings = async () => {
    try {
      const res = await fetch("/api/meeting-bookings?limit=100")
      const data = await res.json()
      if (data.success) {
        setMeetings(data.bookings || [])
        // Calculate stats
        const total = data.bookings?.length || 0
        const scheduledCount = data.bookings?.filter((m: MeetingBooking) => m.status === 'scheduled').length || 0
        const completedCount = data.bookings?.filter((m: MeetingBooking) => m.status === 'completed').length || 0
        setMeetingStats({ total, scheduled: scheduledCount, completed: completedCount })
      }
    } catch (error) {
      console.error("Failed to load meetings:", error)
    }
  }

  const updateContactStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        loadContacts()
      }
    } catch (error) {
      console.error("Failed to update contact:", error)
    }
  }

  const updateMeetingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/meeting-bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        loadMeetings()
      }
    } catch (error) {
      console.error("Failed to update meeting:", error)
    }
  }

  const sendReplyEmail = async (contact: ContactMessage) => {
    const replyMessage = replyMessages[contact.id]
    if (!replyMessage?.trim()) {
      alert("Please enter a reply message")
      return
    }

    setSendingReply(contact.id)
    try {
      const res = await fetch("/api/contact/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          recipientEmail: contact.work_email,
          recipientName: contact.full_name,
          subject: `Re: ${contact.subject}`,
          message: replyMessage
        })
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        alert("Reply sent successfully!")
        // Clear the reply message
        setReplyMessages(prev => ({ ...prev, [contact.id]: "" }))
        // Reload contacts to update status
        loadContacts()
      } else {
        alert(data.error || "Failed to send reply")
      }
    } catch (error) {
      console.error("Failed to send reply:", error)
      alert("Failed to send reply. Please try again.")
    } finally {
      setSendingReply(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return "Not scheduled"
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesFilter = contactFilter === "all" || contact.status === contactFilter
    const matchesSearch = searchQuery === "" || 
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredMeetings = meetings.filter(meeting => {
    const matchesFilter = meetingFilter === "all" || meeting.status === meetingFilter
    const matchesSearch = searchQuery === "" || 
      meeting.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                Customer Interactions
              </CardTitle>
              <CardDescription>Manage contact submissions and meeting requests</CardDescription>
            </div>
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="sm"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <TabsList className="bg-slate-800 border border-slate-700">
                <TabsTrigger 
                  value="contacts" 
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Requests
                  {contactStats.new > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0">
                      {contactStats.new}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="meetings"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Meeting Bookings
                  {meetingStats.scheduled > 0 && (
                    <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0">
                      {meetingStats.scheduled}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Search and Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-white w-48"
                  />
                </div>
                {activeTab === "contacts" ? (
                  <Select value={contactFilter} onValueChange={setContactFilter}>
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={meetingFilter} onValueChange={setMeetingFilter}>
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Contact Requests Tab */}
            <TabsContent value="contacts" className="mt-0">
              <div className="space-y-3">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No contact requests found</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div 
                      key={contact.id}
                      className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden transition-all hover:border-slate-600"
                    >
                      {/* Header Row */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-slate-700 rounded-full">
                                <User className="h-4 w-4 text-slate-300" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{contact.full_name}</h4>
                                <p className="text-sm text-slate-400">{contact.work_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {contact.company_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDate(contact.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 text-slate-300 font-medium truncate">{contact.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${contactStatusColors[contact.status]} border`}>
                              {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                            </Badge>
                            {expandedContact === contact.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedContact === contact.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Message</h5>
                              <div className="bg-slate-900 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {contact.message}
                              </div>
                              {contact.phone_number && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                                  <Phone className="h-4 w-4" />
                                  {contact.phone_number}
                                </div>
                              )}
                            </div>
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Actions</h5>
                              <div className="space-y-3">
                                <Select 
                                  value={contact.status} 
                                  onValueChange={(value) => updateContactStatus(contact.id, value)}
                                >
                                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                    <SelectValue placeholder="Update Status" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="read">Mark as Read</SelectItem>
                                    <SelectItem value="responded">Responded</SelectItem>
                                    <SelectItem value="spam">Mark as Spam</SelectItem>
                                    <SelectItem value="archived">Archive</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {/* Reply Message Input */}
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Type your reply message here..."
                                    value={replyMessages[contact.id] || ""}
                                    onChange={(e) => setReplyMessages(prev => ({ ...prev, [contact.id]: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] resize-none"
                                  />
                                  <Button 
                                    size="sm" 
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => sendReplyEmail(contact)}
                                    disabled={sendingReply === contact.id || !replyMessages[contact.id]?.trim()}
                                  >
                                    {sendingReply === contact.id ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Reply via Email
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Meeting Bookings Tab */}
            <TabsContent value="meetings" className="mt-0">
              <div className="space-y-3">
                {filteredMeetings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No meeting bookings found</p>
                  </div>
                ) : (
                  filteredMeetings.map((meeting) => (
                    <div 
                      key={meeting.id}
                      className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden transition-all hover:border-slate-600"
                    >
                      {/* Header Row */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedMeeting(expandedMeeting === meeting.id ? null : meeting.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-slate-700 rounded-full">
                                <User className="h-4 w-4 text-slate-300" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{meeting.full_name}</h4>
                                <p className="text-sm text-slate-400">{meeting.work_email}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {meeting.company_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatMeetingDate(meeting.meeting_date)}
                              </span>
                              {meeting.meeting_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {meeting.meeting_time}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${meetingStatusColors[meeting.status]} border`}>
                              {meeting.status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </Badge>
                            {expandedMeeting === meeting.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedMeeting === meeting.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Meeting Details</h5>
                                <div className="bg-slate-900 rounded-lg p-3 space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Duration:</span>
                                    <span className="text-white">{meeting.duration_minutes} minutes</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Timezone:</span>
                                    <span className="text-white">{meeting.timezone}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Location:</span>
                                    <span className="text-white capitalize">{meeting.meeting_location.replace('-', ' ')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Submitted:</span>
                                    <span className="text-white">{formatDate(meeting.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                              {meeting.notes && (
                                <div>
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Notes from Customer</h5>
                                  <div className="bg-slate-900 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap">
                                    {meeting.notes}
                                  </div>
                                </div>
                              )}
                              {meeting.phone_number && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <Phone className="h-4 w-4" />
                                  {meeting.phone_number}
                                </div>
                              )}
                            </div>
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Actions</h5>
                              <div className="space-y-3">
                                <Select 
                                  value={meeting.status} 
                                  onValueChange={(value) => updateMeetingStatus(meeting.id, value)}
                                >
                                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                    <SelectValue placeholder="Update Status" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="no_show">No Show</SelectItem>
                                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                                  </SelectContent>
                                </Select>
                                {meeting.meeting_link && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                                    onClick={() => window.open(meeting.meeting_link!, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Meeting Link
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                                  onClick={() => window.open(`mailto:${meeting.work_email}?subject=Your Meeting with HireGenAI`, '_blank')}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
