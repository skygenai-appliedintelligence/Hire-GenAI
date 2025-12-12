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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye, Trash2, Briefcase, CheckCircle, XCircle, ExternalLink, BarChart3, MapPin, Clock, DollarSign, User, Filter, CalendarCheck } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"

export default function JobsPage() {
  const { company, user } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const [applyEnabledByJob, setApplyEnabledByJob] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'open' | 'on_hold' | 'closed' | 'cancelled'>('open')
  const [statusByJob, setStatusByJob] = useState<Record<string, 'open' | 'on_hold' | 'closed' | 'cancelled'>>({})
  const [users, setUsers] = useState<{ id: string; email: string; fullName: string }[]>([])
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('all')
  const [autoScheduleByJob, setAutoScheduleByJob] = useState<Record<string, boolean>>({})
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null)

  const normalizeStatus = (s: string | undefined | null): 'open' | 'on_hold' | 'closed' | 'cancelled' => {
    const v = String(s || '').trim().toLowerCase()
    if (v === 'closed') return 'closed'
    if (v === 'on hold' || v === 'on_hold' || v === 'on-hold' || v === 'onhold' || v === 'hold' || v === 'paused' || v === 'pause') return 'on_hold'
    if (v === 'cancelled' || v === 'canceled' || v === 'cancel') return 'cancelled'
    return 'open'
  }

  // Load users from company
  useEffect(() => {
    const loadUsers = async () => {
      if (!(company as any)?.id) return
      try {
        const res = await fetch(`/api/users/by-company?companyId=${(company as any).id}`)
        const data = await res.json()
        console.log('👥 Users API response:', data)
        if (data.ok && data.users) {
          console.log('👥 Setting users in state:', data.users)
          setUsers(data.users)
          // Set default filter to current user's email
          if (user?.email) {
            setSelectedUserEmail(user.email)
          }
        } else {
          console.log('⚠️ No users found or API error:', data)
        }
      } catch (e) {
        console.error('Failed to load users:', e)
      }
    }
    
    if ((company as any)?.id) {
      loadUsers()
    }
  }, [company, user])

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
      const mappedJobs = (data.jobs || []).map((j: any) => ({
        id: j.id,
        company_id: j.company_id || '',
        title: j.title,
        description: j.summary || j.description || '',
        requirements: j.requirements || '',
        location: j.location || j.location_text || '',
        salary_range: j.salary_label || j.salary_range || '',
        employment_type: j.employment_type || '',
        status: j.status || 'open',
        posted_platforms: Array.isArray(j.posted_platforms) ? j.posted_platforms : [],
        platform_job_ids: typeof j.platform_job_ids === 'object' && j.platform_job_ids !== null ? j.platform_job_ids : {},
        posting_results: Array.isArray(j.posting_results) ? j.posting_results : [],
        interview_rounds: j.interview_rounds || [],
        created_by: j.created_by || '',
        created_by_email: j.created_by_email || '',
        created_at: j.created_at,
        updated_at: j.updated_at,
        total_applications: 0,
        qualified_candidates: 0,
        in_progress: 0,
        completed_interviews: 0,
        recommended: 0,
        rejected: 0,
      }))
      setAllJobs(mappedJobs)
      setJobs(mappedJobs)
    } catch (error) {
      console.error('❌ Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter jobs when user selection changes
  useEffect(() => {
    if (selectedUserEmail === 'all') {
      setJobs(allJobs)
    } else {
      const filtered = allJobs.filter(job => job.created_by_email === selectedUserEmail)
      setJobs(filtered)
    }
  }, [selectedUserEmail, allJobs])

  // Initialize auto_schedule_interview state from jobs data
  // This effect runs whenever jobs change to ensure state reflects database values
  useEffect(() => {
    const autoScheduleState: Record<string, boolean> = {}
    for (const job of jobs) {
      // Always use the value from the job object (which comes from database)
      autoScheduleState[job.id] = (job as any).auto_schedule_interview === true
    }
    setAutoScheduleByJob(autoScheduleState)
    console.log('📋 [AUTO-SCHEDULE] Initialized state from jobs:', autoScheduleState)
  }, [jobs])

  // Handler to toggle auto_schedule_interview
  const handleAutoScheduleToggle = async (jobId: string, currentValue: boolean) => {
    if (!company?.name) {
      toast({ title: "Error", description: "Company context missing", variant: "destructive" })
      return
    }

    const newValue = !currentValue
    setTogglingJobId(jobId)
    console.log(`🔄 [AUTO-SCHEDULE] Toggling job ${jobId} from ${currentValue} to ${newValue}`)
    
    // Optimistically update UI
    setAutoScheduleByJob(prev => ({ ...prev, [jobId]: newValue }))

    try {
      const companyName = encodeURIComponent(company.name)
      const res = await fetch(`/api/jobs/${jobId}?company=${companyName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_schedule_interview: newValue })
      })
      const data = await res.json()
      
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to update')
      }

      console.log(`✅ [AUTO-SCHEDULE] Successfully updated job ${jobId} to ${newValue}`)
      
      toast({ 
        title: newValue ? "Auto-Schedule Enabled" : "Auto-Schedule Disabled",
        description: newValue 
          ? "Interview links will be auto-scheduled to qualified candidates" 
          : "Auto-scheduling has been turned off for this job"
      })
      
      // Refresh jobs to ensure state is synced with database
      await fetchJobs()
    } catch (err) {
      // Revert on error
      console.error(`❌ [AUTO-SCHEDULE] Failed to update job ${jobId}:`, err)
      setAutoScheduleByJob(prev => ({ ...prev, [jobId]: currentValue }))
      toast({ 
        title: "Update Failed", 
        description: (err as Error).message, 
        variant: "destructive" 
      })
    } finally {
      setTogglingJobId(null)
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
        setAllJobs((prev) => prev.filter((job) => job.id !== jobId))
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

      // Store job data for edit flow
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

      // Redirect to edit job page with interview tab
      router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}&tab=interview`)
    } catch (e) {
      console.error('Failed to load job for editing:', e)
      alert('Unable to proceed. Please try again.')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 px-3 sm:px-4 md:px-6 py-4 md:py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Descriptions</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your job postings and track performance</p>
        </div>
        <Link href="/dashboard/jobs/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Status Tabs and Filter Section */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'open' | 'on_hold' | 'closed' | 'cancelled')} className="space-y-4">
        {/* Stack tabs and filter on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Scrollable tabs on mobile */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-auto">
              <TabsTrigger value="open" className="text-xs sm:text-sm px-2 sm:px-3">Open</TabsTrigger>
              <TabsTrigger value="on_hold" className="text-xs sm:text-sm px-2 sm:px-3">On Hold</TabsTrigger>
              <TabsTrigger value="closed" className="text-xs sm:text-sm px-2 sm:px-3">Closed</TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm px-2 sm:px-3">Cancelled</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Filter Section - Full width on mobile */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by creator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.email}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        

        {/* Open tab: show jobs with status === open */}
        <TabsContent value="open">
          <div className="grid gap-5">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'open').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'open').map((job) => (
                <Card
                  key={job.id}
                  className="group border border-gray-200 bg-white rounded-xl shadow-sm transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="pb-4 pt-5 px-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{job.title}</CardTitle>
                      </div>
                      {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={`${getStatusColor(effective)} shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>{effective}</Badge> })()}
                    </div>
                    
                    {/* Job Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{job.location}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{job.employment_type}</span>
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-emerald-700">{job.salary_range}</span>
                        </span>
                      )}
                    </div>
                    
                    {(job as any).created_by_email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                        <User className="w-3.5 h-3.5" />
                        <span>Created by <span className="font-medium text-gray-700">{(job as any).created_by_email}</span></span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="px-6 pb-5">
                    {/* Description */}
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">{(() => {
                      const description = job.description || ''
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) return aboutRoleMatch[1].trim()
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) return oldFormatMatch[1].trim()
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {/* Platform Status */}
                    {job.posting_results.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Platform Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.posting_results.length === 0 && job.posted_platforms.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Posted Platforms</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posted_platforms.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto-Schedule Toggle */}
                    <div className="mb-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Auto-Schedule Interviews</p>
                            <p className="text-xs text-gray-500">Send interview links to qualified candidates automatically</p>
                          </div>
                        </div>
                        <Switch
                          checked={autoScheduleByJob[job.id] ?? false}
                          onCheckedChange={() => handleAutoScheduleToggle(job.id, autoScheduleByJob[job.id] ?? false)}
                          disabled={togglingJobId === job.id}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-4"></div>

                    {/* Footer with Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Created {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {job.posting_results.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                            {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length} platforms
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            localStorage.setItem('selectedJobForAnalytics', JSON.stringify({ id: job.id, title: job.title }))
                            router.push('/dashboard/analytics')
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                          Stats
                        </Button>
                        <Link href={`/jobs/${(company?.name || '').toLowerCase().replace(/\s+/g, '-')}/${job.id}`} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Apply
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-gray-50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
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
          <div className="grid gap-5">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'cancelled').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'cancelled').map((job) => (
                <Card
                  key={job.id}
                  className="group border border-gray-200 bg-white rounded-xl shadow-sm transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="pb-4 pt-5 px-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{job.title}</CardTitle>
                      </div>
                      {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={`${getStatusColor(effective)} shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>{effective}</Badge> })()}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{job.location}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{job.employment_type}</span>
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-emerald-700">{job.salary_range}</span>
                        </span>
                      )}
                    </div>
                    
                    {(job as any).created_by_email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                        <User className="w-3.5 h-3.5" />
                        <span>Created by <span className="font-medium text-gray-700">{(job as any).created_by_email}</span></span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">{(() => {
                      const description = job.description || ''
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) return aboutRoleMatch[1].trim()
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) return oldFormatMatch[1].trim()
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Platform Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto-Schedule Toggle */}
                    <div className="mb-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Auto-Schedule Interviews</p>
                            <p className="text-xs text-gray-500">Send interview links to qualified candidates automatically</p>
                          </div>
                        </div>
                        <Switch
                          checked={autoScheduleByJob[job.id] ?? false}
                          onCheckedChange={() => handleAutoScheduleToggle(job.id, autoScheduleByJob[job.id] ?? false)}
                          disabled={togglingJobId === job.id}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Created {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {job.posting_results.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                            {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length} platforms
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            localStorage.setItem('selectedJobForAnalytics', JSON.stringify({ id: job.id, title: job.title }))
                            router.push('/dashboard/analytics')
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                          Stats
                        </Button>
                        <Link href={`/jobs/${(company?.name || '').toLowerCase().replace(/\s+/g, '-')}/${job.id}`} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Apply
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-gray-50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
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
          <div className="grid gap-5">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'on_hold').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'on_hold').map((job) => (
                <Card
                  key={job.id}
                  className="group border border-gray-200 bg-white rounded-xl shadow-sm transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="pb-4 pt-5 px-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{job.title}</CardTitle>
                      </div>
                      {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={`${getStatusColor(effective)} shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>{effective}</Badge> })()}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{job.location}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{job.employment_type}</span>
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-emerald-700">{job.salary_range}</span>
                        </span>
                      )}
                    </div>
                    
                    {(job as any).created_by_email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                        <User className="w-3.5 h-3.5" />
                        <span>Created by <span className="font-medium text-gray-700">{(job as any).created_by_email}</span></span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">{(() => {
                      const description = job.description || ''
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) return aboutRoleMatch[1].trim()
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) return oldFormatMatch[1].trim()
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Platform Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto-Schedule Toggle */}
                    <div className="mb-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Auto-Schedule Interviews</p>
                            <p className="text-xs text-gray-500">Send interview links to qualified candidates automatically</p>
                          </div>
                        </div>
                        <Switch
                          checked={autoScheduleByJob[job.id] ?? false}
                          onCheckedChange={() => handleAutoScheduleToggle(job.id, autoScheduleByJob[job.id] ?? false)}
                          disabled={togglingJobId === job.id}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Created {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {job.posting_results.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                            {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length} platforms
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            localStorage.setItem('selectedJobForAnalytics', JSON.stringify({ id: job.id, title: job.title }))
                            router.push('/dashboard/analytics')
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                          Stats
                        </Button>
                        <Link href={`/jobs/${(company?.name || '').toLowerCase().replace(/\s+/g, '-')}/${job.id}`} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Apply
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-gray-50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
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
          <div className="grid gap-5">
            {jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'closed').length > 0 ? (
              jobs.filter(j => (statusByJob[j.id] ?? normalizeStatus((j as any).status)) === 'closed').map((job) => (
                <Card
                  key={job.id}
                  className="group border border-gray-200 bg-white rounded-xl shadow-sm transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="pb-4 pt-5 px-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-1 leading-tight">{job.title}</CardTitle>
                      </div>
                      {(() => { const effective = (statusByJob[job.id] ?? normalizeStatus((job as any).status)); return <Badge className={`${getStatusColor(effective)} shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>{effective}</Badge> })()}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{job.location}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{job.employment_type}</span>
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-emerald-700">{job.salary_range}</span>
                        </span>
                      )}
                    </div>
                    
                    {(job as any).created_by_email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                        <User className="w-3.5 h-3.5" />
                        <span>Created by <span className="font-medium text-gray-700">{(job as any).created_by_email}</span></span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">{(() => {
                      const description = job.description || ''
                      const aboutRoleMatch = description.match(/About the Role\s*\n(.+?)(?=\n🔹|\n$|$)/s)
                      if (aboutRoleMatch && aboutRoleMatch[1]) return aboutRoleMatch[1].trim()
                      const oldFormatMatch = description.match(/## About the Role\s*\n(.+?)(?=\n##|\n$|$)/s)
                      if (oldFormatMatch && oldFormatMatch[1]) return oldFormatMatch[1].trim()
                      const afterBasicInfo = description.split('About the Role')[1]
                      if (afterBasicInfo) {
                        const cleanContent = afterBasicInfo.split('🔹')[0]?.trim() || afterBasicInfo.split('\n\n')[0]?.trim()
                        if (cleanContent && cleanContent.length > 10) {
                          return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
                        }
                      }
                      const cleanDesc = description.replace(/^\/\/ Basic Information[\s\S]*?(?=About the Role|$)/, '').replace(/##[^\n]*\n/g, '').trim()
                      const firstLine = cleanDesc.split('\n')[0] || description
                      return firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine
                    })()}</p>

                    {job.posting_results.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Platform Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posting_results.map((result, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                              {result.success ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                    {result.platform}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.posting_results.length === 0 && job.posted_platforms.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Posted Platforms</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.posted_platforms.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto-Schedule Toggle */}
                    <div className="mb-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Auto-Schedule Interviews</p>
                            <p className="text-xs text-gray-500">Send interview links to qualified candidates automatically</p>
                          </div>
                        </div>
                        <Switch
                          checked={autoScheduleByJob[job.id] ?? false}
                          onCheckedChange={() => handleAutoScheduleToggle(job.id, autoScheduleByJob[job.id] ?? false)}
                          disabled={togglingJobId === job.id}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Created {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {job.posting_results.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                            {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length} platforms
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            localStorage.setItem('selectedJobForAnalytics', JSON.stringify({ id: job.id, title: job.title }))
                            router.push('/dashboard/analytics')
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                          Stats
                        </Button>
                        <Link href={`/jobs/${(company?.name || '').toLowerCase().replace(/\s+/g, '-')}/${job.id}`} target="_blank">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Apply
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-gray-50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            try { localStorage.setItem('editJobDraft', JSON.stringify(job)) } catch {}
                            router.push(`/dashboard/jobs/new?jobId=${encodeURIComponent(job.id)}`)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
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
