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
  qualifiedCandidates: number
  completedInterviews: number
  successRate: number
}

const processFlowSteps = [
  { title: "Create JD", role: "(as a recruiter)" },
  { title: "Share Apply Now link", role: "(as a recruiter)" },
  { title: "Candidate applies", role: "(as a candidate)" },
  { title: "Review qualified candidate", role: "(as a recruiter)" },
  { title: "Send interview link", role: "(as a recruiter)" },
  { title: "Candidate gives interview", role: "(as a candidate)" },
  { title: "Review completed interview", role: "(as a recruiter)" },
  { title: "Send to hiring manager", role: "(as a recruiter)" },
]

export default function DashboardPage() {
  const { company } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    qualifiedCandidates: 0,
    completedInterviews: 0,
    successRate: 0,
  })
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

    // Fetch qualified candidate statistics
    const qualifiedRes = await fetch(`/api/analytics/qualified?companyId=${company.id}`)
    const qualifiedData = await qualifiedRes.json().catch(() => ({ ok: false, candidates: [] }))
    const qualifiedCandidatesCount = qualifiedData.ok ? (qualifiedData.candidates?.length || 0) : 0

    // Fetch interview statistics
    const { data: interviews } = await supabase
      .from("interview_rounds")
      .select("*, job_descriptions!inner(*)")
      .eq("job_descriptions.company_id", company.id)
      .eq("status", "success")

    setStats({
      totalJobs: openJobsCount,
      qualifiedCandidates: qualifiedCandidatesCount,
      completedInterviews: interviews?.length || 0,
      successRate: 85, // This would be calculated based on actual data
    })
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
            <div className="text-2xl font-bold">{stats.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/dashboard/analytics/qualified'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualifiedCandidates || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for next steps</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/dashboard/analytics/interviews'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedInterviews || 0}</div>
            <p className="text-xs text-muted-foreground">Upcoming and planned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate || 0}%</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>HireGenAI Process Flow</CardTitle>
          <CardDescription>End-to-end journey from job creation to hiring manager handoff</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50 to-white px-12 py-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_75%)] opacity-30" aria-hidden="true" />
              <div className="absolute left-14 right-14 top-[62px] h-[2px] bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]" />
              <div className="relative flex justify-between gap-4">
                {processFlowSteps.map((step, index) => (
                  <div key={step.title} className="flex flex-col items-center text-center w-[120px]">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full border-2 border-emerald-500 bg-white text-emerald-600 text-base font-semibold shadow-[0_8px_18px_-12px_rgba(16,185,129,0.6)]">
                      {index + 1}
                    </div>
                    <div className="mt-4 text-sm font-semibold text-gray-900 leading-tight">
                      {step.title}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600/90 mt-1">
                      {step.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:hidden rounded-2xl border border-emerald-100 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-6">
              {processFlowSteps.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center text-center w-[130px]">
                  <div className="flex items-center justify-center h-11 w-11 rounded-full border-2 border-emerald-500 bg-white text-emerald-600 font-semibold">
                    {index + 1}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-gray-900 leading-tight">
                    {step.title}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600/90 mt-1">
                    {step.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pb-2" />
    </div>
  )
}
