"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Users, Briefcase, Calendar, Target, Filter } from "lucide-react"

export default function AnalyticsPage() {
  const { company } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<{
    totalApplications: number
    qualifiedCandidates: number
    interviewsCompleted: number
    successfulHires: number
    averageTimeToHire: number
    topSources: { platform: string; count: number; percentage: number }[]
    monthlyTrends: {
      applications: { current: number; previous: number; change: number }
      interviews: { current: number; previous: number; change: number }
      hires: { current: number; previous: number; change: number }
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>("all")

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await fetch('/api/jobs/titles', { cache: 'no-store' })
        const data = await res.json()
        if (data.ok && data.jobs) {
          setJobs(data.jobs)
        }
      } catch (e) {
        console.error('Failed to load job titles:', e)
      }
    }

    // Check if coming from jobs page with selected job
    const checkSelectedJob = () => {
      try {
        const selectedJob = localStorage.getItem('selectedJobForAnalytics')
        if (selectedJob) {
          const jobData = JSON.parse(selectedJob)
          setSelectedJobId(jobData.id)
          // Clear the localStorage after using it
          localStorage.removeItem('selectedJobForAnalytics')
          return jobData.id
        }
      } catch (e) {
        console.error('Failed to parse selected job:', e)
      }
      return 'all'
    }

    const loadAnalytics = async (jobId: string) => {
      try {
        const url = jobId === 'all' 
          ? '/api/analytics' 
          : `/api/analytics?jobId=${encodeURIComponent(jobId)}`
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json()
        if (data.ok && data.analytics) {
          setAnalytics(data.analytics)
        } else {
          setAnalytics({
            totalApplications: 0,
            qualifiedCandidates: 0,
            interviewsCompleted: 0,
            successfulHires: 0,
            averageTimeToHire: 0,
            topSources: [],
            monthlyTrends: {
              applications: { current: 0, previous: 0, change: 0 },
              interviews: { current: 0, previous: 0, change: 0 },
              hires: { current: 0, previous: 0, change: 0 },
            },
          })
        }
      } catch (e) {
        setAnalytics({
          totalApplications: 0,
          qualifiedCandidates: 0,
          interviewsCompleted: 0,
          successfulHires: 0,
          averageTimeToHire: 0,
          topSources: [],
          monthlyTrends: {
            applications: { current: 0, previous: 0, change: 0 },
            interviews: { current: 0, previous: 0, change: 0 },
            hires: { current: 0, previous: 0, change: 0 },
          },
        })
      } finally {
        setLoading(false)
      }
    }

    // First check for selected job, then load analytics with the correct job ID
    const initialJobId = checkSelectedJob()
    loadJobs()
    loadAnalytics(initialJobId)
  }, [])

  // Reload analytics when job filter changes
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      try {
        const url = selectedJobId === 'all' 
          ? '/api/analytics' 
          : `/api/analytics?jobId=${encodeURIComponent(selectedJobId)}`
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json()
        if (data.ok && data.analytics) {
          setAnalytics(data.analytics)
        }
      } catch (e) {
        console.error('Failed to load filtered analytics:', e)
      } finally {
        setLoading(false)
      }
    }

    if (selectedJobId) {
      loadAnalytics()
    }
  }, [selectedJobId])

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

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your recruitment performance and insights</p>
        </div>
        
        {/* Job Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by job title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
          role="button"
          tabIndex={0}
          onClick={() => {
            const url = selectedJobId === 'all' 
              ? "/dashboard/analytics/applications"
              : `/dashboard/analytics/applications?jobId=${encodeURIComponent(selectedJobId)}`
            router.push(url)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const url = selectedJobId === 'all' 
                ? "/dashboard/analytics/applications"
                : `/dashboard/analytics/applications?jobId=${encodeURIComponent(selectedJobId)}`
              router.push(url)
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalApplications ?? 0}</div>
            <div className="flex items-center space-x-1 text-xs">
              {getTrendIcon(analytics?.monthlyTrends.applications.change ?? 0)}
              <span className={getTrendColor(analytics?.monthlyTrends.applications.change ?? 0)}>
                +{analytics?.monthlyTrends.applications.change ?? 0}%
              </span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
          role="button"
          tabIndex={0}
          onClick={() => {
            const url = selectedJobId === 'all' 
              ? "/dashboard/analytics/qualified"
              : `/dashboard/analytics/qualified?jobId=${encodeURIComponent(selectedJobId)}`
            router.push(url)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const url = selectedJobId === 'all' 
                ? "/dashboard/analytics/qualified"
                : `/dashboard/analytics/qualified?jobId=${encodeURIComponent(selectedJobId)}`
              router.push(url)
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Candidates</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.qualifiedCandidates ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {analytics && analytics.totalApplications ? Math.round((analytics.qualifiedCandidates / analytics.totalApplications) * 100) : 0}% qualification rate
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews Completed</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.interviewsCompleted ?? 0}</div>
            <div className="flex items-center space-x-1 text-xs">
              {getTrendIcon(analytics?.monthlyTrends.interviews.change ?? 0)}
              <span className={getTrendColor(analytics?.monthlyTrends.interviews.change ?? 0)}>
                +{analytics?.monthlyTrends.interviews.change ?? 0}%
              </span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Hires</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.successfulHires ?? 0}</div>
            <div className="flex items-center space-x-1 text-xs">
              {getTrendIcon(analytics?.monthlyTrends.hires.change ?? 0)}
              <span className={getTrendColor(analytics?.monthlyTrends.hires.change ?? 0)}>
                +{analytics?.monthlyTrends.hires.change ?? 0}%
              </span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
          <CardHeader>
            <CardTitle>Top Candidate Sources</CardTitle>
            <CardDescription>Where your best candidates are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.topSources ?? []).map((source, index) => (
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
                  <span className="text-2xl font-bold text-blue-600">{analytics?.averageTimeToHire ?? 0} days</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Interview Success Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {analytics && analytics.interviewsCompleted ? Math.round((analytics.successfulHires / analytics.interviewsCompleted) * 100) : 0}%
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
                    {analytics && analytics.totalApplications ? Math.round((analytics.interviewsCompleted / analytics.totalApplications) * 100) : 0}%
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
