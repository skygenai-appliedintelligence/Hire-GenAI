"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// NOTE: Replace with real data fetch later
// Status is either "CV Unqualified" | "CV Qualified"
type ApplicationRow = {
  id: string
  candidateName: string
  appliedJD: string
  email: string
  phone: string
  cvUrl: string
  status: "CV Unqualified" | "CV Qualified"
}

export default function TotalApplicationsPage() {
  const data: ApplicationRow[] = useMemo(
    () => [
      {
        id: "1",
        candidateName: "Jane Doe",
        appliedJD: "Frontend Engineer",
        email: "jane.doe@example.com",
        phone: "+1 555-0100",
        cvUrl: "/uploads/sample-cv-1.pdf",
        status: "CV Qualified",
      },
      {
        id: "2",
        candidateName: "John Smith",
        appliedJD: "Backend Engineer",
        email: "john.smith@example.com",
        phone: "+1 555-0101",
        cvUrl: "/uploads/sample-cv-2.pdf",
        status: "CV Unqualified",
      },
      {
        id: "3",
        candidateName: "Ava Patel",
        appliedJD: "Fullstack Developer",
        email: "ava.patel@example.com",
        phone: "+1 555-0102",
        cvUrl: "/uploads/sample-cv-3.pdf",
        status: "CV Qualified",
      },
    ],
    []
  )

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
                {data.map((row, idx) => {
                  const isQualified = row.status === "CV Qualified"
                  return (
                    <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50" : undefined}>
                      <TableCell className="font-medium">{row.candidateName}</TableCell>
                      <TableCell>{row.appliedJD}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>
                        <Link
                          href={row.cvUrl}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
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
                        <Button variant="outline" size="sm">Show CV Report</Button>
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
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
