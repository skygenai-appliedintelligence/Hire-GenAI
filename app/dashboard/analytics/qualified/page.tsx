"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
// Removed Card wrappers per request
// Tabs removed per request
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

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
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const url = jobId && jobId !== 'all' 
          ? `/api/analytics/qualified?jobId=${encodeURIComponent(jobId)}`
          : '/api/analytics/qualified'
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
    load()
  }, [jobId])

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
                    <TableHead className="px-3 py-2 text-sm align-middle">Candidate Name</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Applied JD</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Email</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Phone</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">CV Link</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Status</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Report</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle whitespace-nowrap">Action</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle whitespace-nowrap">Send Interview Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">Loading...</TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-red-500">
                        Error: {error}
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No qualified candidates found. Candidates will appear here after CV screening.
                      </TableCell>
                    </TableRow>
                  ) : rows.map((row, idx) => (
                    <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                      <TableCell className="px-3 py-2 text-sm align-middle font-medium truncate">{row.candidateName}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle truncate">{row.appliedJD}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <span className="block max-w-[220px] truncate">{row.email}</span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">{row.phone}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        {row.cvUrl ? (
                          <Link href={row.cvUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View CV
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">No CV</span>
                        )}
                      </TableCell>
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
                            row.status === "Qualified"
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }
                          disabled={row.status !== "Qualified"}
                        >
                          Proceed Next
                        </Button>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle whitespace-nowrap">
                        <Button
                          size="sm"
                          className={
                            sentMap[row.id]
                              ? "bg-yellow-500 text-white hover:bg-yellow-600"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }
                          onClick={() => sendInterviewLink(row)}
                        >
                          {sentMap[row.id] ? "Resend Link" : "Send Email"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
      </div>
    </div>
  )
}
