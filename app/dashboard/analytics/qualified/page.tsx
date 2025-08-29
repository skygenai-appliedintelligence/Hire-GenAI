"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
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
        rows: [
          {
            id: "1",
            candidateName: "Jane Doe",
            appliedJD: "Frontend Engineer",
            email: "jane.doe@example.com",
            phone: "+1 555-0100",
            cvUrl: "/uploads/sample-cv-1.pdf",
            status: "Qualified",
          },
          {
            id: "2",
            candidateName: "John Smith",
            appliedJD: "Backend Engineer",
            email: "john.smith@example.com",
            phone: "+1 555-0101",
            cvUrl: "/uploads/sample-cv-2.pdf",
            status: "Unqualified",
          },
          {
            id: "3",
            candidateName: "Sara Khan",
            appliedJD: "Fullstack Developer",
            email: "sara.khan@example.com",
            phone: "+1 555-0102",
            cvUrl: "/uploads/sample-cv-3.pdf",
            status: "Pending",
          },
        ],
      },
      {
        key: "technical",
        label: "Technical Round",
        agent: "Agent 2 - Technical Round",
        rows: [
          {
            id: "4",
            candidateName: "Ava Patel",
            appliedJD: "Fullstack Developer",
            email: "ava.patel@example.com",
            phone: "+1 555-0103",
            cvUrl: "/uploads/sample-cv-4.pdf",
            status: "Qualified",
          },
          {
            id: "5",
            candidateName: "Mike Ross",
            appliedJD: "Backend Engineer",
            email: "mike.ross@example.com",
            phone: "+1 555-0104",
            cvUrl: "/uploads/sample-cv-5.pdf",
            status: "Expired",
          },
        ],
      },
      {
        key: "system-design",
        label: "System Design Round",
        agent: "Agent 3 - System Design Round",
        rows: [
          {
            id: "6",
            candidateName: "Emily Clark",
            appliedJD: "Senior Engineer",
            email: "emily.clark@example.com",
            phone: "+1 555-0105",
            cvUrl: "/uploads/sample-cv-6.pdf",
            status: "Pending",
          },
        ],
      },
      {
        key: "behavioral",
        label: "Behavioral Round",
        agent: "Agent 4 - Behavioral Round",
        rows: [
          {
            id: "7",
            candidateName: "Leo Wang",
            appliedJD: "Frontend Engineer",
            email: "leo.wang@example.com",
            phone: "+1 555-0106",
            cvUrl: "/uploads/sample-cv-7.pdf",
            status: "Qualified",
          },
        ],
      },
      {
        key: "final",
        label: "Final Round",
        agent: "Agent 5 - Final Round",
        rows: [
          {
            id: "8",
            candidateName: "Noah Lee",
            appliedJD: "Staff Engineer",
            email: "noah.lee@example.com",
            phone: "+1 555-0107",
            cvUrl: "/uploads/sample-cv-8.pdf",
            status: "Qualified",
          },
        ],
      },
    ],
    []
  )

  // Controlled tabs to allow programmatic switching when clicking summary cards
  const [tabValue, setTabValue] = useState<string>("screening")

  return (
    <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Qualified Candidates - Interview Flow</h1>
        <Link href="/dashboard/analytics" className="text-sm text-blue-600 hover:underline">
          Back to Analytics
        </Link>
      </div>

      {/* Summary metric cards for each bucket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {buckets.map((b) => (
          <button
            key={b.key}
            onClick={() => setTabValue(b.key)}
            className={`text-left group focus:outline-none`}
            aria-label={`Open ${b.label}`}
          >
            <Card
              className={`border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow ${tabValue === b.key ? "ring-emerald-300" : ""}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
                  <span>{b.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-gray-900">{b.rows.length}</div>
                <p className="text-xs text-gray-500 mt-1">total candidates</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Tabs without visible strip; switching happens via the summary cards above */}
      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">

        {buckets.map((b) => (
          <TabsContent key={b.key} value={b.key}>
            <Card className="border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white motion-safe:transition-shadow emerald-glow">
              <CardHeader>
                <CardTitle>{b.agent}</CardTitle>
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
                        <TableHead>Resend Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {b.rows.map((row, idx) => {
                        const isQualified = row.status === "Qualified"
                        const isUnqualified = row.status === "Unqualified"
                        const canResend = row.status === "Pending" || row.status === "Expired"
                        return (
                          <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                            <TableCell className="font-medium">{row.candidateName}</TableCell>
                            <TableCell>{row.appliedJD}</TableCell>
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
                              <Button variant="outline" size="sm">Show Report & Interview Details</Button>
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
                            <TableCell>
                              <Button
                                size="sm"
                                className={
                                  canResend
                                    ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                }
                                disabled={!canResend}
                              >
                                Resend Link
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
