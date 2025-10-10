"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

// Status typings
export type InterviewStatus = "Completed" | "Scheduled" | "Pending" | "Cancelled"

type InterviewRow = {
  id: string
  jobId: string
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
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [rows, setRows] = useState<InterviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const url = jobId && jobId !== 'all' 
          ? `/api/analytics/interviews?jobId=${encodeURIComponent(jobId)}`
          : '/api/analytics/interviews'
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
    load()
  }, [jobId])

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
    <div className="max-w-7xl mx-auto px-4 space-y-6 py-6 overflow-x-hidden bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
        <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:underline">
          Back to Analytics
        </Link>
      </div>
      
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
                      aria-label="Select all interviews"
                    />
                  </TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Candidate Name</TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Applied JD</TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Email</TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Phone</TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Result</TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Score</TableHead>
                  <TableHead className="px-3 py-2 text-sm align-middle">Report</TableHead>
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
                      No interviews found. Interviews will appear here after they are scheduled or completed.
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
                    <TableCell className="px-3 py-2 text-sm align-middle">
                      {row.interviewScore !== undefined ? (
                        <span className={`font-medium ${row.interviewScore >= 70 ? 'text-green-600' : row.interviewScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {row.interviewScore}/100
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm align-middle whitespace-nowrap">
                      <Link href={`/dashboard/analytics/${row.jobId}/applications/${row.id}/report`}>
                        <Button variant="outline" size="sm">Show Report</Button>
                      </Link>
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
