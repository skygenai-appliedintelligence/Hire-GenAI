"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Check, Hourglass, ArrowLeft } from "lucide-react"

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

export default function QualifiedResultPage() {
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
            <CardTitle>Congratulations!</CardTitle>
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
    <div className="min-h-screen bg-white px-4 sm:px-6 lg:px-8 py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#28a745] shadow-sm">
            <Check className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#28a745]">Thank You! 🎉</h1>
          <p className="mt-3 text-lg md:text-xl font-medium text-slate-800">Your interview has been completed successfully</p>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            We appreciate the time you took to participate in this AI-powered interview. Your responses have been
            recorded and our team will review them carefully.
          </p>

          {/* Status pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#28a745] text-white/95 px-4 py-1.5 text-sm font-semibold shadow-sm">
              <Check className="h-4 w-4 text-white" />
              Interview Completed
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 text-orange-700 px-4 py-1.5 text-sm font-semibold">
              <Hourglass className="h-4 w-4 text-[#f97316]" />
              Evaluation in Progress
            </span>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-8 mx-auto max-w-3xl rounded-xl bg-emerald-100/60 p-5 sm:p-6 ring-1 ring-emerald-100">
          <h2 className="text-center text-xl font-semibold text-slate-900">What happens next?</h2>
          <ul className="mt-4 space-y-3 text-slate-800">
            <li className="flex items-start gap-3"><span className="text-base">📊</span><span className="text-sm">Our team will analyze your interview responses</span></li>
            <li className="flex items-start gap-3"><span className="text-base">🤝</span><span className="text-sm">If successful, our consulting team will contact you</span></li>
            <li className="flex items-start gap-3"><span className="text-base">⏱</span><span className="text-sm">Expected evaluation time: 24-48 hours</span></li>
          </ul>
        </div>

        {/* Footer note and actions */}
        <div className="mt-8 flex flex-col items-center text-center">
          <p className="max-w-3xl text-slate-500 text-sm italic">
            Great things happen to those who prepare and perform well. We're excited to see what the future holds for
            you!
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => router.back()} className="border-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go back
            </Button>
            <Button onClick={() => router.push("/dashboard")} className="bg-[#28a745] hover:bg-[#24943e] text-white">
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
