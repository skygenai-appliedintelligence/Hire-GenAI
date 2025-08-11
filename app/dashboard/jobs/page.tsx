"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { JobService, type Job } from "@/lib/job-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Briefcase, CheckCircle, XCircle, ExternalLink, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function JobsPage() {
  const { company } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (company?.id) {
      fetchJobs()
    }
  }, [company])

  const fetchJobs = async () => {
    if (!company?.id) return

    try {
      console.log("🔄 Fetching jobs for company:", company.id)
      const jobsList = JobService.getJobs(company.id)
      setJobs(jobsList)
      console.log(`✅ Found ${jobsList.length} jobs`)

      // Debug: log all jobs in storage
      JobService.debugAllJobs()
    } catch (error) {
      console.error("❌ Error fetching jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!company?.id) return

    if (confirm("Are you sure you want to delete this job?")) {
      console.log("🗑️ Deleting job:", jobId)
      const success = await JobService.deleteJob(jobId, company.id)
      if (success) {
        setJobs(jobs.filter((job) => job.id !== jobId))
        console.log("✅ Job deleted successfully")
      } else {
        console.log("❌ Failed to delete job")
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "closed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Descriptions</h1>
          <p className="text-gray-600">Manage your job postings and track their performance across platforms</p>
        </div>
        <Link href="/dashboard/jobs/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <Card key={job.id} className="border border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>
                      {job.location} • {job.employment_type}
                      {job.salary_range && ` • ${job.salary_range}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{job.description}</p>

                {/* Platform Posting Status */}
                {job.posting_results.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Status:</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.posting_results.map((result, index) => (
                        <div key={index} className="flex items-center space-x-1 text-xs">
                          {result.success ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {result.platform}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-600" />
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {result.platform} (Failed)
                              </Badge>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original platforms display for jobs without posting results */}
                {job.posting_results.length === 0 && job.posted_platforms.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Posted to:</h4>
                    <div className="flex space-x-2">
                      {job.posted_platforms.map((platform) => (
                        <Badge key={platform} variant="outline">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(job.created_at).toLocaleDateString()}
                    {job.posting_results.length > 0 && (
                      <span className="ml-4">
                        Posted to {job.posting_results.filter((r) => r.success).length}/{job.posting_results.length}{" "}
                        platforms
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/jobs/${job.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-blue-50 hover:text-blue-700 bg-transparent"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        View Stats
                      </Button>
                    </Link>
                    <Link href={`/apply/${job.id}`} target="_blank">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-transparent"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Apply Form
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="hover:bg-gray-50 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border border-gray-200">
            <CardContent className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first job description</p>
              <Link href="/dashboard/jobs/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
