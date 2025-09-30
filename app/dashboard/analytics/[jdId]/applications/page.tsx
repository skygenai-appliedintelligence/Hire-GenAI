"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// Status is either "CV Unqualified" | "CV Qualified"
type ApplicationRow = {
  id: string
  candidateName: string
  email: string
  phone: string
  cvUrl: string
  status: "CV Unqualified" | "CV Qualified"
}

export default function JDApplicationsPage() {
  const params = useParams()
  const jdId = (params?.jdId as string) || ""

  const [rows, setRows] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!jdId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/applications/by-job/${encodeURIComponent(jdId)}`, { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load applications")
        setRows(json.applications || [])
      } catch (e: any) {
        setError(e?.message || "Failed to load applications")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [jdId])

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Total Applications</h1>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/analytics/${jdId}`} className="text-sm text-blue-600 hover:underline">
            Back to Overview
          </Link>
        </div>
      </div>

      <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
        <CardHeader>
          <CardTitle>Applications for this Job</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading…</div>
          ) : error ? (
            <div className="py-8 text-center text-red-600">{error}</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>CV Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No applications yet for this job.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => {
                      const isQualified = row.status === "CV Qualified"
                      return (
                        <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                          <TableCell className="font-medium">{row.candidateName}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>
                            <Link href={row.cvUrl} target="_blank" className="text-blue-600 hover:underline">
                              View CV
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                isQualified
                                  ? "inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                                  : "inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                              }
                            >
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Link href={`/dashboard/analytics/${jdId}/applications/${row.id}/report`}>
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
                              disabled={!isQualified}
                            >
                              Processed to Next Round
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
