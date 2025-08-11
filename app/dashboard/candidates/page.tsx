"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { RoleManagementService } from "@/lib/role-management-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Filter, Users, Mail, Phone, MapPin, Calendar, Star, UserCheck, ExternalLink } from "lucide-react"
import Link from "next/link"

// Mock candidate data
const mockCandidates = [
  {
    id: "cand_1",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1-555-0123",
    location: "San Francisco, CA",
    status: "recommended",
    pipeline_progress: 100,
    current_stage: 3,
    applied_date: "2024-01-15",
    source: "linkedin",
    resume_score: 85,
    job_title: "Senior Software Engineer",
    assigned_interviewer: "interviewer_1",
    avatar: null,
    experience: "5+ years",
    skills: ["React", "Node.js", "TypeScript", "AWS"],
    stages: [
      { name: "Initial Screening", status: "completed", score: 78, completed_at: "2024-01-16" },
      { name: "Interview Round", status: "completed", score: 82, completed_at: "2024-01-18" },
      { name: "HR Round", status: "completed", score: 88, completed_at: "2024-01-20" },
      { name: "Final Result", status: "completed", score: 92, completed_at: "2024-01-22" },
    ],
    final_recommendation: "Strong hire - excellent technical skills and cultural fit",
  },
  {
    id: "cand_2",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1-555-0124",
    location: "New York, NY",
    status: "qualified",
    pipeline_progress: 50,
    current_stage: 1,
    applied_date: "2024-01-18",
    source: "indeed",
    resume_score: 92,
    job_title: "Senior Software Engineer",
    assigned_interviewer: "interviewer_2",
    avatar: null,
    experience: "7+ years",
    skills: ["Python", "Django", "PostgreSQL", "Docker"],
    stages: [
      { name: "Initial Screening", status: "completed", score: 85, completed_at: "2024-01-19" },
      { name: "Interview Round", status: "completed", score: 90, completed_at: "2024-01-21" },
      { name: "HR Round", status: "pending", score: 0, completed_at: null },
      { name: "Final Result", status: "pending", score: 0, completed_at: null },
    ],
    final_recommendation: null,
  },
  {
    id: "cand_3",
    name: "Mike Chen",
    email: "mike.chen@email.com",
    phone: "+1-555-0125",
    location: "Seattle, WA",
    status: "rejected",
    pipeline_progress: 25,
    current_stage: 1,
    applied_date: "2024-01-20",
    source: "monster",
    resume_score: 65,
    job_title: "Senior Software Engineer",
    assigned_interviewer: "interviewer_1",
    avatar: null,
    experience: "3+ years",
    skills: ["Java", "Spring", "MySQL"],
    stages: [
      { name: "Initial Screening", status: "completed", score: 58, completed_at: "2024-01-21" },
      { name: "Interview Round", status: "failed", score: 45, completed_at: "2024-01-23" },
      { name: "HR Round", status: "skipped", score: 0, completed_at: null },
      { name: "Final Result", status: "skipped", score: 0, completed_at: null },
    ],
    final_recommendation: "Not a good fit - lacks required experience",
  },
]

export default function CandidatesPage() {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState(mockCandidates)
  const [filteredCandidates, setFilteredCandidates] = useState(mockCandidates)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [interviewers, setInterviewers] = useState<any[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [assignmentNotes, setAssignmentNotes] = useState("")

  useEffect(() => {
    // Get all interviewers for assignment
    const allInterviewers = RoleManagementService.getUsersByRole("interviewer")
    setInterviewers(allInterviewers)
  }, [])

  useEffect(() => {
    // Filter candidates based on search and status
    let filtered = candidates

    if (searchTerm) {
      filtered = filtered.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.job_title.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((candidate) => candidate.status === statusFilter)
    }

    // If user is an interviewer, only show assigned candidates
    if (user?.role === "interviewer") {
      filtered = filtered.filter((candidate) => candidate.assigned_interviewer === user.id)
    }

    setFilteredCandidates(filtered)
  }, [candidates, searchTerm, statusFilter, user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recommended":
        return "bg-green-100 text-green-800 border-green-200"
      case "qualified":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "linkedin":
        return "🔗"
      case "indeed":
        return "💼"
      case "monster":
        return "👹"
      case "naukri":
        return "🇮🇳"
      default:
        return "📄"
    }
  }

  const handleAssignCandidate = (candidateId: string, interviewerId: string) => {
    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, assigned_interviewer: interviewerId } : candidate,
      ),
    )
  }

  const getInterviewerName = (interviewerId: string) => {
    const interviewer = interviewers.find((i) => i.id === interviewerId)
    return interviewer?.name || "Unassigned"
  }

  const canManageCandidates = user?.role === "admin" || user?.role === "ai_recruiter"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600">
            {user?.role === "interviewer"
              ? "View and manage your assigned candidates"
              : "Manage candidate applications and interview assignments"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            <Users className="w-4 h-4 mr-1" />
            {filteredCandidates.length} candidates
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search candidates by name, email, or job title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <div className="grid gap-4">
        {filteredCandidates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Candidates will appear here as they apply to your job postings."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={candidate.avatar || "/placeholder.svg"} alt={candidate.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {candidate.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                        <Badge className={getStatusColor(candidate.status)}>
                          {candidate.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{candidate.job_title}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{candidate.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{candidate.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{candidate.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Applied {new Date(candidate.applied_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>{getSourceIcon(candidate.source)}</span>
                          <span className="capitalize">{candidate.source}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {candidate.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Progress:</span>
                          <Progress value={candidate.pipeline_progress} className="w-20 h-2" />
                          <span className="text-sm font-medium">{candidate.pipeline_progress}%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">{candidate.resume_score}/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right text-sm text-gray-600">
                      <div>Assigned to:</div>
                      <div className="font-medium">{getInterviewerName(candidate.assigned_interviewer)}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/interview-pipeline/${candidate.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Pipeline
                        </Button>
                      </Link>
                      {canManageCandidates && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(candidate)}>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Candidate</DialogTitle>
                              <DialogDescription>
                                Assign {candidate.name} to an interviewer for evaluation.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="interviewer">Select Interviewer</Label>
                                <Select
                                  value={candidate.assigned_interviewer}
                                  onValueChange={(value) => handleAssignCandidate(candidate.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose an interviewer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {interviewers.map((interviewer) => (
                                      <SelectItem key={interviewer.id} value={interviewer.id}>
                                        {interviewer.name} ({interviewer.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="notes">Assignment Notes</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Add any special instructions or notes for the interviewer..."
                                  value={assignmentNotes}
                                  onChange={(e) => setAssignmentNotes(e.target.value)}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
