"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// NOTE: Replace with real data fetch later
// Status is either "CV Unqualified" | "CV Qualified"
type ApplicationRow = {
  id: string
  jobId: string
  candidateName: string
  appliedJD: string
  email: string
  phone: string
  cvUrl: string
  status: "CV Unqualified" | "CV Qualified"
}

export default function ApplicationsPage() {
  const { company } = useAuth()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const [data, setData] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      if (!(company as any)?.id) return
      try {
        const url = jobId && jobId !== 'all' 
          ? `/api/analytics/applications?companyId=${(company as any).id}&jobId=${encodeURIComponent(jobId)}`
          : `/api/analytics/applications?companyId=${(company as any).id}`
        const res = await fetch(url, { cache: 'no-store' })
        const json = await res.json()
        console.log('API Response:', json)
        
        if (!res.ok) {
          setError(json.error || 'Failed to load applications')
          return
        }
        
        if (json.ok && json.applications) {
          setData(json.applications)
        } else {
          setError('Invalid response format')
        }
      } catch (e) {
        console.error('Failed to load applications:', e)
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    if ((company as any)?.id) {
      load()
    }
  }, [jobId, company])

  const updateStatus = async (row: ApplicationRow, qualified: boolean) => {
    setSaving((s) => ({ ...s, [row.id]: true }))
    const newStatus: ApplicationRow["status"] = qualified ? "CV Qualified" : "CV Unqualified"
    const originalStatus = row.status
    // Optimistic update
    setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)))
    try {
      const res = await fetch('/api/applications/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: row.id, qualified }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) {
        // Revert on failure
        setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: originalStatus } : r)))
      }
    } catch {
      setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: originalStatus } : r)))
    } finally {
      setSaving((s) => ({ ...s, [row.id]: false }))
    }
  }

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Total Applications</h1>
        <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:underline">
          Back to Analytics
        </Link>
      </div>

      <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Applied JD</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>CV Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Action</TableHead>
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
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No applications found. Applications will appear here once candidates apply to jobs.
                    </TableCell>
                  </TableRow>
                ) : data.map((row, idx) => {
                  const isQualified = row.status === "CV Qualified"
                  return (
                    <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                      <TableCell className="font-medium">{row.candidateName}</TableCell>
                      <TableCell>{row.appliedJD}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>
                        {row.cvUrl ? (
                          <Link
                            href={row.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View CV
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">No CV</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="relative inline-flex items-center">
                          <select
                            className={`appearance-none rounded-md border px-2 py-1 text-xs font-medium pr-6 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              isQualified
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                            value={row.status}
                            onChange={(e) => updateStatus(row, e.target.value === 'CV Qualified')}
                            disabled={saving[row.id] || loading}
                          >
                            <option value="CV Qualified">CV Qualified</option>
                            <option value="CV Unqualified">CV Unqualified</option>
                          </select>
                          <svg className="pointer-events-none absolute right-1.5 h-3 w-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/analytics/${row.jobId}/applications/${row.id}/report`}>
                          <Button variant="outline" size="sm">Show CV Report</Button>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className={
                            isQualified
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }
                          disabled={!isQualified || saving[row.id]}
                        >
                          {saving[row.id] ? 'Updating...' : 'Processed to Next Round'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
