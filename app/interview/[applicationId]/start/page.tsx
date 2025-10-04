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

  useEffect(() => {
    const load = async () => {
      if (!applicationId) return
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/summary`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.ok) {
          if (json.job?.title) setJobTitle(json.job.title)
          if (json.company?.name) setCompany(json.company.name)
          if (json.job?.location) setLocation(json.job.location)
        }
      } catch {}
    }
    load()
  }, [applicationId])

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

        {/* Main card */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-8 md:p-12">
            {/* Left: Relevancy panel */}
            <div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-sm font-semibold text-emerald-800 mb-2">Relevancy Check Success</div>
                <p className="text-sm leading-6 text-emerald-900">
                  Candidate has extensive experience in RPA development and architecture, including hands-on work with 
                  Automation Anywhere, UiPath, and Blue Prism. They have led RPA projects, designed and implemented 
                  automation workflows, collaborated with cross-functional teams, and supported RPA solutions in production. 
                  The candidate also has relevant certifications and experience in troubleshooting and supporting RPA bots, 
                  aligning well with the job requirements.
                </p>
              </div>
            </div>

            {/* Right: Job panel (centered, larger) */}
            <div className="flex flex-col items-center justify-center text-center gap-3">
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
            <Button size="lg" className="bg-black text-white hover:bg-gray-900 gap-2">
              <Video className="h-5 w-5" /> Start Video Interview
            </Button>
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
