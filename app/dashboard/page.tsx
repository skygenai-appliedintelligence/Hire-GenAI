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

    // Fetch job statistics
    const { data: jobs } = await supabase.from("job_descriptions").select("*").eq("company_id", company.id)

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
      totalJobs: jobs?.length || 0,
      activeCandidates: candidates?.length || 0,
      scheduledInterviews: interviews?.length || 0,
      successRate: 85, // This would be calculated based on actual data
    })

    setRecentActivity(activity || [])
  }

  return (
    <div className="space-y-6">
      {/* Demo banner removed */}

      {/* AIP Quick Access */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">🤖 Automated Interview Pipeline (AIP)</h3>
              <p className="text-blue-700 text-sm mb-4">
                Test the complete AI-powered interview system with sample data and real-time processing
              </p>
              <div className="flex space-x-3">
                <Link href="/apply/job-1" target="_blank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Try Apply Form
                  </Button>
                </Link>
                <Link href="/dashboard/interviews">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    View Interviews
                  </Button>
                </Link>
              </div>
            </div>
            <div className="text-6xl">🚀</div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your recruitment.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
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
