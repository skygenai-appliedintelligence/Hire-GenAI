"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Radar, Doughnut, Bar } from "react-chartjs-2"
import { 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  User, 
  Building, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Briefcase,
  BarChart4, 
  FileText, 
  Award, 
  Mail, 
  Phone,
  Clock,
  Tag,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Download
} from "lucide-react"
import { useState } from "react"
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js"
import { classifyCandidate, getProfileRecommendation, type CandidateProfile } from "@/utils/profile-classification"

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
)

interface Skill {
  name: string
  score: number
}

interface EvaluationData {
  candidateName: string
  role: string
  experience: string
  overallScore: number
  interviewScore: number
  resumeUrl: string
  photoUrl?: string | null
  qualified: boolean
  keyMetrics: {
    skillsMatch: number
    domainKnowledge: number
    communication: number
    problemSolving: number
  }
  strengths: string[]
  gaps: string[]
  matchedSkills: Skill[]
  missingSkills: string[]
  recommendation: string
  evaluationBreakdown: {
    category: string
    score: number
    weight: number
    details: string[]
  }[]
  candidateProfile: CandidateProfile
  extractedInfo: {
    name: string
    email: string
    phone: string
    totalExperience: string
    skills: string[]
    notes: string[]
    workExperience?: Array<{
      company: string
      title: string
      duration: string
      start_date?: string | null
      end_date?: string | null
    }>
  }
}

interface Props {
  data: EvaluationData
  isGeneratingPDF?: boolean
  expandedSkillSetMatch?: boolean
  onToggleSkillSetMatch?: (expanded: boolean) => void
  candidateLocation?: string | null
}

export function CVEvaluationReport({ data, isGeneratingPDF = false, expandedSkillSetMatch = false, onToggleSkillSetMatch, candidateLocation }: Props) {
  const [profileClassificationOpen, setProfileClassificationOpen] = useState(true)
  const [localExpandedSkillSetMatch, setLocalExpandedSkillSetMatch] = useState(expandedSkillSetMatch)
  
  // Get profile classification
  const profileGroup = classifyCandidate(data.candidateProfile)
  const profileRecommendation = getProfileRecommendation(profileGroup)
  
  // Radar chart data
  const radarData = {
    labels: ["Skills Match", "Domain Knowledge", "Communication", "Problem Solving"],
    datasets: [
      {
        label: "Candidate Score",
        data: [
          data.keyMetrics.skillsMatch,
          data.keyMetrics.domainKnowledge,
          data.keyMetrics.communication,
          data.keyMetrics.problemSolving,
        ],
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 2,
      },
      {
        label: "Industry Average",
        data: [65, 60, 70, 65],
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderColor: "rgb(99, 102, 241)",
        borderWidth: 2,
      }
    ],
  }

  const radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 100,
        beginAtZero: true,
        ticks: {
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      }
    },
  }

  // Donut chart for overall score
  const scoreData = {
    labels: ['Score', 'Remaining'],
    datasets: [
      {
        data: [data.overallScore, 100 - data.overallScore],
        backgroundColor: [
          'rgb(16, 185, 129)',
          'rgb(229, 231, 235)'
        ],
        borderWidth: 0,
        cutout: '75%',
      }
    ]
  }

  const scoreOptions = {
    plugins: {
      tooltip: {
        enabled: false,
      },
      legend: {
        display: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  }

  // Bar chart for evaluation breakdown
  const breakdownData = {
    labels: data.evaluationBreakdown.map(item => item.category),
    datasets: [
      {
        label: 'Score',
        data: data.evaluationBreakdown.map(item => item.score),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
    ],
  }

  const breakdownOptions = {
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  }

  return (
    <div className="w-full">
      {/* Main Header with Company Logo */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4 sm:mb-6 border border-slate-200">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col gap-4">
            {/* Top row: Icon + Title */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div className="bg-emerald-600 rounded-full p-2 sm:p-3 flex-shrink-0">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-800">Resume Evaluation Report</h1>
                <p className="text-slate-500 text-xs sm:text-sm">Generated on {new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
            
            {/* Bottom row: Badge, Button, ID */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="inline-flex items-center">
                {data.qualified ? 
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mr-1.5 sm:mr-2" /> : 
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mr-1.5 sm:mr-2" />
                }
                <Badge 
                  variant={data.qualified ? "default" : "destructive"}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm ${data.qualified ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}`}
                >
                  {data.qualified ? "Qualified" : "Not Qualified"}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => window.open(data.resumeUrl, '_blank')}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Download Resume</span>
              </Button>
              <div className="flex items-center space-x-1 text-xs sm:text-sm text-slate-500">
                <span>ID:</span>
                <span className="font-mono text-xs">CV-20251121-001</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Candidate Overview */}
        <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center border-2 sm:border-4 border-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200 flex-shrink-0 overflow-hidden">
                      {data.photoUrl ? (
                        <img 
                          src={data.photoUrl} 
                          alt={data.candidateName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 sm:h-12 sm:w-12 text-slate-500" />
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-center">{data.candidateName}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-4">
                      <div className="w-64 h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                        {data.photoUrl ? (
                          <img 
                            src={data.photoUrl} 
                            alt={data.candidateName} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-32 w-32 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-slate-800 truncate">{data.candidateName}</h2>
                  <div className="flex items-center text-slate-600 mt-1">
                    <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="text-sm sm:text-base truncate">{data.role}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:border-l md:border-slate-300 md:pl-4 flex-1 w-full md:w-auto">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-medium tracking-wide mb-1">Resume Score</p>
                  <div className="flex items-center">
                    <BarChart4 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-1.5 sm:mr-2" />
                    <p className="font-bold text-base sm:text-lg">{data.overallScore}<span className="text-slate-400 text-[10px] sm:text-xs">/100</span></p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-medium tracking-wide mb-1">Interview Score</p>
                  {data.interviewScore > 0 ? (
                    <div className="flex items-center">
                      <BarChart4 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-1.5 sm:mr-2" />
                      <p className="font-bold text-base sm:text-lg">{data.interviewScore}<span className="text-slate-400 text-[10px] sm:text-xs">/100</span></p>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <BarChart4 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-1.5 sm:mr-2" />
                      <p className="font-bold text-base sm:text-lg text-slate-400">—</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="w-24 h-24 relative hidden md:block">
              <Doughnut data={scoreData} options={scoreOptions} />
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                {data.overallScore}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Classification */}
      <Card className="shadow-md border border-slate-200 mb-6 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Award className="w-5 h-5 text-emerald-600 mr-3" />
              Candidate Profile Classification
            </CardTitle>
            <Collapsible open={profileClassificationOpen} onOpenChange={setProfileClassificationOpen} className="w-auto">
              <CollapsibleTrigger className="hover:bg-slate-200/50 p-1 rounded inline-flex items-center justify-center">
                {profileClassificationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
            </Collapsible>
          </div>
          <CardDescription className="text-slate-600 mt-1 ml-8">
            Classification is based on education, employer, and experience relevance
          </CardDescription>
        </CardHeader>
        
        <Collapsible open={profileClassificationOpen} onOpenChange={setProfileClassificationOpen}>
          <CollapsibleContent>
            <CardContent className="p-6">
              {/* Current Profile */}
              <div className="mb-6">
                <h4 className="text-sm uppercase tracking-wider text-slate-500 font-medium mb-3">Current Classification</h4>
                <div className={`p-4 rounded-lg border ${profileGroup.bgColor} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 bg-white/10 rounded-full"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 -mb-6 -ml-6 bg-white/10 rounded-full"></div>
                  
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <h4 className={`font-semibold ${profileGroup.color} text-lg`}>{profileGroup.name}</h4>
                    <Badge 
                      variant="outline"
                      className={`px-3 py-1 ${profileGroup.priority === 'highest' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 
                        profileGroup.priority === 'high' ? 'border-blue-500 bg-blue-50 text-blue-700' :
                        profileGroup.priority === 'medium' ? 'border-orange-500 bg-orange-50 text-orange-700' : 
                        'border-red-500 bg-red-50 text-red-700'}`}
                    >
                      {profileGroup.priority === 'highest' ? 'Most Ideal' : 
                      profileGroup.priority === 'high' ? 'Good Match' :
                      profileGroup.priority === 'medium' ? 'Average' : 'Least Ideal'}
                    </Badge>
                  </div>
                  <Separator className="my-3 opacity-30" />
                  <p className={`${profileGroup.color} mb-4 text-base`}>{profileGroup.description}</p>
                  <div className="font-medium text-sm bg-white/60 p-3 rounded border border-current/10">{profileRecommendation}</div>
                </div>
              </div>
              
              {/* Profile Criteria */}
              <div className="mb-6">
                <h4 className="text-sm uppercase tracking-wider text-slate-500 font-medium mb-3">Candidate Profile Attributes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <Card className="overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-blue-50 to-white">
                      <CardTitle className="text-sm sm:text-base flex items-center">
                        <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                        University
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-2">
                      {data.candidateProfile.educationList && data.candidateProfile.educationList.length > 0 ? (
                        <div className="space-y-2 mb-2">
                          {data.candidateProfile.educationList.map((edu, idx) => (
                            <p key={idx} className="text-sm text-slate-700 font-medium">
                              {edu.institution}
                              {edu.degree && (
                                <span className="text-slate-500"> - {edu.degree}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <Badge variant="outline" className="capitalize mt-1">
                        {data.candidateProfile.university}
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card className="overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-purple-50 to-white">
                      <CardTitle className="text-sm sm:text-base flex items-center">
                        <Building className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
                        Employer History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-2">
                      {data.extractedInfo.workExperience && data.extractedInfo.workExperience.length > 0 ? (
                        <div className="space-y-2">
                          {data.extractedInfo.workExperience.map((exp, idx) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-slate-800">{exp.company}</p>
                              <p className="text-slate-500 text-xs">{exp.title} • {exp.duration}</p>
                            </div>
                          ))}
                        </div>
                      ) : data.candidateProfile.experience > 0 ? (
                        <div className="text-sm">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {data.candidateProfile.experience}+ Years Experience
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            Work history details not extracted. Re-upload resume to see employer list.
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Fresher Candidate
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">No prior work experience listed</p>
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <Badge variant="outline" className="capitalize text-xs">
                          Profile: {data.candidateProfile.employer}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="overflow-hidden">
                    <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-amber-50 to-white">
                      <CardTitle className="text-sm sm:text-base flex items-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-amber-600" />
                        Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-2">
                      <div className="flex flex-col items-center justify-center py-2">
                        <div className="text-2xl sm:text-3xl font-bold text-amber-600">{data.candidateProfile.experience}</div>
                        <div className="text-xs sm:text-sm text-slate-500">Years of Experience</div>
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{data.candidateProfile.experience} years</Badge>
                        {data.candidateProfile.hasRelevantExperience && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Relevant
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Profile Groups Reference */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-slate-500 font-medium mb-3">Profile Classification Reference</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded border bg-red-50 border-red-200 relative pl-12">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-red-200 text-red-700 font-bold text-xs">0</div>
                    <div className="font-medium text-red-700">Least Ideal</div>
                    <div className="text-xs text-red-600 mt-1">Non-targeted university AND non-targeted employer</div>
                  </div>
                  
                  <div className="p-3 rounded border bg-orange-50 border-orange-200 relative pl-12">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-orange-200 text-orange-700 font-bold text-xs">1</div>
                    <div className="font-medium text-orange-700">Average</div>
                    <div className="text-xs text-orange-600 mt-1">Targeted university BUT non-targeted employer</div>
                  </div>
                  
                  <div className="p-3 rounded border bg-blue-50 border-blue-200 relative pl-12">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-700 font-bold text-xs">2</div>
                    <div className="font-medium text-blue-700">Good Match</div>
                    <div className="text-xs text-blue-600 mt-1">Non-targeted university BUT targeted employer (3+ years exp.)</div>
                  </div>
                  
                  <div className="p-3 rounded border bg-emerald-50 border-emerald-200 relative pl-12">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-200 text-emerald-700 font-bold text-xs">3</div>
                    <div className="font-medium text-emerald-700">Most Ideal</div>
                    <div className="text-xs text-emerald-600 mt-1">Targeted university AND targeted employer (3+ years exp.)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>


      {/* Skills & Gap Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Strengths & Gaps */}
        <Card className="shadow-md border border-slate-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Lightbulb className="w-5 h-5 text-emerald-600 mr-3" />
              Strengths & Gaps Analysis
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1 ml-8">
              Key insights from candidate assessment
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            {isGeneratingPDF ? (
              // PDF mode: Show all content
              <div className="space-y-0">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-2">
                  <div className="flex items-center font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Strengths
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {data.strengths.map((strength, index) => (
                    <li key={index} className="py-3 px-6 flex items-start hover:bg-slate-50">
                      <div className="mr-3 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        </div>
                      </div>
                      <span className="text-slate-700">{strength}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-2 mt-4">
                  <div className="flex items-center font-medium text-amber-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Gaps
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {data.gaps.map((gap, index) => (
                    <li key={index} className="py-3 px-6 flex items-start hover:bg-slate-50">
                      <div className="mr-3 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                          <XCircle className="w-3 h-3 text-amber-600" />
                        </div>
                      </div>
                      <span className="text-slate-700">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // Normal mode: Tabbed interface
              <Tabs defaultValue="strengths" className="w-full">
                <div className="border-b border-slate-200">
                  <TabsList className="w-full grid grid-cols-2 rounded-none bg-transparent p-0">
                    <TabsTrigger 
                      value="strengths" 
                      className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 text-slate-600 data-[state=active]:text-emerald-700 py-3 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Strengths
                    </TabsTrigger>
                    <TabsTrigger 
                      value="gaps" 
                      className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 text-slate-600 data-[state=active]:text-amber-700 py-3 font-medium"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Gaps
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="strengths" className="m-0 pt-4">
                  <ul className="divide-y divide-slate-100">
                    {data.strengths.map((strength, index) => (
                      <li key={index} className="py-3 px-6 flex items-start hover:bg-slate-50">
                        <div className="mr-3 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          </div>
                        </div>
                        <span className="text-slate-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
                
                <TabsContent value="gaps" className="m-0 pt-4">
                  <ul className="divide-y divide-slate-100">
                    {data.gaps.map((gap, index) => (
                      <li key={index} className="py-3 px-6 flex items-start hover:bg-slate-50">
                        <div className="mr-3 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-amber-600" />
                          </div>
                        </div>
                        <span className="text-slate-700">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
        
        {/* Skills Breakdown */}
        <Card className="shadow-md border border-slate-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Tag className="w-5 h-5 text-emerald-600 mr-3" />
              Skills Assessment
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1 ml-8">
              Matched vs. Missing Skills Analysis
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            {isGeneratingPDF ? (
              // PDF mode: Show all content
              <div className="space-y-0">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-2">
                  <div className="flex items-center font-medium text-blue-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Matched Skills
                  </div>
                </div>
                <div className="px-6 pt-4 pb-4">
                  {data.matchedSkills.map((skill, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-medium">{skill.name}</span>
                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {skill.score}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${skill.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-2 mt-4">
                  <div className="flex items-center font-medium text-slate-700">
                    <XCircle className="w-4 h-4 mr-2" />
                    Missing Skills
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {data.missingSkills.map((skill, index) => (
                      <div key={index} className="flex items-center p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="mr-2">
                          <XCircle className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-700">{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Normal mode: Tabbed interface
              <Tabs defaultValue="matched" className="w-full">
                <div className="border-b border-slate-200">
                  <TabsList className="w-full grid grid-cols-2 rounded-none bg-transparent p-0">
                    <TabsTrigger 
                      value="matched" 
                      className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 text-slate-600 data-[state=active]:text-blue-700 py-3 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Matched Skills
                    </TabsTrigger>
                    <TabsTrigger 
                      value="missing" 
                      className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500 text-slate-600 data-[state=active]:text-slate-700 py-3 font-medium"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Missing Skills
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="matched" className="m-0 pt-4 pb-4">
                  <div className="px-6">
                    {data.matchedSkills.map((skill, index) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium">{skill.name}</span>
                          <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            {skill.score}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${skill.score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="missing" className="m-0 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {data.missingSkills.map((skill, index) => (
                      <div key={index} className="flex items-center p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="mr-2">
                          <XCircle className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-700">{skill}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Evaluation Breakdown */}
      <Card className="shadow-md border border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
          <CardTitle className="text-lg font-semibold flex items-center">
            <BarChart4 className="w-5 h-5 text-emerald-600 mr-3" />
            Detailed Evaluation Breakdown
          </CardTitle>
          <CardDescription className="text-slate-600 mt-1 ml-8">
            Weighted category assessment with supporting details
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-5">
            {data.evaluationBreakdown.map((category, index) => {
              const getScoreColor = (score: number) => {
                if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-200';
                if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
                return 'bg-red-100 text-red-800 border-red-200';
              };
              
              const getScoreBgColor = (score: number) => {
                if (score >= 80) return 'bg-emerald-50 hover:bg-emerald-100/50';
                if (score >= 70) return 'bg-blue-50 hover:bg-blue-100/50';
                if (score >= 60) return 'bg-amber-50 hover:bg-amber-100/50';
                return 'bg-red-50 hover:bg-red-100/50';
              };
              
              const isSkillSetMatch = category.category === 'Skill Set Match'
              const isExpanded = isSkillSetMatch ? localExpandedSkillSetMatch : false
              
              const handleToggleSkillSetMatch = () => {
                if (isSkillSetMatch) {
                  setLocalExpandedSkillSetMatch(!localExpandedSkillSetMatch)
                  onToggleSkillSetMatch?.(!localExpandedSkillSetMatch)
                }
              }
              
              return (
                <div 
                  key={index} 
                  className={`border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 ${getScoreBgColor(category.score)} ${isSkillSetMatch ? 'cursor-pointer' : ''}`}
                  onClick={isSkillSetMatch ? handleToggleSkillSetMatch : undefined}
                >
                  {/* Category Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 sm:px-6 py-3 sm:py-5 bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-200 gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                      <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg shadow-md flex-shrink-0 ${
                        category.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                        category.score >= 70 ? 'bg-blue-100 text-blue-700' : 
                        category.score >= 60 ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm sm:text-lg text-slate-900 leading-tight flex items-center gap-1 sm:gap-2 flex-wrap">
                          <span className="truncate">{category.category}</span>
                          {isSkillSetMatch && (
                            <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </h4>
                        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                          <span className="text-xs sm:text-sm font-semibold text-slate-600">Weight: <span className="text-slate-800">{category.weight}%</span></span>
                        </div>
                      </div>
                      {/* Mobile score badge - inline with header */}
                      <Badge 
                        variant="outline"
                        className={`px-2 sm:px-5 py-1 sm:py-2 text-xs sm:text-base font-bold sm:hidden flex-shrink-0 ${getScoreColor(category.score)}`}
                      >
                        {category.score}/100
                      </Badge>
                    </div>
                    {/* Desktop score badge */}
                    <div className="text-right hidden sm:block">
                      <Badge 
                        variant="outline"
                        className={`px-5 py-2 text-base font-bold ${getScoreColor(category.score)}`}
                      >
                        {category.score}/100
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Category Details - Grid Only */}
                  <div className={`px-3 sm:px-6 py-4 sm:py-6 bg-white/80 transition-all duration-300 ${isExpanded ? 'max-h-none' : 'max-h-96'} overflow-hidden`}>
                    {/* Grid Format (2x2 for all grid categories) */}
                    {(category as any).isGrid && (category as any).gridData ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        {(category as any).gridData.map((item: any, idx: number) => {
                          // For Skill Set Match, show full skills when expanded
                          if (isSkillSetMatch && isExpanded && (item.label.includes('Matched Skills') || item.label.includes('Missing Skills'))) {
                            const skillsArray = item.label.includes('Matched Skills') 
                              ? (category as any).fullMatchedSkills || []
                              : (category as any).fullMissingSkills || []
                            
                            return (
                              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 col-span-2">
                                <div className="text-sm font-medium text-slate-600 mb-2">
                                  {item.label}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {skillsArray.length > 0 ? (
                                    skillsArray.map((skill: string, sidx: number) => (
                                      <Badge key={sidx} variant="outline" className="bg-slate-50">
                                        {skill}
                                      </Badge>
                                    ))
                                  ) : (
                                    <p className="text-sm text-slate-500">None</p>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          
                          return (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-4">
                              <div className="text-xs sm:text-sm font-medium text-slate-600 mb-1 sm:mb-2">
                                {item.label}
                              </div>
                              <p className="text-xs sm:text-sm text-slate-800 break-words">
                                {item.value}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="shadow-md border border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
          <CardTitle className="text-lg font-semibold flex items-center">
            {data.qualified ? 
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-3" /> : 
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-3" />
            }
            Final Recommendation
          </CardTitle>
          <CardDescription className="text-slate-600 mt-1 ml-8">
            Assessment outcome based on comprehensive evaluation
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className={`p-4 rounded-lg ${data.qualified ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start">
              {data.qualified ? (
                <div className="mr-4 mt-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              ) : (
                <div className="mr-4 mt-1">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              )}
              <div>
                <h4 className={`font-semibold text-lg mb-2 ${data.qualified ? 'text-emerald-700' : 'text-red-700'}`}>
                  {data.qualified ? "Proceed to Next Round" : "Not Recommended"}
                </h4>
                <p className="text-slate-700">{data.recommendation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Information */}
      <Card className="shadow-md border border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
          <CardTitle className="text-lg font-semibold flex items-center">
            <User className="w-5 h-5 text-emerald-600 mr-3" />
            Extracted Candidate Information
          </CardTitle>
          <CardDescription className="text-slate-600 mt-1 ml-8">
            Data automatically extracted from resume
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
            <Card className="overflow-hidden">
              <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-blue-50 to-white">
                <CardTitle className="text-sm sm:text-base flex items-center">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-blue-600" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-slate-600 truncate">{data.extractedInfo.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-slate-600 truncate">{data.extractedInfo.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-slate-600">{data.extractedInfo.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-amber-50 to-white">
                <CardTitle className="text-sm sm:text-base flex items-center">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-amber-600" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 flex items-center justify-center">
                <div className="text-center py-2">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-600">{data.extractedInfo.totalExperience.split(' ')[0]}</div>
                  <div className="text-xs sm:text-sm text-slate-500">Years of Experience</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden sm:col-span-2 md:col-span-1">
              <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-purple-50 to-white">
                <CardTitle className="text-sm sm:text-base flex items-center">
                  <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-purple-600" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {data.extractedInfo.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-[10px] sm:text-xs bg-slate-50">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {data.extractedInfo.notes.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="p-4 bg-gradient-to-b from-slate-50 to-white">
                <CardTitle className="text-base flex items-center">
                  <HelpCircle className="w-4 h-4 mr-2 text-slate-600" />
                  Notes & Observations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <ul className="space-y-2">
                  {Array.isArray(data.extractedInfo.notes) ? data.extractedInfo.notes.map((note, index) => (
                    <li key={index} className="text-sm text-slate-600 flex items-start p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{note}</span>
                    </li>
                  )) : (
                    <li className="text-sm text-slate-600 flex items-start p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>No additional notes available</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
