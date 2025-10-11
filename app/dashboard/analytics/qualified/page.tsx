"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
// Removed Card wrappers per request
// Tabs removed per request
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import SendEmailModal from "@/components/ui/send-email-modal"

// Status and Bucket typings
export type InterviewStatus = "Unqualified" | "Qualified" | "Pending" | "Expired"

type CandidateRow = {
  id: string
  jobId: string
  candidateName: string
  appliedJD: string
  email: string
  phone: string
  cvUrl: string
  status: InterviewStatus
}

type Bucket = {
  key: string
  label: string
  agent: string
  rows: CandidateRow[]
}

export default function QualifiedCandidatesInterviewFlowPage() {
  const { company } = useAuth()
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
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      if (!(company as any)?.id) return
      try {
        const url = jobId && jobId !== 'all' 
          ? `/api/analytics/qualified?companyId=${(company as any).id}&jobId=${encodeURIComponent(jobId)}`
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
      load()
    }
  }, [jobId, company])

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
      // Use the same interview link API that was working before
      const res = await fetch('/api/interview/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedCandidate.id,
          email: selectedCandidate.email,
          name: selectedCandidate.candidateName,
          jobTitle: selectedCandidate.appliedJD,
          customMessage: message,
          category: category
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to send email')

      setSentMap(prev => ({ ...prev, [selectedCandidate.id]: true }))
      
      // Log the actual interview link that was generated
      console.log('[Interview Link Generated]', json.url)
      console.log('[Custom Message Sent]', message)
      console.log('[Category]', category)
      
    } catch (e: any) {
      throw new Error(e?.message || 'Something went wrong')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 py-6 overflow-x-hidden bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Qualified Candidates</h1>
        <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:underline">
          Back to Analytics
        </Link>
      </div>
      {/* Single section (keep only one table) */}
      <div className="space-y-8">
        <section className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <Table className="table-auto w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-3 py-2 text-sm align-middle w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all candidates"
                      />
                    </TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Candidate Name</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Applied JD</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Email</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Phone</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Status</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Report</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle whitespace-nowrap">Send Interview Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">Loading...</TableCell>
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
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={(checked) => handleRowSelect(row.id, checked as boolean)}
                          aria-label={`Select ${row.candidateName}`}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle font-medium truncate">{row.candidateName}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle truncate">{row.appliedJD}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <span className="block max-w-[220px] truncate">{row.email}</span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">{row.phone}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
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
                      <TableCell className="px-3 py-2 text-sm align-middle whitespace-nowrap">
                        <Link href={`/dashboard/analytics/${row.jobId}/applications/${row.id}/report`}>
                          <Button variant="outline" size="sm">Show Report</Button>
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle whitespace-nowrap">
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
          </section>
      </div>

      {/* Email Modal */}
      {selectedCandidate && (
        <SendEmailModal
          isOpen={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false)
            setSelectedCandidate(null)
          }}
          candidate={selectedCandidate}
          onSendEmail={handleSendEmail}
        />
      )}
    </div>
  )
}
