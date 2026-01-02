"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import SendEmailModal from "@/components/ui/send-email-modal"
import { Spinner } from "@/components/ui/spinner"

// Status and Bucket typings
export type InterviewStatus = "Unqualified" | "Qualified" | "Pending" | "Expired"

type CandidateRow = {
  id: string
  jobId: string
  candidateName: string
  appliedJD: string
  jobTitle?: string
  email: string
  phone: string
  cvUrl: string
  status: InterviewStatus
  interviewEmailSent?: boolean
  interviewEmailSentAt?: string
}

type Bucket = {
  key: string
  label: string
  agent: string
  rows: CandidateRow[]
}

export default function QualifiedCandidatesInterviewFlowPage() {
  const { company, user } = useAuth()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({})
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null)
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>(jobId || 'all')
  const { toast } = useToast()

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
        if (data.ok && data.jobs) {
          setJobs(data.jobs)
        }
      } catch (e) {
        console.error('Failed to load job titles:', e)
      }
    }

    const loadCandidates = async () => {
      if (!(company as any)?.id) return
      setLoading(true)
      try {
        const url = selectedJobId && selectedJobId !== 'all' 
          ? `/api/analytics/qualified?companyId=${(company as any).id}&jobId=${encodeURIComponent(selectedJobId)}`
          : `/api/analytics/qualified?companyId=${(company as any).id}`
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        console.log('Qualified API Response:', json)
        
        if (!res.ok) {
          setError(json.error || 'Failed to load qualified candidates')
          return
        }
        
        if (json.ok && json.candidates) {
          // Map all candidates to "Qualified" status like the job-specific page
          const mappedCandidates = json.candidates.map((candidate: any) => ({
            ...candidate,
            status: "Qualified" as InterviewStatus
          }))
          setRows(mappedCandidates)
          
          // Initialize sentMap from database interviewEmailSent values
          const initialSentMap: Record<string, boolean> = {}
          for (const candidate of json.candidates) {
            if (candidate.interviewEmailSent === true) {
              initialSentMap[candidate.id] = true
            }
          }
          setSentMap(initialSentMap)
          
          // Reset selections when data changes
          setSelectedRows(new Set())
          setSelectAll(false)
        } else {
          setError('Invalid response format')
        }
      } catch (e) {
        console.error('Failed to load qualified candidates:', e)
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if ((company as any)?.id) {
      loadJobs()
      loadCandidates()
    }
  }, [selectedJobId, company])

  const sendInterviewLink = async (row: CandidateRow) => {
    try {
      const res = await fetch('/api/interview/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: row.id,
          email: row.email,
          name: row.candidateName,
          jobTitle: row.appliedJD,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to send link')

      setSentMap(prev => ({ ...prev, [row.id]: true }))
      toast({
        title: 'Interview link sent',
        description: json.url ? `URL: ${json.url}` : 'Link generated successfully',
      })
      // For quick testing, also log in browser console
      if (json.url) console.log('[Interview Link]', json.url)
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e?.message || 'Something went wrong', variant: 'destructive' })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedRows(new Set(rows.map(row => row.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleRowSelect = (rowId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(rowId)
    } else {
      newSelected.delete(rowId)
    }
    setSelectedRows(newSelected)
    setSelectAll(newSelected.size === rows.length && rows.length > 0)
  }

  const handleOpenEmailModal = (candidate: CandidateRow) => {
    // Add jobId to candidate data for the modal
    const candidateWithJobId = {
      ...candidate,
      jobId: candidate.jobId
    }
    setSelectedCandidate(candidateWithJobId)
    setEmailModalOpen(true)
  }

  const handleSendEmail = async (message: string, category: 'interview' | 'new_job') => {
    if (!selectedCandidate) return

    try {
      // Send real email using the custom email API
      // Include applicationId so the database can be updated to mark email as sent
      const res = await fetch('/api/emails/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: selectedCandidate.candidateName,
          candidateEmail: selectedCandidate.email,
          jobTitle: selectedCandidate.appliedJD,
          companyName: (company as any)?.name || '',
          messageContent: message,
          category: category,
          applicationId: selectedCandidate.id // Pass applicationId to mark email as sent in DB
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to send email')

      setSentMap(prev => ({ ...prev, [selectedCandidate.id]: true }))
      
      console.log('✅ Email sent successfully to:', selectedCandidate.email)
      console.log('📧 Category:', category)
      console.log('📝 Message length:', message.length)
      
    } catch (e: any) {
      console.error('❌ Failed to send email:', e)
      throw new Error(e?.message || 'Something went wrong')
    }
  }

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Qualified Candidates</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-48">
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
          <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:underline">
            Back to Analytics
          </Link>
        </div>
      </div>

      <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
        <CardHeader>
          <CardTitle>All Qualified Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all candidates"
                    />
                  </TableHead>
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Applied JD</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Send Interview Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Spinner size="md" text="Loading qualified candidates..." className="mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-red-500">
                      Error: {error}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No qualified candidates found. Candidates will appear here after CV screening.
                    </TableCell>
                  </TableRow>
                ) : rows.map((row, idx) => (
                  <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={(checked) => handleRowSelect(row.id, checked as boolean)}
                        aria-label={`Select ${row.candidateName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.candidateName}</TableCell>
                    <TableCell>{row.appliedJD}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>
                      <span
                        className={
                          row.status === "Qualified"
                            ? "inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                            : row.status === "Unqualified"
                            ? "inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                            : row.status === "Pending"
                            ? "inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700"
                            : "inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                        }
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/analytics/${row.jobId}/applications/${row.id}/report`}>
                        <Button variant="outline" size="sm">Show Report</Button>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className={
                          sentMap[row.id]
                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }
                        onClick={() => handleOpenEmailModal(row)}
                      >
                        {sentMap[row.id] ? "Resend Email" : "Send Email"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Email Modal */}
      {selectedCandidate && (
        <SendEmailModal
          isOpen={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false)
            setSelectedCandidate(null)
          }}
          candidate={selectedCandidate}
          company={company}
          user={user}
          onSendEmail={handleSendEmail}
        />
      )}
    </div>
  )
}
