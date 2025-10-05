"use client"

import { useEffect, useRef, useState, useLayoutEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2, Users, Briefcase, Target, CheckCircle, Clock, Bot, ChevronDown, ChevronUp, Trash2, Plus, RefreshCw } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"
import { parseJobDescription, renderLinkedInJobDescription } from "@/lib/job-description-parser"

export default function CreateJobPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company, user } = useAuth()
  const isEditing = !!searchParams.get('jobId')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTab, setCurrentTab] = useState("basic")
  const lastSyncedTabRef = useRef<string | null>(null)
  const statusInitializedRef = useRef(false)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [agentQuestions, setAgentQuestions] = useState<Record<string, string[]>>({
    "Phone Screening": []
  })
  const [agentCriteria, setAgentCriteria] = useState<Record<string, string[]>>({
    "Phone Screening": ["Communication", "Culture fit", "Technical", "Team player"]
  })
  const [createdJobId, setCreatedJobId] = useState<string | null>(null)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  
  // Job status: open | on_hold | closed | cancelled

  // Helper: parse varied salary labels into structured fields
  const normalizeStatus = (val?: string | null): 'open' | 'on_hold' | 'closed' | 'cancelled' | undefined => {
    if (!val) return undefined
    const v = String(val).toLowerCase().trim()
    if (v === 'open') return 'open'
    if (v === 'closed' || v === 'close') return 'closed'
    if (v === 'on_hold' || v === 'on-hold' || v === 'onhold' || v === 'hold' || v === 'on hold') return 'on_hold'
    if (v === 'cancelled' || v === 'canceled' || v === 'cancel' || v === 'cancelled ') return 'cancelled'
    return undefined
  }

  // Map UI employment type to DB enum
  const toDbEmploymentType = (raw?: string | null): 'full_time' | 'part_time' | 'contract' | undefined => {
    const v = (raw || '').toLowerCase().trim()
    if (v === 'full-time' || v === 'full_time' || v === 'full time') return 'full_time'
    if (v === 'part-time' || v === 'part_time' || v === 'part time') return 'part_time'
    if (v === 'contract' || v === 'freelance' || v === 'contractor') return 'contract'
    return undefined
  }

  // Map UI experience level to DB enum
  const toDbExperienceLevel = (
    raw?: string | null
  ): 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | undefined => {
    const v = (raw || '').toLowerCase().trim()
    if (v === 'intern' || v === 'internship') return 'intern'
    if (v === 'entry' || v === 'junior' || v === 'fresher') return 'junior'
    if (v === 'mid' || v === 'mid-level' || v === 'mid level') return 'mid'
    if (v === 'senior' || v === 'sr') return 'senior'
    if (v === 'lead') return 'lead'
    if (v === 'principal' || v === 'staff') return 'principal'
    return undefined
  }
  const parseSalaryLabel = (labelRaw: string) => {
    const label = (labelRaw || '').toLowerCase()
    if (!label) return {}
    // Determine period hint
    let period: 'Monthly' | 'Yearly' | undefined
    if (/(year|annual|per\s*year|yr|yoy|lpa)/i.test(labelRaw)) period = 'Yearly'
    else if (/(month|per\s*month|mo)/i.test(labelRaw)) period = 'Monthly'

    // Extract up to 2 numbers (allow commas/decimals)
    const nums = Array.from(labelRaw.matchAll(/([\d]+[\d,]*\.?\d*)/g)).map(m => m[1].replace(/,/g, ''))
    if (nums.length === 0) return { period }

    // Handle LPA (Lakhs per annum) -> convert to absolute if possible
    const isLpa = /lpa/.test(label)
    const toNumber = (s: string) => {
      const n = parseFloat(s)
      if (Number.isNaN(n)) return undefined
      if (isLpa) return Math.round(n * 100000) // 1 LPA = 100,000
      return n
    }
    const [minS, maxS] = [nums[0], nums[1]]
    const min = toNumber(minS)
    const max = maxS !== undefined ? toNumber(maxS) : undefined
    return { min: min !== undefined ? String(min) : undefined, max: max !== undefined ? String(max) : undefined, period }
  }

  // Form state
  const [formData, setFormData] = useState(() => {
    // Determine initial status from localStorage synchronously to avoid flicker to "open"
    let initialStatus: 'open' | 'on_hold' | 'closed' | 'cancelled' = 'open'
    try {
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search)
        const jobId = sp.get('jobId')
        if (jobId) {
          const saved = localStorage.getItem(`jobStatus:${jobId}`)
          const norm = ((): 'open' | 'on_hold' | 'closed' | 'cancelled' | undefined => {
            const v = saved?.toLowerCase().trim()
            if (v === 'open') return 'open'
            if (v === 'closed' || v === 'close') return 'closed'
            if (v === 'on_hold' || v === 'on-hold' || v === 'onhold' || v === 'hold' || v === 'on hold') return 'on_hold'
            if (v === 'cancelled' || v === 'canceled' || v === 'cancel') return 'cancelled'
            return undefined
          })()
          if (typeof window !== 'undefined') {
            console.log('[Job Edit] Initial status sync read', { jobId, saved, norm })
          }
          if (norm) initialStatus = norm
          else {
            const afe = localStorage.getItem(`applyFormEnabled:${jobId}`)
            console.log('[Job Edit] Deriving from applyFormEnabled', { jobId, afe })
            if (afe === 'true') initialStatus = 'open'
            else if (afe === 'false') initialStatus = 'on_hold'
          }
        }
      }
    } catch {}
    return {
      // Basic Information
      jobTitle: "",
      company: "",
      location: "",
      jobType: "full-time", // maps Work Arrangement
      experienceLevel: "entry", // maps Level/Seniority
      status: initialStatus, // job status

      // New sections: Requirements
      education: "",
      years: "",
      technical: "",
      domain: "",
      soft: "",
      languages: "",
      mustHave: "",
      niceToHave: "",

      // New section: Responsibilities
      day: "",
      project: "",
      collaboration: "",
      scope: "",

      // New section: Compensation
      salaryMin: "",
      salaryMax: "",
      period: "Monthly",
      bonus: "",
      perks: "",
      timeOff: "",

      // New section: Logistics
      joining: "",
      travel: "",
      visa: "",

      // Legacy fields kept for API compatibility (will be compiled before submit)
      description: "",
      requirements: "",
      responsibilities: "",
      benefits: "",
      salaryRange: "",

      // Interview Process
      interviewRounds: [] as string[],

      // Platform Selection
      platforms: [] as string[],
    }
  })

  // Prefill when editing: if jobId is present in URL, fetch job and populate form
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return
    ;(async () => {
      try {
        // Try localStorage first for instant prefill
        const draft = typeof window !== 'undefined' ? localStorage.getItem('editJobDraft') : null
        if (draft) {
          const j = JSON.parse(draft)
          if (j?.id === jobId) {
            setFormData(prev => {
              let savedStatus: string | null = null
              try {
                savedStatus = localStorage.getItem(`jobStatus:${jobId}`)
              } catch {}
              const normalized = normalizeStatus(savedStatus)
              const next = {
                ...prev,
                jobTitle: j.title || prev.jobTitle,
                company: company?.name || prev.company,
                location: j.location_text || prev.location,
                jobType: j.employment_type || prev.jobType,
                status: (normalized as any) || (normalizeStatus(j.status) as any) || prev.status,
                description: j.description || prev.description,
                requirements: j.requirements || prev.requirements,
                salaryRange: j.salary_range || prev.salaryRange,
                interviewRounds: Array.isArray(j.interview_rounds) ? j.interview_rounds : prev.interviewRounds,
                platforms: Array.isArray(j.posted_platforms) ? j.posted_platforms : prev.platforms,
              }
              // Mark status initialized ONLY if we used a saved status.
              // If no saved status existed (we fell back to API/draft), do NOT mark initialized yet,
              // so we don't persist API 'open' into localStorage.
              if (normalized) {
                statusInitializedRef.current = true
              }
              return next
            })
            // Persist selected interview rounds and derive salary details if possible
            try {
              const rounds: string[] = Array.isArray(j.interview_rounds) ? j.interview_rounds : []
              if (rounds.length) {
                localStorage.setItem('selectedInterviewRounds', JSON.stringify(rounds))
              }
              const label = j.salary_label || j.salary_range || ''
              const m = String(label).match(/(\d[\d,\.]*)\s*[-–]\s*(\d[\d,\.]*)\s*(?:\((Monthly|Yearly)\))?/i)
              if (m) {
                const toNum = (s: string) => String(s).replace(/[,]/g, '')
                const min = toNum(m[1])
                const max = toNum(m[2])
                const period = (m[3] as 'Monthly' | 'Yearly') || 'Monthly'
                setFormData(prev => ({ ...prev, salaryMin: min, salaryMax: max, period }))
              } else {
                const p = parseSalaryLabel(label)
                if (p.min || p.max || p.period) {
                  setFormData(prev => ({ ...prev, salaryMin: p.min ?? prev.salaryMin, salaryMax: p.max ?? prev.salaryMax, period: (p.period as any) ?? prev.period }))
                }
              }
            } catch {}
            // Persist status from draft only if nothing saved yet
            try {
              const existing = localStorage.getItem(`jobStatus:${jobId}`)
              if (!existing && j.status) localStorage.setItem(`jobStatus:${jobId}`, j.status)
            } catch {}
            // Persist round -> skills mapping for downstream pages
            try {
              const rounds: string[] = Array.isArray(j.interview_rounds) ? j.interview_rounds : []
              const mapping: Record<string, string[]> = {}
              rounds.forEach(r => {
                const cfg = (agentConfigurations as any)[r]
                if (cfg && Array.isArray(cfg.skills)) mapping[r] = cfg.skills
              })
              if (Object.keys(mapping).length) {
                localStorage.setItem('selectedRoundSkills', JSON.stringify(mapping))
              }
            } catch {}
          }
        }
        // Also fetch from API to ensure latest (requires company query param)
        if (company?.name) {
          const res = await fetch(
            `/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company.name)}`,
            { cache: 'no-store' }
          )
          const data = await res.json().catch(() => ({}))
          if (res.ok && data?.job) {
            const j = data.job
            setFormData(prev => {
              let savedStatus: string | null = null
              try {
                savedStatus = localStorage.getItem(`jobStatus:${jobId}`)
              } catch {}
              const normalized = normalizeStatus(savedStatus)
              // helpers to stringify arrays
              const joinComma = (a: any): string => Array.isArray(a) ? a.join(', ') : (a ?? '')
              const joinLines = (a: any): string => Array.isArray(a) ? a.join('\n') : (a ?? '')
              const toPeriod = (p?: string | null): 'Monthly' | 'Yearly' | undefined => {
                const v = (p || '').toLowerCase()
                if (v.includes('year')) return 'Yearly'
                if (v.includes('month')) return 'Monthly'
                return undefined
              }
              const next = {
                ...prev,
                jobTitle: j.title || prev.jobTitle,
                company: company?.name || prev.company,
                location: j.location_text || prev.location,
                jobType: j.employment_type || prev.jobType,
                status: (normalized as any) || (normalizeStatus(j.status) as any) || prev.status,
                description: j.description_md || j.summary || j.description || prev.description,
                requirements: j.responsibilities_md || j.requirements || prev.requirements,
                benefits: j.benefits_md || prev.benefits,
                salaryRange: j.salary_level || j.salary_label || j.salary_range || prev.salaryRange,
                interviewRounds: Array.isArray(j.interview_rounds) ? j.interview_rounds : prev.interviewRounds,
                platforms: Array.isArray(j.posted_platforms) ? j.posted_platforms : prev.platforms,
                // Requirements tab
                education: j.education ?? prev.education,
                years: (j.years_experience_min != null || j.years_experience_max != null)
                  ? `${j.years_experience_min ?? ''}${j.years_experience_max != null ? `-${j.years_experience_max}` : ''}`
                  : prev.years,
                technical: joinLines(j.technical_skills) || prev.technical,
                domain: joinLines(j.domain_knowledge) || prev.domain,
                soft: joinLines(j.soft_skills) || prev.soft,
                languages: joinComma(j.languages) || prev.languages,
                mustHave: joinLines(j.must_have_skills) || prev.mustHave,
                niceToHave: joinLines(j.nice_to_have_skills) || prev.niceToHave,
                // Responsibilities tab
                day: joinLines(j.duties_day_to_day) || prev.day,
                project: joinLines(j.duties_strategic) || prev.project,
                collaboration: joinComma(j.stakeholders) || prev.collaboration,
                scope: j.decision_scope ?? prev.scope,
                // Compensation tab
                salaryMin: j.salary_min != null ? String(j.salary_min) : prev.salaryMin,
                salaryMax: j.salary_max != null ? String(j.salary_max) : prev.salaryMax,
                period: toPeriod(j.salary_period) || prev.period,
                bonus: j.bonus_incentives ?? prev.bonus,
                perks: joinLines(j.perks_benefits) || prev.perks,
                timeOff: j.time_off_policy ?? prev.timeOff,
                // Logistics tab
                joining: j.joining_timeline ?? prev.joining,
                travel: j.travel_requirements ?? prev.travel,
                visa: j.visa_requirements ?? prev.visa,
              }
              // Mark status initialized after deriving it and persist server truth to localStorage
              statusInitializedRef.current = true
              return next
            })
            try {
              const serverStatus = normalizeStatus(j.status)
              if (serverStatus) {
                localStorage.setItem(`jobStatus:${jobId}`, serverStatus)
                const enabled = serverStatus === 'open'
                localStorage.setItem(`applyFormEnabled:${jobId}`, String(enabled))
              }
            } catch {}
            // Persist selected interview rounds and derive salary details if possible
            try {
              const rounds: string[] = Array.isArray(j.interview_rounds) ? j.interview_rounds : []
              if (rounds.length) {
                localStorage.setItem('selectedInterviewRounds', JSON.stringify(rounds))
              }
              const label = j.salary_level || j.salary_label || j.salary_range || ''
              const m = String(label).match(/(\d[\d,\.]*)\s*[-–]\s*(\d[\d,\.]*)\s*(?:\((Monthly|Yearly)\))?/i)
              if (m) {
                const toNum = (s: string) => String(s).replace(/[,]/g, '')
                const min = toNum(m[1])
                const max = toNum(m[2])
                const period = (m[3] as 'Monthly' | 'Yearly') || 'Monthly'
                setFormData(prev => ({ ...prev, salaryMin: min, salaryMax: max, period }))
              } else {
                const p = parseSalaryLabel(label)
                if (p.min || p.max || p.period) {
                  setFormData(prev => ({ ...prev, salaryMin: p.min ?? prev.salaryMin, salaryMax: p.max ?? prev.salaryMax, period: (p.period as any) ?? prev.period }))
                }
              }
            } catch {}
            // Persist round -> skills mapping for downstream pages
            try {
              const rounds: string[] = Array.isArray(j.interview_rounds) ? j.interview_rounds : []
              const mapping: Record<string, string[]> = {}
              rounds.forEach(r => {
                const cfg = (agentConfigurations as any)[r]
                if (cfg && Array.isArray(cfg.skills)) mapping[r] = cfg.skills
              })
              if (Object.keys(mapping).length) {
                localStorage.setItem('selectedRoundSkills', JSON.stringify(mapping))
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn('Prefill failed:', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, company?.name])

  // Initialize tab from URL once on mount to avoid feedback loops
  useEffect(() => {
    const t = searchParams.get('tab')
    const allowed = ['basic', 'requirements', 'responsibilities', 'compensation', 'logistics', 'resume-screening', 'interview']
    const next = t && allowed.includes(t) ? t : 'basic'
    lastSyncedTabRef.current = next
    setCurrentTab(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fill company from auth context
  useEffect(() => {
    if (company?.name) {
      setFormData(prev => ({ ...prev, company: company.name }))
    }
  }, [company?.name])

  // Synchronously apply saved status before paint to prevent showing a wrong default
  useLayoutEffect(() => {
    try {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const jobId = sp?.get('jobId')
      if (!jobId) return
      const raw = localStorage.getItem(`jobStatus:${jobId}`)
      const savedStatus = normalizeStatus(raw)
      if (savedStatus) {
        console.log('[Job Edit] useLayoutEffect applying status before paint', { jobId, status: savedStatus })
        setFormData(prev => ({ ...prev, status: savedStatus }))
        statusInitializedRef.current = true
      }
    } catch {}
  }, [])

  // Read persisted Job Status if available (fallback when API/draft lacks status)
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return
    try {
      const raw = localStorage.getItem(`jobStatus:${jobId}`)
      const savedStatus = normalizeStatus(raw)
      if (savedStatus) {
        console.log('[Job Edit] Prefill applying persisted status', { jobId, status: savedStatus })
        setFormData(prev => ({ ...prev, status: savedStatus }))
        statusInitializedRef.current = true
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Apply Form availability follows status:
  // Open => enabled (true), On Hold/Closed => disabled (false)
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return
    if (!statusInitializedRef.current) return
    const enabled = formData.status === 'open'
    try {
      console.log('[Job Edit] Persisting due to status change/effect', { jobId, status: formData.status, enabled })
      localStorage.setItem(`applyFormEnabled:${jobId}`, String(enabled))
      localStorage.setItem(`jobStatus:${jobId}`, formData.status)
    } catch {}
  }, [formData.status, searchParams])

  const handleInputChange = (field: string, value: string) => {
    if (field === 'status') {
      // Mark initialized and persist immediately so it survives navigation
      statusInitializedRef.current = true
      try {
        const jobId = searchParams.get('jobId')
        if (jobId) {
          console.log('[Job Edit] User changed status', { jobId, value })
          localStorage.setItem(`jobStatus:${jobId}`, value)
          const enabled = value === 'open'
          localStorage.setItem(`applyFormEnabled:${jobId}`, String(enabled))
        }
      } catch {}
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const prevArr = (prev[field as keyof typeof prev] as string[]) || []
      const set = new Set(prevArr)
      if (checked) {
        set.add(value)
      } else {
        set.delete(value)
      }
      const nextArr = Array.from(set)
      // Avoid unnecessary state updates
      if (prevArr.length === nextArr.length && prevArr.every((v, i) => v === nextArr[i])) {
        return prev
      }
      const next = { ...prev, [field]: nextArr }
      // If we updated interviewRounds, also persist a mapping of round -> skills to localStorage
      if (field === 'interviewRounds') {
        try {
          const mapping: Record<string, string[]> = {}
          nextArr.forEach(r => {
            const cfg = (agentConfigurations as any)[r]
            if (cfg && Array.isArray(cfg.skills)) mapping[r] = cfg.skills
          })
          localStorage.setItem('selectedRoundSkills', JSON.stringify(mapping))
        } catch {}
      }
      return next
    })
  }

  // Validation functions for each tab
  const isBasicInfoValid = () => {
    return formData.jobTitle.trim() !== '' && 
           formData.location.trim() !== '' && 
           formData.jobType.trim() !== ''
  }

  const isRequirementsValid = () => {
    return formData.technical.trim() !== '' || formData.mustHave.trim() !== ''
  }

  const isResponsibilitiesValid = () => {
    return formData.day.trim() !== ''
  }

  const isCompensationValid = () => {
    return formData.salaryMin.trim() !== '' && formData.salaryMax.trim() !== ''
  }

  const isLogisticsValid = () => {
    return true // Optional fields
  }

  const isResumeScreeningValid = () => {
    return true // Auto-configured
  }

  const isInterviewValid = () => {
    return formData.interviewRounds.length > 0
  }

  // Get validation status for current tab
  const isCurrentTabValid = () => {
    switch (currentTab) {
      case 'basic': return isBasicInfoValid()
      case 'requirements': return isRequirementsValid()
      case 'responsibilities': return isResponsibilitiesValid()
      case 'compensation': return isCompensationValid()
      case 'logistics': return isLogisticsValid()
      case 'resume-screening': return isResumeScreeningValid()
      case 'interview': return isInterviewValid()
      default: return false
    }
  }

  // Navigate to next tab
  const goToNextTab = () => {
    const tabs = ['basic', 'requirements', 'responsibilities', 'compensation', 'logistics', 'resume-screening', 'interview']
    const currentIndex = tabs.indexOf(currentTab)
    if (currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1])
      // Update URL
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tabs[currentIndex + 1])
      router.push(`/dashboard/jobs/new?${params.toString()}`, { scroll: false })
    }
  }

  // Generate interview questions using AI
  const handleGenerateQuestions = async (round: string) => {
    setGeneratingQuestions(true)
    try {
      const jobDescription = generateStructuredDescription()
      
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          agentType: 'Screening Agent',
          numberOfQuestions: 10,
          skills: agentCriteria[round] || []
        })
      })

      if (!res.ok) {
        throw new Error('Failed to generate questions')
      }

      const data = await res.json()
      const generatedQuestions = data.questions || []
      
      // Categorize questions: 2 intro, 3 behavioral, 5 technical
      const categorizedQuestions = [
        ...generatedQuestions.slice(0, 2), // 2 intro
        ...generatedQuestions.slice(2, 5), // 3 behavioral  
        ...generatedQuestions.slice(5, 10) // 5 technical
      ]

      setAgentQuestions({
        ...agentQuestions,
        [round]: categorizedQuestions
      })

      alert(`Generated ${categorizedQuestions.length} questions successfully!`)
    } catch (error) {
      console.error('Error generating questions:', error)
      alert('Failed to generate questions. Please try again.')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  // Generate structured description
  const generateStructuredDescription = () => {
    const salaryRange = formData.salaryMin && formData.salaryMax 
      ? `₹${parseInt(formData.salaryMin).toLocaleString()} – ₹${parseInt(formData.salaryMax).toLocaleString()} per ${formData.period?.toLowerCase() || 'month'}`
      : 'Competitive salary'
    
    const workArrangement = formData.jobType?.replace(/[_-]/g, '-') || 'Full-time'
    const location = formData.location || 'Remote'
    
    return `// Basic Information
Job Title* → ${formData.jobTitle || 'Position Title'}
Company* → ${company?.name || 'Company'}
Location* → ${location}
Work Arrangement* → ${workArrangement}, ${location.toLowerCase().includes('remote') ? 'Remote' : 'Onsite'}
Job Level / Seniority → ${formData.experienceLevel || 'As per experience'}

About the Role
We are seeking a ${formData.jobTitle || 'professional'} to join ${company?.name || 'our team'}. This role involves ${formData.day ? formData.day.split(',')[0]?.trim() : 'contributing to our team\'s success'} while collaborating with ${formData.collaboration ? formData.collaboration.split(',').slice(0,2).join(' and ') : 'cross-functional teams'} to deliver business impact.

🔹 Key Responsibilities
${formData.day ? formData.day.split(/[,\n]/).map((d: string) => d.trim()).filter(Boolean).map((duty: string) => `${duty.charAt(0).toUpperCase() + duty.slice(1)}.`).join('\n') : 'Develop and maintain solutions as per business requirements.'}
${formData.project ? formData.project.split(/[,\n]/).map((d: string) => d.trim()).filter(Boolean).map((duty: string) => `${duty.charAt(0).toUpperCase() + duty.slice(1)}.`).join('\n') : 'Drive strategic initiatives and process improvements.'}
${formData.collaboration ? `Collaborate with ${formData.collaboration.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join(', ')}.` : 'Collaborate with cross-functional teams.'}
${formData.scope ? `${formData.scope}.` : 'Provide technical guidance and mentorship.'}

🔹 Requirements
Education & Certifications
${formData.education || 'Bachelor\'s degree in relevant field or equivalent experience.'}

Experience
${formData.years || 'Experience as per role requirements'}

Technical Skills (Must-Have)
${formData.technical ? formData.technical.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : 'Technical skills as per job requirements'}
${formData.mustHave ? formData.mustHave.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : ''}

Nice-to-Have Skills
${formData.niceToHave ? formData.niceToHave.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : 'Additional skills welcome'}

${formData.domain ? `Domain Knowledge\n${formData.domain}\n\n` : ''}Soft Skills
${formData.soft ? formData.soft.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : 'Strong communication and stakeholder management\nProblem-solving and adaptability\nLeadership and team collaboration'}

${formData.languages ? `Languages\n${formData.languages.split(/[,\n]/).map((l: string) => l.trim()).filter(Boolean).join('\n')}\n\n` : ''}🔹 Compensation & Benefits
💰 Salary Range: ${salaryRange}
${formData.bonus ? `🎁 Bonus: ${formData.bonus}` : '🎁 Bonus: Performance-based incentives'}
${formData.perks ? `✨ Perks: ${formData.perks.split(/[,\n]/).map((p: string) => p.trim()).filter(Boolean).join(', ')}` : '✨ Perks: Health insurance, flexible working hours, wellness programs'}
${formData.timeOff ? `🌴 Time Off Policy: ${formData.timeOff}` : '🌴 Time Off Policy: Competitive leave policy'}

🔹 Logistics
Joining Timeline: ${formData.joining || 'Within 30 days'}
${formData.travel ? `Travel Requirements: ${formData.travel}` : 'Travel Requirements: Minimal travel as per project needs'}
Work Authorization: ${formData.visa || 'Work authorization required'}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const compiledDescription = generateStructuredDescription()
      const compiledRequirements = formData.requirements || 'As per job requirements'

      // Optional sanity check for salary range
      const minNum = formData.salaryMin ? Number(formData.salaryMin) : undefined
      const maxNum = formData.salaryMax ? Number(formData.salaryMax) : undefined
      if (typeof minNum === 'number' && typeof maxNum === 'number' && !Number.isNaN(minNum) && !Number.isNaN(maxNum) && minNum > maxNum) {
        alert('Salary Min should not exceed Salary Max.')
        setIsSubmitting(false)
        return
      }

      let res: Response
      let data: any
      
      // Use createdJobId or URL jobId for updates
      const jobIdToUpdate = createdJobId || searchParams.get('jobId')
      
      if (jobIdToUpdate) {
        // PATCH update for edit flow
        const jobId = jobIdToUpdate
        // Build minimal updates supported by API
        const updates: any = {}
        if (formData.jobTitle) updates.title = formData.jobTitle
        if (formData.location) updates.location = formData.location
        const mappedEmpType = toDbEmploymentType(formData.jobType)
        if (mappedEmpType) updates.employment_type = mappedEmpType
        if (formData.status) updates.status = formData.status
        const mappedLevel = toDbExperienceLevel(formData.experienceLevel)
        if (mappedLevel) updates.experience_level = mappedLevel
        if (compiledDescription || formData.description) updates.description_md = compiledDescription || formData.description || ''
        if (compiledRequirements || formData.requirements) updates.responsibilities_md = compiledRequirements || formData.requirements || ''
        // Optionally map perks/timeOff to benefits_md
        const benefits = [formData.perks, formData.timeOff].filter(Boolean).join('\n')
        if (benefits) updates.benefits_md = benefits
        // Salary proxy
        if (formData.salaryMin || formData.salaryMax || formData.period) {
          updates.salary_level = `${formData.salaryMin || ''}-${formData.salaryMax || ''} (${formData.period || 'Monthly'})`
        }
        res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company?.name || '')}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        data = await res.json()
      } else {
        // POST create flow
        res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            description: compiledDescription || formData.description || '',
            requirements: compiledRequirements || formData.requirements || '',
            companyId: company?.id, // Pass companyId directly
            createdBy: user?.id || null,
          }),
        })
        data = await res.json()
      }
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to save job')
      }

      // Store minimal info
      const finalJobId = data.jobId || jobIdToUpdate
      const jobData = {
        ...formData,
        id: finalJobId,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem('newJobData', JSON.stringify(jobData))
      localStorage.setItem('selectedInterviewRounds', JSON.stringify(formData.interviewRounds))

      // Save interview questions and criteria to database
      if (formData.interviewRounds.length > 0 && finalJobId) {
        try {
          const roundsData = formData.interviewRounds.map(round => ({
            roundName: round,
            questions: agentQuestions[round] || [],
            criteria: agentCriteria[round] || []
          }))

          console.log('Saving questions for job:', finalJobId, roundsData)

          const saveRes = await fetch(`/api/jobs/${encodeURIComponent(finalJobId)}/rounds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roundsData })
          })

          const saveData = await saveRes.json()
          
          if (!saveRes.ok) {
            console.error('Failed to save interview questions:', saveData)
          } else {
            console.log('Questions saved successfully')
          }
        } catch (error) {
          console.error('Error saving interview questions:', error)
        }
      }

      // Redirect to jobs list
      router.push('/dashboard/jobs')
      
    } catch (error) {
      console.error('Error creating job:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Detailed agent catalog (aligned with /dashboard/agents/create design)
  const agentConfigurations = {
    "Phone Screening": {
      name: "Screening Agent",
      description: "Initial candidate screening and basic qualification assessment",
      duration: "30 min",
      skills: ["Communication", "Culture fit", "Technical", "Team player"],
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
    "Technical Assessment": {
      name: "Technical Agent",
      description: "Coding skills, algorithms, and technical problem-solving evaluation",
      duration: "30 minutes",
      skills: ["Coding Skills", "Algorithm Knowledge", "Problem Solving"],
      color: "bg-green-100 text-green-800 border-green-200",
    },
    "System Design": {
      name: "System Design Agent",
      description: "Architecture design, scalability, and system thinking assessment",
      duration: "30 minutes",
      skills: ["System Architecture", "Scalability", "Database Design"],
      color: "bg-purple-100 text-purple-800 border-purple-200",
    },
    "Behavioral Interview": {
      name: "Behavioral Agent",
      description: "Leadership, teamwork, and soft skills evaluation",
      duration: "30 minutes",
      skills: ["Leadership", "Team Collaboration", "Communication"],
      color: "bg-orange-100 text-orange-800 border-orange-200",
    },
    "Final Round": {
      name: "Final Round Agent",
      description: "Comprehensive evaluation and final decision making",
      duration: "30 minutes",
      skills: ["Overall Assessment", "Cultural Fit", "Decision Making"],
      color: "bg-red-100 text-red-800 border-red-200",
    },
  } as const

  const platformOptions = [
    "LinkedIn",
    "Indeed", 
    "Glassdoor",
    "AngelList",
    "Company Website"
  ]

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{searchParams.get('jobId') ? 'Edit Job' : 'Create New Job'}</h1>
        <p className="text-gray-600 mt-2">{searchParams.get('jobId') ? 'Review and update the job details' : 'Fill out the details to create a comprehensive job posting'}</p>

        {/* Top bar Job Status selector */}
        <div className="mt-4 flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm">
            <div className="font-medium">Job Status</div>
            <div className="text-gray-500">Set whether the job is open, on hold, or closed</div>
          </div>
          <div className="flex items-center gap-3 min-w-[220px]">
            <Select
              value={formData.status}
              onValueChange={(val) => handleInputChange('status', val)}
              disabled={isEditing}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs
          value={currentTab}
          onValueChange={(val) => {
            if (val !== currentTab) setCurrentTab(val)
            const currentUrlTab = searchParams.get('tab')
            if (currentUrlTab !== val) {
              const sp = new URLSearchParams(Array.from(searchParams.entries()))
              sp.set('tab', val)
              lastSyncedTabRef.current = val
              router.replace(`${pathname}?${sp.toString()}`)
            }
          }}
          className="space-y-6"
        >
          <TabsList className="w-full flex items-center gap-2 p-1 rounded-lg border bg-muted/40 text-muted-foreground my-2 h-[56px] overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 flex-nowrap">
              <TabsTrigger value="basic" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Basic Info</TabsTrigger>
              <TabsTrigger value="requirements" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Requirements</TabsTrigger>
              <TabsTrigger value="responsibilities" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Responsibilities</TabsTrigger>
              <TabsTrigger value="compensation" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Compensation</TabsTrigger>
              <TabsTrigger value="logistics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Logistics</TabsTrigger>
              <TabsTrigger value="resume-screening" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Resume Screening</TabsTrigger>
              <TabsTrigger value="interview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 text-sm rounded-md whitespace-nowrap shrink-0">Interview Process</TabsTrigger>
            </div>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the fundamental details about the job position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Senior Software Engineer"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      required
                      readOnly={isEditing}
                      disabled={isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      placeholder={company?.name || 'Loading company...'}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      required
                      readOnly={isEditing}
                      disabled={isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Work Arrangement *</Label>
                    <Select value={formData.jobType} onValueChange={(value) => handleInputChange('jobType', value)} disabled={isEditing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work arrangement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Job Level / Seniority</Label>
                  <Select value={formData.experienceLevel} onValueChange={(value) => handleInputChange('experienceLevel', value)} disabled={isEditing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="mid">Mid</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Requirements
                </CardTitle>
                <CardDescription>
                  Describe the background and skills expected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="education">Educational Background</Label>
                    <Input id="education" placeholder="e.g., BSc CS; Azure Certs" value={formData.education} onChange={(e)=>handleInputChange('education', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years">Years of Experience</Label>
                    <Input id="years" placeholder="e.g., 5–8 years (min 5)" value={formData.years} onChange={(e)=>handleInputChange('years', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technical">Technical Skills</Label>
                  <Textarea id="technical" placeholder="Hard skills, tools, languages, platforms" value={formData.technical} onChange={(e)=>handleInputChange('technical', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Knowledge</Label>
                  <Textarea id="domain" placeholder="Industry-specific expertise" value={formData.domain} onChange={(e)=>handleInputChange('domain', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soft">Soft Skills</Label>
                  <Textarea id="soft" placeholder="Communication, leadership, problem-solving, adaptability" value={formData.soft} onChange={(e)=>handleInputChange('soft', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input id="languages" placeholder="e.g., English (required), Mandarin (nice-to-have)" value={formData.languages} onChange={(e)=>handleInputChange('languages', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                  <div className="space-y-2"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mustHave">Must‑Have Skills</Label>
                    <Textarea id="mustHave" placeholder="List must-haves, one per line" value={formData.mustHave} onChange={(e)=>handleInputChange('mustHave', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="niceToHave">Nice‑to‑Have Skills</Label>
                    <Textarea id="niceToHave" placeholder="List nice-to-haves, one per line" value={formData.niceToHave} onChange={(e)=>handleInputChange('niceToHave', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responsibilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Responsibilities
                </CardTitle>
                <CardDescription>
                  Outline what the role will do
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Day‑to‑Day Duties</Label>
                  <Textarea id="day" placeholder="Regular tasks (one per line)" value={formData.day} onChange={(e)=>handleInputChange('day', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project">Project / Strategic Duties</Label>
                  <Textarea id="project" placeholder="Long‑term contributions (one per line)" value={formData.project} onChange={(e)=>handleInputChange('project', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collaboration">Team Collaboration / Stakeholders</Label>
                  <Textarea id="collaboration" placeholder="Cross‑functional interactions (one per line)" value={formData.collaboration} onChange={(e)=>handleInputChange('collaboration', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Decision‑Making Scope</Label>
                  <Textarea id="scope" placeholder="Budget, people management, strategic influence" value={formData.scope} onChange={(e)=>handleInputChange('scope', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Compensation & Benefits
                </CardTitle>
                <CardDescription>
                  Share ranges only if you intend to publish them
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Salary Min</Label>
                    <Input id="salaryMin" type="number" placeholder="e.g., 6000" value={formData.salaryMin} onChange={(e)=>handleInputChange('salaryMin', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Salary Max</Label>
                    <Input id="salaryMax" type="number" placeholder="e.g., 9000" value={formData.salaryMax} onChange={(e)=>handleInputChange('salaryMax', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select value={formData.period} onValueChange={(value)=>handleInputChange('period', value)} disabled={isEditing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus">Bonus / Incentives</Label>
                  <Input id="bonus" placeholder="e.g., 10% annual bonus; RSUs" value={formData.bonus} onChange={(e)=>handleInputChange('bonus', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perks">Perks & Benefits</Label>
                  <Textarea id="perks" placeholder="Health, insurance, stock options, learning budget, wellness" value={formData.perks} onChange={(e)=>handleInputChange('perks', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeOff">Time Off Policy</Label>
                  <Input id="timeOff" placeholder="e.g., 18 AL, sick leave, parental leave" value={formData.timeOff} onChange={(e)=>handleInputChange('timeOff', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Logistics
                </CardTitle>
                <CardDescription>
                  Final details to help candidates plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="joining">Joining Timeline</Label>
                    <Input id="joining" placeholder="e.g., Within 30 days" value={formData.joining} onChange={(e)=>handleInputChange('joining', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel">Travel Requirements</Label>
                    <Input id="travel" placeholder="e.g., Up to 20%" value={formData.travel} onChange={(e)=>handleInputChange('travel', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visa">Work Authorization / Visa</Label>
                  <Input id="visa" placeholder="e.g., Open to sponsorship / PR required" value={formData.visa} onChange={(e)=>handleInputChange('visa', e.target.value)} readOnly={isEditing} disabled={isEditing} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          

          <TabsContent value="interview" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Interview Process
                    </CardTitle>
                    <CardDescription>
                      Configure the interview rounds and process for this position
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                    {Object.entries(agentConfigurations)
                      .filter(([round]) => round === "Phone Screening")
                      .map(([round, cfg]) => {
                      const checked = formData.interviewRounds.includes(round)
                      const isExpanded = expandedAgent === round
                      const questions = agentQuestions[round] || []
                      const criteria = agentCriteria[round] || []
                      
                      return (
                        <Card
                          key={round}
                          className={`transition-all duration-200 ${checked ? 'ring-2 ring-blue-500 shadow-md bg-blue-50' : 'border-gray-200'}`}
                        >
                          <CardHeader 
                            className="pb-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              if (!isEditing) {
                                handleArrayChange('interviewRounds', round, !checked)
                              }
                              setExpandedAgent(isExpanded ? null : round)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (isEditing) return
                                    handleArrayChange('interviewRounds', round, e.target.checked)
                                  }}
                                  disabled={isEditing}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Bot className="w-5 h-5 text-blue-500" />
                                <div>
                                  <CardTitle className="text-base">{cfg.name}</CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {cfg.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Phone/Video • {cfg.duration} • Pass/Fail + notes</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </CardHeader>

                          {isExpanded && (
                            <CardContent className="pt-4 space-y-6 border-t bg-white">
                              {/* Interview Questions Section */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold">Interview Questions ({questions.length})</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={generatingQuestions}
                                    onClick={() => handleGenerateQuestions(round)}
                                  >
                                    {generatingQuestions ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Generate Questions
                                      </>
                                    )}
                                  </Button>
                                </div>
                                
                                {questions.length > 0 ? (
                                  <>
                                    <div className="space-y-2">
                                      {questions.map((question, idx) => (
                                        <div key={idx} className="flex items-start gap-2 group">
                                          <span className="text-sm text-gray-500 mt-2">{idx + 1}.</span>
                                          <Input
                                            value={question}
                                            onChange={(e) => {
                                              const newQuestions = [...questions]
                                              newQuestions[idx] = e.target.value
                                              setAgentQuestions({ ...agentQuestions, [round]: newQuestions })
                                            }}
                                            className="flex-1 text-sm"
                                            placeholder="Enter question..."
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                              const newQuestions = questions.filter((_, i) => i !== idx)
                                              setAgentQuestions({ ...agentQuestions, [round]: newQuestions })
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-8 text-xs border-dashed"
                                      onClick={() => {
                                        setAgentQuestions({
                                          ...agentQuestions,
                                          [round]: [...questions, ""]
                                        })
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add a custom question...
                                    </Button>
                                  </>
                                ) : (
                                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                    <p className="text-sm text-gray-500 mb-3">No questions added yet</p>
                                    <p className="text-xs text-gray-400 mb-4">Click "Generate Questions" to auto-generate questions or add manually</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        setAgentQuestions({
                                          ...agentQuestions,
                                          [round]: [""]
                                        })
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add a custom question...
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Evaluation Criteria Section */}
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Evaluation Criteria</Label>
                                <div className="flex flex-wrap gap-2">
                                  {criteria.map((criterion, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="px-3 py-1 text-xs flex items-center gap-1"
                                    >
                                      {criterion}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newCriteria = criteria.filter((_, i) => i !== idx)
                                          setAgentCriteria({ ...agentCriteria, [round]: newCriteria })
                                        }}
                                        className="ml-1 hover:text-red-500"
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                                
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Add evaluation criteria..."
                                    className="text-sm h-8"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        const input = e.currentTarget
                                        if (input.value.trim()) {
                                          setAgentCriteria({
                                            ...agentCriteria,
                                            [round]: [...criteria, input.value.trim()]
                                          })
                                          input.value = ''
                                        }
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3"
                                    onClick={(e) => {
                                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                                      if (input?.value.trim()) {
                                        setAgentCriteria({
                                          ...agentCriteria,
                                          [round]: [...criteria, input.value.trim()]
                                        })
                                        input.value = ''
                                      }
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resume-screening" className="space-y-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-emerald-50 p-4 rounded-full mb-6 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-emerald-600">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Resume Screening</h3>
                  <p className="text-gray-600 mb-8 max-w-lg leading-relaxed">
                    Our AI will automatically screen and rank resumes based on job requirements, saving you time and effort in the hiring process.
                  </p>
                  <Button className="bg-emerald-500 hover:bg-emerald-600 px-8 py-6 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5">
                    Configure Screening Criteria
                  </Button>
                  <div className="mt-8 pt-6 border-t border-gray-100 w-full">
                    <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>AI-Powered Analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Time-Saving</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Accurate Matching</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            * Required fields
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            {currentTab === 'interview' ? (
              <Button 
                type="submit" 
                disabled={isSubmitting || !isCurrentTabValid()}
                className="min-w-[200px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {createdJobId ? 'Updating Job...' : 'Creating Job...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Job & Setup Agents
                  </>
                )}
              </Button>
            ) : (
              <Button 
                type="button"
                disabled={!isCurrentTabValid()}
                onClick={async () => {
                  // Save job on resume-screening tab
                  if (currentTab === 'resume-screening' && !createdJobId) {
                    setIsSubmitting(true)
                    try {
                      const compiledDescription = generateStructuredDescription()
                      const res = await fetch('/api/jobs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...formData,
                          description: compiledDescription || formData.description || '',
                          requirements: formData.requirements || '',
                          companyId: company?.id,
                          createdBy: user?.id || null,
                        }),
                      })
                      const data = await res.json()
                      if (res.ok && data?.ok && data?.jobId) {
                        setCreatedJobId(data.jobId)
                        // Update URL with jobId
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('jobId', data.jobId)
                        router.push(`/dashboard/jobs/new?${params.toString()}`, { scroll: false })
                      }
                    } catch (error) {
                      console.error('Error creating job:', error)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }
                  goToNextTab()
                }}
                className="min-w-[120px]"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
