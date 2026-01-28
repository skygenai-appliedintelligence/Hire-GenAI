"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Hourglass, ArrowLeft, Home } from "lucide-react"

export default function InterviewSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""

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
            <li className="flex items-start gap-3"><span className="text-base">🤝</span><span className="text-sm">If successful, our recruiting team will contact you</span></li>
            <li className="flex items-start gap-3"><span className="text-base">⏱</span><span className="text-sm">Expected evaluation time: 24-48 hours</span></li>
          </ul>
        </div>

        {/* Footer note and actions */}
        <div className="mt-8 flex flex-col items-center text-center">
          <p className="max-w-3xl text-slate-500 text-sm italic">
            Great things happen to those who prepare and perform well. We're excited to see what the future holds for you!
          </p>

          
          {applicationId && (
            <div className="mt-4 text-xs text-slate-400">
              Application ID: <span className="font-mono">{applicationId.substring(0, 12)}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
