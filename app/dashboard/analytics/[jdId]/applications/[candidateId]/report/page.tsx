"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, FileText, MessageSquare, Download, Mail, Phone, Calendar, ExternalLink, Star, Briefcase, ChevronDown, CheckCircle2, TrendingUp, Target, Award, BarChart3, HelpCircle, Lightbulb, AlertTriangle, Zap, Brain, Users, MessageCircle, Code, Globe, DollarSign, Link as LinkIcon, XCircle, CheckCircle } from "lucide-react"
import { CVEvaluationReport } from "@/components/cv-evaluation-report"
// Dynamic import for html2pdf to avoid TypeScript issues
const html2pdf = () => import('html2pdf.js')

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
  languages?: Array<{ language: string; proficiency: string }>
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

type EvaluationBreakdownItem = {
  category: string
  score: number
  weight: number
  details: string[]
  isGrid?: boolean
  gridData?: Array<{
    label: string
    value: string
  }>
  fullMatchedSkills?: string[]
  fullMissingSkills?: string[]
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

const parseConversationTranscript = (text: string): Array<{role: 'agent' | 'candidate', text: string}> => {
  if (!text || typeof text !== 'string') return []
  
  const lines = text.split('\n').filter(line => line.trim())
  const messages: Array<{role: 'agent' | 'candidate', text: string}> = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // Detect role based on common patterns
    let role: 'agent' | 'candidate' = 'candidate'
    let messageText = trimmedLine
    
    // Check for Agent patterns
    if (trimmedLine.startsWith('[Agent]') || 
        trimmedLine.startsWith('Agent:') || 
        trimmedLine.match(/^(Olivia|AI Agent|interviewer):/i)) {
      role = 'agent'
      // Remove the role prefix
      messageText = trimmedLine.replace(/^\[(Agent|Olivia|AI Agent|interviewer)\]:?\s*/i, '')
                           .replace(/^(Agent|Olivia|AI Agent|interviewer):\s*/i, '')
    }
    // Check for Candidate patterns  
    else if (trimmedLine.startsWith('[You]') || 
             trimmedLine.startsWith('You:') || 
             trimmedLine.startsWith('[') ||
             trimmedLine.match(/^(candidate|user):/i)) {
      role = 'candidate'
      // Remove the role prefix
      messageText = trimmedLine.replace(/^\[(You|candidate|user)\]:?\s*/i, '')
                           .replace(/^(You|candidate|user):\s*/i, '')
    }
    // If no clear pattern, try to infer from content
    else {
      // Questions typically end with ? and are from agent
      if (trimmedLine.includes('?') && trimmedLine.length > 10) {
        role = 'agent'
      }
      // Short answers are typically from candidate
      else if (trimmedLine.length < 100 && !trimmedLine.includes('?')) {
        role = 'candidate'
      }
    }
    
    if (messageText.trim()) {
      messages.push({ role, text: messageText.trim() })
    }
  }
  
  return messages
}

export default function CandidateReportPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const jdId = (params?.jdId as string) || ""
  const candidateId = (params?.candidateId as string) || ""
  const reportRef = useRef<HTMLDivElement>(null)

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [expandedSkillSetMatch, setExpandedSkillSetMatch] = useState(false)

  // Download report as PDF
  const downloadReport = async () => {
    if (!reportRef.current) return

    try {
      // Enable PDF mode to show all tabs
      setIsGeneratingPDF(true)
      
      // Wait for state update and DOM to render
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const html2pdfModule = await html2pdf()
      const element = reportRef.current
      const opt = {
        margin: 10,
        filename: `${candidate?.name || 'Report'}_Evaluation_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }

      await html2pdfModule.default().set(opt).from(element).save()
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback: show alert if PDF generation fails
      alert('PDF generation failed. Please try again.')
    } finally {
      // Disable PDF mode
      setIsGeneratingPDF(false)
    }
  }

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
        console.log('🎯 QualificationDetails received:', JSON.stringify(json.qualificationDetails, null, 2))
        
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

  // Calculate weighted score from breakdown - matches backend logic exactly
  const calculateWeightedScore = (breakdown: any): number => {
    if (!breakdown) {
      console.log('[Score Calc] No breakdown data available')
      return 0
    }
    
    const categories = [
      { key: 'skill_set_match', weight: 30 },
      { key: 'missed_skills_analysis', weight: 10 },
      { key: 'skills_in_recent_projects', weight: 15 },
      { key: 'experience_range_match', weight: 15 },
      { key: 'location_match', weight: 5 },
      { key: 'written_communication', weight: 5 },
      { key: 'education_qualification', weight: 10 },
      { key: 'certifications_match', weight: 5 },
      { key: 'language_skills', weight: 2 },
      { key: 'nationality_match', weight: 1 },
      { key: 'profile_quality', weight: 2 },
    ]
    
    console.log('[Score Calc] Starting weighted score calculation...')
    let totalScore = 0
    let totalWeight = 0
    
    categories.forEach(cat => {
      const categoryData = breakdown[cat.key]
      if (categoryData && typeof categoryData.score === 'number') {
        const contribution = (categoryData.score * cat.weight) / 100
        totalScore += contribution
        totalWeight += cat.weight
        console.log(`[Score Calc] ${cat.key}: score=${categoryData.score}, weight=${cat.weight}%, contribution=${contribution.toFixed(2)}`)
      } else {
        console.log(`[Score Calc] ${cat.key}: MISSING or invalid`)
      }
    })
    
    const finalScore = Math.round(totalScore)
    console.log(`[Score Calc] ✅ Total weighted score: ${totalScore.toFixed(2)} → Rounded: ${finalScore}`)
    console.log(`[Score Calc] Total weight used: ${totalWeight}%`)
    
    return finalScore
  }

  // Prefer evaluation score; fall back to DB score only if evaluation missing
  const overallScore = ((evaluation?.overallScore ?? null) !== null)
    ? (evaluation!.overallScore as number)
    : (typeof dbScore === 'number' ? dbScore : null)
  
  // Resume/Qualification score priority:
  // 1. Use DB score first (always show resume score from database)
  // 2. Use AI-calculated score from qualificationDetails.overall.score_percent (authoritative)
  // 3. Calculate from breakdown
  // 4. Finally use 0
  const resumeScore = (() => {
    // First priority: DB score (resume score from database)
    if (typeof dbScore === 'number') {
      console.log('[Score Calc] Using DB score for resume:', dbScore)
      return dbScore
    }
    
    // Second priority: AI-calculated score from overall
    if (qualificationDetails?.overall?.score_percent != null) {
      const aiScore = Math.round(qualificationDetails.overall.score_percent)
      console.log('[Score Calc] Using AI-calculated score from overall:', aiScore)
      return aiScore
    }
    
    // Third priority: Calculate from breakdown
    if (qualificationDetails?.breakdown) {
      const calculatedScore = calculateWeightedScore(qualificationDetails.breakdown)
      console.log('[Score Calc] Using calculated score from breakdown:', calculatedScore)
      return calculatedScore
    }
    
    // Last resort
    console.log('[Score Calc] No score available, using 0')
    return 0
  })()
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

          {/* Title and Download Report Button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-purple-600">
              Interview with {candidateData.name} {jobTitle && `for ${jobTitle}`}
            </h1>
            <Button 
              onClick={downloadReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>

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
      <div className="px-4 md:px-6 py-6 bg-gradient-to-b from-gray-50/60 via-white to-gray-50/40" ref={reportRef}>
        {/* Candidate Tab Content */}
        {activeTab === "candidate" && qualificationDetails && (
          <div className="mt-6">
            <CVEvaluationReport 
              expandedSkillSetMatch={expandedSkillSetMatch}
              onToggleSkillSetMatch={setExpandedSkillSetMatch}
              candidateLocation={candidate?.location}
              data={{
                candidateName: qualificationDetails.extracted?.name || candidateData.name,
                role: jobTitle || 'N/A',
                experience: qualificationDetails.extracted?.total_experience_years_estimate 
                  ? `${qualificationDetails.extracted.total_experience_years_estimate} yrs` 
                  : 'N/A',
                overallScore: resumeScore,
                interviewScore: evaluation?.overallScore ? (evaluation.overallScore as number) : 0,
                resumeUrl: candidateData.resumeUrl,
                qualified: resumeScore >= 60,
                keyMetrics: {
                  skillsMatch: qualificationDetails.breakdown?.skill_set_match?.score || 75,
                  domainKnowledge: qualificationDetails.breakdown?.profile_quality?.score || 70,
                  communication: qualificationDetails.breakdown?.written_communication?.score || 90,
                  problemSolving: qualificationDetails.breakdown?.skills_in_recent_projects?.score || 80,
                },
                strengths: [
                  ...(qualificationDetails.breakdown?.skill_set_match?.matched_skills?.slice(0, 3).map((skill: string) => 
                    `Strong proficiency in ${skill}`
                  ) || []),
                  ...(qualificationDetails.breakdown?.skill_set_match?.score >= 70 
                    ? ['Excellent skill set match with job requirements'] 
                    : []),
                  ...(qualificationDetails.breakdown?.experience_range_match?.years_actual >= 3 
                    ? [`Solid experience of ${qualificationDetails.breakdown.experience_range_match.years_actual} years`] 
                    : qualificationDetails.extracted?.total_experience_years_estimate >= 3
                    ? [`Solid experience of ${qualificationDetails.extracted.total_experience_years_estimate} years`]
                    : []),
                  ...(qualificationDetails.breakdown?.written_communication?.score >= 85
                    ? ['Professional CV with excellent communication']
                    : []),
                ],
                gaps: [
                  ...(qualificationDetails.breakdown?.skill_set_match?.missing_skills?.slice(0, 3).map((skill: string) => 
                    `Missing experience with ${skill}`
                  ) || []),
                  ...(qualificationDetails.breakdown?.missed_skills_analysis?.critical_missing?.slice(0, 2).map((skill: string) =>
                    `Critical skill gap: ${skill}`
                  ) || []),
                  ...(qualificationDetails.gaps_and_notes?.slice(0, 2) || []),
                ],
                matchedSkills: (qualificationDetails.breakdown?.skill_set_match?.matched_skills || []).map((skill: string) => ({
                  name: skill,
                  score: qualificationDetails.breakdown?.skill_set_match?.score || 85,
                })),
                missingSkills: qualificationDetails.breakdown?.skill_set_match?.missing_skills || [],
                recommendation: resumeScore >= 60 
                  ? '✅ Qualified - The candidate demonstrates strong relevant experience and meets the requirements. Recommended to proceed to next round.'
                  : '❌ Not Qualified - The candidate does not meet the minimum requirements for this role.',
                candidateProfile: {
                  university: 'non-targeted' as const,
                  educationList: (qualificationDetails.extracted?.education || [])
                    .filter((edu: any) => edu?.institution || edu?.degree)
                    .map((edu: any) => ({
                      institution: edu?.institution || '',
                      degree: edu?.degree || ''
                    })),
                  employer: 'targeted' as const,
                  experience: qualificationDetails.extracted?.total_experience_years_estimate || 4,
                  hasRelevantExperience: true,
                },
                extractedInfo: {
                  name: qualificationDetails.extracted?.name || candidateData.name,
                  email: qualificationDetails.extracted?.email || candidateData.email,
                  phone: qualificationDetails.extracted?.phone || candidateData.phone,
                  totalExperience: qualificationDetails.extracted?.total_experience_years_estimate 
                    ? `${qualificationDetails.extracted.total_experience_years_estimate} years` 
                    : 'N/A',
                  skills: qualificationDetails.extracted?.skills || [],
                  notes: qualificationDetails.gaps_and_notes || [],
                  workExperience: qualificationDetails.extracted?.work_experience || [],
                },
                evaluationBreakdown: ([] as EvaluationBreakdownItem[]).concat([
                  {
                    category: 'Skill Set Match',
                    score: qualificationDetails.breakdown?.skill_set_match?.score || 75,
                    weight: qualificationDetails.breakdown?.skill_set_match?.weight || 30,
                    isGrid: true,
                    fullMatchedSkills: qualificationDetails.breakdown?.skill_set_match?.matched_skills || [],
                    fullMissingSkills: qualificationDetails.breakdown?.skill_set_match?.missing_skills || [],
                    gridData: (() => {
                      const matchedSkills = qualificationDetails.breakdown?.skill_set_match?.matched_skills || []
                      const missingSkills = qualificationDetails.breakdown?.skill_set_match?.missing_skills || []
                      const matchedCount = matchedSkills.length
                      const missingCount = missingSkills.length
                      const totalSkills = matchedCount + missingCount
                      
                      return [
                        {
                          label: `✓ Matched Skills (${matchedCount})`,
                          value: matchedSkills.length > 0 
                            ? matchedSkills.slice(0, 6).join(', ')
                            : 'None'
                        },
                        {
                          label: `✗ Missing Skills (${missingCount})`,
                          value: missingSkills.length > 0 
                            ? missingSkills.slice(0, 6).join(', ')
                            : 'None'
                        },
                        {
                          label: 'Match Percentage',
                          value: `${qualificationDetails.breakdown?.skill_set_match?.match_percentage || (totalSkills > 0 ? Math.round((matchedCount / totalSkills) * 100) : 0)}%`
                        },
                        {
                          label: 'Skills Summary',
                          value: `${matchedCount} matched / ${totalSkills} total required`
                        }
                      ]
                    })(),
                    details: [
                      ...(qualificationDetails.breakdown?.skill_set_match?.evidence && qualificationDetails.breakdown.skill_set_match.evidence.length > 0 ? qualificationDetails.breakdown.skill_set_match.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Skills in Recent Projects',
                    score: qualificationDetails.breakdown?.skills_in_recent_projects?.score || 80,
                    weight: qualificationDetails.breakdown?.skills_in_recent_projects?.weight || 15,
                    isGrid: true,
                    gridData: [
                      {
                        label: 'Recent Skills Used',
                        value: (qualificationDetails.breakdown?.skills_in_recent_projects?.recent_skills_used || []).join(', ') || 'Not specified'
                      },
                      {
                        label: 'Projects Analyzed',
                        value: `${qualificationDetails.breakdown?.skills_in_recent_projects?.projects_analyzed || 0} projects`
                      },
                      {
                        label: 'Skill Relevance',
                        value: 'High' // Can be enhanced based on data
                      },
                      {
                        label: 'Experience Depth',
                        value: 'Verified' // Can be enhanced based on data
                      }
                    ],
                    details: [
                      ...(qualificationDetails.breakdown?.skills_in_recent_projects?.evidence && qualificationDetails.breakdown.skills_in_recent_projects.evidence.length > 0 ? qualificationDetails.breakdown.skills_in_recent_projects.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Experience Range Match',
                    score: qualificationDetails.breakdown?.experience_range_match?.score || 85,
                    weight: qualificationDetails.breakdown?.experience_range_match?.weight || 15,
                    isGrid: true,
                    gridData: [
                      {
                        label: 'Actual Experience',
                        value: `${qualificationDetails.breakdown?.experience_range_match?.years_actual !== null && qualificationDetails.breakdown?.experience_range_match?.years_actual !== undefined ? qualificationDetails.breakdown.experience_range_match.years_actual : qualificationDetails.extracted?.total_experience_years_estimate || 'N/A'} years`
                      },
                      {
                        label: 'Required Experience',
                        value: `${qualificationDetails.breakdown?.experience_range_match?.years_required || 'Not specified'} years`
                      },
                      {
                        label: 'Match Level',
                        value: qualificationDetails.breakdown?.experience_range_match?.match_level || 'Not specified'
                      },
                      {
                        label: 'Experience Status',
                        value: (qualificationDetails.breakdown?.experience_range_match?.years_actual || 0) >= (parseInt(qualificationDetails.breakdown?.experience_range_match?.years_required || '0') || 0) ? '✓ Meets Requirement' : '✗ Below Requirement'
                      }
                    ],
                    details: [
                      ...(qualificationDetails.breakdown?.experience_range_match?.evidence && qualificationDetails.breakdown.experience_range_match.evidence.length > 0 ? qualificationDetails.breakdown.experience_range_match.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Location Match',
                    score: qualificationDetails.breakdown?.location_match?.score || 50,
                    weight: qualificationDetails.breakdown?.location_match?.weight || 5,
                    isGrid: true,
                    gridData: (() => {
                      const candidateLocation = candidate?.location || qualificationDetails.breakdown?.location_match?.candidate_location || qualificationDetails.extracted?.location || 'Not specified'
                      const jobLocation = qualificationDetails.breakdown?.location_match?.job_location || 'Not specified'
                      
                      // Extract city name from location (first part before comma)
                      const extractCity = (loc: string) => {
                        if (loc === 'Not specified') return ''
                        return loc.split(',')[0].trim().toLowerCase()
                      }
                      
                      // Fuzzy match: check if cities are similar (handles typos)
                      const candidateCity = extractCity(candidateLocation)
                      const jobCity = extractCity(jobLocation)
                      
                      const isSimilar = (str1: string, str2: string) => {
                        if (!str1 || !str2) return false
                        // Exact match
                        if (str1 === str2) return true
                        // Check if one is substring of other (handles typos)
                        if (str1.includes(str2) || str2.includes(str1)) return true
                        // Levenshtein distance for typo tolerance (simple version)
                        const len = Math.max(str1.length, str2.length)
                        let diff = 0
                        for (let i = 0; i < len; i++) {
                          if (str1[i] !== str2[i]) diff++
                        }
                        // Allow up to 2 character differences for typos
                        return diff <= 2
                      }
                      
                      const isMatch = candidateLocation !== 'Not specified' && jobLocation !== 'Not specified' && isSimilar(candidateCity, jobCity)
                      
                      return [
                        {
                          label: 'Candidate Location',
                          value: candidateLocation
                        },
                        {
                          label: 'Job Location',
                          value: jobLocation
                        },
                        {
                          label: 'Remote Possible',
                          value: qualificationDetails.breakdown?.location_match?.remote_possible ? '✓ Yes' : '✗ No'
                        },
                        {
                          label: 'Location Status',
                          value: isMatch ? '✓ Match' : '⚠ Different'
                        }
                      ]
                    })(),
                    details: [
                      ...(qualificationDetails.breakdown?.location_match?.evidence && qualificationDetails.breakdown.location_match.evidence.length > 0 ? qualificationDetails.breakdown.location_match.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Written Communication',
                    score: qualificationDetails.breakdown?.written_communication?.score || 90,
                    weight: qualificationDetails.breakdown?.written_communication?.weight || 5,
                    isGrid: true,
                    gridData: [
                      {
                        label: 'Grammar Score',
                        value: `${qualificationDetails.breakdown?.written_communication?.grammar_score || 0}/100`
                      },
                      {
                        label: 'Structure Score',
                        value: `${qualificationDetails.breakdown?.written_communication?.structure_score || 0}/100`
                      },
                      {
                        label: 'Formatting Score',
                        value: `${qualificationDetails.breakdown?.written_communication?.formatting_score || 0}/100`
                      },
                      {
                        label: 'Issues Found',
                        value: (qualificationDetails.breakdown?.written_communication?.issues || []).length > 0 ? (qualificationDetails.breakdown?.written_communication?.issues || []).join(', ') : '✓ None'
                      }
                    ],
                    details: [
                      ...(qualificationDetails.breakdown?.written_communication?.evidence && qualificationDetails.breakdown.written_communication.evidence.length > 0 ? qualificationDetails.breakdown.written_communication.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Education Qualification',
                    score: qualificationDetails.breakdown?.education_qualification?.score || 80,
                    weight: qualificationDetails.breakdown?.education_qualification?.weight || 10,
                    isGrid: true,
                    gridData: [
                      {
                        label: 'Candidate Degree',
                        value: qualificationDetails.breakdown?.education_qualification?.candidate_degree || 'Not specified'
                      },
                      {
                        label: 'Required Degree',
                        value: qualificationDetails.breakdown?.education_qualification?.required_degree || 'Not specified'
                      },
                      {
                        label: 'Field Match',
                        value: qualificationDetails.breakdown?.education_qualification?.field_match ? '✓ Yes' : '✗ No'
                      },
                      {
                        label: 'Institution Rank',
                        value: qualificationDetails.breakdown?.education_qualification?.institution_rank || 'Not specified'
                      }
                    ],
                    details: [
                      ...(qualificationDetails.breakdown?.education_qualification?.evidence && qualificationDetails.breakdown.education_qualification.evidence.length > 0 ? qualificationDetails.breakdown.education_qualification.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Certifications',
                    score: qualificationDetails.breakdown?.certifications_match?.score || 70,
                    weight: qualificationDetails.breakdown?.certifications_match?.weight || 5,
                    isGrid: true,
                    gridData: [
                      {
                        label: '✓ Matched Certs',
                        value: (qualificationDetails.breakdown?.certifications_match?.matched_certs || []).join(', ') || 'None'
                      },
                      {
                        label: '✗ Missing Certs',
                        value: (qualificationDetails.breakdown?.certifications_match?.missing_certs || []).join(', ') || 'None'
                      },
                      {
                        label: '⏰ Expired Certs',
                        value: (qualificationDetails.breakdown?.certifications_match?.expired_certs || []).join(', ') || 'None'
                      },
                      {
                        label: 'Cert Status',
                        value: (qualificationDetails.breakdown?.certifications_match?.matched_certs || []).length > 0 ? '✓ Has Required' : '✗ Missing'
                      }
                    ],
                    details: [
                      ...(qualificationDetails.breakdown?.certifications_match?.evidence && qualificationDetails.breakdown.certifications_match.evidence.length > 0 ? qualificationDetails.breakdown.certifications_match.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Language Skills',
                    score: qualificationDetails.breakdown?.language_skills?.score || 95,
                    weight: qualificationDetails.breakdown?.language_skills?.weight || 2,
                    isGrid: true,
                    gridData: (() => {
                      // Prioritize languages from application form, fallback to resume-extracted languages
                      const applicationLanguages = candidate?.languages || []
                      const resumeLanguages = qualificationDetails.breakdown?.language_skills?.matched_languages || []
                      const langs = applicationLanguages.length > 0 ? applicationLanguages : resumeLanguages
                      
                      const proficiencyLabels: Record<string, string> = {
                        'native': 'Native / Bilingual',
                        'fluent': 'Fluent',
                        'advanced': 'Advanced',
                        'intermediate': 'Intermediate',
                        'basic': 'Basic'
                      }
                      
                      return [
                        {
                          label: 'Known Languages',
                          value: langs.length > 0 
                            ? langs.map((l: any) => l.language).join(', ')
                            : 'Not specified'
                        },
                        {
                          label: 'Proficiency Levels',
                          value: langs.length > 0 
                            ? langs.map((l: any) => proficiencyLabels[l.proficiency] || l.proficiency || 'N/A').join(', ')
                            : 'Not specified'
                        },
                        {
                          label: 'Language Details',
                          value: langs.length > 0 
                            ? langs.map((l: any) => `${l.language} (${proficiencyLabels[l.proficiency] || l.proficiency || 'N/A'})`).join(', ')
                            : 'No languages specified'
                        },
                        {
                          label: 'Status',
                          value: langs.length > 0 ? '✓ Languages Provided' : '⚠ No languages specified'
                        }
                      ]
                    })(),
                    details: [
                      ...(qualificationDetails.breakdown?.language_skills?.evidence && qualificationDetails.breakdown.language_skills.evidence.length > 0 ? qualificationDetails.breakdown.language_skills.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                  {
                    category: 'Profile Quality',
                    score: qualificationDetails.breakdown?.profile_quality?.score || 75,
                    weight: qualificationDetails.breakdown?.profile_quality?.weight || 2,
                    isGrid: true,
                    gridData: [
                      {
                        label: 'Education Rank',
                        value: qualificationDetails.breakdown?.profile_quality?.education_rank || 'Not specified'
                      },
                      {
                        label: 'Employer Rank',
                        value: qualificationDetails.breakdown?.profile_quality?.employer_rank || 'Not specified'
                      },
                      {
                        label: 'Industry Relevance',
                        value: qualificationDetails.breakdown?.profile_quality?.industry_relevance || 'Not specified'
                      },
                      {
                        label: 'Overall Quality',
                        value: qualificationDetails.breakdown?.profile_quality?.score >= 80 ? '✓ Excellent' : qualificationDetails.breakdown?.profile_quality?.score >= 60 ? '⚠ Good' : '✗ Fair'
                      }
                    ],
                    details: [
                      ...(qualificationDetails.breakdown?.profile_quality?.evidence && qualificationDetails.breakdown.profile_quality.evidence.length > 0 ? qualificationDetails.breakdown.profile_quality.evidence : []),
                    ].filter(d => d && !d.includes('undefined')),
                  },
                ]),
              }}
              isGeneratingPDF={isGeneratingPDF}
            />
          </div>
        )}
        {activeTab === "candidate" && !qualificationDetails && (
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
                    {/* Only show Interview Score when interview evaluation exists */}
                    {evaluation?.overallScore && (
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-orange-500 fill-orange-500 mt-0.5" />
                        <div>
                          <div className="text-xs text-gray-700">Interview Score</div>
                          <div className="text-base font-semibold text-gray-900">{overallScoreDisplay}</div>
                        </div>
                      </div>
                    )}
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
                      {evaluation?.overallScore && (
                        <div>
                          <div className="text-gray-500">Interview Score</div>
                          <div className="font-semibold text-gray-900">{overallScoreDisplay}</div>
                        </div>
                      )}
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

        {/* Evaluation Tab Content - Redesigned with Criteria-Based Flow */}
        {activeTab === "evaluation" && (
          <div className="mt-6 space-y-6">
            {evaluation ? (
              <>
                {/* ===== SECTION 1: Overall Score Hero Card ===== */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                            <div className="text-center">
                              <div className="text-4xl font-bold">{overallScoreDisplay.split('/')[0]}</div>
                              <div className="text-sm opacity-80">out of 100</div>
                            </div>
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                            {(evaluation as any).overallScore >= 65 ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="h-6 w-6 text-orange-500" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold mb-2">Interview Evaluation</h2>
                          <p className="text-emerald-100 text-sm max-w-md">
                            Score calculated based on all {(evaluation as any).marks_summary?.total_interview_questions || (evaluation as any).questions?.length || 10} configured questions
                          </p>
                          {(evaluation as any).marks_summary && (
                            <div className="flex gap-4 mt-2 text-xs text-emerald-200">
                              <span>Questions Asked: {(evaluation as any).marks_summary.questions_asked || (evaluation as any).questions?.length || 0}</span>
                              <span>|</span>
                              <span>Answered: {(evaluation as any).marks_summary.questions_answered || 0}</span>
                            </div>
                          )}
                          <div className="mt-3">
                            {getDecisionBadge(evaluationData!.decision)}
                          </div>
                        </div>
                      </div>
                      <div className="text-center md:text-right">
                        <div className="text-sm opacity-80 mb-1">Recommendation</div>
                        <div className="text-xl font-semibold">
                          {(evaluation as any).overallScore >= 60 ? 'Hire' : 'Not Hire'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ===== SECTION 2: Evaluation Flow Explanation - REMOVED AS REQUESTED ===== */}
                {/* This section was removed per user request */}

                {/* ===== SECTION 3: Criteria Breakdown with Weights ===== */}
                <Card className="border-2 border-gray-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                      Criteria-Based Score Breakdown
                    </CardTitle>
                    <CardDescription>Only criteria with questions asked are included in the final score</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {(() => {
                      // Get criteria breakdown from evaluation
                      const evalAny = evaluation as any
                      const criteriaBreakdown = evalAny.criteriaBreakdown || {}
                      const categoriesUsed = evalAny.categoriesUsed || Object.keys(criteriaBreakdown)
                      const categoriesNotUsed = evalAny.categoriesNotUsed || []
                      const questions = evalAny.questions || []
                      
                      // Calculate criteria from questions if not available
                      const criteriaFromQuestions: Record<string, { count: number, totalScore: number, questions: any[] }> = {}
                      questions.forEach((q: any) => {
                        const criteria = q.criteria || q.category || 'General'
                        if (!criteriaFromQuestions[criteria]) {
                          criteriaFromQuestions[criteria] = { count: 0, totalScore: 0, questions: [] }
                        }
                        criteriaFromQuestions[criteria].count++
                        criteriaFromQuestions[criteria].totalScore += (q.score || q.marks_obtained || 0)
                        criteriaFromQuestions[criteria].questions.push(q)
                      })
                      
                      const totalQuestions = questions.length || 1
                      const criteriaList = Object.keys(criteriaBreakdown).length > 0 
                        ? Object.keys(criteriaBreakdown) 
                        : Object.keys(criteriaFromQuestions)
                      
                      const getCriteriaIcon = (criteria: string) => {
                        const icons: Record<string, any> = {
                          'Technical Skills': <Code className="h-5 w-5" />,
                          'Technical': <Code className="h-5 w-5" />,
                          'Communication': <MessageCircle className="h-5 w-5" />,
                          'Problem Solving': <Brain className="h-5 w-5" />,
                          'Cultural Fit': <Users className="h-5 w-5" />,
                          'Culture': <Users className="h-5 w-5" />
                        }
                        return icons[criteria] || <Target className="h-5 w-5" />
                      }
                      
                      const getCriteriaColor = (criteria: string) => {
                        const colors: Record<string, { bg: string, border: string, text: string, bar: string }> = {
                          'Technical Skills': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500' },
                          'Technical': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500' },
                          'Communication': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-500' },
                          'Problem Solving': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', bar: 'bg-purple-500' },
                          'Cultural Fit': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
                          'Culture': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' }
                        }
                        return colors[criteria] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', bar: 'bg-gray-500' }
                      }
                      
                      return (
                        <div className="space-y-6">
                          {/* Criteria Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {criteriaList.map((criteria, idx) => {
                              const breakdown = criteriaBreakdown[criteria] || {}
                              const fromQuestions = criteriaFromQuestions[criteria] || { count: 0, totalScore: 0 }
                              const questionCount = breakdown.question_count || fromQuestions.count || 0
                              const avgScore = breakdown.average_score || (fromQuestions.count > 0 ? Math.round(fromQuestions.totalScore / fromQuestions.count) : 0)
                              const weightPct = breakdown.weight_percentage || Math.round((questionCount / totalQuestions) * 100)
                              const contribution = breakdown.weighted_contribution || Math.round(avgScore * (questionCount / totalQuestions))
                              const colors = getCriteriaColor(criteria)
                              
                              return (
                                <div key={idx} className={`p-5 rounded-xl border-2 ${colors.border} ${colors.bg} transition-all hover:shadow-md`}>
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg bg-white shadow-sm ${colors.text}`}>
                                        {getCriteriaIcon(criteria)}
                                      </div>
                                      <div>
                                        <h4 className={`font-semibold ${colors.text}`}>{criteria}</h4>
                                        <p className="text-xs text-gray-500">{questionCount} question{questionCount !== 1 ? 's' : ''} evaluated</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-2xl font-bold ${colors.text}`}>{avgScore}</div>
                                      <div className="text-xs text-gray-500">avg score</div>
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="mb-3">
                                    <div className="w-full bg-white rounded-full h-3 shadow-inner">
                                      <div
                                        className={`h-3 rounded-full ${colors.bar} transition-all duration-500`}
                                        style={{ width: `${avgScore}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Weight & Contribution */}
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">
                                      <span className="font-medium">Weight:</span> {weightPct}%
                                    </span>
                                    <span className={`font-semibold ${colors.text}`}>
                                      Contributes: +{contribution} pts
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Categories Not Used */}
                          {categoriesNotUsed.length > 0 && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">Criteria Not Evaluated</span>
                              </div>
                              <p className="text-xs text-gray-500">
                                The following criteria were not included in the final score because no questions were asked for them:
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {categoriesNotUsed.map((cat: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="bg-white text-gray-500">
                                    {cat} (0%)
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Final Score Calculation - REMOVED AS REQUESTED */}
                          {/* This section was removed per user request */}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* ===== SECTION 4: Question-by-Question Breakdown ===== */}
                <Card className="border-2 border-gray-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-indigo-600" />
                      Question-by-Question Evaluation
                    </CardTitle>
                    <CardDescription>Each question mapped to its criteria with detailed scoring</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {(() => {
                      const evalAny = evaluation as any
                      const questions = evalAny.questions || []
                      
                      if (questions.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <HelpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No detailed question breakdown available</p>
                          </div>
                        )
                      }
                      
                      const getCriteriaColor = (criteria: string) => {
                        const colors: Record<string, { bg: string, border: string, text: string, badge: string }> = {
                          // Technical criteria (blue)
                          'Technical Skills': { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
                          'Technical': { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
                          // Communication criteria (green)
                          'Communication': { bg: 'bg-green-50', border: 'border-l-green-500', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
                          // Problem Solving criteria (purple)
                          'Problem Solving': { bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
                          // Cultural Fit criteria (orange)
                          'Cultural Fit': { bg: 'bg-orange-50', border: 'border-l-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
                          'Culture Fit': { bg: 'bg-orange-50', border: 'border-l-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
                          'Culture': { bg: 'bg-orange-50', border: 'border-l-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
                          // Team Player criteria (teal/cyan)
                          'Team Player': { bg: 'bg-teal-50', border: 'border-l-teal-500', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' },
                          'Teamwork': { bg: 'bg-teal-50', border: 'border-l-teal-500', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' },
                          // Leadership criteria (indigo)
                          'Leadership': { bg: 'bg-indigo-50', border: 'border-l-indigo-500', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
                          // Adaptability criteria (amber)
                          'Adaptability': { bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
                          // Experience criteria (slate)
                          'Experience': { bg: 'bg-slate-50', border: 'border-l-slate-500', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' },
                          // Behavioral criteria (rose)
                          'Behavioral': { bg: 'bg-rose-50', border: 'border-l-rose-500', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' }
                        }
                        return colors[criteria] || { bg: 'bg-gray-50', border: 'border-l-gray-500', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' }
                      }
                      
                      const getScoreStatus = (score: number, maxScore: number = 100) => {
                        const pct = (score / maxScore) * 100
                        if (pct >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' }
                        if (pct >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' }
                        if (pct >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
                        return { label: 'Needs Work', color: 'text-red-600', bg: 'bg-red-100' }
                      }
                      
                      return (
                        <div className="space-y-4">
                          {questions.map((q: any, idx: number) => {
                            const criteria = q.criteria || q.category || 'General'
                            const colors = getCriteriaColor(criteria)
                            const score = q.score || q.marks_obtained || 0
                            const maxScore = q.max_score || q.max_marks || 100
                            const status = getScoreStatus(score, maxScore)
                            const answered = q.answered !== false
                            
                            return (
                              <div key={idx} className={`rounded-xl border-l-4 ${colors.border} ${colors.bg} p-5 transition-all hover:shadow-md`}>
                                {/* Question Header */}
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-gray-600">
                                      {q.question_number || idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 leading-snug">
                                        {q.question_text || q.question || 'Question not available'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={colors.badge}>
                                      {criteria}
                                    </Badge>
                                    {!answered && (
                                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                        Not Answered
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Criteria Reasoning - Why this question belongs to this criterion */}
                                {q.criteria_reasoning && (
                                  <div className="mb-3 -mt-1">
                                    <div className={`text-xs ${colors.text} opacity-80 flex items-center gap-1 italic`}>
                                      <Target className="h-3 w-3" /> 
                                      <span className="font-medium">Why {criteria}:</span> {q.criteria_reasoning}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Score Display */}
                                <div className="flex items-center gap-4 mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`text-3xl font-bold ${answered ? colors.text : 'text-gray-400'}`}>
                                      {score}
                                    </div>
                                    <div className="text-gray-400">/</div>
                                    <div className="text-lg text-gray-500">{maxScore}</div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="w-full bg-white rounded-full h-2 shadow-inner">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-500 ${answered ? (score >= maxScore * 0.8 ? 'bg-green-500' : score >= maxScore * 0.6 ? 'bg-blue-500' : score >= maxScore * 0.4 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-gray-300'}`}
                                        style={{ width: `${(score / maxScore) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                  <Badge className={`${status.bg} ${status.color}`}>
                                    {status.label}
                                  </Badge>
                                </div>
                                
                                {/* Candidate Response */}
                                {(q.candidate_response || q.answer) && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                      <MessageCircle className="h-3 w-3" /> Candidate Response
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                                      {q.candidate_response || q.answer || 'No response recorded'}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Evaluation Reasoning */}
                                {(q.evaluation_reasoning || q.feedback) && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                      <Brain className="h-3 w-3" /> Evaluation Reasoning
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-600">
                                      {q.evaluation_reasoning || q.feedback}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Strengths & Gaps in Answer */}
                                {((q.strengths_in_answer && q.strengths_in_answer.length > 0) || (q.gaps_in_answer && q.gaps_in_answer.length > 0)) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.strengths_in_answer && q.strengths_in_answer.length > 0 && (
                                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                        <div className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" /> Strengths
                                        </div>
                                        <ul className="space-y-1">
                                          {q.strengths_in_answer.map((s: string, sIdx: number) => (
                                            <li key={sIdx} className="text-xs text-green-800 flex items-start gap-1">
                                              <span className="text-green-500">✓</span> {s}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {q.gaps_in_answer && q.gaps_in_answer.length > 0 && (
                                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                        <div className="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3" /> Gaps
                                        </div>
                                        <ul className="space-y-1">
                                          {q.gaps_in_answer.map((g: string, gIdx: number) => (
                                            <li key={gIdx} className="text-xs text-orange-800 flex items-start gap-1">
                                              <span className="text-orange-500">•</span> {g}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* ===== SECTION 5: Strengths & Areas for Improvement ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths Card */}
                  {evaluationData!.strengths.length > 0 && (
                    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-green-800 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          Key Strengths
                        </CardTitle>
                        <CardDescription className="text-green-600">Areas where candidate excels</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {evaluationData!.strengths.map((strength, idx) => {
                            const strengthObj = typeof strength === 'string' 
                              ? { point: strength } 
                              : strength as any
                            
                            return (
                              <div key={idx} className="p-3 bg-white rounded-lg border border-green-200 hover:border-green-400 transition-all hover:shadow-sm">
                                <div className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">{strengthObj.point}</p>
                                    {strengthObj.category && (
                                      <Badge variant="outline" className="text-xs mt-1 bg-green-50 text-green-700">
                                        {strengthObj.category}
                                      </Badge>
                                    )}
                                    {strengthObj.evidence && Array.isArray(strengthObj.evidence) && strengthObj.evidence.length > 0 && (
                                      <ul className="mt-2 space-y-1">
                                        {strengthObj.evidence.map((ev: string, evIdx: number) => (
                                          <li key={evIdx} className="text-xs text-gray-600 flex items-start gap-1">
                                            <span className="text-green-400">•</span> {ev}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Weaknesses Card */}
                  {evaluationData!.weaknesses.length > 0 && (
                    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-orange-800 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Areas for Improvement
                        </CardTitle>
                        <CardDescription className="text-orange-600">Growth opportunities</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {evaluationData!.weaknesses.map((weakness, idx) => {
                            const weaknessObj = typeof weakness === 'string' 
                              ? { point: weakness } 
                              : weakness as any
                            
                            return (
                              <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-all hover:shadow-sm">
                                <div className="flex items-start gap-2">
                                  <span className="text-orange-500 mt-0.5">⚠</span>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">{weaknessObj.point}</p>
                                    {weaknessObj.category && (
                                      <Badge variant="outline" className="text-xs mt-1 bg-orange-50 text-orange-700">
                                        {weaknessObj.category}
                                      </Badge>
                                    )}
                                    {weaknessObj.evidence && Array.isArray(weaknessObj.evidence) && weaknessObj.evidence.length > 0 && (
                                      <ul className="mt-2 space-y-1">
                                        {weaknessObj.evidence.map((ev: string, evIdx: number) => (
                                          <li key={evIdx} className="text-xs text-gray-600 flex items-start gap-1">
                                            <span className="text-orange-400">•</span> {ev}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {weaknessObj.improvement_suggestion && (
                                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                        <div className="text-xs font-medium text-blue-800 flex items-center gap-1">
                                          <Lightbulb className="h-3 w-3" /> Suggestion
                                        </div>
                                        <p className="text-xs text-blue-700 mt-1">{weaknessObj.improvement_suggestion}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* ===== SECTION 6: Summary & Comments ===== */}
                {evaluationData!.reviewerComments && (
                  <Card className="border-2 border-gray-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        Evaluation Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {evaluationData!.reviewerComments}
                      </div>
                      {evaluationData!.reviewedAt && (
                        <div className="mt-4 pt-4 border-t text-xs text-gray-500 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Evaluated on {new Date(evaluationData!.reviewedAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {evaluationData!.reviewedBy && ` by ${evaluationData!.reviewedBy}`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Evaluation Data Available</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    The interview evaluation has not been completed yet. Once the candidate completes their interview, the AI will generate a detailed evaluation.
                  </p>
                </CardContent>
              </Card>
            )}
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
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {parseConversationTranscript(transcriptData!.text).map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                              msg.role === 'agent' 
                                ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                : 'bg-green-100 text-green-900 border border-green-200'
                            }`}>
                              <div className={`text-xs font-semibold mb-1 ${
                                msg.role === 'agent' ? 'text-blue-700' : 'text-green-700'
                              }`}>
                                {msg.role === 'agent' ? '🤖 Agent' : '👤 Candidate'}
                              </div>
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!transcriptData!.text || transcriptData!.text.trim().length === 0) && (
                          <div className="text-center text-gray-500 py-8">
                            No transcript available
                          </div>
                        )}
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

        {/* Job Application Tab Content */}
        {activeTab === "job" && (
          <div className="mt-6 space-y-6">
            {/* Application Overview Card */}
            <Card className="border-2 border-purple-200 bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
                <CardTitle className="text-2xl text-purple-900 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Application Details
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Information submitted by the candidate during the application process
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {candidate ? (
                  <div className="space-y-8">
                    {/* Personal Information Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                        <User className="h-5 w-5 text-purple-600" />
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Full Name</div>
                          <div className="text-gray-900 font-medium">{candidate.name || 'Not provided'}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Address</div>
                          <div className="text-gray-900 font-medium">{candidate.email || 'Not provided'}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone Number</div>
                          <div className="text-gray-900 font-medium">{candidate.phone || 'Not provided'}</div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Location</div>
                          <div className="text-gray-900 font-medium">{candidate.location || 'Not provided'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Salary & Compensation Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Salary Expectations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Expected Salary</div>
                          <div className="text-gray-900 font-semibold text-lg">
                            {candidate.expectedSalary 
                              ? `${candidate.salaryCurrency || 'USD'} ${Number(candidate.expectedSalary).toLocaleString()}`
                              : 'Not specified'}
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Currency</div>
                          <div className="text-gray-900 font-medium">{candidate.salaryCurrency || 'USD'}</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Pay Period</div>
                          <div className="text-gray-900 font-medium capitalize">{candidate.salaryPeriod || 'Monthly'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Language & Proficiency Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Language Proficiency
                      </h3>
                      {candidate.languages && candidate.languages.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {candidate.languages.map((lang, idx) => {
                            const proficiencyLabels: Record<string, string> = {
                              'native': 'Native / Bilingual',
                              'fluent': 'Fluent',
                              'advanced': 'Advanced',
                              'intermediate': 'Intermediate',
                              'basic': 'Basic'
                            }
                            const proficiencyColors: Record<string, string> = {
                              'native': 'bg-purple-100 border-purple-300 text-purple-800',
                              'fluent': 'bg-blue-100 border-blue-300 text-blue-800',
                              'advanced': 'bg-green-100 border-green-300 text-green-800',
                              'intermediate': 'bg-yellow-100 border-yellow-300 text-yellow-800',
                              'basic': 'bg-gray-100 border-gray-300 text-gray-800'
                            }
                            return (
                              <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900">{lang.language}</div>
                                  <Badge className={`${proficiencyColors[lang.proficiency] || 'bg-gray-100 text-gray-800'}`}>
                                    {proficiencyLabels[lang.proficiency] || lang.proficiency}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <Globe className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500">No languages specified in the application</p>
                        </div>
                      )}
                    </div>

                    {/* Availability & Relocation Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        Availability & Relocation
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">Available Start Date</div>
                          <div className="text-gray-900 font-medium">
                            {candidate.availableStartDate 
                              ? new Date(candidate.availableStartDate).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })
                              : 'Not specified'}
                          </div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">Willing to Relocate</div>
                          <div className="flex items-center gap-2">
                            {candidate.willingToRelocate ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-green-700 font-medium">Yes, willing to relocate</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5 text-red-500" />
                                <span className="text-red-600 font-medium">Not willing to relocate</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Professional Links Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                        <LinkIcon className="h-5 w-5 text-indigo-600" />
                        Professional Links
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-1">LinkedIn Profile</div>
                          {candidate.linkedinUrl ? (
                            <a 
                              href={candidate.linkedinUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View LinkedIn Profile
                            </a>
                          ) : (
                            <span className="text-gray-500">Not provided</span>
                          )}
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-1">Portfolio / Website</div>
                          {candidate.portfolioUrl ? (
                            <a 
                              href={candidate.portfolioUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Portfolio
                            </a>
                          ) : (
                            <span className="text-gray-500">Not provided</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Resume Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                        <FileText className="h-5 w-5 text-red-600" />
                        Resume / CV
                      </h3>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        {candidate.resumeUrl && candidate.resumeUrl !== '#' ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <FileText className="h-6 w-6 text-red-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Resume Uploaded</div>
                                <div className="text-sm text-gray-500">Click to view or download</div>
                              </div>
                            </div>
                            <a 
                              href={candidate.resumeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">No resume uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Application Metadata */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Applied on {new Date(candidate.appliedAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <Badge variant="outline" className={
                          candidate.status === 'qualified' || candidate.status === 'CV Qualified' 
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : candidate.status === 'applied' 
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-gray-50 text-gray-700 border-gray-300'
                        }>
                          Status: {candidate.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Application Data Available</h3>
                    <p className="text-gray-500">Unable to load the application details for this candidate.</p>
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
