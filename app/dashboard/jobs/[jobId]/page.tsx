"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { JobService, type Job } from "@/lib/job-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  DollarSign,
  Briefcase,
  ExternalLink,
  Eye,
  UserCheck,
  Building2,
} from "lucide-react"
import Link from "next/link"

// Mock job database with specific job descriptions
const jobDatabase: Record<
  string,
  {
    title: string
    company: string
    location: string
    salary: string
    description: string
    requirements: string[]
    benefits: string[]
    employmentType: string
  }
> = {
  job_1735776571000_abc123def: {
    title: "T&T Manager - SAP Project Management - SG",
    company: "Tech Solutions Singapore",
    location: "Singapore",
    salary: "S$8,000 - S$12,000",
    description:
      "We are seeking an experienced T&T (Training & Transition) Manager to lead SAP project management initiatives in Singapore. This role involves managing complex SAP implementations, coordinating training programs, and ensuring smooth transitions for enterprise clients across the APAC region.",
    requirements: [
      "Bachelor's degree in Information Technology, Business Administration, or related field",
      "8+ years of experience in SAP project management",
      "Strong knowledge of SAP modules (FI/CO, MM, SD, HR)",
      "Experience with SAP S/4HANA implementations",
      "PMP or equivalent project management certification preferred",
      "Excellent communication skills in English and Mandarin",
      "Experience working in Singapore or APAC markets",
      "Strong leadership and team management skills",
    ],
    benefits: [
      "Competitive salary with performance bonuses",
      "Health and dental insurance",
      "Professional development opportunities",
      "Flexible working arrangements",
      "Annual leave and sick leave",
      "Training and certification support",
    ],
    employmentType: "Full-time",
  },
  job_1735776571001_def456ghi: {
    title: "Senior Software Engineer - Full Stack",
    company: "InnovateTech Solutions",
    location: "San Francisco, CA",
    salary: "$120,000 - $160,000",
    description:
      "Join our dynamic team as a Senior Software Engineer to build scalable web applications using modern technologies. You'll work on cutting-edge projects that impact millions of users worldwide.",
    requirements: [
      "Bachelor's degree in Computer Science or related field",
      "5+ years of full-stack development experience",
      "Proficiency in React, Node.js, and TypeScript",
      "Experience with cloud platforms (AWS, GCP, or Azure)",
      "Strong understanding of database design and optimization",
      "Experience with microservices architecture",
      "Excellent problem-solving and communication skills",
    ],
    benefits: [
      "Competitive salary and equity package",
      "Comprehensive health, dental, and vision insurance",
      "Unlimited PTO policy",
      "Remote work flexibility",
      "Professional development budget",
      "State-of-the-art equipment and workspace",
    ],
    employmentType: "Full-time",
  },
  job_1735776571002_ghi789jkl: {
    title: "Data Scientist - Machine Learning",
    company: "DataCorp Analytics",
    location: "New York, NY",
    salary: "$110,000 - $140,000",
    description:
      "We're looking for a passionate Data Scientist to join our ML team and help build intelligent systems that drive business decisions through advanced analytics and machine learning models.",
    requirements: [
      "Master's degree in Data Science, Statistics, or related field",
      "3+ years of experience in machine learning and data analysis",
      "Proficiency in Python, R, and SQL",
      "Experience with ML frameworks (TensorFlow, PyTorch, scikit-learn)",
      "Strong statistical analysis and modeling skills",
      "Experience with big data technologies (Spark, Hadoop)",
      "Excellent analytical and problem-solving abilities",
    ],
    benefits: [
      "Competitive salary with annual bonuses",
      "Health, dental, and vision insurance",
      "401(k) with company matching",
      "Flexible work schedule",
      "Conference and training opportunities",
      "Collaborative and innovative work environment",
    ],
    employmentType: "Full-time",
  },
  job_1735776571003_jkl012mno: {
    title: "DevOps Engineer - Cloud Infrastructure",
    company: "CloudTech Systems",
    location: "Austin, TX",
    salary: "$100,000 - $130,000",
    description:
      "Join our DevOps team to design, implement, and maintain scalable cloud infrastructure. You'll work with cutting-edge technologies to ensure high availability and performance of our systems.",
    requirements: [
      "Bachelor's degree in Computer Science or related field",
      "4+ years of DevOps and cloud infrastructure experience",
      "Expertise in AWS, Docker, and Kubernetes",
      "Experience with Infrastructure as Code (Terraform, CloudFormation)",
      "Strong knowledge of CI/CD pipelines",
      "Proficiency in scripting languages (Python, Bash)",
      "Experience with monitoring and logging tools",
    ],
    benefits: [
      "Competitive salary and stock options",
      "Comprehensive health benefits",
      "Flexible PTO policy",
      "Remote work options",
      "Professional certification support",
      "Modern tech stack and tools",
    ],
    employmentType: "Full-time",
  },
}

// Mock candidates data specific to T&T Manager job
const mockCandidatesData = {
  job_1735776571000_abc123def: [
    {
      id: "candidate_001",
      name: "Sarah Chen",
      email: "sarah.chen@email.com",
      phone: "+65 9123 4567",
      status: "qualified",
      stage: "Technical Interview",
      appliedDate: "2024-01-15",
      experience: "10 years",
      skills: ["SAP S/4HANA", "Project Management", "Team Leadership"],
      score: 92,
      notes: "Excellent SAP experience with strong leadership background",
    },
    {
      id: "candidate_002",
      name: "Michael Wong",
      email: "michael.wong@email.com",
      phone: "+65 8234 5678",
      status: "in_progress",
      stage: "HR Screening",
      appliedDate: "2024-01-18",
      experience: "8 years",
      skills: ["SAP FI/CO", "Change Management", "Training"],
      score: 85,
      notes: "Strong technical skills, good cultural fit",
    },
    {
      id: "candidate_003",
      name: "Lisa Tan",
      email: "lisa.tan@email.com",
      phone: "+65 9345 6789",
      status: "recommended",
      stage: "Final Interview",
      appliedDate: "2024-01-12",
      experience: "12 years",
      skills: ["SAP Implementation", "APAC Markets", "Mandarin"],
      score: 96,
      notes: "Perfect fit - extensive APAC experience and language skills",
    },
    {
      id: "candidate_004",
      name: "David Kumar",
      email: "david.kumar@email.com",
      phone: "+65 8456 7890",
      status: "rejected",
      stage: "Technical Interview",
      appliedDate: "2024-01-20",
      experience: "5 years",
      skills: ["SAP Basics", "Project Coordination"],
      score: 65,
      notes: "Insufficient experience for senior role",
    },
  ],
}

export default function JobStatsPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<any[]>([])

  const jobId = params.jobId as string

  useEffect(() => {
    if (company?.id && jobId) {
      fetchJobDetails()
    }
  }, [company, jobId])

  const fetchJobDetails = async () => {
    try {
      const jobData = await JobService.getJob(jobId, company!.id)
      setJob(jobData)

      // Get candidates for this specific job
      const jobCandidates = mockCandidatesData[jobId] || []
      setCandidates(jobCandidates)
    } catch (error) {
      console.error("Error fetching job details:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading job details...</div>
  }

  if (!job) {
    return <div className="text-center py-12">Job not found</div>
  }

  // Get job-specific details from database
  const jobDetails = jobDatabase[jobId] || {
    title: job.title,
    company: company?.name || "Unknown Company",
    location: job.location,
    salary: job.salary_range,
    description: job.description,
    requirements: job.requirements.split("\n").filter((req) => req.trim()),
    benefits: ["Competitive salary", "Health benefits", "Professional development"],
    employmentType: job.employment_type,
  }

  // Calculate stats from candidates
  const stats = {
    totalApplications: candidates.length,
    qualifiedCandidates: candidates.filter((c) => c.status === "qualified").length,
    inProgress: candidates.filter((c) => c.status === "in_progress").length,
    completedInterviews: candidates.filter(
      (c) => c.stage === "Final Interview" || c.status === "recommended" || c.status === "rejected",
    ).length,
    recommended: candidates.filter((c) => c.status === "recommended").length,
    rejected: candidates.filter((c) => c.status === "rejected").length,
  }

  const conversionRate = stats.totalApplications > 0 ? (stats.recommended / stats.totalApplications) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/jobs")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Jobs</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{jobDetails.title}</h1>
            <p className="text-gray-600">Job Performance Analytics</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/apply/${jobId}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Application Form
            </Button>
          </Link>
        </div>
      </div>

      {/* Job Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Job Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Company:</span>
              <span className="font-medium">{jobDetails.company}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Location:</span>
              <span className="font-medium">{jobDetails.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Salary:</span>
              <span className="font-medium">{jobDetails.salary}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Type:</span>
              <span className="font-medium">{jobDetails.employmentType}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Job Description</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{jobDetails.description}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
              <ul className="text-gray-600 text-sm space-y-1">
                {jobDetails.requirements.map((req, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Qualified Candidates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.qualifiedCandidates}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Applications</CardTitle>
              <CardDescription>Recent applications for this position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{candidate.name}</h4>
                        <p className="text-sm text-gray-600">{candidate.email}</p>
                        <p className="text-xs text-gray-500">{candidate.experience} experience</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge
                          className={
                            candidate.status === "recommended"
                              ? "bg-green-100 text-green-800"
                              : candidate.status === "qualified"
                                ? "bg-blue-100 text-blue-800"
                                : candidate.status === "in_progress"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                          }
                        >
                          {candidate.status.replace("_", " ")}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{candidate.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Score: {candidate.score}/100</p>
                        <p className="text-xs text-gray-500">Applied: {candidate.appliedDate}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/interview-pipeline/${candidate.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interview Pipeline</CardTitle>
              <CardDescription>Candidate progress through interview stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-medium">Applied</h4>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalApplications}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h4 className="font-medium">Screening</h4>
                    <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-medium">Recommended</h4>
                    <p className="text-2xl font-bold text-green-600">{stats.recommended}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h4 className="font-medium">Rejected</h4>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>Job posting performance across different platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {job.posting_results.length > 0 ? (
                  job.posting_results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <h4 className="font-medium">{result.platform}</h4>
                          <p className="text-sm text-gray-600">
                            {result.success ? "Successfully posted" : "Failed to post"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Posted: {new Date(result.posted_at).toLocaleDateString()}
                        </p>
                        {result.applicationUrl && (
                          <Link href={result.applicationUrl} target="_blank">
                            <Button variant="outline" size="sm" className="mt-1 bg-transparent">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Post
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No platform posting data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
