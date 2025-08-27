"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { XCircle, ArrowLeft } from "lucide-react"

interface EvaluationRecord {
  candidateId: string
  jobId: string
  jobTitle: string
  candidateName: string
  createdAt: string
  qualified: boolean
  score: number
  reasoning: string
  feedback: string
}

export default function NotQualifiedResultPage() {
  const params = useSearchParams()
  const router = useRouter()
  const candidateId = params.get("candidateId") || ""
  const [record, setRecord] = useState<EvaluationRecord | null>(null)

  const createdAt = useMemo(() => {
    if (!record?.createdAt) return ""
    try { return new Date(record.createdAt).toLocaleString() } catch { return record.createdAt }
  }, [record])

  useEffect(() => {
    try {
      const listRaw = localStorage.getItem("applicationEvaluations") || "[]"
      const list: EvaluationRecord[] = JSON.parse(listRaw)
      const rec = list.find((r) => r.candidateId === candidateId) || null
      setRecord(rec)
    } catch {
      setRecord(null)
    }
  }, [candidateId])

  if (!candidateId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle>Application Result</CardTitle>
            <CardDescription>Missing candidate reference.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-white to-rose-50/40 px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="w-full shadow-sm rounded-2xl border border-rose-200">
          <CardHeader className="text-center px-6 sm:px-10 pt-10 pb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
              <XCircle className="h-8 w-8 text-rose-600" aria-hidden="true" />
            </div>
            <h1 className="sr-only">Application Not Suitable</h1>
            <CardTitle className="text-3xl sm:text-4xl font-semibold tracking-tight text-rose-700">Application Not Suitable</CardTitle>
            <CardDescription className="text-base text-slate-600">
              Thank you for your interest{record?.candidateName ? `, ${record.candidateName}` : ""}. Unfortunately, your application doesn't match our current requirements for {record?.jobTitle || "this role"}.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-10 pb-10">
            <div className="rounded-lg border bg-white">
              <div className="px-4 py-3 border-b text-slate-800 font-medium">AI Analysis Results</div>
              <div className="p-4 text-sm text-slate-700">
                <p className="mb-3 whitespace-pre-line">{record?.feedback || "We couldn't find enough relevant information to assess fit for this position."}</p>
                {record?.reasoning && (
                  <div className="mt-2 text-slate-600">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Reasoning</div>
                    <p className="whitespace-pre-line">{record.reasoning}</p>
                  </div>
                )}
                {typeof record?.score === "number" && (
                  <div className="mt-3 text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400 mr-2">Score</span>
                    <span className="font-semibold">{record.score}/100</span>
                  </div>
                )}
                {createdAt && (
                  <div className="mt-1 text-xs text-slate-400">Evaluated on {createdAt}</div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="rounded-lg border bg-white">
              <div className="px-4 py-3 border-b text-slate-800 font-medium">Suggestions for Future Applications</div>
              <div className="p-4 text-sm text-slate-700 space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Review the job requirements carefully and align your experience.</li>
                  <li>Gain relevant experience or certifications in required areas.</li>
                  <li>Update your resume to highlight transferable skills.</li>
                  <li>Apply for positions that better match your current skill set.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Go back
              </Button>
              <Button onClick={() => router.push("/")}>Explore other opportunities</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 