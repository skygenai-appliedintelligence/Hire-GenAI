"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  TrendingUp,
  Award,
  AlertCircle,
} from "lucide-react"

interface InterviewStage {
  name: string
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped"
  score: number
  completed_at: string | null
  feedback: string | null
}

interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  status: string
  pipeline_progress: number
  current_stage: number
  applied_date: string
  source: string
  resume_score: number
  rejection_count: number
  last_rejection_date: string | null
  jobId: string
  application_data: any
  stages: InterviewStage[]
  final_recommendation: string | null
}

export default function InterviewPipelinePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [processing, setProcessing] = useState(false)

  const pipelineId = params.pipelineId as string

  useEffect(() => {
    loadCandidateData()
  }, [pipelineId])

  const loadCandidateData = () => {
    try {
      const candidatesData = localStorage.getItem("interviewCandidates")
      if (candidatesData) {
        const candidates = JSON.parse(candidatesData)
        const foundCandidate = candidates.find((c: Candidate) => c.id === pipelineId)

        if (foundCandidate) {
          setCandidate(foundCandidate)
          setCurrentStageIndex(foundCandidate.current_stage || 0)
        } else {
          toast({
            title: "Candidate Not Found",
            description: "The candidate you're looking for doesn't exist.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error loading candidate data:", error)
      toast({
        title: "Error",
        description: "Failed to load candidate data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCandidateData = (updatedCandidate: Candidate) => {
    try {
      const candidatesData = localStorage.getItem("interviewCandidates")
      if (candidatesData) {
        const candidates = JSON.parse(candidatesData)
        const updatedCandidates = candidates.map((c: Candidate) => (c.id === pipelineId ? updatedCandidate : c))
        localStorage.setItem("interviewCandidates", JSON.stringify(updatedCandidates))
        setCandidate(updatedCandidate)
      }
    } catch (error) {
      console.error("Error updating candidate data:", error)
    }
  }

  const handleStageAction = async (action: "start" | "complete" | "fail") => {
    if (!candidate) return

    setProcessing(true)
    try {
      const updatedCandidate = { ...candidate }
      const currentStage = updatedCandidate.stages[currentStageIndex]

      if (action === "start") {
        currentStage.status = "in_progress"
        toast({
          title: "Stage Started",
          description: `${currentStage.name} has been started.`,
        })
      } else if (action === "complete") {
        if (!feedback.trim()) {
          toast({
            title: "Feedback Required",
            description: "Please provide feedback before completing the stage.",
            variant: "destructive",
          })
          return
        }

        currentStage.status = "completed"
        currentStage.completed_at = new Date().toISOString()
        currentStage.feedback = feedback
        currentStage.score = Math.floor(Math.random() * 30) + 70 // Random score 70-100

        // Update progress
        const completedStages = updatedCandidate.stages.filter((s) => s.status === "completed").length
        updatedCandidate.pipeline_progress = Math.round((completedStages / updatedCandidate.stages.length) * 100)

        // Move to next stage or complete pipeline
        if (currentStageIndex < updatedCandidate.stages.length - 1) {
          updatedCandidate.current_stage = currentStageIndex + 1
          setCurrentStageIndex(currentStageIndex + 1)
        } else {
          // Pipeline completed
          updatedCandidate.status = "recommended"
          updatedCandidate.final_recommendation = "Strong candidate - recommended for hire"
        }

        setFeedback("")
        toast({
          title: "Stage Completed",
          description: `${currentStage.name} has been completed successfully.`,
        })
      } else if (action === "fail") {
        if (!feedback.trim()) {
          toast({
            title: "Feedback Required",
            description: "Please provide feedback before failing the stage.",
            variant: "destructive",
          })
          return
        }

        currentStage.status = "failed"
        currentStage.completed_at = new Date().toISOString()
        currentStage.feedback = feedback
        currentStage.score = Math.floor(Math.random() * 40) + 20 // Random score 20-60

        // Mark remaining stages as skipped
        for (let i = currentStageIndex + 1; i < updatedCandidate.stages.length; i++) {
          updatedCandidate.stages[i].status = "skipped"
        }

        updatedCandidate.status = "rejected"
        updatedCandidate.final_recommendation = "Not suitable for this position"
        updatedCandidate.rejection_count += 1
        updatedCandidate.last_rejection_date = new Date().toISOString()

        setFeedback("")
        toast({
          title: "Candidate Rejected",
          description: `${currentStage.name} failed. Candidate has been rejected.`,
          variant: "destructive",
        })
      }

      updateCandidateData(updatedCandidate)
    } catch (error) {
      console.error("Error updating stage:", error)
      toast({
        title: "Error",
        description: "Failed to update stage. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const getStageStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      case "skipped":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "in_progress":
        return <Clock className="w-4 h-4" />
      case "failed":
        return <XCircle className="w-4 h-4" />
      case "skipped":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const handleBackToJob = () => {
    if (candidate?.jobId) {
      router.push(`/dashboard/jobs/${candidate.jobId}`)
    } else {
      router.push("/dashboard/jobs")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading interview pipeline...</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Candidate Not Found</h2>
        <p className="text-gray-600 mb-4">The candidate you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/dashboard/jobs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>
      </div>
    )
  }

  const currentStage = candidate.stages[currentStageIndex]
  const completedStages = candidate.stages.filter((s) => s.status === "completed").length
  const averageScore =
    completedStages > 0
      ? Math.round(
          candidate.stages.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.score, 0) /
            completedStages,
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBackToJob}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Pipeline</h1>
            <p className="text-gray-600">Candidate Assessment & Progress</p>
          </div>
        </div>
        <Badge
          className={`px-3 py-1 text-sm ${
            candidate.status === "recommended"
              ? "bg-green-100 text-green-800"
              : candidate.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
          }`}
        >
          {candidate.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Candidate Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Candidate Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{candidate.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{candidate.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Applied: {new Date(candidate.applied_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resume Score</span>
                    <Badge className="bg-blue-100 text-blue-800">{candidate.resume_score}/100</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pipeline Progress</span>
                    <Badge className="bg-green-100 text-green-800">{candidate.pipeline_progress}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Score</span>
                    <Badge className="bg-purple-100 text-purple-800">{averageScore}/100</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Progress Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Progress</span>
                    <span>{candidate.pipeline_progress}%</span>
                  </div>
                  <Progress value={candidate.pipeline_progress} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{completedStages}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{candidate.stages.length - completedStages}</div>
                    <div className="text-xs text-gray-600">Remaining</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interview Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Stages</CardTitle>
          <CardDescription>Progress through each stage of the interview process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {candidate.stages.map((stage, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  index === currentStageIndex ? "border-blue-300 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStageStatusColor(stage.status)}`}>
                      {getStageIcon(stage.status)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{stage.name}</h4>
                      <p className="text-sm text-gray-600">
                        Stage {index + 1} of {candidate.stages.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {stage.score > 0 && <Badge className="bg-gray-100 text-gray-800">Score: {stage.score}/100</Badge>}
                    <Badge className={getStageStatusColor(stage.status)}>
                      {stage.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {stage.feedback && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{stage.feedback}</p>
                    {stage.completed_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed: {new Date(stage.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {index === currentStageIndex &&
                  stage.status !== "completed" &&
                  stage.status !== "failed" &&
                  candidate.status !== "rejected" && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stage Feedback</label>
                        <Textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide detailed feedback for this stage..."
                          rows={3}
                          className="w-full"
                        />
                      </div>
                      <div className="flex space-x-2">
                        {stage.status === "pending" && (
                          <Button
                            onClick={() => handleStageAction("start")}
                            disabled={processing}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Stage
                          </Button>
                        )}
                        {stage.status === "in_progress" && (
                          <>
                            <Button
                              onClick={() => handleStageAction("complete")}
                              disabled={processing || !feedback.trim()}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete Stage
                            </Button>
                            <Button
                              onClick={() => handleStageAction("fail")}
                              disabled={processing || !feedback.trim()}
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Fail Stage
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Final Recommendation */}
      {candidate.final_recommendation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Final Recommendation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`p-4 rounded-lg ${
                candidate.status === "recommended"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p className={`font-medium ${candidate.status === "recommended" ? "text-green-800" : "text-red-800"}`}>
                {candidate.final_recommendation}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
