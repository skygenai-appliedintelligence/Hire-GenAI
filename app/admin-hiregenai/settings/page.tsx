"use client"

import SettingsTab from "@/app/admin-hiregenai/_components/SettingsTab"
import CustomerInteractionsTab from "@/app/admin-hiregenai/_components/CustomerInteractionsTab"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Headphones, MessageCircle, ArrowRight, Settings, Users, ExternalLink, Lightbulb, Clock, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab") || "interactions"
  const [activeTab, setActiveTab] = useState(tabParam)
  const [openTickets, setOpenTickets] = useState(0)
  const [inProgressTickets, setInProgressTickets] = useState(0)
  const [resolvedTodayTickets, setResolvedTodayTickets] = useState(0)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [feedbackItems, setFeedbackItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTicketStats()
  }, [])

  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/admin-hiregenai/settings?tab=${value}`)
  }

  const loadTicketStats = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/support/tickets?admin=true")
      const data = await res.json()
      
      if (data.success && data.tickets) {
        const tickets = data.tickets
        
        // Count open tickets (open, in_progress, waiting_customer)
        const open = tickets.filter((t: any) => 
          ["open", "in_progress", "waiting_customer"].includes(t.status)
        ).length
        
        // Count in_progress tickets
        const inProgress = tickets.filter((t: any) => t.status === "in_progress").length
        
        // Count resolved today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const resolvedToday = tickets.filter((t: any) => {
          if (t.status !== "resolved" && t.status !== "closed") return false
          const resolvedDate = new Date(t.resolved_at || t.updated_at)
          resolvedDate.setHours(0, 0, 0, 0)
          return resolvedDate.getTime() === today.getTime()
        }).length
        
        setOpenTickets(open)
        setInProgressTickets(inProgress)
        setResolvedTodayTickets(resolvedToday)
        
        // Count and store feedback items
        const feedback = tickets.filter((t: any) => t.type === "feedback")
        const unreadFeedback = feedback.filter((f: any) => f.status === "open").length
        setFeedbackCount(unreadFeedback) // Only count unread/new feedback for badge
        setFeedbackItems(feedback)
      }
    } catch (error) {
      console.error("Failed to load ticket stats:", error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Configure admin preferences, manage customer interactions, and support</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700 mb-6">
          <TabsTrigger 
            value="interactions" 
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Customer Interactions
          </TabsTrigger>
          <TabsTrigger 
            value="support"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <Headphones className="h-4 w-4 mr-2" />
            Support Center
          </TabsTrigger>
          <TabsTrigger 
            value="feedback"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Product Feedback
            {feedbackCount > 0 && (
              <span className="ml-2 bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                {feedbackCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </TabsTrigger>
        </TabsList>

        {/* Customer Interactions Tab */}
        <TabsContent value="interactions">
          <CustomerInteractionsTab />
        </TabsContent>

        {/* Support Center Tab */}
        <TabsContent value="support">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Headphones className="h-5 w-5 text-emerald-400" />
                Support Center
              </CardTitle>
              <CardDescription>Manage customer support tickets and responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Support Ticket Management</p>
                      <p className="text-xs text-slate-400">View and respond to customer support requests</p>
                    </div>
                  </div>
                  <Link href="/support-hiregenai/admin">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                      Open Support
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-2xl font-bold text-emerald-400">{loading ? "..." : openTickets}</p>
                    <p className="text-xs text-slate-400">Open Tickets</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-2xl font-bold text-blue-400">{loading ? "..." : inProgressTickets}</p>
                    <p className="text-xs text-slate-400">In Progress</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-2xl font-bold text-emerald-400">{loading ? "..." : resolvedTodayTickets}</p>
                    <p className="text-xs text-slate-400">Resolved Today</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Feedback Tab */}
        <TabsContent value="feedback">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                Product Feedback
              </CardTitle>
              <CardDescription>Review and manage customer feedback and suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-2xl font-bold text-amber-400">{loading ? "..." : feedbackItems.length}</p>
                    <p className="text-xs text-slate-400">Total Feedback</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-2xl font-bold text-emerald-400">
                      {loading ? "..." : feedbackItems.filter(f => f.status === "open").length}
                    </p>
                    <p className="text-xs text-slate-400">New / Unread</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <p className="text-2xl font-bold text-blue-400">
                      {loading ? "..." : feedbackItems.filter(f => f.status === "resolved" || f.status === "closed").length}
                    </p>
                    <p className="text-xs text-slate-400">Reviewed</p>
                  </div>
                </div>

                {/* Feedback List */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Recent Feedback</h3>
                  {feedbackItems.length === 0 ? (
                    <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-slate-700">
                      <Lightbulb className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No feedback received yet</p>
                      <p className="text-xs text-slate-500 mt-1">Customer feedback will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {feedbackItems.map((feedback: any) => (
                        <div 
                          key={feedback.id}
                          className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-500">{feedback.ticket_number}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  feedback.status === "open" ? "bg-amber-500/20 text-amber-400" :
                                  feedback.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                                  feedback.status === "resolved" ? "bg-emerald-500/20 text-emerald-400" :
                                  "bg-slate-500/20 text-slate-400"
                                }`}>
                                  {feedback.status === "open" ? "New" : 
                                   feedback.status === "in_progress" ? "Reviewing" :
                                   feedback.status === "resolved" ? "Reviewed" : feedback.status}
                                </span>
                              </div>
                              <h4 className="text-white font-medium truncate">{feedback.title}</h4>
                              <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                {feedback.first_message || feedback.category}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span>{feedback.user_email}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(feedback.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                                {feedback.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link to Support Admin */}
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Respond to Feedback</p>
                      <p className="text-xs text-slate-400">Open support admin to reply to feedback</p>
                    </div>
                  </div>
                  <Link href="/support-hiregenai/admin">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2">
                      Open Admin
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// This page needs to be client-side for real-time data fetching
// Remove the metadata export since we're using "use client"
