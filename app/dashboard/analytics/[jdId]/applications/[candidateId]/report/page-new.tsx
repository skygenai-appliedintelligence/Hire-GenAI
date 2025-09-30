"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, FileText, MessageSquare, Download, Mail, Phone, Calendar, ExternalLink } from "lucide-react"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"candidate" | "evaluation" | "transcript" | "job">("candidate")

  useEffect(() => {
    const fetchData = async () => {
      if (!jdId || !candidateId) return
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/candidates/${candidateId}/report?jobId=${jdId}`, { cache: "no-store" })
        const json = await res.json()

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load candidate report")
        }

        setCandidate(json.candidate || null)
        setEvaluation(json.evaluation || null)
        setTranscript(json.transcript || null)
        
        // Fetch job title
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
      } catch (e: any) {
        setError(e?.message || "Failed to load candidate report")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [jdId, candidateId])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">Loading candidate report...</div>
          <div className="text-sm text-gray-500 mt-2">Please wait</div>
        </div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">{error || "Candidate not found"}</div>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/analytics/${jdId}/applications`)}
            className="mt-4"
          >
            Back to Applications
          </Button>
        </div>
      </div>
    )
  }

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
            Interview with {candidate.name} {jobTitle && `for ${jobTitle}`}
          </h1>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-8 border-b border-gray-200 -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab("candidate")}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
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
              className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
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
              className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
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
              className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap ${
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
      <div className="px-4 md:px-6 py-6">
        {/* Candidate Tab */}
        {activeTab === "candidate" && (
          <Card className="border-2 border-purple-200 bg-white shadow-lg max-w-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </div>
                <div>
                  <CardTitle className="text-2xl text-purple-900">{candidate.name}</CardTitle>
                  <CardDescription className="text-purple-700">{candidate.status}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-700">Email</div>
                  <a href={`mailto:${candidate.email}`} className="text-purple-600 hover:underline break-all">
                    {candidate.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Phone</div>
                  <a href={`tel:${candidate.phone}`} className="text-purple-600 hover:underline">
                    {candidate.phone}
                  </a>
                </div>
              </div>

              {candidate.location && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Location</div>
                    <div className="text-gray-900">{candidate.location}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Applied On</div>
                  <div className="text-gray-900">
                    {new Date(candidate.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-2">Resume</div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download Resume
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Tab */}
        {activeTab === "evaluation" && (
          <Card className="border-2 border-emerald-200 bg-white shadow-lg max-w-2xl">
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
                      <div className="text-sm font-medium text-gray-700">Overall Score</div>
                      <div className={`text-4xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                        {evaluation.overallScore}/100
                      </div>
                    </div>
                    <div>
                      {getDecisionBadge(evaluation.decision)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Detailed Scores</h3>
                    {Object.entries(evaluation.scores).map(([key, value]) => (
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

                  {evaluation.strengths.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Strengths</h3>
                      <ul className="space-y-1">
                        {evaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.weaknesses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Areas for Improvement</h3>
                      <ul className="space-y-1">
                        {evaluation.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-red-600 mt-0.5">✗</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.reviewerComments && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Reviewer Comments</h3>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        {evaluation.reviewerComments}
                      </div>
                    </div>
                  )}

                  {evaluation.reviewedAt && (
                    <div className="text-xs text-gray-500 pt-4 border-t">
                      Reviewed on {new Date(evaluation.reviewedAt).toLocaleDateString()}
                      {evaluation.reviewedBy && ` by ${evaluation.reviewedBy}`}
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
        )}

        {/* Transcript Tab */}
        {activeTab === "transcript" && (
          <Card className="border-2 border-blue-200 bg-white shadow-lg max-w-4xl">
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
                  {transcript.interviewDate && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b">
                      <span>📅 {new Date(transcript.interviewDate).toLocaleDateString()}</span>
                      {transcript.duration && <span>⏱️ {transcript.duration}</span>}
                      {transcript.interviewer && <span>👤 {transcript.interviewer}</span>}
                    </div>
                  )}

                  {transcript.rounds && transcript.rounds.length > 0 ? (
                    <div className="space-y-6">
                      {transcript.rounds.map((round, roundIdx) => (
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
                        {transcript.text || "No transcript available"}
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
        )}

        {/* Job Application Tab */}
        {activeTab === "job" && (
          <Card className="border-2 border-indigo-200 bg-white shadow-lg max-w-2xl">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200">
              <CardTitle className="text-2xl text-indigo-900">Job Application</CardTitle>
              <CardDescription className="text-indigo-700">Job details and application information</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Job Title</div>
                  <div className="text-lg font-semibold text-gray-900">{jobTitle || "Loading..."}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Job ID</div>
                  <div className="text-sm text-gray-600 font-mono">{jdId}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Application Status</div>
                  <div className="mt-1">{getDecisionBadge(candidate.status)}</div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/dashboard/analytics/${jdId}`}>
                      View Full Job Details
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
