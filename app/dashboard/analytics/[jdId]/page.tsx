"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, Clock, TrendingUp, ArrowLeft, Calendar } from "lucide-react"
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

  const conversionRate = useMemo(() => {
    if (!data) return 0
    const total = data.stats.applicants
    return total > 0 ? (data.stats.recommended / total) * 100 : 0
  }, [data])

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

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Job Analytics</h1>
        </div>
        <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:underline">
          All Analytics
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">{displayTitle}</CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs border border-emerald-200">
              JD ID: <span className="font-mono text-[11px]">{jdId}</span>
            </span>
            {employmentType && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs border border-emerald-200 ml-2">
                {employmentType}
              </span>
            )}
            {createdAt && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs border border-emerald-200 ml-2">
                <Calendar className="h-3.5 w-3.5" />
                Created: {new Date(createdAt).toLocaleDateString()}
              </span>
            )}
            <span className="block mt-2 text-gray-600">Performance snapshot for this job</span>
          </CardDescription>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/dashboard/analytics/${jdId}`}
              className="inline-flex items-center rounded-full px-3 py-1 text-sm border border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              Overview
            </Link>
            <Link
              href={`/dashboard/analytics/${jdId}/applications`}
              className="inline-flex items-center rounded-full px-3 py-1 text-sm border border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50"
            >
              Applications
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading analytics...</div>
          ) : error ? (
            <div className="py-8 text-center text-red-600">{error}</div>
          ) : data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between min-h-[96px]">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Applicants</p>
                      <p className="text-2xl font-bold text-gray-900">{data.stats.applicants}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between min-h-[96px]">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Qualified</p>
                      <p className="text-2xl font-bold text-gray-900">{data.stats.qualified}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between min-h-[96px]">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-gray-900">{data.stats.inProgress}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between min-h-[96px]">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
