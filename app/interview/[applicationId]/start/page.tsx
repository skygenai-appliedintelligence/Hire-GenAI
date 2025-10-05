"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Video, CircleDot, Heart } from "lucide-react"

export default function InterviewStartPage() {
  const params = useParams()
  const search = useSearchParams()
  const applicationId = (params?.applicationId as string) || ""

  // DB-backed fields (fallback to query params if provided)
  const [jobTitle, setJobTitle] = useState<string>(search?.get("title") || "")
  const [company, setCompany] = useState<string>(search?.get("company") || "")
  const [location, setLocation] = useState<string>(search?.get("loc") || "")
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!applicationId) return
      
      try {
        // First check if interview is already completed
        const statusRes = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, { cache: 'no-store' })
        const statusJson = await statusRes.json()
        
        if (statusRes.ok && statusJson?.ok && !statusJson.canInterview) {
          setInterviewCompleted(true)
          setLoading(false)
          return
        }
        
        // Load job details
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/summary`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.ok) {
          if (json.job?.title) setJobTitle(json.job.title)
          if (json.company?.name) setCompany(json.company.name)
          if (json.job?.location) setLocation(json.job.location)
        }
      } catch {}
      
      setLoading(false)
    }
    load()
  }, [applicationId])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show "Interview Already Completed" message
  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Interview Already Completed</h1>
          <p className="text-lg text-slate-600 mb-6">
            This interview link has already been used and the interview has been completed.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Each interview link can only be used once for security purposes. If you believe this is an error, please contact the recruiting team.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.href = '/'} className="bg-black text-white hover:bg-gray-900">
              Go to Home
            </Button>
          </div>
          <div className="mt-6 text-xs text-slate-400">
            Application ID: <span className="font-mono">{applicationId.substring(0, 12)}...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center">
            <Video className="h-7 w-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Ready for Your Interview?</h1>
          <p className="text-gray-600 max-w-2xl">You're just one click away from starting your AI-powered video interview</p>
        </div>

        {/* Main card (simplified, no green relevancy panel) */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-md">
          <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="text-2xl md:text-4xl font-bold text-gray-900">{jobTitle || 'Job Title'}</div>
            <div className="text-base md:text-lg text-gray-600">at {company || 'Company'}</div>
            <div className="flex items-center justify-center gap-2 text-sm md:text-base text-gray-500">
              <CircleDot className="h-4 w-4" /> {location || 'Location'}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="border-gray-300 text-gray-700 gap-2 px-3 py-1.5 rounded-full text-sm md:text-base">
                <Video className="h-4 w-4" /> AI Interview
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-2 px-3 py-1.5 rounded-full text-sm md:text-base">
                <Heart className="h-4 w-4" /> Application Submitted
              </Badge>
            </div>
          </div>
        </div>

        {/* Instructions + CTA */}
        <div className="grid md:grid-cols-2 gap-8 items-start mt-8">
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-gray-900">Interview Instructions</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Ensure you have a stable internet connection</li>
              <li>Find a quiet, well-lit space for the interview</li>
              <li>Allow camera and microphone access when prompted</li>
              <li>Speak clearly and be yourself — our AI is here to help!</li>
            </ul>
          </div>
          <div className="flex md:justify-end">
            <Link href={`/interview/${applicationId}`}>
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 gap-2">
                <Video className="h-5 w-5" /> Start Video Interview
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="text-xs text-gray-400">Application ID: <span className="font-mono">{applicationId.substring(0, 12)}...</span></div>
          <Link href="/" className="inline-block mt-2 text-sm text-blue-600 hover:underline">Back to home</Link>
        </div>
      </div>
    </div>
  )
}
