"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, Video, Phone, User, Eye, Play } from "lucide-react"
import Link from "next/link"
import type { InterviewPipeline, CandidateApplication } from "@/lib/ai-interview-service"

export default function InterviewsPage() {
  const { company } = useAuth()
  const [pipelines, setPipelines] = useState<InterviewPipeline[]>([])
  const [candidates, setCandidates] = useState<CandidateApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (company?.id) {
      fetchInterviewData()
    }
  }, [company])

  const fetchInterviewData = async () => {
    try {
      // Load interview pipelines
      const storedPipelines = JSON.parse(localStorage.getItem("interviewPipelines") || "[]")
      setPipelines(storedPipelines)

      // Load candidate applications
      const storedCandidates = JSON.parse(localStorage.getItem("candidateApplications") || "[]")
      setCandidates(storedCandidates)
    } catch (error) {
      console.error("Error fetching interview data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "passed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStageIcon = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case "initial screening":
        return <Phone className="h-4 w-4" />
      case "technical interview":
        return <Video className="h-4 w-4" />
      case "hr interview":
        return <User className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading interviews...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Management</h1>
          <p className="text-gray-600">Manage automated interview pipelines and scheduled interviews</p>
        </div>
        <Button className="sr-button-primary">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Interview Pipelines */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Active Interview Pipelines</h2>

        {pipelines.length > 0 ? (
          <div className="grid gap-6">
            {pipelines.map((pipeline) => {
              const candidate = candidates.find((c) => c.id === pipeline.candidateId)
              const currentStage = pipeline.stages[pipeline.currentStage]
              const completedStages = pipeline.stages.filter(
                (s) => s.status === "passed" || s.status === "failed",
              ).length

              return (
                <Card key={pipeline.id} className="sr-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{candidate?.fullName || "Unknown Candidate"}</CardTitle>
                        <CardDescription>
                          Automated Interview Pipeline • {completedStages}/{pipeline.stages.length} stages completed
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600 mb-1">{pipeline.overallProgress}%</div>
                        <Progress value={pipeline.overallProgress} className="w-24 h-2" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Current Stage */}
                      {currentStage && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getStageIcon(currentStage.name)}
                              <div>
                                <h4 className="font-medium">{currentStage.name}</h4>
                                <p className="text-sm text-gray-600">{currentStage.duration} minutes</p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(currentStage.status)}>{currentStage.status}</Badge>
                          </div>
                          {currentStage.scheduledAt && (
                            <p className="text-sm text-gray-600 mt-2">
                              Scheduled: {new Date(currentStage.scheduledAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Stage Progress */}
                      <div className="grid grid-cols-4 gap-2">
                        {pipeline.stages.map((stage, index) => (
                          <div key={stage.id} className="text-center">
                            <div
                              className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                                stage.status === "passed"
                                  ? "bg-green-500 text-white"
                                  : stage.status === "failed"
                                    ? "bg-red-500 text-white"
                                    : stage.status === "scheduled" || stage.status === "in_progress"
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-300 text-gray-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="text-xs text-gray-600">{stage.name.split(" ")[0]}</div>
                            {stage.score && <div className="text-xs font-medium">{stage.score}/100</div>}
                          </div>
                        ))}
                      </div>

                      {/* Final Recommendation */}
                      {pipeline.finalRecommendation && (
                        <div
                          className={`p-3 rounded-lg ${
                            pipeline.finalRecommendation.decision === "recommend"
                              ? "bg-green-50 border border-green-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-semibold ${
                                pipeline.finalRecommendation.decision === "recommend"
                                  ? "text-green-800"
                                  : "text-red-800"
                              }`}
                            >
                              {pipeline.finalRecommendation.decision === "recommend"
                                ? "RECOMMEND FOR HIRE"
                                : "DO NOT RECOMMEND"}
                            </span>
                            <span className="text-sm text-gray-600">
                              Score: {pipeline.finalRecommendation.overallScore}/100
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-sm text-gray-500">
                          Created: {new Date(pipeline.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/interview-pipeline/${pipeline.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Pipeline
                            </Button>
                          </Link>
                          {currentStage?.status === "scheduled" && (
                            <Button size="sm" className="sr-button-primary">
                              <Play className="h-4 w-4 mr-1" />
                              Start Interview
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="sr-card">
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No interview pipelines yet</h3>
              <p className="text-gray-600 mb-4">
                Interview pipelines will appear here when candidates apply and get qualified
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
