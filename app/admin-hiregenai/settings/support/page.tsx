"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Headphones, MessageCircle, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function SupportCenterPage() {
  const [openTickets, setOpenTickets] = useState(0)
  const [inProgressTickets, setInProgressTickets] = useState(0)
  const [resolvedTodayTickets, setResolvedTodayTickets] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTicketStats()
  }, [])

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
      <div className="flex items-center gap-4">
        <Link href="/admin-hiregenai/settings">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
        <p className="text-slate-400">Manage customer support tickets and responses</p>
      </div>
      
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
    </div>
  )
}
