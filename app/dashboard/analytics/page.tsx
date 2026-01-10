"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Users, Briefcase, Calendar, Target, Filter } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

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
      if (!(company as any)?.id) return
      try {
        const res = await fetch(`/api/jobs/titles?companyId=${(company as any).id}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        const data = await res.json()
        console.log('🔍 Jobs API response:', data)
        if (data.ok && data.jobs) {
          console.log('🔍 Setting jobs in state:', data.jobs)
          setJobs(data.jobs)
        } else {
          console.log('⚠️ No jobs found or API error:', data)
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
      if (!(company as any)?.id) return
      
      setLoading(true)
      
      try {
        const url = jobId === 'all' 
          ? `/api/analytics?companyId=${(company as any).id}` 
          : `/api/analytics?companyId=${(company as any).id}&jobId=${encodeURIComponent(jobId)}`
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
        console.error('Failed to load analytics:', e)
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
    if ((company as any)?.id) {
      loadJobs()
      loadAnalytics(initialJobId)
    }
  }, [company])

  // Reload analytics when job filter changes
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!(company as any)?.id) return
      
      setLoading(true)
      
      try {
        const url = selectedJobId === 'all' 
          ? `/api/analytics?companyId=${(company as any).id}` 
          : `/api/analytics?companyId=${(company as any).id}&jobId=${encodeURIComponent(selectedJobId)}`
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
        console.error('Failed to load filtered analytics:', e)
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

    if (selectedJobId && (company as any)?.id) {
      loadAnalytics()
    }
  }, [selectedJobId, company])

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
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-4 sm:py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 mb-2 sm:mb-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your recruitment performance and insights</p>
        </div>
        
        {/* Job Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-36 sm:w-48 md:w-64">
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

      {loading ? (
        <div className="py-16">
          <Spinner size="lg" text="Loading analytics data..." className="mx-auto" />
        </div>
      ) : (
      <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

        <Card
          className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
          role="button"
          tabIndex={0}
          onClick={() => {
            const url = selectedJobId === 'all' 
              ? "/dashboard/analytics/interviews"
              : `/dashboard/analytics/interviews?jobId=${encodeURIComponent(selectedJobId)}`
            router.push(url)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const url = selectedJobId === 'all' 
                ? "/dashboard/analytics/interviews"
                : `/dashboard/analytics/interviews?jobId=${encodeURIComponent(selectedJobId)}`
              router.push(url)
            }
          }}
        >
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

        <Card 
          className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow cursor-pointer"
          onClick={() => {
            const url = selectedJobId === "all" 
              ? "/dashboard/analytics/successful-hire"
              : `/dashboard/analytics/successful-hire?jobId=${encodeURIComponent(selectedJobId)}`
            router.push(url)
          }}
        >
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
          <CardHeader>
            <CardTitle>Top Candidate Sources</CardTitle>
            <CardDescription>Where your best candidates are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.topSources ?? []).map((source, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <span className="font-medium text-sm sm:text-base">{source.platform}</span>
                  </div>
                  <div className="flex items-center space-x-2 ml-9 sm:ml-0">
                    <span className="text-xs sm:text-sm text-gray-600">{source.count} candidates</span>
                    <Badge variant="outline" className="text-xs">{source.percentage}%</Badge>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 space-y-1 sm:space-y-0">
                  <span className="text-sm font-medium">Average Time to Hire</span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">{analytics?.averageTimeToHire ?? 0} days</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((analytics?.averageTimeToHire ?? 0) / 30 * 100, 100)}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 space-y-1 sm:space-y-0">
                  <span className="text-sm font-medium">Interview Success Rate</span>
                  <span className="text-xl sm:text-2xl font-bold text-green-600">
                    {analytics && analytics.interviewsCompleted ? Math.round((analytics.successfulHires / analytics.interviewsCompleted) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${analytics && analytics.interviewsCompleted ? Math.round((analytics.successfulHires / analytics.interviewsCompleted) * 100) : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 space-y-1 sm:space-y-0">
                  <span className="text-sm font-medium">Application to Interview Rate</span>
                  <span className="text-xl sm:text-2xl font-bold text-purple-600">
                    {analytics && analytics.totalApplications ? Math.round((analytics.interviewsCompleted / analytics.totalApplications) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${analytics && analytics.totalApplications ? Math.round((analytics.interviewsCompleted / analytics.totalApplications) * 100) : 0}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  )
}
