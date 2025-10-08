"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// Status is either "Interview Scheduled" | "Interview Completed" | "Awaiting Results"
type InterviewedRow = {
  id: string
  candidateName: string
  email: string
  phone: string
  cvUrl: string
  status: "Interview Scheduled" | "Interview Completed" | "Awaiting Results"
  interviewDate: string
  interviewRound: string
  score?: number
}

export default function JDInterviewedPage() {
  const params = useParams()
  const jdId = (params?.jdId as string) || ""

  const [rows, setRows] = useState<InterviewedRow[]>([])
  const [stats, setStats] = useState<{ applications: number; rounds: number; interviews: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!jdId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/interviewed/by-job/${encodeURIComponent(jdId)}`, { cache: "no-store" })
        const json = await res.json()
        // Debug: Log full payload
        console.log('[Interviewed] API payload:', json)
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load interviewed candidates")
        setRows(json.interviewed || [])
        if (json.stats) setStats(json.stats)
      } catch (e: any) {
        setError(e?.message || "Failed to load interviewed candidates")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [jdId])

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Interviewed Candidates</h1>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/analytics/${jdId}`} className="text-sm text-blue-600 hover:underline">
            Back to Overview
          </Link>
        </div>
      </div>

      <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
        <CardHeader>
          <CardTitle>Interviewed Candidates for this Job</CardTitle>
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
                    <TableHead>Interview Round</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-700 py-8">
                        <div>No interviewed candidates yet for this job.</div>
                        {stats && (
                          <div className="mt-2 text-xs text-gray-500">
                            Diagnostics — Applications: {stats.applications} • Rounds: {stats.rounds} • Interviews: {stats.interviews}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case "Interview Scheduled":
                            return "bg-yellow-100 text-yellow-700"
                          case "Interview Completed":
                            return "bg-green-100 text-green-700"
                          case "Awaiting Results":
                            return "bg-blue-100 text-blue-700"
                          default:
                            return "bg-gray-100 text-gray-700"
                        }
                      }
                      
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
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(row.status)}`}>
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{row.interviewRound}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{new Date(row.interviewDate).toLocaleDateString()}</span>
                          </TableCell>
                          <TableCell>
                            {row.score ? (
                              <span className="font-medium text-emerald-600">{row.score}%</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.status === "Interview Completed" ? (
                              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                                View Results
                              </Button>
                            ) : row.status === "Interview Scheduled" ? (
                              <Button size="sm" variant="outline">
                                Reschedule
                              </Button>
                            ) : (
                              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                                Process Results
                              </Button>
                            )}
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
