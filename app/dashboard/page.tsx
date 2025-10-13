"use client"

import { Button } from "@/components/ui/button"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Users, Calendar, TrendingUp, ExternalLink } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalJobs: number
  activeCandidates: number
  scheduledInterviews: number
  successRate: number
}

export default function DashboardPage() {
  const { company } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeCandidates: 0,
    scheduledInterviews: 0,
    successRate: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (company?.id) {
      fetchDashboardData()
    }
  }, [company])

  const fetchDashboardData = async () => {
    if (!company?.id) return

    // Fetch jobs via internal API (same source as Jobs page)
    let openJobsCount = 0
    try {
      const companyName = company?.name ? encodeURIComponent(company.name) : ''
      const url = companyName ? `/api/jobs?company=${companyName}` : '/api/jobs'
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok && Array.isArray(data.jobs)) {
        openJobsCount = data.jobs.filter((j: any) => {
          const v = String(j.status || '').trim().toLowerCase()
          if (v === 'closed') return false
          if (['on hold','on_hold','on-hold','onhold','hold','paused','pause'].includes(v)) return false
          if (['cancelled','canceled','cancel'].includes(v)) return false
          return true // treat anything else as open
        }).length
      }
    } catch (e) {
      console.error('Failed to load jobs for dashboard:', e)
    }

    // Fetch candidate statistics
    const { data: candidates } = await supabase
      .from("candidates")
      .select("*, job_descriptions!inner(*)")
      .eq("job_descriptions.company_id", company.id)

    // Fetch interview statistics
    const { data: interviews } = await supabase
      .from("interview_rounds")
      .select("*, job_descriptions!inner(*)")
      .eq("job_descriptions.company_id", company.id)
      .eq("status", "scheduled")

    // Fetch recent activity
    const { data: activity } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(10)

    setStats({
      totalJobs: openJobsCount,
      activeCandidates: candidates?.length || 0,
      scheduledInterviews: interviews?.length || 0,
      successRate: 85, // This would be calculated based on actual data
    })

    setRecentActivity(activity || [])
  }

  return (
    <div className="space-y-6">
      {/* Demo banner removed */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your recruitment.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/dashboard/jobs'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCandidates}</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledInterviews}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your recruitment pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline">{activity.details?.status || "Active"}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
