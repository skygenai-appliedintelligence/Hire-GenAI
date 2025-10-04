"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, FileText, MessageSquare, Download, Mail, Phone, Calendar, ExternalLink, Star, Briefcase, ChevronDown } from "lucide-react"

type CandidateData = {
  id: string
  name: string
  email: string
  phone: string
  resumeUrl: string
  appliedAt: string
  location?: string
  status: string
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

export default function CandidateReportPage() {
  const params = useParams()
  const router = useRouter()
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

  useEffect(() => {
    const fetchData = async () => {
      if (!jdId || !candidateId) return
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/candidates/${candidateId}/report?jobId=${jdId}`, { cache: "no-store" })
        const json = await res.json()

        if (!res.ok || !json?.ok) {
        }

        setCandidate(json.candidate || null)
        setEvaluation(json.evaluation || null)
        setTranscript(json.transcript || null)
        setResumeText(typeof json.resumeText === 'string' ? json.resumeText : null)

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

  // Prefer DB score from applications table; fall back to evaluation values or safe defaults
  const overallScore = dbScore ?? ((evaluation?.overallScore ?? null) !== null ? (evaluation!.overallScore as number) : 77)
  // Resume/Qualification score must come from DB qualification_score
  const resumeScore = typeof dbScore === 'number' ? dbScore : 0
  // Display placeholder for overall score until interview module provides it
  const overallScoreDisplay = "--"

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
              onClick={() => setActiveTab("candidate")}
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
              onClick={() => setActiveTab("evaluation")}
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
              onClick={() => setActiveTab("transcript")}
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
              onClick={() => setActiveTab("job")}
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

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Relevant + Resume Summary */}
              <div className="space-y-6 lg:col-span-2">
                {/* Relevant Section (AI Analysis) */}
                <Card className="border-2 border-emerald-200 bg-emerald-50/60">
                  <CardHeader>
                    <CardTitle className="text-emerald-800 text-lg">Relevant</CardTitle>
                    <CardDescription className="text-emerald-700">AI analysis of candidate fit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-emerald-900 whitespace-pre-wrap">
                      {evaluation?.reviewerComments || "No AI analysis available."}
                    </div>
                  </CardContent>
                </Card>

                {/* Resume Summary */}
                <Card className="border-2 border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Resume Summary</CardTitle>
                    <CardDescription>Parsed resume text</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
                        {resumeText || transcript?.text || "Resume text not available."}
                      </div>
                    </div>
                    <div className="pt-4 text-sm">
                      <a href={candidateData.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline inline-flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" /> View original resume
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Quick Stats + Timeline */}
              <div className="space-y-6">
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

                {/* Timeline */}
                <Card className="border-2 border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Timeline</CardTitle>
                    <CardDescription>Key timestamps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span className="text-gray-900">{new Date(candidateData.appliedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Updated</span>
                        <span className="text-gray-900">{evaluation?.reviewedAt ? new Date(evaluation.reviewedAt).toLocaleString() : new Date(candidateData.appliedAt).toLocaleString()}</span>
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
                          Interview scores coming soon
                        </div>
                      </div>
                      <div>
                        {getDecisionBadge(evaluationData!.decision)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Detailed Scores</h3>
                      {Object.entries(evaluationData!.scores).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                            <span className={`font-bold ${getScoreColor(value)}`}>{value}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                value >= 80 ? 'bg-green-600' : value >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {evaluationData!.strengths.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Strengths</h3>
                        <ul className="space-y-1">
                          {evaluationData!.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluationData!.weaknesses.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Areas for Improvement</h3>
                        <ul className="space-y-1">
                          {evaluationData!.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-red-600 mt-0.5">✗</span>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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
