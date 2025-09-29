"use client"

import Link from "next/link"
import { useMemo } from "react"
// Removed Card wrappers per request
// Tabs removed per request
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// Status and Bucket typings
export type InterviewStatus = "Unqualified" | "Qualified" | "Pending" | "Expired"

type CandidateRow = {
  id: string
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
  const buckets: Bucket[] = useMemo(
    () => [
      {
        key: "screening",
        label: "Screening Round",
        agent: "Agent 1 - Screening Round",
        rows: [],
      },
      {
        key: "technical",
        label: "Technical Round",
        agent: "Agent 2 - Technical Round",
        rows: [],
      },
      {
        key: "system-design",
        label: "System Design Round",
        agent: "Agent 3 - System Design Round",
        rows: [],
      },
      {
        key: "behavioral",
        label: "Behavioral Round",
        agent: "Agent 4 - Behavioral Round",
        rows: [],
      },
      {
        key: "final",
        label: "Final Round",
        agent: "Agent 5 - Final Round",
        rows: [],
      },
    ],
    []
  )

  const firstBucket = buckets[0]

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
        {firstBucket && (
          <section key={firstBucket.key} className="space-y-3">
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
                    <TableHead className="px-3 py-2 text-sm align-middle whitespace-nowrap">Resend Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {firstBucket.rows.map((row, idx) => (
                    <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                      <TableCell className="px-3 py-2 text-sm align-middle font-medium truncate">{row.candidateName}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle truncate">{row.appliedJD}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <span className="block max-w-[220px] truncate">{row.email}</span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">{row.phone}</TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle">
                        <Link href={row.cvUrl} target="_blank" className="text-blue-600 hover:underline">
                          View CV
                        </Link>
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
                        <Button variant="outline" size="sm">Show Report & Interview Details</Button>
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
                          Processed to Next Round
                        </Button>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm align-middle whitespace-nowrap">
                        <Button
                          size="sm"
                          className={
                            row.status === "Pending" || row.status === "Expired"
                              ? "bg-yellow-500 text-white hover:bg-yellow-600"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }
                          disabled={!(row.status === "Pending" || row.status === "Expired")}
                        >
                          Resend Link
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
