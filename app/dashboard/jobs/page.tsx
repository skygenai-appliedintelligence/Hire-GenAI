"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { type Job } from "@/lib/job-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Briefcase, CheckCircle, XCircle, ExternalLink, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function JobsPage() {
  const { company } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const [applyEnabledByJob, setApplyEnabledByJob] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'open' | 'on_hold' | 'closed' | 'cancelled'>('open')
  const [statusByJob, setStatusByJob] = useState<Record<string, 'open' | 'on_hold' | 'closed' | 'cancelled'>>({})

  const normalizeStatus = (s: string | undefined | null): 'open' | 'on_hold' | 'closed' | 'cancelled' => {
    const v = String(s || '').trim().toLowerCase()
    if (v === 'closed') return 'closed'
    if (v === 'on hold' || v === 'on_hold' || v === 'on-hold' || v === 'onhold' || v === 'hold' || v === 'paused' || v === 'pause') return 'on_hold'
    if (v === 'cancelled' || v === 'canceled' || v === 'cancel') return 'cancelled'
    return 'open'
  }

  useEffect(() => {
    if (company?.id) {
      fetchJobs()
    }
  }, [company])

  // Read Apply Form toggle per job and listen for changes
  useEffect(() => {
    const loadStates = () => {
      setApplyEnabledByJob((prev) => {
        const next: Record<string, boolean> = { ...prev }
        for (const j of jobs) {
          try {
            const saved = localStorage.getItem(`applyFormEnabled:${j.id}`)
            next[j.id] = saved === null ? true : saved === 'true'
          } catch {
            next[j.id] = true
          }
        }
        return next
      })
    }
    loadStates()
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      const m = e.key.match(/^applyFormEnabled:(.+)$/)
      if (m && e.newValue !== null) {
        const jobId = m[1]
        setApplyEnabledByJob((prev) => ({ ...prev, [jobId]: e.newValue === 'true' }))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [jobs])

  // Read Job Status per job and listen for changes
  useEffect(() => {
    const loadStatuses = () => {
      setStatusByJob((prev) => {
        const next: Record<string, 'open' | 'on_hold' | 'closed' | 'cancelled'> = { ...prev }
        for (const j of jobs) {
          try {
            const saved = localStorage.getItem(`jobStatus:${j.id}`)
            if (saved) next[j.id] = normalizeStatus(saved)
            else next[j.id] = normalizeStatus((j as any).status)
          } catch {
            next[j.id] = normalizeStatus((j as any).status)
          }
        }
        return next
      })
    }
    loadStatuses()
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      const m = e.key.match(/^jobStatus:(.+)$/)
      if (m) {
        const jobId = m[1]
        const newVal = e.newValue
        if (newVal !== null) {
          setStatusByJob((prev) => ({ ...prev, [jobId]: normalizeStatus(newVal) }))
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [jobs])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const companyName = company?.name ? encodeURIComponent(company.name) : ''
      const url = companyName ? `/api/jobs?company=${companyName}` : '/api/jobs'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to load jobs')
      setJobs(
        (data.jobs || []).map((j: any) => ({
          id: j.id,
          company_id: j.company_id || '',
          title: j.title,
          description: j.summary || j.description || '',
          requirements: j.requirements || '',
          location: j.location_text || '',
          salary_range: j.salary_label || j.salary_range || '',
          employment_type: j.employment_type || '',
          status: j.status || 'open',
          posted_platforms: Array.isArray(j.posted_platforms) ? j.posted_platforms : [],
          platform_job_ids: typeof j.platform_job_ids === 'object' && j.platform_job_ids !== null ? j.platform_job_ids : {},
          posting_results: Array.isArray(j.posting_results) ? j.posting_results : [],
          interview_rounds: j.interview_rounds || [],
          created_by: j.created_by || '',
          created_at: j.created_at,
          updated_at: j.updated_at,
          total_applications: 0,
          qualified_candidates: 0,
          in_progress: 0,
          completed_interviews: 0,
          recommended: 0,
          rejected: 0,
        }))
      )
    } catch (error) {
      console.error('❌ Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!company?.name) {
      toast({ title: "Missing company context", description: "Please re-login or select a company.", variant: "destructive" })
      return
    }

    if (confirm("Are you sure you want to delete this job?")) {
      try {
        setDeletingId(jobId)
        console.log("🗑️ Deleting job:", jobId)
        const companyName = encodeURIComponent(company.name)
        const res = await fetch(`/api/jobs/${jobId}?company=${companyName}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to delete job')

        setJobs((prev) => prev.filter((job) => job.id !== jobId))
        console.log("✅ Job deleted successfully")
        toast({ title: "Job deleted", description: "The job has been removed successfully." })
      } catch (err) {
        console.error("❌ Failed to delete job", err)
        toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" })
      } finally {
        setDeletingId(null)
      }
    }
  }

  const getStatusColor = (status: 'open' | 'on_hold' | 'closed' | 'cancelled') => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800'
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-200 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    )
  }

  const handleStoreJD = (job: Job) => {
    try {
      // Determine number of interview rounds
      const roundsCount = Array.isArray((job as any).interview_rounds)
        ? (job as any).interview_rounds.length
        : (typeof (job as any).interview_rounds === 'number' ? (job as any).interview_rounds : 0)

      // Fallback: if not available, default to 1
      const agentsCount = Math.max(1, Number(roundsCount) || 0)

      // Build selectedAgents as [1..agentsCount]
      const selectedAgents = Array.from({ length: agentsCount }, (_, i) => i + 1)
      localStorage.setItem('selectedAgents', JSON.stringify(selectedAgents))

      // Persist chosen interview rounds if available so Selected Agents can map correctly
      const rounds = Array.isArray((job as any).interview_rounds) ? (job as any).interview_rounds : []
      if (rounds.length > 0) {
        localStorage.setItem('selectedInterviewRounds', JSON.stringify(rounds))
      }

      // Optionally store minimal job data (not required by selected-agents page but useful)
      const jobData = {
        id: job.id,
        title: job.title,
        company: company?.name || '',
        description: job.description,
        location: job.location,
        employment_type: job.employment_type,
        createdAt: job.created_at,
      }
      localStorage.setItem('newJobData', JSON.stringify(jobData))

      // Redirect to Selected Agents page with jobId so it can fetch JD directly
      router.push(`/selected-agents?jobId=${encodeURIComponent(job.id)}`)
    } catch (e) {
      console.error('Failed to store JD for selected agents:', e)
      alert('Unable to proceed. Please try again.')
    }
  }

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Descriptions</h1>
          <p className="text-gray-600">Manage your job postings and track their performance across platforms</p>
        </div>
        <Link href="/dashboard/jobs/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Buckets: by status */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'open' | 'on_hold' | 'closed' | 'cancelled')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="on_hold">On Hold</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        

        {/* Open tab: show jobs with status === open */}
        <TabsContent value="open">
          <div className="grid gap-6">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'open').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'open').map((job) => (
                <Card
                  key={job.id}
                  className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
                  onClick={() => handleStoreJD(job)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription>
                          {job.location} • {job.employment_type}
                          {job.salary_range && ` • ${job.salary_range}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={getStatusColor(effective)}>{effective}</Badge> })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{(() => {
                      // Extract "About the Role" section from structured description format
                      const description = job.description || ''
                      
                      // Try new structured format first
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) {
                        return aboutRoleMatch[1].trim()
                      }
                      
                      // Fallback: try old markdown format
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) {
                        return oldFormatMatch[1].trim()
                      }
                      
                      // Final fallback: show first meaningful content after Basic Information
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      
                      // Ultimate fallback: show first meaningful content without headers
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Status:</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {result.platform} (Failed)
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.posting_results.length === 0 && job.posted_platforms.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Posted to:</h4>
                        <div className="flex space-x-2">
                          {job.posted_platforms.map((platform) => (
                            <Badge key={platform} variant="outline">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(job.created_at).toLocaleDateString()}
                        {job.posting_results.length > 0 && (
                          <span className="ml-4">
                            Posted to {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length}{" "}
                            platforms
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/analytics`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent hover:bg-blue-50 hover:text-blue-700 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Stats
                          </Button>
                        </Link>
                        {/* Apply button enabled for open status */}
                        <Link href={`/jobs/${(company?.name || '').toLowerCase().replace(/\s+/g, '-')}/${job.id}`} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 bg-transparent hover:bg-blue-50 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Apply Form
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent hover:bg-gray-50 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id) }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shadow-sm hover:shadow-md motion-safe:transition-shadow"
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={deletingId === job.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingId === job.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border border-gray-200">
                <CardContent className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No open jobs</h3>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Cancelled tab: show jobs with status === cancelled */}
        <TabsContent value="cancelled">
          <div className="grid gap-6">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'cancelled').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'cancelled').map((job) => (
                <Card
                  key={job.id}
                  className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
                  onClick={() => handleStoreJD(job)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription>
                          {job.location} • {job.employment_type}
                          {job.salary_range && ` • ${job.salary_range}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={getStatusColor(effective)}>{effective}</Badge> })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{(() => {
                      // Extract "About the Role" section from structured description format
                      const description = job.description || ''
                      
                      // Try new structured format first
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) {
                        return aboutRoleMatch[1].trim()
                      }
                      
                      // Fallback: try old markdown format
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) {
                        return oldFormatMatch[1].trim()
                      }
                      
                      // Final fallback: show first meaningful content after Basic Information
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      
                      // Ultimate fallback: show first meaningful content without headers
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Status:</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {result.platform} (Failed)
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(job.created_at).toLocaleDateString()}
                        {job.posting_results.length > 0 && (
                          <span className="ml-4">
                            Posted to {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length}{" "}
                            platforms
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/analytics`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent hover:bg-blue-50 hover:text-blue-700 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Stats
                          </Button>
                        </Link>
                        {/* Disabled Apply in non-open statuses */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="cursor-not-allowed text-red-600 bg-transparent hover:bg-red-50/50 border-red-200/70"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          title="Apply Form is disabled for this status"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Apply Form
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent hover:bg-gray-50 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id) }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shadow-sm hover:shadow-md motion-safe:transition-shadow"
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={deletingId === job.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingId === job.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border border-gray-200">
                <CardContent className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No cancelled jobs</h3>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* On Hold tab: show jobs with status === on_hold */}
        <TabsContent value="on_hold">
          <div className="grid gap-6">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'on_hold').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'on_hold').map((job) => (
                <Card
                  key={job.id}
                  className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
                  onClick={() => handleStoreJD(job)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription>
                          {job.location} • {job.employment_type}
                          {job.salary_range && ` • ${job.salary_range}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={getStatusColor(effective)}>{effective}</Badge> })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{(() => {
                      // Extract "About the Role" section from structured description format
                      const description = job.description || ''
                      
                      // Try new structured format first
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) {
                        return aboutRoleMatch[1].trim()
                      }
                      
                      // Fallback: try old markdown format
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) {
                        return oldFormatMatch[1].trim()
                      }
                      
                      // Final fallback: show first meaningful content after Basic Information
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      
                      // Ultimate fallback: show first meaningful content without headers
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Status:</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {result.platform} (Failed)
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(job.created_at).toLocaleDateString()}
                        {job.posting_results.length > 0 && (
                          <span className="ml-4">
                            Posted to {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length}{" "}
                            platforms
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/analytics`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent hover:bg-blue-50 hover:text-blue-700 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Stats
                          </Button>
                        </Link>
                        {/* Disabled Apply in non-open statuses */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="cursor-not-allowed text-red-600 bg-transparent hover:bg-red-50/50 border-red-200/70"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          title="Apply Form is disabled for this status"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Apply Form
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent hover:bg-gray-50 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id) }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shadow-sm hover:shadow-md motion-safe:transition-shadow"
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={deletingId === job.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingId === job.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border border-gray-200">
                <CardContent className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No on-hold jobs</h3>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Closed tab: show jobs with status === closed */}
        <TabsContent value="closed">
          <div className="grid gap-6">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'closed').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'closed').map((job) => (
                <Card
                  key={job.id}
                  className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow cursor-pointer emerald-glow"
                  onClick={() => handleStoreJD(job)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription>
                          {job.location} • {job.employment_type}
                          {job.salary_range && ` • ${job.salary_range}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={getStatusColor(effective)}>{effective}</Badge> })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{(() => {
                      // Extract "About the Role" section from structured description format
                      const description = job.description || ''
                      
                      // Try new structured format first
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) {
                        return aboutRoleMatch[1].trim()
                      }
                      
                      // Fallback: try old markdown format
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) {
                        return oldFormatMatch[1].trim()
                      }
                      
                      // Final fallback: show first meaningful content after Basic Information
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      
                      // Ultimate fallback: show first meaningful content without headers
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Status:</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {result.platform} (Failed)
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.posting_results.length === 0 && job.posted_platforms.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Posted to:</h4>
                        <div className="flex space-x-2">
                          {job.posted_platforms.map((platform) => (
                            <Badge key={platform} variant="outline">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(job.created_at).toLocaleDateString()}
                        {job.posting_results.length > 0 && (
                          <span className="ml-4">
                            Posted to {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length}{" "}
                            platforms
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/analytics`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent hover:bg-blue-50 hover:text-blue-700 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Stats
                          </Button>
                        </Link>
                        {/* Disabled Apply in non-open statuses */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="cursor-not-allowed text-red-600 bg-transparent hover:bg-red-50/50 border-red-200/70"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          title="Apply Form is disabled for this status"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Apply Form
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent hover:bg-gray-50 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id) }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shadow-sm hover:shadow-md motion-safe:transition-shadow"
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={deletingId === job.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deletingId === job.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border border-gray-200">
                <CardContent className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No closed-form jobs</h3>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
