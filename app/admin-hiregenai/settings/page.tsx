"use client"

import SettingsTab from "@/app/admin-hiregenai/_components/SettingsTab"
import CustomerInteractionsTab from "@/app/admin-hiregenai/_components/CustomerInteractionsTab"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Headphones, MessageCircle, ArrowRight, Settings, Users, ExternalLink } from "lucide-react"
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
