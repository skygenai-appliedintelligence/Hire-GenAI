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
import { Spinner } from "@/components/ui/spinner"

// Status typings
export type InterviewStatus = "Completed" | "Scheduled" | "Pending" | "Cancelled"

type InterviewRow = {
  id: string
  jobId: string
  applicationId?: string
  candidateName: string
  appliedJD: string
  email: string
  phone: string
  status: InterviewStatus
  interviewDate?: string
  interviewScore?: number
  feedback?: string
  result?: 'Pass' | 'Fail'
}

export default function InterviewsPage() {
  const { company } = useAuth()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [rows, setRows] = useState<InterviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
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

    const loadInterviews = async () => {
      if (!(company as any)?.id) return
      setLoading(true)
      try {
        const url = selectedJobId && selectedJobId !== 'all' 
          ? `/api/analytics/interviews?companyId=${(company as any).id}&jobId=${encodeURIComponent(selectedJobId)}`
          : `/api/analytics/interviews?companyId=${(company as any).id}`
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        console.log('Interviews API Response:', json)
        
        if (!res.ok) {
          setError(json.error || 'Failed to load interviews')
          return
        }
        
        if (json.ok && json.interviews) {
          setRows(json.interviews)
          // Reset selections when data changes
          setSelectedRows(new Set())
          setSelectAll(false)
        } else {
          setError('Invalid response format')
        }
      } catch (e) {
        console.error('Failed to load interviews:', e)
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if ((company as any)?.id) {
      loadJobs()
      loadInterviews()
    }
  }, [selectedJobId, company])

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

  const getStatusColor = (status: InterviewStatus) => {
    switch (status) {
      case "Completed":
        return "inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
      case "Scheduled":
        return "inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
      case "Pending":
        return "inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700"
      case "Cancelled":
        return "inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
      default:
        return "inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
    }
  }

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
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
          <CardTitle>All Interviews</CardTitle>
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
                      aria-label="Select all interviews"
                    />
                  </TableHead>
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Applied JD</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Spinner size="md" text="Loading interviews..." className="mx-auto" />
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
                      No interviews found. Interviews will appear here after they are scheduled or completed.
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
                      {row.interviewScore !== undefined ? (
                        <span className={`font-semibold ${row.result === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                          {row.result || 'N/A'}
                        </span>
                      ) : (
                        <span className={getStatusColor(row.status)}>
                          {row.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.interviewScore !== undefined ? (
                        <span className={`font-medium ${row.interviewScore >= 70 ? 'text-green-600' : row.interviewScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {row.interviewScore}/100
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/analytics/${row.jobId}/applications/${encodeURIComponent(row.applicationId || row.id)}/report`}>
                        <Button variant="outline" size="sm">Show Report</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
