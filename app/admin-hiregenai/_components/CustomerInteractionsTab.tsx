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
  CalendarClock,
  Plus,
  FileText,
  Send,
  Archive,
  FileEdit,
  Trash2,
  X,
  Check,
  Users
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  is_default: boolean
  created_at: string
  updated_at: string
  images?: {
    id: string
    filename: string
    contentType: string
    size: number
    url: string
  }[]
}

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
  interaction_summary?: string
  replied?: boolean
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
  interaction_summary?: string
}

const contactStatusColors: Record<string, string> = {
  new_lead: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active_prospect: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive_prospect: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  converted_to_customer: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30"
}

const meetingStatusColors: Record<string, string> = {
  new_lead: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active_prospect: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive_prospect: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  converted_to_customer: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30"
}

// Status sub-tabs configuration
const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new_lead', label: 'New Lead' },
  { value: 'active_prospect', label: 'Active' },
  { value: 'inactive_prospect', label: 'Inactive' },
  { value: 'converted_to_customer', label: 'Converted' },
  { value: 'archived', label: 'Archived' }
]

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
  const [meetingStats, setMeetingStats] = useState({ total: 0, scheduled: 0, completed: 0, confirmed: 0, cancelled: 0, no_show: 0, rescheduled: 0 })
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  const [repliedContacts, setRepliedContacts] = useState<Set<string>>(new Set())
  const [interactionSummaries, setInteractionSummaries] = useState<Record<string, string[]>>({})
  const [newSummaryInput, setNewSummaryInput] = useState<Record<string, string>>({})
  const [savingSummary, setSavingSummary] = useState<string | null>(null)
  
  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', category: 'general' })
  const [isCreateMode, setIsCreateMode] = useState(true) // Track if we're in create or update mode
  const [templateImages, setTemplateImages] = useState<any[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null) // Track template ID for image uploads without changing mode
  
  // Bulk Selection
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set())
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadContacts(), loadMeetings(), loadEmailTemplates()])
    setLoading(false)
  }
  
  const loadEmailTemplates = async () => {
    try {
      const res = await fetch("/api/email-templates")
      const data = await res.json()
      if (data.success) {
        setEmailTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Failed to load email templates:", error)
    }
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
        
        // Load replied contacts and interaction summaries from database
        const repliedSet = new Set<string>()
        const summaries: Record<string, string[]> = {}
        data.data?.forEach((contact: ContactMessage) => {
          if (contact.replied) {
            repliedSet.add(contact.id)
          }
          if (contact.interaction_summary) {
            try {
              summaries[contact.id] = JSON.parse(contact.interaction_summary)
            } catch {
              summaries[contact.id] = []
            }
          }
        })
        setRepliedContacts(repliedSet)
        setInteractionSummaries(prev => ({ ...prev, ...summaries }))
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
        // Calculate stats from API stats (not from filtered data)
        const total = data.stats?.total || 0
        const scheduledCount = data.stats?.scheduled || 0
        const completedCount = data.stats?.completed || 0
        const confirmedCount = data.stats?.confirmed || 0
        const cancelledCount = data.stats?.cancelled || 0
        const noShowCount = data.stats?.no_show || 0
        const rescheduledCount = data.stats?.rescheduled || 0
        setMeetingStats({ 
          total, 
          scheduled: scheduledCount, 
          completed: completedCount,
          confirmed: confirmedCount,
          cancelled: cancelledCount,
          no_show: noShowCount,
          rescheduled: rescheduledCount
        })
        
        // Load interaction summaries for meetings from database
        const meetingSummaries: Record<string, string[]> = {}
        data.bookings?.forEach((meeting: MeetingBooking) => {
          if (meeting.interaction_summary) {
            try {
              meetingSummaries[`meeting_${meeting.id}`] = JSON.parse(meeting.interaction_summary)
            } catch {
              meetingSummaries[`meeting_${meeting.id}`] = []
            }
          }
        })
        setInteractionSummaries(prev => ({ ...prev, ...meetingSummaries }))
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
        // Reload meetings to update counts
        await loadMeetings()
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
        // Mark this contact as replied - show summary section instead of reply
        setRepliedContacts(prev => new Set([...prev, contact.id]))
        // Add initial interaction summary
        const timestamp = new Date().toLocaleString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        })
        const newSummary = `[${timestamp}] Email reply sent: "${replyMessage.substring(0, 100)}${replyMessage.length > 100 ? '...' : ''}"`
        const updatedSummaries = [...(interactionSummaries[contact.id] || []), newSummary]
        setInteractionSummaries(prev => ({
          ...prev,
          [contact.id]: updatedSummaries
        }))
        
        // Save replied status and interaction summary to database
        await fetch("/api/contact", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: contact.id,
            replied: true,
            interactionSummary: JSON.stringify(updatedSummaries)
          })
        })
        
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

  const addInteractionSummary = async (entityId: string) => {
    const summaryText = newSummaryInput[entityId]?.trim()
    if (!summaryText) return

    setSavingSummary(entityId)
    try {
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })
      
      const newNote = `[${timestamp}] ${summaryText}`
      const updatedSummaries = [...(interactionSummaries[entityId] || []), newNote]
      
      // Add to local state (append, not overwrite)
      setInteractionSummaries(prev => ({
        ...prev,
        [entityId]: updatedSummaries
      }))
      
      // Clear input
      setNewSummaryInput(prev => ({ ...prev, [entityId]: "" }))
      
      // Save to database via API
      const isMeeting = entityId.startsWith('meeting_')
      const actualId = isMeeting ? entityId.replace('meeting_', '') : entityId
      const apiUrl = isMeeting ? '/api/meeting-bookings' : '/api/contact'
      
      await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actualId,
          interactionSummary: JSON.stringify(updatedSummaries)
        })
      })
      
    } catch (error) {
      console.error("Failed to add summary:", error)
    } finally {
      setSavingSummary(null)
    }
  }

  // Email Template Functions
  const openTemplateModal = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category || 'general'
      })
      setIsCreateMode(false) // Set to update mode
      
      // Load images for this template
      const templateImages = template.images ? 
        (typeof template.images === 'string' ? JSON.parse(template.images) : template.images) : []
      
      setTemplateImages(templateImages)
    } else {
      setEditingTemplate(null)
      setTemplateForm({ name: '', subject: '', body: '', category: 'general' })
      setTemplateImages([])
      setIsCreateMode(true) // Set to create mode
      setSavedTemplateId(null) // Reset saved template ID
    }
    setShowTemplateModal(true)
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      alert("Please fill in all required fields")
      return
    }

    setSavingTemplate(true)
    try {
      // Process body content to handle image references properly
      let processedBody = templateForm.body;
      templateImages.forEach((image, index) => {
        const placeholder = `{image:${index+1}}`;
        const imageHtml = `<img src="${image.url}" alt="Image ${index+1}" style="max-width: 100%; height: auto;" />`;
        processedBody = processedBody.split(placeholder).join(imageHtml);
      });
      
      const url = "/api/email-templates"
      // Use savedTemplateId if we already saved the template during image upload
      const existingId = editingTemplate?.id || savedTemplateId
      const method = existingId ? "PATCH" : "POST"
      const body = existingId 
        ? { id: existingId, ...templateForm, body: processedBody }
        : { ...templateForm, body: processedBody }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (data.success) {
        if (isCreateMode) {
          alert("Template created!")
          setShowTemplateModal(false)
          setSavedTemplateId(null) // Reset saved template ID
        } else {
          // For update, just show message but don't close modal
          alert("Template updated!")
        }
        loadEmailTemplates()
      } else {
        alert(data.error || "Failed to save template")
      }
    } catch (error) {
      console.error("Failed to save template:", error)
      alert("Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const res = await fetch(`/api/email-templates?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        loadEmailTemplates()
      } else {
        alert(data.error || "Failed to delete template")
      }
    } catch (error) {
      console.error("Failed to delete template:", error)
    }
  }

  // Bulk Selection Functions
  const toggleContactSelection = (id: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleMeetingSelection = (id: string) => {
    setSelectedMeetings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAllContacts = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)))
    }
  }

  const selectAllMeetings = () => {
    if (selectedMeetings.size === filteredMeetings.length) {
      setSelectedMeetings(new Set())
    } else {
      setSelectedMeetings(new Set(filteredMeetings.map(m => m.id)))
    }
  }

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') return window.location.origin
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  const getTemplateImages = (template: EmailTemplate | null | undefined) => {
    if (!template?.images) return []
    return typeof template.images === 'string' ? JSON.parse(template.images) : template.images
  }

  const makeAbsoluteImageSources = (body: string, baseUrl: string) => {
    if (!body) return ''
    return body.replace(/src="\/([^"]+)"/g, (_match, path) => `src="${baseUrl}/${path}"`)
  }

  const inlineImagesInHtml = async (html: string, baseUrl: string) => {
    if (!html) return ''
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi
    let result = html
    const matches = [...html.matchAll(imgRegex)]
    for (const match of matches) {
      const src = match[1]
      if (!src || src.startsWith('data:')) continue
      const absoluteSrc = src.startsWith('http') ? src : `${baseUrl}${src}`
      try {
        const res = await fetch(absoluteSrc)
        const blob = await res.blob()
        const buffer = await blob.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        const dataUrl = `data:${blob.type};base64,${base64}`
        result = result.split(src).join(dataUrl)
      } catch (e) {
        console.warn('Failed to inline image', absoluteSrc, e)
      }
    }
    return result
  }

  const replaceImagePlaceholders = (body: string, images: any[], baseUrl: string) => {
    const safeBody = body || ''
    if (images.length === 0) return safeBody

    let result = safeBody
    let replaced = false

    images.forEach((img: any, idx: number) => {
      const url = img?.url?.startsWith('http') ? img.url : `${baseUrl}${img.url}`
      const placeholderIndex = `{image:${idx + 1}}`
      const placeholderId = `{image:${img.id}}`
      const imgTag = `<img src="${url}" alt="${img.filename || `Image ${idx + 1}`}" style="max-width: 100%; height: auto;" />`

      if (result.includes(placeholderIndex) || result.includes(placeholderId)) {
        replaced = true
      }

      result = result.split(placeholderIndex).join(imgTag)
      result = result.split(placeholderId).join(imgTag)
    })

    // If no placeholders were present, append all images to the end
    if (!replaced) {
      const appended = images
        .map((img: any, idx: number) => {
          const url = img?.url?.startsWith('http') ? img.url : `${baseUrl}${img.url}`
          return `<div style="margin-top:12px;"><img src="${url}" alt="${img.filename || `Image ${idx + 1}`}" style="max-width: 100%; height: auto;" /></div>`
        })
        .join('')
      result = result + (result ? '<br/><br/>' : '') + appended
    }

    return result
  }

  const normalizeTemplateBody = (body: string, images: any[], baseUrl: string) => {
    // 1) Replace {image:n} and {image:id} placeholders with img tags
    let withImages = replaceImagePlaceholders(body, images, baseUrl)
    // 2) Convert any relative img src to absolute
    withImages = makeAbsoluteImageSources(withImages, baseUrl)
    return withImages
  }

  const stripHtml = (html: string) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').trim()
  }

  // Helper function to replace all placeholders in template with recipient data
  const replaceTemplatePlaceholders = (text: string, recipient: ContactMessage | MeetingBooking, isMeeting: boolean) => {
    let result = text
    
    // Common placeholders for both contacts and meetings
    result = result.replace(/\[Name\]/gi, recipient.full_name || '')
    result = result.replace(/\[Email\]/gi, recipient.work_email || '')
    result = result.replace(/\[Company\]/gi, recipient.company_name || '')
    result = result.replace(/\[Phone\]/gi, recipient.phone_number || '')
    
    // Meeting-specific placeholders
    if (isMeeting) {
      const meeting = recipient as MeetingBooking
      
      // Format date nicely
      const formattedDate = meeting.meeting_date 
        ? new Date(meeting.meeting_date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'TBD'
      
      result = result.replace(/\[Date\]/gi, formattedDate)
      result = result.replace(/\[Time\]/gi, meeting.meeting_time || 'TBD')
      result = result.replace(/\[EndTime\]/gi, meeting.meeting_end_time || '')
      result = result.replace(/\[Duration\]/gi, `${meeting.duration_minutes || 30} minutes`)
      result = result.replace(/\[Timezone\]/gi, meeting.timezone || '')
      result = result.replace(/\[Location\]/gi, meeting.meeting_location || '')
      result = result.replace(/\[Link\]/gi, meeting.meeting_link || '')
      result = result.replace(/\[MeetingLink\]/gi, meeting.meeting_link || '')
    }
    
    return result
  }

  // Bulk Email Functions
  const sendBulkEmail = async () => {
    if (!selectedTemplateId) {
      alert("Please select a template")
      return
    }

    const template = emailTemplates.find(t => t.id === selectedTemplateId)
    if (!template) {
      alert("Template not found")
      return
    }

    const templateImages = getTemplateImages(template)
    const baseUrl = getBaseUrl()
    const normalizedBody = normalizeTemplateBody(template.body, templateImages, baseUrl)

    const isMeetingTab = activeTab === "meetings"
    const recipients = isMeetingTab 
      ? meetings.filter(m => selectedMeetings.has(m.id))
      : contacts.filter(c => selectedContacts.has(c.id))

    if (recipients.length === 0) {
      alert("No recipients selected")
      return
    }

    setSendingBulkEmail(true)
    try {
      let successCount = 0
      let failCount = 0

      const newlyRepliedContactIds: string[] = []

      for (const recipient of recipients) {
        try {
          // Replace all placeholders with recipient-specific data
          const personalizedSubject = replaceTemplatePlaceholders(template.subject, recipient, isMeetingTab)
          const personalizedBody = replaceTemplatePlaceholders(normalizedBody, recipient, isMeetingTab)
          
          const res = await fetch("/api/contact/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contactId: recipient.id,
              recipientEmail: recipient.work_email,
              recipientName: recipient.full_name,
              subject: personalizedSubject,
              message: personalizedBody,
              images: templateImages
            })
          })

          if (res.ok) {
            successCount++
            if (!isMeetingTab) {
              newlyRepliedContactIds.push(recipient.id)
            }
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      alert(`Emails sent: ${successCount} successful, ${failCount} failed`)
      setShowBulkEmailModal(false)
      setSelectedContacts(new Set())
      setSelectedMeetings(new Set())
      setSelectedTemplateId('')
      loadData()

      // Immediately hide Send Reply for contacts that were emailed via template
      if (newlyRepliedContactIds.length > 0) {
        setRepliedContacts(prev => new Set([...prev, ...newlyRepliedContactIds]))
      }
    } catch (error) {
      console.error("Failed to send bulk emails:", error)
      alert("Failed to send bulk emails")
    } finally {
      setSendingBulkEmail(false)
    }
  }

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
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
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => openTemplateModal()} 
                variant="outline" 
                size="sm"
                className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Templates
              </Button>
              {(selectedContacts.size > 0 || selectedMeetings.size > 0) && (
                <Button 
                  onClick={() => setShowBulkEmailModal(true)} 
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send to {activeTab === "contacts" ? selectedContacts.size : selectedMeetings.size} Selected
                </Button>
              )}
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
                  {(() => {
                    // Show count of pending meetings (not completed, cancelled, or no_show)
                    const pendingCount = meetingStats.scheduled + meetingStats.confirmed + meetingStats.rescheduled
                    return pendingCount > 0 && (
                      <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0">
                        {pendingCount}
                      </Badge>
                    )
                  })()}
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white w-48"
                />
              </div>
            </div>

            {/* Contact Requests Tab */}
            <TabsContent value="contacts" className="mt-0">
              {/* Status Sub-tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-700">
                {STATUS_TABS.map(tab => {
                  const count = tab.value === 'all' 
                    ? contacts.length 
                    : contacts.filter(c => c.status === tab.value).length
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setContactFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        contactFilter === tab.value
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          contactFilter === tab.value ? 'bg-white/20' : 'bg-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Select All Checkbox */}
              {filteredContacts.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-slate-800/50 rounded-lg">
                  <Checkbox
                    checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                    onCheckedChange={selectAllContacts}
                    className="border-slate-600 data-[state=checked]:bg-emerald-600"
                  />
                  <span className="text-sm text-slate-400">
                    Select All ({filteredContacts.length})
                  </span>
                </div>
              )}

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
                      <div className="p-4 flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedContacts.has(contact.id)}
                            onCheckedChange={() => toggleContactSelection(contact.id)}
                            className="border-slate-600 data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                        
                        <div 
                          className="flex-1 cursor-pointer"
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
                              {contact.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">{contact.phone_number}</span>
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-slate-300 font-medium truncate">{contact.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Select 
                                value={contact.status} 
                                onValueChange={(value) => updateContactStatus(contact.id, value)}
                              >
                                <SelectTrigger className="p-0 border-0 bg-transparent h-auto min-h-0 w-auto">
                                  <Badge className={`${contactStatusColors[contact.status]} border cursor-pointer hover:bg-slate-700/30`}>
                                    {formatStatusLabel(contact.status)}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-emerald-600">
                                  <SelectItem value="new_lead">New Lead</SelectItem>
                                  <SelectItem value="active_prospect">Active Prospect</SelectItem>
                                  <SelectItem value="inactive_prospect">Inactive Prospect</SelectItem>
                                  <SelectItem value="converted_to_customer">Converted to Customer</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {expandedContact === contact.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedContact === contact.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Left Column: Message */}
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Original Message
                              </h5>
                              <div className="bg-slate-900 rounded-lg p-3 text-slate-400 text-sm whitespace-pre-wrap max-h-16 overflow-hidden border border-slate-700/50">
                                {contact.message.split('\n').slice(0, 2).join('\n')}
                                {contact.message.split('\n').length > 2 && '...'}
                              </div>
                            </div>

                            {/* Right Column: Reply or Summary */}
                            <div>
                              {!repliedContacts.has(contact.id) ? (
                                <>
                                  {/* Reply Section - Before sending */}
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    Send Reply
                                  </h5>
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
                                          <Send className="h-4 w-4 mr-2" />
                                          Reply via Email
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Summary Section - After sending reply */}
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5" />
                                    Interaction Summary
                                  </h5>
                                  <div className="space-y-3">
                                    {/* Previous Summaries */}
                                    {interactionSummaries[contact.id]?.length > 0 && (
                                      <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 max-h-32 overflow-y-auto">
                                        {interactionSummaries[contact.id].map((summary, idx) => (
                                          <div 
                                            key={idx} 
                                            className={`p-2.5 text-sm ${idx !== 0 ? 'border-t border-slate-700/30' : ''}`}
                                          >
                                            <span className="text-slate-300">{summary}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Add New Summary */}
                                    <div className="space-y-2">
                                      <Textarea
                                        placeholder="Add notes about this interaction..."
                                        value={newSummaryInput[contact.id] || ""}
                                        onChange={(e) => setNewSummaryInput(prev => ({ ...prev, [contact.id]: e.target.value }))}
                                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none text-sm"
                                      />
                                      <Button 
                                        size="sm" 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => addInteractionSummary(contact.id)}
                                        disabled={savingSummary === contact.id || !newSummaryInput[contact.id]?.trim()}
                                      >
                                        {savingSummary === contact.id ? (
                                          <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Interaction Note
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )}
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
              {/* Status Sub-tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-700">
                {STATUS_TABS.map(tab => {
                  const count = tab.value === 'all' 
                    ? meetings.length 
                    : meetings.filter(m => m.status === tab.value).length
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setMeetingFilter(tab.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        meetingFilter === tab.value
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                          meetingFilter === tab.value ? 'bg-white/20' : 'bg-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Select All Checkbox */}
              {filteredMeetings.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-slate-800/50 rounded-lg">
                  <Checkbox
                    checked={selectedMeetings.size === filteredMeetings.length && filteredMeetings.length > 0}
                    onCheckedChange={selectAllMeetings}
                    className="border-slate-600 data-[state=checked]:bg-emerald-600"
                  />
                  <span className="text-sm text-slate-400">
                    Select All ({filteredMeetings.length})
                  </span>
                </div>
              )}

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
                      <div className="p-4 flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedMeetings.has(meeting.id)}
                            onCheckedChange={() => toggleMeetingSelection(meeting.id)}
                            className="border-slate-600 data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                        
                        <div 
                          className="flex-1 cursor-pointer"
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
                              {meeting.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">{meeting.phone_number}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {meeting.meeting_time}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Select 
                                value={meeting.status} 
                                onValueChange={(value) => updateMeetingStatus(meeting.id, value)}
                              >
                                <SelectTrigger className="p-0 border-0 bg-transparent h-auto min-h-0 w-auto">
                                  <Badge className={`${meetingStatusColors[meeting.status]} border cursor-pointer hover:bg-slate-700/30`}>
                                    {formatStatusLabel(meeting.status)}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-emerald-600">
                                  <SelectItem value="new_lead">New Lead</SelectItem>
                                  <SelectItem value="active_prospect">Active Prospect</SelectItem>
                                  <SelectItem value="inactive_prospect">Inactive Prospect</SelectItem>
                                  <SelectItem value="converted_to_customer">Converted to Customer</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {expandedMeeting === meeting.id ? (
                              <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedMeeting === meeting.id && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Left Column: Meeting Details */}
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  Meeting Details
                                </h5>
                                <div className="bg-slate-900 rounded-lg p-3 space-y-2 text-sm border border-slate-700/50">
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
                                  <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Notes from Customer
                                  </h5>
                                  <div className="bg-slate-900 rounded-lg p-3 text-slate-400 text-sm whitespace-pre-wrap max-h-16 overflow-hidden border border-slate-700/50">
                                    {meeting.notes?.split('\n').slice(0, 2).join('\n')}
                                    {meeting.notes && meeting.notes.split('\n').length > 2 && '...'}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Column: Summary Section */}
                            <div>
                              <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                Interaction Summary
                              </h5>
                              <div className="space-y-3">
                                {/* Previous Summaries */}
                                {interactionSummaries[`meeting_${meeting.id}`]?.length > 0 && (
                                  <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 max-h-32 overflow-y-auto">
                                    {interactionSummaries[`meeting_${meeting.id}`].map((summary, idx) => (
                                      <div 
                                        key={idx} 
                                        className={`p-2.5 text-sm ${idx !== 0 ? 'border-t border-slate-700/30' : ''}`}
                                      >
                                        <span className="text-slate-300">{summary}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add New Summary */}
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Add notes about this interaction..."
                                    value={newSummaryInput[`meeting_${meeting.id}`] || ""}
                                    onChange={(e) => setNewSummaryInput(prev => ({ ...prev, [`meeting_${meeting.id}`]: e.target.value }))}
                                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none text-sm"
                                  />
                                  <Button 
                                    size="sm" 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => addInteractionSummary(`meeting_${meeting.id}`)}
                                    disabled={savingSummary === `meeting_${meeting.id}` || !newSummaryInput[`meeting_${meeting.id}`]?.trim()}
                                  >
                                    {savingSummary === `meeting_${meeting.id}` ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Interaction Note
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
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-emerald-400" />
              {isCreateMode ? 'Create Email Template' : 'Edit Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 overflow-y-auto hover:overflow-y-scroll px-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
            <div className="px-1">
              <label className="text-sm text-slate-400 mb-1 block">Template Name *</label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Email, Follow-up Template"
                className="bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div className="px-1">
              <label className="text-sm text-slate-400 mb-1 block">Email Subject *</label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Thank you for contacting us, [Name]"
                className="bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">Use [Name] to insert recipient's name</p>
            </div>
            
            <div className="px-1">
              <label className="text-sm text-slate-400 mb-2 block">Category</label>
              <Select 
                value={templateForm.category} 
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="general" className="text-white hover:bg-slate-700">General</SelectItem>
                  <SelectItem value="contact" className="text-white hover:bg-slate-700">Contact Response</SelectItem>
                  <SelectItem value="meeting" className="text-white hover:bg-slate-700">Meeting Follow-up</SelectItem>
                  <SelectItem value="follow_up" className="text-white hover:bg-slate-700">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="px-1">
              <label className="text-sm text-slate-400 mb-2 block">Email Body *</label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your email template here..."
                className="bg-slate-800 border-slate-700 text-white min-h-[180px] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">To insert an image in your email, use: {'{image:ID}'} where ID is the image number</p>
            </div>

            {/* Image Upload Section */}
            <div className="border-t border-slate-700 pt-6 px-1">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-300">Images</h4>
                <div>
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Image
                    </div>
                    <input 
                      type="file" 
                      id="image-upload" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={async (e) => {
                        // Auto-save template first if it doesn't exist yet instead of showing confirmation
                        // No need for confirmation, we'll auto-save silently
                        
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Upload the image
                        try {
                          setUploadingImage(true);
                          
                          // If template isn't saved yet, save it silently first
                          let templateId = editingTemplate?.id || savedTemplateId;
                          if (!templateId) {
                            try {
                              setSavingTemplate(true);
                              const res = await fetch("/api/email-templates", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(templateForm)
                              });
                              
                              const data = await res.json();
                              if (data.success) {
                                templateId = data.template.id;
                                // Store template ID for future image uploads but DON'T change UI mode
                                setSavedTemplateId(templateId);
                                // Reload templates list to show the new template
                                loadEmailTemplates();
                              } else {
                                alert(data.error || "Failed to save template");
                                return;
                              }
                            } catch (error) {
                              console.error("Failed to save template:", error);
                              alert("Failed to save template");
                              return;
                            } finally {
                              setSavingTemplate(false);
                            }
                          }
                          
                          const formData = new FormData();
                          formData.append('image', file);
                          formData.append('templateId', templateId!);
                          
                          const res = await fetch("/api/email-templates/image", {
                            method: "POST",
                            body: formData
                          });
                          
                          const data = await res.json();
                          if (data.success) {
                            setTemplateImages(prev => [...prev, data.image]);
                            // Clear the file input
                            e.target.value = '';
                          } else {
                            alert(data.error || "Failed to upload image");
                          }
                        } catch (error) {
                          console.error("Failed to upload image:", error);
                          alert("Failed to upload image");
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>
              
              {uploadingImage ? (
                <div className="p-4 flex justify-center items-center">
                  <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-sm text-slate-300">Uploading image...</span>
                </div>
              ) : templateImages.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg">
                  <p className="text-sm text-slate-400">No images uploaded</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templateImages.map((image, index) => (
                    <div key={image.id} className="relative group bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                      <div className="aspect-video w-full flex items-center justify-center">
                        <img 
                          src={image.url} 
                          alt={image.filename} 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-white mb-2">{image.filename.length > 15 ? image.filename.substring(0, 12) + '...' : image.filename}</p>
                          <div className="flex gap-2">
                            <button 
                              className="p-1.5 bg-blue-600 rounded-full"
                              onClick={() => {
                                navigator.clipboard.writeText(`{image:${index+1}}`);
                                alert(`Copied {image:${index+1}} to clipboard. Paste this into your email body.`);
                              }}
                            >
                              <span className="sr-only">Copy Image Tag</span>
                              <FileText className="h-4 w-4 text-white" />
                            </button>
                            <button 
                              className="p-1.5 bg-red-600 rounded-full"
                              onClick={async () => {
                                if (!confirm('Delete this image?')) return;
                                
                                try {
                                  const res = await fetch(`/api/email-templates/image?id=${image.id}&templateId=${editingTemplate?.id}`, {
                                    method: "DELETE"
                                  });
                                  
                                  const data = await res.json();
                                  if (data.success) {
                                    setTemplateImages(prev => prev.filter(img => img.id !== image.id));
                                  } else {
                                    alert(data.error || "Failed to delete image");
                                  }
                                } catch (error) {
                                  console.error("Failed to delete image:", error);
                                  alert("Failed to delete image");
                                }
                              }}
                            >
                              <span className="sr-only">Delete Image</span>
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-1 right-1 bg-slate-900/80 rounded-full text-xs text-white p-1 px-1.5">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Templates List */}
            {emailTemplates.length > 0 && !editingTemplate && (
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Existing Templates</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {emailTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                      <div>
                        <p className="text-sm text-white">{template.name}</p>
                        <p className="text-xs text-slate-400">{template.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openTemplateModal(template)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-600/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setShowTemplateModal(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={saveTemplate}
              disabled={savingTemplate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingTemplate ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {isCreateMode ? 'Create Template' : 'Update Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Modal */}
      <Dialog open={showBulkEmailModal} onOpenChange={setShowBulkEmailModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Send Bulk Email
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-300">
                <span className="font-medium text-emerald-400">
                  {activeTab === "contacts" ? selectedContacts.size : selectedMeetings.size}
                </span> recipients selected
              </p>
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Select Template *</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {emailTemplates.length === 0 ? (
                    <SelectItem value="none" disabled>No templates available</SelectItem>
                  ) : (
                    emailTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              (() => {
                const selectedTemplate = emailTemplates.find(t => t.id === selectedTemplateId)
                const templateImages = getTemplateImages(selectedTemplate)
                
                // Use sample data to show placeholders in preview (text-only)
                const sampleRecipient = activeTab === "meetings"
                  ? {
                      full_name: '[Name]',
                      work_email: '[Email]',
                      company_name: '[Company]',
                      phone_number: '[Phone]',
                      meeting_date: '[Date]',
                      meeting_time: '[Time]',
                      meeting_end_time: '',
                      duration_minutes: 30,
                      timezone: '[Timezone]',
                      meeting_location: '[Location]',
                      meeting_link: '[Link]'
                    } as unknown as MeetingBooking
                  : {
                      full_name: '[Name]',
                      work_email: '[Email]',
                      company_name: '[Company]',
                      phone_number: '[Phone]'
                    } as ContactMessage

                const previewBody = replaceTemplatePlaceholders(selectedTemplate?.body || '', sampleRecipient, activeTab === "meetings")
                const previewSubject = replaceTemplatePlaceholders(selectedTemplate?.subject || '', sampleRecipient, activeTab === "meetings")

                return (
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Preview:</p>
                      <p className="text-sm text-white font-medium">{previewSubject}</p>
                    </div>
                    <div className="text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-md p-3 max-h-60 overflow-y-auto prose prose-invert prose-sm">
                      <div dangerouslySetInnerHTML={{ __html: previewBody }} />
                    </div>
                    {templateImages.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Images:</p>
                        <div className="flex flex-wrap gap-2">
                          {templateImages.map((img: any, idx: number) => {
                            const url = img?.url?.startsWith('http') ? img.url : `${getBaseUrl()}${img.url}`
                            return (
                              <div key={img.id || idx} className="w-20 h-14 bg-slate-900 border border-slate-700 rounded-md overflow-hidden flex items-center justify-center">
                                <img src={url} alt={img.filename} className="max-w-full max-h-full object-contain" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()
            )}

            {emailTemplates.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-2">No templates available</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowBulkEmailModal(false)
                    openTemplateModal()
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkEmailModal(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={sendBulkEmail}
              disabled={sendingBulkEmail || !selectedTemplateId || emailTemplates.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sendingBulkEmail ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
