"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Video, CircleDot, Heart, ChevronDown, AlertCircle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function InterviewStartPage() {
  const params = useParams()
  const search = useSearchParams()
  const applicationId = (params?.applicationId as string) || ""

  // DB-backed fields (fallback to query params if provided)
  const [jobTitle, setJobTitle] = useState<string>(search?.get("title") || "")
  const [company, setCompany] = useState<string>(search?.get("company") || "")
  const [location, setLocation] = useState<string>(search?.get("loc") || "")
  const [loading, setLoading] = useState(true)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [showDisclaimerWarning, setShowDisclaimerWarning] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!applicationId) return
      
      try {
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

        {/* Disclaimer Accordion - ABOVE Button */}
        <div className="mt-8">
          <Accordion type="single" collapsible className="w-full border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <AccordionItem value="disclaimer" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 text-left font-semibold text-gray-900 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Interview Disclaimer
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-gray-50 border-t border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                  <li>The interview will be recorded for evaluation purposes.</li>
                  <li>Your responses may be reviewed by recruiters at your company.</li>
                  <li>Do not share passwords or highly sensitive personal data.</li>
                  <li>You may exit the interview at any time by clicking the end button.</li>
                  <li>Your camera must remain on throughout the entire interview session.</li>
                  <li>Ensure your background is clean and professional.</li>
                  <li>The interview session will be saved and cannot be resumed later.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Disclaimer Checkbox */}
        <div className="mt-4 space-y-2">
          <label className="flex items-start space-x-3 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200 hover:shadow-sm">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => {
                setDisclaimerAccepted(e.target.checked)
                if (e.target.checked) setShowDisclaimerWarning(false)
              }}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the interview disclaimer above.
            </span>
          </label>

          {showDisclaimerWarning && !disclaimerAccepted && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Please tick the disclaimer before starting the interview.
              </p>
            </div>
          )}
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
            <div className="w-full md:w-auto">
              <Button 
                size="lg" 
                className={`w-full md:w-auto gap-2 transition-all duration-300 ${
                  disclaimerAccepted 
                    ? 'bg-black text-white hover:bg-gray-900 shadow-lg hover:shadow-xl hover:scale-105' 
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                }`}
                disabled={!disclaimerAccepted}
                onClick={() => {
                  if (!disclaimerAccepted) {
                    setShowDisclaimerWarning(true)
                    return
                  }
                }}
              >
                <Link href={`/interview/${applicationId}`} className={disclaimerAccepted ? '' : 'pointer-events-none'}>
                  <span className="flex items-center gap-2">
                    <Video className="h-5 w-5" /> Start Video Interview
                  </span>
                </Link>
              </Button>
            </div>
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
