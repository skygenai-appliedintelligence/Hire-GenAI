"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type SuccessfulHireRow = {
  id: string
  jobId: string
  candidateName: string
  appliedJD: string
  email: string
  phone: string
  status: string
}

export default function SuccessfulHirePage() {
  const { company } = useAuth()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [rows, setRows] = useState<SuccessfulHireRow[]>([])
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

    const load = async () => {
      if (!(company as any)?.id) return
      try {
        const url = selectedJobId && selectedJobId !== 'all' 
          ? `/api/analytics/successful-hire?companyId=${(company as any).id}&jobId=${encodeURIComponent(selectedJobId)}`
          : `/api/analytics/successful-hire?companyId=${(company as any).id}`
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }

        console.log(`Found ${json.hires?.length || 0} successful hires`)
        setRows(json.hires || [])
      } catch (e: any) {
        console.error('Failed to load successful hires:', e)
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if ((company as any)?.id) {
      loadJobs()
      load()
    }
  }, [selectedJobId, company])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(rows.map(row => row.id)))
    } else {
      setSelectedRows(new Set())
    }
    setSelectAll(checked)
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "hired":
        return "bg-green-100 text-green-800"
      case "pass":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const updateStatus = async (hireId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/analytics/successful-hire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hireId,
          status: newStatus
        })
      })

      const result = await response.json()

      if (result.ok) {
        // Update local state
        setRows(prevRows => 
          prevRows.map(row => 
            row.id === hireId ? { ...row, status: newStatus } : row
          )
        )
        toast({
          title: "Status Updated",
          description: `Status changed to ${newStatus}`,
        })
      } else {
        throw new Error(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      })
    }
  }

  const downloadReport = (hire: SuccessfulHireRow) => {
    // Generate CSV report
    const csvContent = `Candidate Report
Name,${hire.candidateName}
Position,${hire.appliedJD}
Email,${hire.email}
Phone,${hire.phone}
Status,${hire.status}
Generated,${new Date().toLocaleString()}`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${hire.candidateName.replace(/\s+/g, '_')}_report.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Report Downloaded",
      description: `Report for ${hire.candidateName} has been downloaded`,
    })
  }

  const downloadCV = (hire: SuccessfulHireRow) => {
    // Generate dummy CV content
    const cvContent = `${hire.candidateName}
${hire.email} | ${hire.phone}

PROFESSIONAL SUMMARY
Experienced ${hire.appliedJD} with strong technical skills and proven track record.

EXPERIENCE
Current Position: ${hire.appliedJD}
Status: ${hire.status}

CONTACT INFORMATION
Email: ${hire.email}
Phone: ${hire.phone}

Generated on: ${new Date().toLocaleString()}`

    const blob = new Blob([cvContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${hire.candidateName.replace(/\s+/g, '_')}_CV.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast({
      title: "CV Downloaded",
      description: `CV for ${hire.candidateName} has been downloaded`,
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 py-6 overflow-x-hidden bg-gradient-to-b from-green-50/60 via-white to-green-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Successful Hires</h1>
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

      <div className="space-y-8">
        <section>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Hired Candidates ({rows.length})
                </h2>
                {selectedRows.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedRows.size} selected
                    </span>
                    <Button size="sm" variant="outline">
                      Export Selected
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-3 py-2 text-sm align-middle w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all hires"
                      />
                    </TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Candidate Name</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Position</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Email</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Phone</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Status</TableHead>
                    <TableHead className="px-3 py-2 text-sm align-middle">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading...</TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-red-500">
                        Error: {error}
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No successful hires found. Hired candidates will appear here after onboarding.
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
                      <TableCell className="px-3 py-2 text-sm align-middle font-medium">
                        {row.candidateName}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">{row.appliedJD}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <span className="block max-w-[220px] truncate">{row.email}</span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">{row.phone}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <Select
                          value={row.status}
                          onValueChange={(value) => updateStatus(row.id, value)}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pass">
                              <Badge className="bg-blue-100 text-blue-800">Pass</Badge>
                            </SelectItem>
                            <SelectItem value="Hired">
                              <Badge className="bg-green-100 text-green-800">Hired</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadReport(row)}
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Report
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadCV(row)}
                            className="h-8 px-2"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            CV
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
