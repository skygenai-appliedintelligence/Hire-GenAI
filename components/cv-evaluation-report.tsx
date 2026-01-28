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
  Download,
  Target
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

interface RiskAdjustments {
  critical_gaps?: string[]
  risk_flags?: string[]
  score_cap_applied?: number | null
}

interface ExplainableScore {
  skill_contribution?: number
  project_contribution?: number
  experience_contribution?: number
  edu_certs_contribution?: number
  location_contribution?: number
  quality_contribution?: number
}

interface EligibilityData {
  domain_fit?: string
  must_have_fit?: string
  experience_fit?: string
  language_fit?: string
  fail_reasons?: string[]
  missing_must_have?: string[]
}

interface Props {
  data: EvaluationData
  isGeneratingPDF?: boolean
  expandedSkillSetMatch?: boolean
  onToggleSkillSetMatch?: (expanded: boolean) => void
  candidateLocation?: string | null
  riskAdjustments?: RiskAdjustments | null
  missingMustHave?: string[]
  explainableScore?: ExplainableScore | null
  totalScore?: number
  eligibility?: EligibilityData | null
  extractedData?: {
    skills?: string[]
    languages?: any[]
    total_experience_years_estimate?: number
  } | null
  experienceRequired?: string
}

export function CVEvaluationReport({ data, isGeneratingPDF = false, expandedSkillSetMatch = false, onToggleSkillSetMatch, candidateLocation, riskAdjustments, missingMustHave, explainableScore, totalScore, eligibility, extractedData, experienceRequired }: Props) {
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

      {/* Eligibility Gates - Between Profile Classification and Detailed Evaluation */}
      {eligibility && (
        <Card className="shadow-md border border-slate-200 overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center text-slate-800">
                <Target className="w-5 h-5 text-indigo-600 mr-3" />
                Eligibility Gates
              </CardTitle>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                eligibility.fail_reasons && eligibility.fail_reasons.length > 0 
                  ? "bg-red-100 text-red-700" 
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                {eligibility.fail_reasons && eligibility.fail_reasons.length > 0 ? 'Gates Failed' : 'All Gates Passed'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-6 font-semibold text-slate-700 w-1/4">Gate</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 w-24">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-6 text-slate-800">Domain Fit</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${eligibility.domain_fit === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {eligibility.domain_fit || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {eligibility.domain_fit === 'PASS' 
                      ? 'Relevant platforms detected from resume'
                      : 'Required domain platforms not found'}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-6 text-slate-800">Must-Have Skills</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${eligibility.must_have_fit === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {eligibility.must_have_fit || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {eligibility.must_have_fit === 'PASS' 
                      ? 'All critical skills present' 
                      : `Missing: ${eligibility.missing_must_have?.slice(0, 5).join(', ') || 'critical skills'}`}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-6 text-slate-800">Experience Fit</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${eligibility.experience_fit === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {eligibility.experience_fit || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {extractedData?.total_experience_years_estimate 
                      ? `${extractedData.total_experience_years_estimate} years vs required ${experienceRequired || '3+'} years`
                      : eligibility.experience_fit === 'PASS' 
                        ? 'Experience meets requirements' 
                        : 'Experience below requirement'}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-6 text-slate-800">Language Fit</td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${eligibility.language_fit === 'PASS' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {eligibility.language_fit || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {eligibility.language_fit === 'PASS' 
                      ? `${(extractedData?.languages || []).map((l: any) => l.language || l).slice(0, 2).join(', ') || 'English'} present`
                      : 'Required language not found'}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Evaluation Breakdown - Tabular Format */}
      <Card className="shadow-md border border-slate-200 overflow-hidden mb-6">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
          <CardTitle className="text-lg font-semibold flex items-center">
            <BarChart4 className="w-5 h-5 text-emerald-600 mr-3" />
            Detailed Evaluation Breakdown
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 w-12">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 w-24">Weight</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 w-28">Points</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Calculate raw score (sum of all contributions)
                  const rawScore = Math.round(
                    (explainableScore?.skill_contribution || 0) +
                    (explainableScore?.project_contribution || 0) +
                    (explainableScore?.experience_contribution || 0) +
                    (explainableScore?.edu_certs_contribution || 0) +
                    (explainableScore?.location_contribution || 0) +
                    (explainableScore?.quality_contribution || 0)
                  )
                  // Scale factor to adjust points so they sum to final score
                  const finalScore = totalScore ?? rawScore
                  const scaleFactor = rawScore > 0 ? finalScore / rawScore : 1
                  
                  // Adjusted points
                  const skillPts = Math.round((explainableScore?.skill_contribution || 0) * scaleFactor)
                  const projectPts = Math.round((explainableScore?.project_contribution || 0) * scaleFactor)
                  const expPts = Math.round((explainableScore?.experience_contribution || 0) * scaleFactor)
                  const eduPts = Math.round((explainableScore?.edu_certs_contribution || 0) * scaleFactor)
                  const locPts = Math.round((explainableScore?.location_contribution || 0) * scaleFactor)
                  const qualityPts = Math.round((explainableScore?.quality_contribution || 0) * scaleFactor)
                  
                  return (
                    <>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4">1</td>
                        <td className="py-3 px-4"><strong>Skills Match</strong></td>
                        <td className="py-3 px-4">30%</td>
                        <td className="py-3 px-4 font-semibold text-blue-600">+{skillPts}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4">2</td>
                        <td className="py-3 px-4"><strong>Project Relevance</strong></td>
                        <td className="py-3 px-4">20%</td>
                        <td className="py-3 px-4 font-semibold text-indigo-600">+{projectPts}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4">3</td>
                        <td className="py-3 px-4"><strong>Experience Match</strong></td>
                        <td className="py-3 px-4">20%</td>
                        <td className="py-3 px-4 font-semibold text-purple-600">+{expPts}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4">4</td>
                        <td className="py-3 px-4"><strong>Education & Certifications</strong></td>
                        <td className="py-3 px-4">15%</td>
                        <td className="py-3 px-4 font-semibold text-amber-600">+{eduPts}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4">5</td>
                        <td className="py-3 px-4"><strong>Location & Availability</strong></td>
                        <td className="py-3 px-4">10%</td>
                        <td className="py-3 px-4 font-semibold text-emerald-600">+{locPts}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4">6</td>
                        <td className="py-3 px-4"><strong>Resume Quality</strong></td>
                        <td className="py-3 px-4">5%</td>
                        <td className="py-3 px-4 font-semibold text-slate-600">+{qualityPts}</td>
                      </tr>
                      <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4">
                          <strong className="text-emerald-800">Total Score</strong>
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">100%</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-700 text-lg">
                            {finalScore} / 100
                          </div>
                        </td>
                      </tr>
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-3">
            {(() => {
              // Calculate raw score and scale factor for mobile view
              const rawScore = Math.round(
                (explainableScore?.skill_contribution || 0) +
                (explainableScore?.project_contribution || 0) +
                (explainableScore?.experience_contribution || 0) +
                (explainableScore?.edu_certs_contribution || 0) +
                (explainableScore?.location_contribution || 0) +
                (explainableScore?.quality_contribution || 0)
              )
              const finalScore = totalScore ?? rawScore
              const scaleFactor = rawScore > 0 ? finalScore / rawScore : 1
              
              const skillPts = Math.round((explainableScore?.skill_contribution || 0) * scaleFactor)
              const projectPts = Math.round((explainableScore?.project_contribution || 0) * scaleFactor)
              const expPts = Math.round((explainableScore?.experience_contribution || 0) * scaleFactor)
              const eduPts = Math.round((explainableScore?.edu_certs_contribution || 0) * scaleFactor)
              const locPts = Math.round((explainableScore?.location_contribution || 0) * scaleFactor)
              const qualityPts = Math.round((explainableScore?.quality_contribution || 0) * scaleFactor)
              
              return (
                <>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">Skills Match (30%)</span>
                      <span className="font-bold text-blue-600">+{skillPts}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">Project Relevance (20%)</span>
                      <span className="font-bold text-indigo-600">+{projectPts}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">Experience Match (20%)</span>
                      <span className="font-bold text-purple-600">+{expPts}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">Education & Certs (15%)</span>
                      <span className="font-bold text-amber-600">+{eduPts}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">Location (10%)</span>
                      <span className="font-bold text-emerald-600">+{locPts}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">Resume Quality (5%)</span>
                      <span className="font-bold text-slate-600">+{qualityPts}</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800">Total Score</span>
                      <span className="font-bold text-emerald-700 text-lg">
                        {finalScore} / 100
                      </span>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Skills & Gap Analysis */}
      <div className="mb-6">
        {/* Strengths & Gaps */}
        <Card className="shadow-md border border-slate-200 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 py-4 px-6">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Lightbulb className="w-5 h-5 text-emerald-600 mr-3" />
              Skill & Gap Analysis
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1 ml-8">
              Matched skills and gaps from candidate assessment
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            {isGeneratingPDF ? (
              // PDF mode: Show all content
              <div className="space-y-0">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-2">
                  <div className="flex items-center font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Matched Skills
                  </div>
                </div>
                {(() => {
                  const skills = data.strengths.length > 0 ? data.strengths : (extractedData?.skills || [])
                  return (
                    <>
                      <div className="p-4">
                        <p className="text-slate-700 leading-relaxed">
                          {skills.length > 0 
                            ? `The candidate demonstrates proficiency in ${skills.slice(0, 5).join(', ')}${skills.length > 5 ? ` and ${skills.length - 5} more skills` : ''}.`
                            : 'No matched skills identified.'}
                        </p>
                      </div>
                      <div className="px-6 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                })()}
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-2 mt-4">
                  <div className="flex items-center font-medium text-amber-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Gaps
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {data.gaps.map((gap, index) => (
                    <li key={`pdf-gap-${index}`} className="py-3 px-6 flex items-start hover:bg-slate-50">
                      <div className="mr-3 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                          <XCircle className="w-3 h-3 text-amber-600" />
                        </div>
                      </div>
                      <span className="text-slate-700">{gap}</span>
                    </li>
                  ))}
                  {/* Critical gaps from risk analysis */}
                  {riskAdjustments?.critical_gaps?.map((gap, index) => (
                    <li key={`pdf-critical-${index}`} className="py-3 px-6 flex items-start bg-red-50">
                      <div className="mr-3 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle className="w-3 h-3 text-red-600" />
                        </div>
                      </div>
                      <span className="text-red-700">{gap}</span>
                    </li>
                  ))}
                  {/* Risk flags */}
                  {riskAdjustments?.risk_flags?.map((flag, index) => (
                    <li key={`pdf-risk-${index}`} className="py-3 px-6 flex items-start bg-amber-50">
                      <div className="mr-3 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                        </div>
                      </div>
                      <span className="text-amber-700">{flag}</span>
                    </li>
                  ))}
                  {/* Missing must-have skills - show all in one line */}
                  {missingMustHave && missingMustHave.length > 0 && (
                    <li key="pdf-missing-skills" className="py-3 px-6 flex items-start bg-orange-50">
                      <div className="mr-3 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                          <XCircle className="w-3 h-3 text-orange-600" />
                        </div>
                      </div>
                      <span className="text-orange-700">Missing skills: {missingMustHave.join(', ')}</span>
                    </li>
                  )}
                </ul>
                {/* Score cap warning */}
                {riskAdjustments?.score_cap_applied && (
                  <div className="mx-6 my-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Score Capped at {riskAdjustments.score_cap_applied} due to risk factors
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Normal mode: Tabbed interface
              <Tabs defaultValue="matched" className="w-full">
                <div className="border-b border-slate-200">
                  <TabsList className="w-full grid grid-cols-2 rounded-none bg-transparent p-0">
                    <TabsTrigger 
                      value="matched" 
                      className="data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 text-slate-600 data-[state=active]:text-emerald-700 py-3 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Matched Skills
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
                
                <TabsContent value="matched" className="m-0 pt-4">
                  <div className="p-4">
                    {(() => {
                      // Use strengths from data, fallback to extractedData skills
                      const skills = data.strengths.length > 0 ? data.strengths : (extractedData?.skills || [])
                      return (
                        <>
                          <p className="text-slate-700 leading-relaxed mb-4">
                            {skills.length > 0 
                              ? `The candidate demonstrates proficiency in ${skills.slice(0, 5).join(', ')}${skills.length > 5 ? ` and ${skills.length - 5} more skills` : ''}.`
                              : 'No matched skills identified.'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill: string, index: number) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {skill}
                              </span>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </TabsContent>
                
                <TabsContent value="gaps" className="m-0 pt-4">
                  <ul className="divide-y divide-slate-100">
                    {/* Original gaps */}
                    {data.gaps.map((gap, index) => (
                      <li key={`gap-${index}`} className="py-3 px-6 flex items-start hover:bg-slate-50">
                        <div className="mr-3 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-amber-600" />
                          </div>
                        </div>
                        <span className="text-slate-700">{gap}</span>
                      </li>
                    ))}
                    {/* Critical gaps from risk analysis */}
                    {riskAdjustments?.critical_gaps?.map((gap, index) => (
                      <li key={`critical-${index}`} className="py-3 px-6 flex items-start hover:bg-red-50">
                        <div className="mr-3 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-red-600" />
                          </div>
                        </div>
                        <span className="text-red-700">{gap}</span>
                      </li>
                    ))}
                    {/* Risk flags */}
                    {riskAdjustments?.risk_flags?.map((flag, index) => (
                      <li key={`risk-${index}`} className="py-3 px-6 flex items-start hover:bg-amber-50">
                        <div className="mr-3 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                          </div>
                        </div>
                        <span className="text-amber-700">{flag}</span>
                      </li>
                    ))}
                    {/* Missing must-have skills - show all in one line */}
                    {missingMustHave && missingMustHave.length > 0 && (
                      <li key="missing-skills" className="py-3 px-6 flex items-start hover:bg-orange-50">
                        <div className="mr-3 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-orange-600" />
                          </div>
                        </div>
                        <span className="text-orange-700">Missing skills: {missingMustHave.join(', ')}</span>
                      </li>
                    )}
                  </ul>
                  {/* Score cap warning */}
                  {riskAdjustments?.score_cap_applied && (
                    <div className="mx-6 my-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Score Capped at {riskAdjustments.score_cap_applied} due to risk factors
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
