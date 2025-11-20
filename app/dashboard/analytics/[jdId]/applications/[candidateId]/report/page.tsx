"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, FileText, MessageSquare, Download, Mail, Phone, Calendar, ExternalLink, Star, Briefcase, ChevronDown, CheckCircle2, TrendingUp } from "lucide-react"

type CandidateData = {
  id: string
  name: string
  email: string
  phone: string
  resumeUrl: string
  appliedAt: string
  location?: string
  status: string
  expectedSalary?: number | null
  salaryCurrency?: string
  salaryPeriod?: string
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  availableStartDate?: string | null
  willingToRelocate?: boolean
}

type EvaluationData = {
  overallScore: number
  decision: "qualified" | "unqualified" | "pending"
  scores: {
    technical: number
    communication: number
    experience: number
    cultural_fit: number
  }
  strengths: string[]
  weaknesses: string[]
  reviewerComments: string
  reviewedAt?: string
  reviewedBy?: string
}

type SectionPointers = {
  technical: {
    score: number
    label: string
    summary: string
  }
  communication: {
    score: number
    label: string
    summary: string
  }
  experience: {
    score: number
    label: string
    summary: string
  }
  cultural: {
    score: number
    label: string
    summary: string
  }
}

type TranscriptData = {
  text: string
  duration?: string
  interviewDate?: string
  interviewer?: string
  rounds?: Array<{
    round: string
    questions: Array<{
      question: string
      answer: string
      score?: number
    }>
  }>
}

// Helper Functions
const getScoreBadgeColor = (score: number, maxScore: number = 100) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return "bg-green-100 text-green-800 border-green-300"
  if (percentage >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-300"
  return "bg-red-100 text-red-800 border-red-300"
}

const getScoreBarColor = (score: number, maxScore: number = 100) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 80) return "bg-gradient-to-r from-green-500 to-green-600"
  if (percentage >= 60) return "bg-gradient-to-r from-yellow-500 to-yellow-600"
  return "bg-gradient-to-r from-red-500 to-red-600"
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    "Technical Skills": "💻",
    "Technical": "💻",
    "Communication": "💬",
    "Experience": "📊",
    "Problem Solving": "🧩",
    "Cultural Fit": "🤝",
    "Culture": "🤝"
  }
  return icons[category] || "📌"
}

const extractWeight = (scoreObj: any, defaultWeight: number = 25): number => {
  if (typeof scoreObj === 'object' && scoreObj !== null) {
    return scoreObj.weight || defaultWeight
  }
  return defaultWeight
}

const extractScore = (scoreObj: any): number => {
  if (typeof scoreObj === 'number') return scoreObj
  if (typeof scoreObj === 'object' && scoreObj !== null) {
    return scoreObj.score || 0
  }
  return 0
}

export default function CandidateReportPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jdId = (params?.jdId as string) || ""
  const candidateId = (params?.candidateId as string) || ""

  const [candidate, setCandidate] = useState<CandidateData | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [transcript, setTranscript] = useState<TranscriptData | null>(null)
  const [jobTitle, setJobTitle] = useState<string>("")
  const [resumeText, setResumeText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"candidate" | "evaluation" | "transcript" | "job">("candidate")
  const [applicationsCount, setApplicationsCount] = useState<number | null>(null)
  const [dbScore, setDbScore] = useState<number | null>(null)
  const [dbQualified, setDbQualified] = useState<boolean | null>(null)
  const [qualificationDetails, setQualificationDetails] = useState<any>(null)
  const [sectionPointers, setSectionPointers] = useState<SectionPointers | null>(null)

  // Read tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam && ['candidate', 'evaluation', 'transcript', 'job'].includes(tabParam)) {
      setActiveTab(tabParam as "candidate" | "evaluation" | "transcript" | "job")
    }
  }, [searchParams])

  // Function to change tab and update URL
  const changeTab = (tab: "candidate" | "evaluation" | "transcript" | "job") => {
    setActiveTab(tab)
    const url = `/dashboard/analytics/${jdId}/applications/${candidateId}/report?tab=${tab}`
    router.push(url, { scroll: false })
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!jdId || !candidateId) return
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/candidates/${candidateId}/report?jobId=${jdId}`, { cache: "no-store" })
        const json = await res.json()

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}: Failed to fetch candidate report`)
        }

        console.log('📊 Report data received:', json)
        console.log('📝 Transcript data:', json.transcript)
        console.log('🔍 Evaluation data received:', JSON.stringify(json.evaluation, null, 2))
        console.log('🔍 SectionPointers received:', JSON.stringify(json.sectionPointers, null, 2))
        
        setCandidate(json.candidate || null)
        setEvaluation(json.evaluation || null)
        setTranscript(json.transcript || null)
        setResumeText(typeof json.resumeText === 'string' ? json.resumeText : null)
        setQualificationDetails(json.qualificationDetails || null)
        setSectionPointers(json.sectionPointers || null)
        if (json.qualificationScore) setDbScore(json.qualificationScore)
        if (typeof json.isQualified === 'boolean') setDbQualified(json.isQualified)

        // Fetch job title and applications count
        if (jdId) {
          try {
            const jobRes = await fetch(`/api/jobs/${jdId}/summary?companyId=temp`, { cache: "no-store" })
            const jobJson = await jobRes.json()
            if (jobRes.ok && jobJson?.ok && jobJson.job?.title) {
              setJobTitle(jobJson.job.title)
            }
          } catch {
            // Ignore job title fetch errors
          }
        }

        // Fetch applications for this job to compute candidate's applications count
        if (jdId) {
          try {
            const appsRes = await fetch(`/api/applications/by-job/${jdId}`, { cache: "no-store" })
            const appsJson = await appsRes.json()
            if (appsRes.ok && appsJson?.ok && Array.isArray(appsJson.applications)) {
              const email = (json?.candidate?.email || "").toLowerCase()
              const count = appsJson.applications.filter((a: any) => (a.email || "").toLowerCase() === email).length
              setApplicationsCount(count || 1)
            }
          } catch {
            setApplicationsCount(1)
          }
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load candidate report")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [jdId, candidateId])

  // Fetch authoritative score from DB using applicationId (candidateId param is applicationId in this route)
  useEffect(() => {
    const fetchScore = async () => {
      if (!candidateId) return
      try {
        const res = await fetch(`/api/applications/score?applicationId=${encodeURIComponent(candidateId)}`, { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.ok) {
          if (typeof json.score === 'number') setDbScore(json.score)
          if (typeof json.isQualified === 'boolean') setDbQualified(json.isQualified)
        }
      } catch {}
    }
    fetchScore()
  }, [candidateId])

  if (loading) {
    return (
      <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
        <div className="py-12 text-center">Loading candidate report...</div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="space-y-6 px-4 md:px-6 py-6 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/40">
        <div className="py-12 text-center text-red-600">{error || "Candidate not found"}</div>
        <div className="text-center">
          <Button variant="outline" onClick={() => router.push(`/dashboard/analytics/${jdId}/applications`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
          </Button>
        </div>
      </div>
    )
  }

  // TypeScript narrowing: candidate is guaranteed to be non-null after the guard above
  const candidateData = candidate as CandidateData
  
  // Create safe references for evaluation and transcript (they can be null)
  const evaluationData = evaluation
  const transcriptData = transcript

  // Prefer evaluation score; fall back to DB score only if evaluation missing
  const overallScore = ((evaluation?.overallScore ?? null) !== null)
    ? (evaluation!.overallScore as number)
    : (typeof dbScore === 'number' ? dbScore : null)
  // Resume/Qualification score must come from DB qualification_score
  const resumeScore = typeof dbScore === 'number' ? dbScore : (qualificationDetails?.overall?.score_percent || 0)
  // Display overall score from evaluation: always show out of 100
  const overallScoreDisplay = (() => {
    if (overallScore === null || overallScore === undefined || isNaN(overallScore as any)) return "--"
    const n = Number(overallScore)
    // If score is <=10, scale it up to 100 scale
    if (n <= 10) {
      const scaled = Math.round(n * 10)
      return `${scaled}/100`
    } else {
      const rounded = Math.round(n)
      return `${rounded}/100`
    }
  })()

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "qualified":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Qualified</Badge>
      case "unqualified":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Unqualified</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Review</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{decision}</Badge>
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section - Matching Reference Design */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 md:px-6 py-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
              Dashboard
            </Link>
            <span>›</span>
            <Link href={`/dashboard/analytics/${jdId}/applications`} className="hover:text-gray-700 transition-colors">
              Applications
            </Link>
            <span>›</span>
            <span className="text-gray-700">{candidateId.substring(0, 16)}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-purple-600 mb-6">
            Interview with {candidateData.name} {jobTitle && `for ${jobTitle}`}
          </h1>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-8 border-b border-gray-200 -mb-px">
            <button
              onClick={() => changeTab("candidate")}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === "candidate"
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Candidate
              {activeTab === "candidate" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
            <button
              onClick={() => changeTab("evaluation")}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === "evaluation"
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Evaluation
              {activeTab === "evaluation" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
            <button
              onClick={() => changeTab("transcript")}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === "transcript"
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Transcript
              {activeTab === "transcript" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
            <button
              onClick={() => changeTab("job")}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                activeTab === "job"
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Job Application
              {activeTab === "job" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 md:px-6 py-6 bg-gradient-to-b from-gray-50/60 via-white to-gray-50/40">
        {/* Candidate Tab Content */}
        {activeTab === "candidate" && (
          <div className="mt-6 space-y-6">
            {/* Header Profile Card */}
            <Card className="border-2 border-purple-200 bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                <div className="flex items-start justify-between gap-6">
                  {/* Left: Avatar + details */}
                  <div className="flex items-start gap-8 relative">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                        {candidateData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                      </div>
                      <div className="absolute -bottom-2 left-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-xs px-2 py-0.5">
                          {candidateData.status || 'Interviewed'} <ChevronDown className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                    <div className="pt-1 ml-2">
                      <CardTitle className="text-2xl font-semibold text-purple-700">{candidateData.name}</CardTitle>
                      <div className="mt-1.5 space-y-1 text-xs text-gray-700">
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-purple-600" /> {candidateData.email}</div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-purple-600" /> {candidateData.phone || '—'}</div>
                        <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-purple-600" /> {applicationsCount ?? 1} job application{(applicationsCount ?? 1) > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores and button */}
                  <div className="flex flex-col items-start justify-center gap-4 min-w-[260px] ml-auto">
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-orange-500 fill-orange-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-700">Resume Score</div>
                        <div className="text-base font-semibold text-gray-900">{resumeScore}/100</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-orange-500 fill-orange-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-700">Overall Score</div>
                        <div className="text-base font-semibold text-gray-900">{overallScoreDisplay}</div>
                      </div>
                    </div>
                    <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700 text-white w-48 justify-center mt-1">
                      <a href={candidateData.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" /> Download Resume
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Content Grid - Full Width */}
            <div className="space-y-6">
                {/* Relevant Section (AI Analysis) */}
                <Card className="border-2 border-emerald-200 bg-emerald-50/60">
                  <CardHeader>
                    <CardTitle className="text-emerald-800 text-lg">Relevance</CardTitle>
                    <CardDescription className="text-emerald-700">Detailed CV evaluation breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {qualificationDetails ? (
                      <div className="space-y-6">
                        {/* Resume Evaluation Summary */}
                        <div className="p-5 bg-gradient-to-br from-white to-emerald-50 rounded-lg border-2 border-emerald-300 shadow-sm">
                          <h4 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                            📄 Resume Evaluation Summary
                          </h4>
                          
                          {/* Header Info */}
                          <div className="mb-4 pb-4 border-b border-emerald-200">
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                              <span className="font-semibold text-gray-900">
                                Candidate: <span className="text-emerald-700">{qualificationDetails.extracted?.name || candidateData.name}</span>
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="font-semibold text-gray-900">
                                Role: <span className="text-emerald-700">{jobTitle || 'N/A'}</span>
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="font-semibold text-gray-900">
                                Exp: <span className="text-emerald-700">
                                  {qualificationDetails.extracted?.total_experience_years_estimate 
                                    ? `${qualificationDetails.extracted.total_experience_years_estimate} yrs` 
                                    : 'N/A'}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Overall Score & Verdict */}
                          <div className="mb-4 pb-4 border-b border-emerald-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-2xl font-bold text-gray-900">{resumeScore}</span>
                                <span className="text-lg text-gray-600"> / 100</span>
                              </div>
                              <div>
                                {resumeScore >= 60 ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-300 text-base px-3 py-1">
                                    ✅ Qualified
                                  </Badge>
                                ) : resumeScore >= 40 ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-base px-3 py-1">
                                    ⚠️ Borderline
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800 border-red-300 text-base px-3 py-1">
                                    ❌ Not Qualified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Key Evaluation */}
                          <div className="mb-4 pb-4 border-b border-emerald-200">
                            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              🔑 Key Evaluation
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">Skills Match:</span>
                                <span className={`ml-2 font-semibold ${
                                  qualificationDetails.breakdown?.hard_skills?.score >= 70 ? 'text-green-700' :
                                  qualificationDetails.breakdown?.hard_skills?.score >= 50 ? 'text-yellow-700' : 'text-red-700'
                                }`}>
                                  {qualificationDetails.breakdown?.hard_skills?.score >= 70 ? 'Strong' :
                                   qualificationDetails.breakdown?.hard_skills?.score >= 50 ? 'Moderate' : 'Weak'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Domain Knowledge:</span>
                                <span className={`ml-2 font-semibold ${
                                  qualificationDetails.breakdown?.domain_relevance?.score >= 60 ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                  {qualificationDetails.breakdown?.domain_relevance?.score >= 60 ? 'Good' : 'Limited'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Communication:</span>
                                <span className={`ml-2 font-semibold ${
                                  qualificationDetails.breakdown?.communication_redflags?.score >= 80 ? 'text-green-700' :
                                  qualificationDetails.breakdown?.communication_redflags?.score >= 60 ? 'text-yellow-700' : 'text-red-700'
                                }`}>
                                  {qualificationDetails.breakdown?.communication_redflags?.score >= 80 ? 'Clear' :
                                   qualificationDetails.breakdown?.communication_redflags?.score >= 60 ? 'Average' : 'Weak'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Problem Solving:</span>
                                <span className={`ml-2 font-semibold ${
                                  qualificationDetails.breakdown?.experience_depth?.score >= 70 ? 'text-green-700' :
                                  qualificationDetails.breakdown?.experience_depth?.score >= 50 ? 'text-yellow-700' : 'text-red-700'
                                }`}>
                                  {qualificationDetails.breakdown?.experience_depth?.score >= 70 ? 'Strong' :
                                   qualificationDetails.breakdown?.experience_depth?.score >= 50 ? 'Fair' : 'Needs Work'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Strengths */}
                          {qualificationDetails.breakdown?.hard_skills?.matched?.length > 0 && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                ✅ Strengths
                              </h5>
                              <ul className="space-y-1 text-sm text-gray-700">
                                {qualificationDetails.breakdown.hard_skills.matched.slice(0, 3).map((skill: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span>Strong proficiency in {skill}</span>
                                  </li>
                                ))}
                                {qualificationDetails.breakdown.role_title_alignment?.score >= 70 && (
                                  <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span>Excellent role alignment with job requirements</span>
                                  </li>
                                )}
                                {qualificationDetails.breakdown.experience_depth?.years_estimate >= 3 && (
                                  <li className="flex items-start gap-2">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span>Solid experience of {qualificationDetails.breakdown.experience_depth.years_estimate} years</span>
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Gaps */}
                          {(qualificationDetails.breakdown?.hard_skills?.missing?.length > 0 || 
                            qualificationDetails.gaps_and_notes?.length > 0) && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                                ⚠️ Gaps
                              </h5>
                              <ul className="space-y-1 text-sm text-gray-700">
                                {qualificationDetails.breakdown?.hard_skills?.missing?.slice(0, 3).map((skill: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-yellow-600 mt-0.5">•</span>
                                    <span>Missing experience with {skill}</span>
                                  </li>
                                ))}
                                {qualificationDetails.gaps_and_notes?.slice(0, 2).map((note: string, i: number) => (
                                  <li key={`note-${i}`} className="flex items-start gap-2">
                                    <span className="text-yellow-600 mt-0.5">•</span>
                                    <span>{note}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recommendation */}
                          <div className="pt-4 border-t border-emerald-200">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">Recommendation:</span>
                              <Badge className={`text-sm px-3 py-1 ${
                                resumeScore >= 60 ? 'bg-green-100 text-green-800 border-green-300' :
                                resumeScore >= 40 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                'bg-red-100 text-red-800 border-red-300'
                              }`}>
                                {resumeScore >= 60 ? '✅ Next Round' :
                                 resumeScore >= 40 ? '⏸️ Pipeline' : '❌ Reject'}
                              </Badge>
                            </div>
                            {qualificationDetails.reason_summary && (
                              <p className="text-xs text-gray-600 mt-2 italic">{qualificationDetails.reason_summary}</p>
                            )}
                          </div>
                        </div>

                        {/* Breakdown Scores */}
                        {qualificationDetails.breakdown && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-emerald-900">Evaluation Breakdown</h4>
                            
                            {/* Role Title Alignment */}
                            {qualificationDetails.breakdown.role_title_alignment && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Role/Title Alignment</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.role_title_alignment.score}/100 (Weight: {qualificationDetails.breakdown.role_title_alignment.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.role_title_alignment.evidence?.length > 0 && (
                                  <ul className="text-xs text-gray-600 space-y-1 mt-2">
                                    {qualificationDetails.breakdown.role_title_alignment.evidence.map((e: string, i: number) => (
                                      <li key={i} className="pl-2 border-l-2 border-emerald-300">• {e}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {/* Hard Skills */}
                            {qualificationDetails.breakdown.hard_skills && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Hard Skills & Tools</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.hard_skills.score}/100 (Weight: {qualificationDetails.breakdown.hard_skills.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.hard_skills.matched?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-green-700 mb-1">✓ Matched Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {qualificationDetails.breakdown.hard_skills.matched.map((s: string, i: number) => (
                                        <Badge key={i} className="bg-green-100 text-green-800 text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {qualificationDetails.breakdown.hard_skills.missing?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-red-700 mb-1">✗ Missing Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {qualificationDetails.breakdown.hard_skills.missing.map((s: string, i: number) => (
                                        <Badge key={i} className="bg-red-100 text-red-800 text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {qualificationDetails.breakdown.hard_skills.evidence?.length > 0 && (
                                  <ul className="text-xs text-gray-600 space-y-1 mt-2">
                                    {qualificationDetails.breakdown.hard_skills.evidence.map((e: string, i: number) => (
                                      <li key={i} className="pl-2 border-l-2 border-emerald-300">• {e}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {/* Experience Depth */}
                            {qualificationDetails.breakdown.experience_depth && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Experience Depth</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.experience_depth.score}/100 (Weight: {qualificationDetails.breakdown.experience_depth.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.experience_depth.years_estimate && (
                                  <p className="text-xs text-gray-700 mb-2">
                                    Estimated Experience: <span className="font-semibold">{qualificationDetails.breakdown.experience_depth.years_estimate} years</span>
                                  </p>
                                )}
                                {qualificationDetails.breakdown.experience_depth.evidence?.length > 0 && (
                                  <ul className="text-xs text-gray-600 space-y-1 mt-2">
                                    {qualificationDetails.breakdown.experience_depth.evidence.map((e: string, i: number) => (
                                      <li key={i} className="pl-2 border-l-2 border-emerald-300">• {e}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {/* Domain Relevance */}
                            {qualificationDetails.breakdown.domain_relevance && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Domain/Industry Relevance</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.domain_relevance.score}/100 (Weight: {qualificationDetails.breakdown.domain_relevance.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.domain_relevance.evidence?.length > 0 && (
                                  <ul className="text-xs text-gray-600 space-y-1 mt-2">
                                    {qualificationDetails.breakdown.domain_relevance.evidence.map((e: string, i: number) => (
                                      <li key={i} className="pl-2 border-l-2 border-emerald-300">• {e}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {/* Education & Certifications */}
                            {qualificationDetails.breakdown.education_certs && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Education & Certifications</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.education_certs.score}/100 (Weight: {qualificationDetails.breakdown.education_certs.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.education_certs.matched?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-green-700 mb-1">✓ Matched:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {qualificationDetails.breakdown.education_certs.matched.map((s: string, i: number) => (
                                        <Badge key={i} className="bg-green-100 text-green-800 text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {qualificationDetails.breakdown.education_certs.evidence?.length > 0 && (
                                  <ul className="text-xs text-gray-600 space-y-1 mt-2">
                                    {qualificationDetails.breakdown.education_certs.evidence.map((e: string, i: number) => (
                                      <li key={i} className="pl-2 border-l-2 border-emerald-300">• {e}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {/* Nice to Have */}
                            {qualificationDetails.breakdown.nice_to_have && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Nice-to-Have Skills</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.nice_to_have.score}/100 (Weight: {qualificationDetails.breakdown.nice_to_have.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.nice_to_have.matched?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-green-700 mb-1">✓ Matched:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {qualificationDetails.breakdown.nice_to_have.matched.map((s: string, i: number) => (
                                        <Badge key={i} className="bg-blue-100 text-blue-800 text-xs">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Communication & Red Flags */}
                            {qualificationDetails.breakdown.communication_redflags && (
                              <div className="bg-white p-4 rounded-lg border border-emerald-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-900">Communication & Quality</span>
                                  <span className="text-sm font-semibold text-emerald-700">
                                    {qualificationDetails.breakdown.communication_redflags.score}/100 (Weight: {qualificationDetails.breakdown.communication_redflags.weight}%)
                                  </span>
                                </div>
                                {qualificationDetails.breakdown.communication_redflags.red_flags?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-red-700 mb-1">⚠ Red Flags:</p>
                                    <ul className="text-xs text-red-600 space-y-1">
                                      {qualificationDetails.breakdown.communication_redflags.red_flags.map((f: string, i: number) => (
                                        <li key={i}>• {f}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Extracted Information */}
                        {qualificationDetails.extracted && (
                          <div className="bg-white p-4 rounded-lg border border-gray-300">
                            <h4 className="font-semibold text-gray-900 mb-3">Extracted Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {qualificationDetails.extracted.name && (
                                <div>
                                  <span className="text-gray-500">Name:</span>
                                  <span className="ml-2 font-medium">{qualificationDetails.extracted.name}</span>
                                </div>
                              )}
                              {qualificationDetails.extracted.email && (
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <span className="ml-2 font-medium">{qualificationDetails.extracted.email}</span>
                                </div>
                              )}
                              {qualificationDetails.extracted.phone && (
                                <div>
                                  <span className="text-gray-500">Phone:</span>
                                  <span className="ml-2 font-medium">{qualificationDetails.extracted.phone}</span>
                                </div>
                              )}
                              {qualificationDetails.extracted.location && (
                                <div>
                                  <span className="text-gray-500">Location:</span>
                                  <span className="ml-2 font-medium">{qualificationDetails.extracted.location}</span>
                                </div>
                              )}
                              {qualificationDetails.extracted.total_experience_years_estimate && (
                                <div>
                                  <span className="text-gray-500">Total Experience:</span>
                                  <span className="ml-2 font-medium">{qualificationDetails.extracted.total_experience_years_estimate} years</span>
                                </div>
                              )}
                            </div>
                            {qualificationDetails.extracted.skills?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-gray-700 mb-2">Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {qualificationDetails.extracted.skills.map((s: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Gaps and Notes */}
                        {qualificationDetails.gaps_and_notes?.length > 0 && (
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
                            <h4 className="font-semibold text-yellow-900 mb-2">Notes & Observations</h4>
                            <ul className="text-xs text-yellow-800 space-y-1">
                              {qualificationDetails.gaps_and_notes.map((note: string, i: number) => (
                                <li key={i}>• {note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-emerald-900 whitespace-pre-wrap">
                        {evaluation?.reviewerComments || "No evaluation details available yet. The CV will be evaluated when a candidate applies."}
                      </div>
                    )}
                  </CardContent>
                </Card>

              {/* Quick Stats + Submitted Information - Horizontal Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Stats */}
                <Card className="border-2 border-purple-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-purple-900">Quick Stats</CardTitle>
                    <CardDescription className="text-purple-700">Key details at a glance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Status</div>
                        <div className="font-semibold text-gray-900">{candidateData.status || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Qualification Score</div>
                        <div className="font-semibold text-gray-900">{resumeScore}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Applications</div>
                        <div className="font-semibold text-gray-900">{applicationsCount ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Resume Score (DB)</div>
                        <div className="font-semibold text-gray-900">{typeof dbScore === 'number' ? dbScore : '—'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submitted Information */}
                <Card className="border-2 border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Submitted Information</CardTitle>
                    <CardDescription>Details provided by applicant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {candidateData.expectedSalary && (
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Expected Salary</div>
                          <div className="font-semibold text-gray-900">
                            {candidateData.salaryCurrency} {Number(candidateData.expectedSalary).toLocaleString()}/{candidateData.salaryPeriod}
                          </div>
                        </div>
                      )}
                      {candidateData.location && (
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Location</div>
                          <div className="font-semibold text-gray-900">{candidateData.location}</div>
                        </div>
                      )}
                      {candidateData.linkedinUrl && (
                        <div>
                          <div className="text-gray-500 text-xs mb-1">LinkedIn URL</div>
                          <a 
                            href={candidateData.linkedinUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-purple-600 hover:underline text-xs break-all inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            {candidateData.linkedinUrl.replace(/^https?:\/\//, '').substring(0, 30)}...
                          </a>
                        </div>
                      )}
                      {candidateData.portfolioUrl && (
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Portfolio/Website</div>
                          <a 
                            href={candidateData.portfolioUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-purple-600 hover:underline text-xs break-all inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            {candidateData.portfolioUrl.replace(/^https?:\/\//, '').substring(0, 30)}...
                          </a>
                        </div>
                      )}
                      {candidateData.availableStartDate && (
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Available Start Date</div>
                          <div className="font-semibold text-gray-900">
                            {new Date(candidateData.availableStartDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-500 text-xs mb-1">Willing to Relocate</div>
                        <div className="font-semibold text-gray-900">
                          {candidateData.willingToRelocate ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">Yes</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-300">No</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Evaluation Tab Content */}
        {activeTab === "evaluation" && (
          <div className="mt-6">
            <Card className="border-2 border-emerald-200 bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200">
                <CardTitle className="text-2xl text-emerald-900 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Evaluation
                </CardTitle>
                <CardDescription className="text-emerald-700">Assessment scores and feedback</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {evaluation ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div>
                        <div className="text-xs text-gray-700">Overall Score</div>
                        <div className={`text-4xl font-bold text-gray-800`}>
                          {overallScoreDisplay}
                        </div>
                        <div className="text-xs text-gray-500">
                          Weighted average from all categories
                        </div>
                      </div>
                      <div>
                        {getDecisionBadge(evaluationData!.decision)}
                      </div>
                    </div>

                    {/* Weighted Score Breakdown Card */}
                    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Weighted Score Breakdown
                        </CardTitle>
                        <CardDescription>Category-wise performance with dynamic weightage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Technical Skills */}
                          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                                  💻 Technical Skills
                                </h4>
                                <p className="text-xs text-blue-700 mt-1">Core technical competencies</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-900">
                                  {extractScore((evaluationData!.scores as any).technical)}/100
                                </div>
                                <Badge className="bg-blue-600 text-white mt-1">
                                  Weight: {extractWeight((evaluationData!.scores as any).technical, 40)}%
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                style={{ width: `${extractScore((evaluationData!.scores as any).technical)}%` }}
                              />
                            </div>
                            
                            {/* Contribution to Final Score */}
                            <div className="flex justify-between text-xs text-blue-800 mt-2">
                              <span>Contribution to Final Score:</span>
                              <span className="font-semibold">
                                {((extractScore((evaluationData!.scores as any).technical) * extractWeight((evaluationData!.scores as any).technical, 40)) / 100).toFixed(1)} points
                              </span>
                            </div>
                          </div>

                          {/* Communication Skills */}
                          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                  💬 Communication Skills
                                </h4>
                                <p className="text-xs text-green-700 mt-1">Verbal and written communication</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-900">
                                  {extractScore((evaluationData!.scores as any).communication)}/100
                                </div>
                                <Badge className="bg-green-600 text-white mt-1">
                                  Weight: {extractWeight((evaluationData!.scores as any).communication, 20)}%
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="w-full bg-green-200 rounded-full h-3 mb-2">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                                style={{ width: `${extractScore((evaluationData!.scores as any).communication)}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-xs text-green-800 mt-2">
                              <span>Contribution to Final Score:</span>
                              <span className="font-semibold">
                                {((extractScore((evaluationData!.scores as any).communication) * extractWeight((evaluationData!.scores as any).communication, 20)) / 100).toFixed(1)} points
                              </span>
                            </div>
                          </div>

                          {/* Problem Solving / Experience */}
                          <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                                  📊 Experience & Problem Solving
                                </h4>
                                <p className="text-xs text-orange-700 mt-1">Work experience and analytical skills</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-orange-900">
                                  {extractScore((evaluationData!.scores as any).experience)}/100
                                </div>
                                <Badge className="bg-orange-600 text-white mt-1">
                                  Weight: {extractWeight((evaluationData!.scores as any).experience, 25)}%
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="w-full bg-orange-200 rounded-full h-3 mb-2">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                                style={{ width: `${extractScore((evaluationData!.scores as any).experience)}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-xs text-orange-800 mt-2">
                              <span>Contribution to Final Score:</span>
                              <span className="font-semibold">
                                {((extractScore((evaluationData!.scores as any).experience) * extractWeight((evaluationData!.scores as any).experience, 25)) / 100).toFixed(1)} points
                              </span>
                            </div>
                          </div>

                          {/* Cultural Fit */}
                          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                                  🤝 Cultural Fit
                                </h4>
                                <p className="text-xs text-purple-700 mt-1">Team alignment and values</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-purple-900">
                                  {extractScore((evaluationData!.scores as any).cultural_fit)}/100
                                </div>
                                <Badge className="bg-purple-600 text-white mt-1">
                                  Weight: {extractWeight((evaluationData!.scores as any).cultural_fit, 15)}%
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                                style={{ width: `${extractScore((evaluationData!.scores as any).cultural_fit)}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-xs text-purple-800 mt-2">
                              <span>Contribution to Final Score:</span>
                              <span className="font-semibold">
                                {((extractScore((evaluationData!.scores as any).cultural_fit) * extractWeight((evaluationData!.scores as any).cultural_fit, 15)) / 100).toFixed(1)} points
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Final Calculation Summary */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border-2 border-emerald-300">
                          <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                            🧮 Final Score Calculation
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Technical ({extractWeight((evaluationData!.scores as any).technical, 40)}%)</span>
                              <span className="font-mono text-gray-900">
                                {extractScore((evaluationData!.scores as any).technical)} × 0.{extractWeight((evaluationData!.scores as any).technical, 40)} = 
                                <strong className="ml-1 text-emerald-700">
                                  {((extractScore((evaluationData!.scores as any).technical) * extractWeight((evaluationData!.scores as any).technical, 40)) / 100).toFixed(1)}
                                </strong>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Communication ({extractWeight((evaluationData!.scores as any).communication, 20)}%)</span>
                              <span className="font-mono text-gray-900">
                                {extractScore((evaluationData!.scores as any).communication)} × 0.{extractWeight((evaluationData!.scores as any).communication, 20)} = 
                                <strong className="ml-1 text-emerald-700">
                                  {((extractScore((evaluationData!.scores as any).communication) * extractWeight((evaluationData!.scores as any).communication, 20)) / 100).toFixed(1)}
                                </strong>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Experience ({extractWeight((evaluationData!.scores as any).experience, 25)}%)</span>
                              <span className="font-mono text-gray-900">
                                {extractScore((evaluationData!.scores as any).experience)} × 0.{extractWeight((evaluationData!.scores as any).experience, 25)} = 
                                <strong className="ml-1 text-emerald-700">
                                  {((extractScore((evaluationData!.scores as any).experience) * extractWeight((evaluationData!.scores as any).experience, 25)) / 100).toFixed(1)}
                                </strong>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Cultural Fit ({extractWeight((evaluationData!.scores as any).cultural_fit, 15)}%)</span>
                              <span className="font-mono text-gray-900">
                                {extractScore((evaluationData!.scores as any).cultural_fit)} × 0.{extractWeight((evaluationData!.scores as any).cultural_fit, 15)} = 
                                <strong className="ml-1 text-emerald-700">
                                  {((extractScore((evaluationData!.scores as any).cultural_fit) * extractWeight((evaluationData!.scores as any).cultural_fit, 15)) / 100).toFixed(1)}
                                </strong>
                              </span>
                            </div>
                            <div className="border-t-2 border-emerald-300 pt-2 mt-2 flex justify-between items-center font-bold text-base">
                              <span className="text-emerald-900">Final Weighted Score:</span>
                              <span className="text-2xl text-emerald-700">{evaluationData!.overallScore}/100</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Detailed Scores</h3>
                      
                      {/* Technical Section */}
                      {(sectionPointers?.technical || evaluationData?.scores?.technical !== undefined) && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-blue-900">Technical</span>
                            <span className="font-bold text-blue-800">
                              {sectionPointers?.technical?.label || `${evaluationData?.scores?.technical || 0}/100`}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${sectionPointers?.technical?.score || evaluationData?.scores?.technical || 0}%` }}
                            />
                          </div>
                          <p className="text-sm text-blue-800">
                            {sectionPointers?.technical?.summary || "Technical skills assessment based on interview performance"}
                          </p>
                        </div>
                      )}
                      
                      {/* Communication Section */}
                      {(sectionPointers?.communication || evaluationData?.scores?.communication !== undefined) && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-green-900">Communication</span>
                            <span className="font-bold text-green-800">
                              {sectionPointers?.communication?.label || `${evaluationData?.scores?.communication || 0}/100`}
                            </span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2 mb-3">
                            <div
                              className="h-2 rounded-full bg-green-600"
                              style={{ width: `${sectionPointers?.communication?.score || evaluationData?.scores?.communication || 0}%` }}
                            />
                          </div>
                          <p className="text-sm text-green-800">
                            {sectionPointers?.communication?.summary || "Communication skills assessment based on interview performance"}
                          </p>
                        </div>
                      )}
                      
                      {/* Experience Section */}
                      {(sectionPointers?.experience || evaluationData?.scores?.experience !== undefined) && (
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-orange-900">Experience</span>
                            <span className="font-bold text-orange-800">
                              {sectionPointers?.experience?.label || `${evaluationData?.scores?.experience || 0}/100`}
                            </span>
                          </div>
                          <div className="w-full bg-orange-200 rounded-full h-2 mb-3">
                            <div
                              className="h-2 rounded-full bg-orange-600"
                              style={{ width: `${sectionPointers?.experience?.score || evaluationData?.scores?.experience || 0}%` }}
                            />
                          </div>
                          <p className="text-sm text-orange-800">
                            {sectionPointers?.experience?.summary || "Experience assessment based on interview performance"}
                          </p>
                        </div>
                      )}
                      
                      {/* Cultural Section */}
                      {(sectionPointers?.cultural || evaluationData?.scores?.cultural_fit !== undefined) && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-purple-900">Cultural Fit</span>
                            <span className="font-bold text-purple-800">
                              {sectionPointers?.cultural?.label || `${evaluationData?.scores?.cultural_fit || 0}/100`}
                            </span>
                          </div>
                          <div className="w-full bg-purple-200 rounded-full h-2 mb-3">
                            <div
                              className="h-2 rounded-full bg-purple-600"
                              style={{ width: `${sectionPointers?.cultural?.score || evaluationData?.scores?.cultural_fit || 0}%` }}
                            />
                          </div>
                          <p className="text-sm text-purple-800">
                            {sectionPointers?.cultural?.summary || "Cultural fit assessment based on interview performance"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Strengths & Weaknesses with Evidence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Strengths Card */}
                      {evaluationData!.strengths.length > 0 && (
                        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                          <CardHeader>
                            <CardTitle className="text-green-900 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5" />
                              Key Strengths
                            </CardTitle>
                            <CardDescription className="text-green-700">Areas where candidate excels</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {evaluationData!.strengths.map((strength, idx) => {
                                // Handle both string and object formats
                                const strengthObj = typeof strength === 'string' 
                                  ? { point: strength } 
                                  : strength as any
                                
                                return (
                                  <div key={idx} className="p-3 bg-white rounded-lg border border-green-200 hover:border-green-400 transition-colors">
                                    <div className="flex items-start gap-2 mb-2">
                                      <span className="text-green-600 mt-0.5 text-lg">✓</span>
                                      <p className="font-medium text-gray-900 flex-1">{strengthObj.point}</p>
                                    </div>
                                    {strengthObj.category && (
                                      <Badge variant="outline" className="text-xs mb-2 bg-green-50">
                                        {getCategoryIcon(strengthObj.category)} {strengthObj.category}
                                      </Badge>
                                    )}
                                    {strengthObj.evidence && Array.isArray(strengthObj.evidence) && strengthObj.evidence.length > 0 && (
                                      <div className="mt-2 pl-6">
                                        <div className="text-xs font-medium text-gray-500 mb-1">Evidence:</div>
                                        <ul className="space-y-1">
                                          {strengthObj.evidence.map((ev: string, evIdx: number) => (
                                            <li key={evIdx} className="text-xs text-gray-700 flex items-start gap-1">
                                              <span className="text-green-500 mt-0.5">•</span>
                                              <span className="flex-1">{ev}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Weaknesses Card */}
                      {evaluationData!.weaknesses.length > 0 && (
                        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                          <CardHeader>
                            <CardTitle className="text-orange-900 flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              Areas for Improvement
                            </CardTitle>
                            <CardDescription className="text-orange-700">Growth opportunities</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {evaluationData!.weaknesses.map((weakness, idx) => {
                                // Handle both string and object formats
                                const weaknessObj = typeof weakness === 'string' 
                                  ? { point: weakness } 
                                  : weakness as any
                                
                                return (
                                  <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors">
                                    <div className="flex items-start gap-2 mb-2">
                                      <span className="text-orange-600 mt-0.5 text-lg">⚠</span>
                                      <p className="font-medium text-gray-900 flex-1">{weaknessObj.point}</p>
                                    </div>
                                    {weaknessObj.category && (
                                      <Badge variant="outline" className="text-xs mb-2 bg-orange-50">
                                        {getCategoryIcon(weaknessObj.category)} {weaknessObj.category}
                                      </Badge>
                                    )}
                                    {weaknessObj.evidence && Array.isArray(weaknessObj.evidence) && weaknessObj.evidence.length > 0 && (
                                      <div className="mt-2 pl-6">
                                        <div className="text-xs font-medium text-gray-500 mb-1">Evidence:</div>
                                        <ul className="space-y-1">
                                          {weaknessObj.evidence.map((ev: string, evIdx: number) => (
                                            <li key={evIdx} className="text-xs text-gray-700 flex items-start gap-1">
                                              <span className="text-orange-500 mt-0.5">•</span>
                                              <span className="flex-1">{ev}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {weaknessObj.improvement_suggestion && (
                                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                        <div className="text-xs font-medium text-blue-900 mb-1">💡 Suggestion:</div>
                                        <p className="text-xs text-blue-800">{weaknessObj.improvement_suggestion}</p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {evaluationData!.reviewerComments && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Reviewer Comments</h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          {evaluationData!.reviewerComments}
                        </div>
                      </div>
                    )}

                    {evaluationData!.reviewedAt && (
                      <div className="text-xs text-gray-500 pt-4 border-t">
                        Reviewed on {new Date(evaluationData!.reviewedAt).toLocaleDateString()}
                        {evaluationData!.reviewedBy && ` by ${evaluationData!.reviewedBy}`}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No evaluation data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transcript Tab Content */}
        {activeTab === "transcript" && (
          <div className="mt-6">
            <Card className="border-2 border-blue-200 bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                <CardTitle className="text-2xl text-blue-900 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  Transcript
                </CardTitle>
                <CardDescription className="text-blue-700">Interview conversation and responses</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {transcript ? (
                  <div className="space-y-4">
                    {/* Debug info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded text-xs">
                      <div>Transcript exists: {transcript ? 'Yes' : 'No'}</div>
                      <div>Text length: {transcriptData?.text?.length || 0} characters</div>
                      <div>Has rounds: {transcriptData?.rounds ? 'Yes' : 'No'}</div>
                    </div>
                    
                    {transcriptData!.interviewDate && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b">
                        <span>📅 {new Date(transcriptData!.interviewDate).toLocaleDateString()}</span>
                        {transcriptData!.duration && <span>⏱️ {transcriptData!.duration}</span>}
                        {transcriptData!.interviewer && <span>👤 {transcriptData!.interviewer}</span>}
                      </div>
                    )}

                    {transcriptData!.rounds && transcriptData!.rounds.length > 0 ? (
                      <div className="space-y-6">
                        {transcriptData!.rounds.map((round, roundIdx) => (
                          <div key={roundIdx} className="space-y-4">
                            <h3 className="font-semibold text-lg text-blue-900 border-b pb-2">
                              {round.round}
                            </h3>
                            {round.questions.map((qa, qaIdx) => (
                              <div key={qaIdx} className="space-y-2 pl-4 border-l-2 border-blue-200">
                                <div className="font-medium text-gray-900">Q: {qa.question}</div>
                                <div className="text-gray-700 pl-4">A: {qa.answer}</div>
                                {qa.score !== undefined && (
                                  <div className="text-sm">
                                    <Badge variant="outline" className={getScoreColor(qa.score)}>
                                      Score: {qa.score}/100
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {transcriptData!.text || "No transcript available"}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No transcript available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    </div>
  )
}
