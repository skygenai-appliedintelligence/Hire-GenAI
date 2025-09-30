"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Users, Target, Calendar, Briefcase, ArrowLeft } from "lucide-react"
import { MetricsDashboard } from "@/components/ui/metrics-card"
import { useAuth } from "@/contexts/auth-context"
import { JobService, type Job } from "@/lib/job-service"

type AnalyticsResponse = {
  ok: boolean
  jdId: string
  stats: {
    applicants: number
    qualified: number
    interviewsCompleted: number
    inProgress: number
    recommended: number
    rejected: number
  }
}

export default function AnalyticsByJDPage() {
  const params = useParams()
  const router = useRouter()
  const jdId = (params?.jdId as string) || ""
  const { company } = useAuth()

  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string>("")
  const displayTitle = jobTitle || "Robotic Automation"
  const [employmentType, setEmploymentType] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  // Mock analytics data structure matching global analytics
  const analytics = useMemo(() => {
    if (!data) return null
    return {
      totalApplications: data.stats.applicants,
      qualifiedCandidates: data.stats.qualified,
      interviewsCompleted: data.stats.interviewsCompleted,
      successfulHires: data.stats.recommended,
      averageTimeToHire: 18,
      topSources: [
        { platform: "LinkedIn", count: Math.floor(data.stats.applicants * 0.43), percentage: 43 },
        { platform: "Indeed", count: Math.floor(data.stats.applicants * 0.29), percentage: 29 },
        { platform: "Monster", count: Math.floor(data.stats.applicants * 0.18), percentage: 18 },
        { platform: "Naukri", count: Math.floor(data.stats.applicants * 0.10), percentage: 10 },
      ],
      monthlyTrends: {
        applications: { current: data.stats.applicants, previous: Math.max(0, data.stats.applicants - 10), change: 16.4 },
        interviews: { current: data.stats.interviewsCompleted, previous: Math.max(0, data.stats.interviewsCompleted - 5), change: 18.4 },
        hires: { current: data.stats.recommended, previous: Math.max(0, data.stats.recommended - 2), change: 50 },
      },
    }
  }, [data])

  const metricsData = useMemo(() => {
    if (!analytics) return []
    return [
      {
        title: "Total Applications",
        value: analytics.totalApplications,
        trend: {
          value: analytics.monthlyTrends.applications.change,
          label: "from last month"
        },
        icon: Users,
        iconColor: "text-blue-600",
        onClick: () => router.push(`/dashboard/analytics/${jdId}/applications`)
      },
      {
        title: "Qualified Candidates",
        value: analytics.qualifiedCandidates,
        subtext: `${analytics.totalApplications ? Math.round((analytics.qualifiedCandidates / analytics.totalApplications) * 100) : 0}% qualification rate`,
        icon: Target,
        iconColor: "text-green-600",
        onClick: () => router.push(`/dashboard/analytics/${jdId}/qualified`)
      },
      {
        title: "Interviews Completed",
        value: analytics.interviewsCompleted,
        trend: {
          value: analytics.monthlyTrends.interviews.change,
          label: "from last month"
        },
        icon: Calendar,
        iconColor: "text-purple-600",
        onClick: () => router.push(`/dashboard/analytics/${jdId}/interviewed`)
      },
      {
        title: "Successful Hires",
        value: analytics.successfulHires,
        trend: {
          value: analytics.monthlyTrends.hires.change,
          label: "from last month"
        },
        icon: Briefcase,
        iconColor: "text-orange-600"
      }
    ]
  }, [analytics, router, jdId])

  const hasData = useMemo(() => {
    if (!data) return false
    const s = data.stats
    return (
      (s.applicants ?? 0) > 0 ||
      (s.qualified ?? 0) > 0 ||
      (s.inProgress ?? 0) > 0 ||
      (s.interviewsCompleted ?? 0) > 0 ||
      (s.recommended ?? 0) > 0 ||
      (s.rejected ?? 0) > 0
    )
  }, [data])

  const getTrendIcon = (change: number) => {
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getTrendColor = (change: number) => {
    return change > 0 ? "text-green-600" : "text-red-600"
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!jdId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/analytics/${encodeURIComponent(jdId)}`, { cache: "no-store" })
        const json = (await res.json()) as AnalyticsResponse
        if (!res.ok || !json?.ok) throw new Error((json as any)?.error || "Failed to load analytics")
        setData(json)
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics")
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [jdId])

  // Load job title using client-side JobService (localStorage-backed)
  useEffect(() => {
    const loadJobTitle = async () => {
      if (!jdId || !company?.id) return
      try {
        const job = await JobService.getJob(jdId, company.id)
        if (job?.title) setJobTitle(job.title)
      } catch {}
    }
    loadJobTitle()
  }, [jdId, company?.id])

  // Fetch authoritative job summary from backend (DB or placeholder)
  useEffect(() => {
    const fetchJobSummary = async () => {
      if (!jdId || !company?.id) return
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jdId)}/summary?companyId=${encodeURIComponent(company.id)}`, { cache: "no-store" })
        const json = await res.json()
        if (res.ok && json?.ok && json.job) {
          if (json.job.title) setJobTitle(json.job.title)
          setEmploymentType(json.job.employment_type ?? null)
          setCreatedAt(json.job.created_at ?? null)
        }
      } catch {
        // ignore, UI already has fallback
      }
    }
    fetchJobSummary()
  }, [jdId, company?.id])

  if (loading) {
    return (
      <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
        <div className="py-8 text-center">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
        <div className="py-8 text-center text-red-600">{error}</div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{displayTitle}</h1>
            <p className="text-gray-600">Track your recruitment performance and insights</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
          </Button>
        </div>
        <div className="py-14 text-center text-gray-600">
          <div className="text-lg font-medium">No analytics yet for this job</div>
          <div className="text-sm mt-1">Metrics will appear once candidates start applying and progressing.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayTitle}</h1>
          <p className="text-gray-600">Track your recruitment performance and insights</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/jobs")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
        </Button>
      </div>

      {/* Key Metrics */}
      <MetricsDashboard metrics={metricsData} />

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
          <CardHeader>
            <CardTitle>Top Candidate Sources</CardTitle>
            <CardDescription>Where your best candidates are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.topSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <span className="font-medium">{source.platform}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{source.count} candidates</span>
                    <Badge variant="outline">{source.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
          <CardHeader>
            <CardTitle>Recruitment Efficiency</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Average Time to Hire</span>
                  <span className="text-2xl font-bold text-blue-600">{analytics?.averageTimeToHire || 0} days</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Interview Success Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {analytics?.interviewsCompleted ? Math.round((analytics.successfulHires / analytics.interviewsCompleted) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "27%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Application to Interview Rate</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {analytics?.totalApplications ? Math.round((analytics.interviewsCompleted / analytics.totalApplications) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "29%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
