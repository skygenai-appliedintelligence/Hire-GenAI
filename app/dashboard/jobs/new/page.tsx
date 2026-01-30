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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Building2, Users, Briefcase, Target, CheckCircle, Clock, Bot, ChevronDown, ChevronUp, Trash2, Plus, RefreshCw, Save, AlertCircle } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"
import { parseJobDescription, renderLinkedInJobDescription } from "@/lib/job-description-parser"
import { EVALUATION_CRITERIA, MAX_CRITERIA_SELECTION, TOTAL_AI_QUESTIONS } from "@/lib/evaluation-criteria"

export default function CreateJobPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company, user } = useAuth()
  const isEditing = !!searchParams.get('jobId')
  const isDraftEdit = searchParams.get('draft') === 'true'
  const isCreateFlow = !isEditing || isDraftEdit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const mergePreferNonEmpty = (base: any, incoming: any) => {
    const out: any = { ...base }
    for (const [k, v] of Object.entries(incoming || {})) {
      const b = (base as any)[k]
      const baseEmpty =
        b === '' ||
        b === null ||
        b === undefined ||
        (Array.isArray(b) && b.length === 0)
      const incomingEmpty = v === '' || v === null || v === undefined
      if (baseEmpty && !incomingEmpty) {
        out[k] = v
      }
    }
    return out
  }

  // Generate temporary UUID for draft jobs (for billing tracking)
  useEffect(() => {
    if (!searchParams.get('jobId') && !draftJobId) {
      // Generate a temporary UUID for this draft job session
      const tempId = crypto.randomUUID()
      setDraftJobId(tempId)
      console.log('🆔 [DRAFT JOB] Generated temporary job ID for billing:', tempId)
    }
  }, [])
  const [currentTab, setCurrentTab] = useState("basic")
  const lastSyncedTabRef = useRef<string | null>(null)
  const statusInitializedRef = useRef(false)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [agentQuestions, setAgentQuestions] = useState<Record<string, string[]>>({
    "Phone Screening": []
  })
  // NEW FORMAT: Questions with id, question, criterion, weight
  const [agentQuestionsWithWeight, setAgentQuestionsWithWeight] = useState<Record<string, Array<{ id: number; question: string; criterion: string; weight: 'high' | 'medium' | 'low' }>>>({
    "Phone Screening": []
  })
  const [agentCriteria, setAgentCriteria] = useState<Record<string, string[]>>({
    "Phone Screening": ["Technical Skills", "Communication", "Experience"]
  })
  const [createdJobId, setCreatedJobId] = useState<string | null>(null)
  const [draftJobId, setDraftJobId] = useState<string | null>(null)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  
  // Job status: open | on_hold | closed | cancelled
  
  // Set default question and criteria when in edit mode
  useEffect(() => {
    if (isEditing) {
      setAgentQuestions({
        "Phone Screening": [
          "Can you walk me through your experience relevant to this role?"
        ]
      });
      setAgentCriteria({
        "Phone Screening": ["Communication", "Technical Skills", "Experience", "Problem Solving"]
      });
    }
  }, [isEditing]);

  // Helper: parse varied salary labels into structured fields
  const normalizeStatus = (val?: string | null): 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled' | undefined => {
    if (!val) return undefined
    const v = String(val).toLowerCase().trim()
    if (v === 'draft') return 'draft'
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
    let initialStatus: 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled' = 'open'
    try {
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search)
        const jobId = sp.get('jobId')
        if (jobId) {
          const saved = localStorage.getItem(`jobStatus:${jobId}`)
          const norm = ((): 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled' | undefined => {
            const v = saved?.toLowerCase().trim()
            if (v === 'draft') return 'draft'
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
      status: initialStatus as 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled', // job status

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
      salaryCurrency: "INR",
      bonus: "",
      perks: "",
      timeOff: "",

      // New section: Logistics
      joining: "",
      travel: "",
      visa: "",

      // Notice Period
      noticePeriodMonths: "",
      noticePeriodNegotiable: "",

      // Summary Tab
      sendInterviewLinkAutomatically: true,
      detailsConfirmed: false,
      descriptionMd: "",

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

      // Screening Questions - Resume Screening Feature Toggle
      screeningEnabled: false,
      resumeScreeningEnabled: false,
      screeningOverallExp: "",
      screeningPrimarySkill: "",
      screeningCurrentLocation: "",
      screeningNationality: "",
      screeningVisaRequired: "no",
      screeningLanguageProficiency: "intermediate",
      screeningCurrentSalary: "",
    }
  })

  // Determine if form should be read-only based on job status
  // Draft jobs should be editable, all other statuses (open, closed, on_hold, cancelled) remain read-only
  const isReadOnly = isEditing && formData.status !== 'draft'

  // Prefill when editing: if jobId is present in URL, fetch job and populate form
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return
    ;(async () => {
      try {
        // Draft edit: load full saved draft form data (if available)
        let hasLocalDraftForm = false
        if (isDraftEdit && typeof window !== 'undefined') {
          const savedDraftForm = localStorage.getItem(`draftFormData:${jobId}`)
          if (savedDraftForm) {
            try {
              const parsed = JSON.parse(savedDraftForm)
              if (parsed && typeof parsed === 'object') {
                hasLocalDraftForm = true
                setFormData((prev) => ({ ...prev, ...parsed, status: 'draft' }))
                setCreatedJobId(jobId)
                statusInitializedRef.current = true
                try {
                  localStorage.setItem(`jobStatus:${jobId}`, 'draft')
                  localStorage.setItem(`applyFormEnabled:${jobId}`, 'false')
                } catch {}
              }
            } catch {}
          }
        }

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
                sendInterviewLinkAutomatically:
                  typeof (j as any).auto_schedule_interview === 'boolean'
                    ? (j as any).auto_schedule_interview
                    : prev.sendInterviewLinkAutomatically,
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
              if (isDraftEdit && hasLocalDraftForm) {
                return mergePreferNonEmpty(prev, next)
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
                sendInterviewLinkAutomatically:
                  typeof j.auto_schedule_interview === 'boolean'
                    ? j.auto_schedule_interview
                    : prev.sendInterviewLinkAutomatically,
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
                // Notice Period
                noticePeriodMonths: j.notice_period_months != null ? String(j.notice_period_months) : prev.noticePeriodMonths,
                noticePeriodNegotiable: j.notice_period_negotiable ? 'yes' : 'no',
              }
              // Mark status initialized after deriving it and persist server truth to localStorage
              statusInitializedRef.current = true
              // If we already restored a full draft from localStorage, do not overwrite non-empty fields
              if (isDraftEdit && hasLocalDraftForm) {
                return mergePreferNonEmpty(prev, next)
              }
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

  // Load interview questions when editing an existing job
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId || !company?.name) return
    
    ;(async () => {
      try {
        console.log('🔍 Loading interview questions for job:', jobId)
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/rounds`, {
          cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        
        if (res.ok && data?.ok && Array.isArray(data.rounds)) {
          console.log('📝 Found rounds:', data.rounds.length)
          
          // Extract questions and criteria from job_rounds configuration
          const loadedQuestions: Record<string, string[]> = {}
          const loadedQuestionsWithWeight: Record<string, Array<{ id: number; question: string; criterion: string; weight: 'high' | 'medium' | 'low' }>> = {}
          const loadedCriteria: Record<string, string[]> = {}
          
          // Process each round's configuration
          for (const round of data.rounds) {
            const roundName = round.name
            
            if (round.configuration) {
              try {
                const config = typeof round.configuration === 'string' 
                  ? JSON.parse(round.configuration) 
                  : round.configuration
                
                if (config.questions && Array.isArray(config.questions)) {
                  // Check if NEW FORMAT (objects with id, question, criterion, weight)
                  const isNewFormat = config.questions.length > 0 && 
                    typeof config.questions[0] === 'object' && 
                    'question' in config.questions[0] && 
                    'criterion' in config.questions[0]
                  
                  if (isNewFormat) {
                    // NEW FORMAT: Store in both states
                    loadedQuestionsWithWeight[roundName] = config.questions
                    loadedQuestions[roundName] = config.questions.map((q: any) => q.question)
                    
                    // Extract unique criteria from questions
                    const criteriaSet = new Set(config.questions.map((q: any) => q.criterion))
                    loadedCriteria[roundName] = Array.from(criteriaSet) as string[]
                    
                    console.log(`✅ Loaded ${config.questions.length} questions in NEW FORMAT for round: ${roundName}`)
                  } else {
                    // OLD FORMAT: string array
                    loadedQuestions[roundName] = config.questions
                    console.log(`✅ Loaded ${config.questions.length} questions in OLD FORMAT for round: ${roundName}`)
                  }
                }
                
                // Also load criteria if stored separately (for backward compat)
                if (config.criteria && Array.isArray(config.criteria) && !loadedCriteria[roundName]) {
                  loadedCriteria[roundName] = config.criteria
                  console.log(`✅ Loaded ${config.criteria.length} criteria for round: ${roundName}`)
                }
              } catch (e) {
                console.warn(`⚠️ Could not parse config for round ${roundName}:`, e)
              }
            }
          }
          
          // Update state with loaded questions and criteria
          if (Object.keys(loadedQuestions).length > 0) {
            setAgentQuestions(prev => ({ ...prev, ...loadedQuestions }))
            console.log('📋 Updated agentQuestions with loaded data')
          }
          
          if (Object.keys(loadedQuestionsWithWeight).length > 0) {
            setAgentQuestionsWithWeight(prev => ({ ...prev, ...loadedQuestionsWithWeight }))
            console.log('📋 Updated agentQuestionsWithWeight with NEW FORMAT data')
          }
          
          if (Object.keys(loadedCriteria).length > 0) {
            setAgentCriteria(prev => ({ ...prev, ...loadedCriteria }))
            console.log('📋 Updated agentCriteria with loaded data')
          }
        }
      } catch (e) {
        console.warn('Failed to load interview questions:', e)
      }
    })()
  }, [searchParams, company?.name])

  // Initialize tab from URL once on mount to avoid feedback loops
  useEffect(() => {
    const t = searchParams.get('tab')
    const allowed = ['basic', 'requirements', 'responsibilities', 'compensation', 'resume-screening', 'interview', 'summary']
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

  // Auto-populate descriptionMd when navigating to Summary tab
  useEffect(() => {
    if (currentTab === 'summary' && !formData.descriptionMd) {
      const generatedDesc = generateStructuredDescription()
      setFormData(prev => ({ ...prev, descriptionMd: generatedDesc }))
    }
  }, [currentTab])

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
    // Mandatory: Years of Experience, Primary Skills (technical), Languages
    return formData.years.trim() !== '' && 
           formData.technical.trim() !== '' && 
           formData.languages.trim() !== ''
  }

  const isResponsibilitiesValid = () => {
    return formData.day.trim() !== ''
  }

  const isCompensationValid = () => {
    // Mandatory: Salary Min, Salary Max, Visa/Work Authorization
    return formData.salaryMin.trim() !== '' && 
           formData.salaryMax.trim() !== '' &&
           formData.visa.trim() !== ''
  }

  const isResumeScreeningValid = () => {
    // Resume screening tab is always valid - it's optional configuration
    // Users can skip it or fill it partially
    return true
  }

  const isInterviewValid = () => {
    return formData.interviewRounds.length > 0
  }

  const isSummaryValid = () => {
    return formData.detailsConfirmed === true
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const generateJobLink = () => {
    const jobId = createdJobId || searchParams.get('jobId')
    if (jobId) {
      return `${typeof window !== 'undefined' ? window.location.origin : ''}/apply?jobId=${jobId}`
    }
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/jobs/apply`
  }

  // Get validation status for current tab
  const isCurrentTabValid = () => {
    switch (currentTab) {
      case 'basic': return isBasicInfoValid()
      case 'requirements': return isRequirementsValid()
      case 'responsibilities': return isResponsibilitiesValid()
      case 'compensation': return isCompensationValid()
      case 'resume-screening': return isResumeScreeningValid()
      case 'interview': return isInterviewValid()
      case 'summary': return isSummaryValid()
      default: return false
    }
  }

  // Navigate to next tab
  const goToNextTab = () => {
    const tabs = ['basic', 'requirements', 'responsibilities', 'compensation', 'resume-screening', 'interview', 'summary']
    const currentIndex = tabs.indexOf(currentTab)
    if (currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1])
      // Update URL
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tabs[currentIndex + 1])
      router.push(`/dashboard/jobs/new?${params.toString()}`, { scroll: false })
    }
  }

  // Handle next button click
  const handleNext = () => {
    goToNextTab()
  }

  // Generate interview questions using AI (NEW: Criteria-based approach)
  const handleGenerateQuestions = async (round: string) => {
    const selectedCriteria = agentCriteria[round] || []
    
    // Validate criteria selection
    if (selectedCriteria.length === 0) {
      alert('Please select at least one evaluation criterion before generating questions.')
      return
    }
    if (selectedCriteria.length > MAX_CRITERIA_SELECTION) {
      alert(`Maximum ${MAX_CRITERIA_SELECTION} criteria can be selected. Please remove some criteria.`)
      return
    }

    setGeneratingQuestions(true)
    try {
      const jobDescription = generateStructuredDescription()
      const jobIdForUsage = createdJobId || searchParams.get('jobId') || draftJobId
      
      console.log('\n' + '='.repeat(70))
      console.log('💰 [QUESTION GENERATION] Starting CRITERIA-BASED question generation...')
      console.log('📋 Company ID:', company?.id || 'N/A')
      console.log('💼 Job ID:', jobIdForUsage || 'N/A (draft)')
      console.log('🎯 Selected Criteria:', selectedCriteria.join(', '))
      console.log('❓ Total Questions:', TOTAL_AI_QUESTIONS)
      console.log('='.repeat(70))

      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: formData.jobTitle,
          jobDescription,
          selectedCriteria,
          useCriteriaBased: true,
          companyId: company?.id || null,
          jobId: jobIdForUsage || null
        })
      })

      const data = await res.json()

      // Handle pre-condition failure
      if (!res.ok) {
        if (data.preConditionFailed) {
          alert(data.error)
          return
        }
        throw new Error(data.error || 'Failed to generate questions')
      }

      // Log usage data
      const usage = data?.usage
      if (usage && typeof usage.promptTokens === 'number') {
        console.log('\n' + '-'.repeat(60))
        console.log('✅ [QUESTION GENERATION] Using REAL OpenAI token data!')
        console.log('🤖 Prompt Tokens:', usage.promptTokens)
        console.log('✍️  Completion Tokens:', usage.completionTokens)
        console.log('📝 Total Tokens:', (usage.promptTokens || 0) + (usage.completionTokens || 0))
        console.log('🎯 Mode:', data.mode || 'criteria-based')
        console.log('-'.repeat(60) + '\n')
      }

      // Use NEW FORMAT (questionsWithWeight) if available
      const questionsWithWeight = data.questionsWithWeight
      const generatedQuestions = data.questions || []
      
      if (questionsWithWeight && questionsWithWeight.length > 0) {
        // Store questions in NEW FORMAT with id, question, criterion, weight
        console.log('📊 [NEW FORMAT] Questions with criterion and weight:')
        questionsWithWeight.forEach((q: any, i: number) => {
          console.log(`  Q${q.id}: [${q.criterion}] (${q.weight}) ${q.question.substring(0, 50)}...`)
        })
        
        // Store in new format state
        setAgentQuestionsWithWeight({
          ...agentQuestionsWithWeight,
          [round]: questionsWithWeight
        })
        
        // Also store plain question text for backward compatibility
        setAgentQuestions({
          ...agentQuestions,
          [round]: questionsWithWeight.map((q: any) => q.question)
        })
      } else {
        // Fallback to old format - transform to new format with default criterion
        const transformedQuestions = generatedQuestions.map((q: string, idx: number) => ({
          id: idx + 1,
          question: q,
          criterion: selectedCriteria[idx % selectedCriteria.length] || 'Technical Skills',
          weight: 'medium' as const
        }))
        
        setAgentQuestionsWithWeight({
          ...agentQuestionsWithWeight,
          [round]: transformedQuestions
        })
        
        setAgentQuestions({
          ...agentQuestions,
          [round]: generatedQuestions
        })
      }

      console.log('🎉 [QUESTION GENERATION] Generated', generatedQuestions.length, 'questions in NEW FORMAT!')
      alert(`Generated ${generatedQuestions.length} questions successfully!`)
    } catch (error) {
      console.error('Error generating questions:', error)
      console.log('❌ [QUESTION GENERATION] ERROR: Failed to generate questions')
      alert('Failed to generate questions. Please try again.')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  // Generate structured description (without basic info - that's shown separately in Summary tab)
  const generateStructuredDescription = () => {
    const salaryRange = formData.salaryMin && formData.salaryMax 
      ? `₹${parseInt(formData.salaryMin).toLocaleString()} – ₹${parseInt(formData.salaryMax).toLocaleString()} per ${formData.period?.toLowerCase() || 'month'}`
      : 'Competitive salary'
    
    return `About the Role
We are seeking a ${formData.jobTitle || 'professional'} to join ${company?.name || 'our team'}. This role involves ${formData.day ? formData.day.split(',')[0]?.trim() : 'contributing to our team\'s success'} while collaborating with ${formData.collaboration ? formData.collaboration.split(',').slice(0,2).join(' and ') : 'cross-functional teams'} to deliver business impact.

🔹 Key Responsibilities
${formData.day ? formData.day.split(/[,\n]/).map((d: string) => d.trim()).filter(Boolean).map((duty: string) => `• ${duty.charAt(0).toUpperCase() + duty.slice(1)}`).join('\n') : '• Develop and maintain solutions as per business requirements.'}
${formData.project ? formData.project.split(/[,\n]/).map((d: string) => d.trim()).filter(Boolean).map((duty: string) => `• ${duty.charAt(0).toUpperCase() + duty.slice(1)}`).join('\n') : ''}
${formData.collaboration ? `• Collaborate with ${formData.collaboration.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join(', ')}` : ''}
${formData.scope ? `• ${formData.scope}` : ''}

🔹 Requirements
🎓 Education & Certifications
${formData.education || 'Bachelor\'s degree in relevant field or equivalent experience.'}

📅 Experience
${formData.years || 'Experience as per role requirements'}

🛠️ Primary Skills (Must-Have)
${formData.technical ? formData.technical.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => `• ${s}`).join('\n') : '• Technical skills as per job requirements'}
${formData.mustHave ? formData.mustHave.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => `• ${s}`).join('\n') : ''}

✨ Nice-to-Have Skills
${formData.niceToHave ? formData.niceToHave.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => `• ${s}`).join('\n') : '• Additional skills welcome'}

${formData.domain ? `🌐 Domain Knowledge\n${formData.domain.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => `• ${s}`).join('\n')}\n\n` : ''}🤝 Soft Skills
${formData.soft ? formData.soft.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => `• ${s}`).join('\n') : '• Strong communication and stakeholder management\n• Problem-solving and adaptability\n• Leadership and team collaboration'}

${formData.languages ? `🗣️ Languages\n${formData.languages.split(/[,\n]/).map((l: string) => l.trim()).filter(Boolean).map((l: string) => `• ${l}`).join('\n')}\n\n` : ''}🔹 Compensation & Benefits
💰 Salary Range: ${salaryRange}
${formData.bonus ? `🎁 Bonus: ${formData.bonus}` : '🎁 Bonus: Performance-based incentives'}
${formData.perks ? `✨ Perks: ${formData.perks.split(/[,\n]/).map((p: string) => p.trim()).filter(Boolean).join(', ')}` : '✨ Perks: Health insurance, flexible working hours, wellness programs'}
${formData.timeOff ? `🌴 Time Off Policy: ${formData.timeOff}` : '🌴 Time Off Policy: Competitive leave policy'}

🔹 Logistics
📆 Joining Timeline: ${formData.joining || 'Within 30 days'}
${formData.travel ? `✈️ Travel Requirements: ${formData.travel}` : '✈️ Travel Requirements: Minimal travel as per project needs'}
📝 Work Authorization: ${formData.visa || 'Work authorization required'}
⏰ Notice Period: ${formData.noticePeriodMonths || 'Negotiable'} months ${formData.noticePeriodNegotiable === 'yes' ? '(negotiable)' : ''}
`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Use user-edited descriptionMd if available, otherwise generate fresh
      const compiledDescription = formData.descriptionMd || generateStructuredDescription()
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
        // Auto-transition from DRAFT to OPEN on final submission
        updates.status = formData.status === 'draft' ? 'open' : formData.status
        updates.auto_schedule_interview = formData.sendInterviewLinkAutomatically === true
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
        // Notice period
        if (formData.noticePeriodMonths) updates.notice_period_months = parseInt(formData.noticePeriodMonths)
        if (formData.noticePeriodNegotiable) updates.notice_period_negotiable = formData.noticePeriodNegotiable === 'yes'
        // Currency and Resume Screening
        if (formData.salaryCurrency) updates.salary_currency = formData.salaryCurrency
        updates.resume_screening_enabled = formData.resumeScreeningEnabled === true
        res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company?.name || '')}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        data = await res.json()
      } else {
        // POST create flow - always create as 'open' status (not draft)
        res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status: 'open', // Final submission always creates as Open
            auto_schedule_interview: formData.sendInterviewLinkAutomatically,
            description: compiledDescription || formData.description || '',
            requirements: compiledRequirements || formData.requirements || '',
            companyId: company?.id, // Pass companyId directly
            createdBy: user?.email || null, // Pass email instead of user ID
            draftJobId: draftJobId || null, // Pass draft job ID for usage reconciliation
          }),
        })
        data = await res.json()
      }
      if (!res.ok || !data?.ok) {
        // Check if it's a trial limit error
        if (data?.code === 'TRIAL_JD_LIMIT_REACHED') {
          alert('🎉 Free Trial Limit Reached!\n\n' + 
                data?.error + '\n\n' +
                'Go to Billing → Settings to recharge your wallet and unlock unlimited access.')
        } else {
          alert(data?.error || 'Failed to save job')
        }
        throw new Error(data?.error || 'Failed to save job')
      }

      // Store minimal info - status is now 'open' after final submission
      const finalJobId = data.jobId || jobIdToUpdate
      const finalStatus = 'open' // After final submission, job is always open
      const jobData = {
        ...formData,
        status: finalStatus,
        id: finalJobId,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem('newJobData', JSON.stringify(jobData))
      localStorage.setItem('selectedInterviewRounds', JSON.stringify(formData.interviewRounds))
      // Update localStorage status to 'open' (no longer draft)
      if (finalJobId) {
        localStorage.setItem(`jobStatus:${finalJobId}`, finalStatus)
        localStorage.setItem(`applyFormEnabled:${finalJobId}`, 'true')
      }

      // Save interview questions in NEW FORMAT to database
      if (formData.interviewRounds.length > 0 && finalJobId) {
        try {
          // Use NEW FORMAT: questions with id, question, criterion, weight
          const roundsData = formData.interviewRounds.map(round => {
            const questionsWithWeight = agentQuestionsWithWeight[round] || []
            
            // If we have new format, use it directly
            if (questionsWithWeight.length > 0) {
              return {
                roundName: round,
                questions: questionsWithWeight, // NEW FORMAT: Array<{ id, question, criterion, weight }>
                criteria: agentCriteria[round] || [] // Keep for backward compat
              }
            }
            
            // Fallback: transform old format to new format
            const oldQuestions = agentQuestions[round] || []
            const criteria = agentCriteria[round] || ['Technical Skills']
            const transformedQuestions = oldQuestions.map((q, idx) => ({
              id: idx + 1,
              question: q,
              criterion: criteria[idx % criteria.length] || 'Technical Skills',
              weight: 'medium' as const
            }))
            
            return {
              roundName: round,
              questions: transformedQuestions,
              criteria: criteria
            }
          })

          console.log('📝 Saving questions in NEW FORMAT for job:', finalJobId)
          console.log('📋 Rounds data:', JSON.stringify(roundsData, null, 2))

          const saveRes = await fetch(`/api/jobs/${encodeURIComponent(finalJobId)}/rounds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roundsData })
          })

          const saveData = await saveRes.json()
          
          if (!saveRes.ok) {
            console.error('❌ Failed to save interview questions:', saveData)
          } else {
            console.log('✅ Questions saved successfully in NEW FORMAT')
          }
        } catch (error) {
          console.error('❌ Error saving interview questions:', error)
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

  // Save as Draft handler
  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    try {
      const compiledDescription = formData.descriptionMd || generateStructuredDescription()
      const compiledRequirements = formData.requirements || 'As per job requirements'
      
      const jobIdToUpdate = createdJobId || searchParams.get('jobId')
      
      if (jobIdToUpdate) {
        // Update existing draft
        const updates: any = {
          status: 'draft',
          title: formData.jobTitle || 'Untitled Draft',
          location: formData.location || '',
          description_md: compiledDescription,
          responsibilities_md: compiledRequirements,
          auto_schedule_interview: formData.sendInterviewLinkAutomatically === true,
        }
        if (formData.jobType) {
          const mappedEmpType = toDbEmploymentType(formData.jobType)
          if (mappedEmpType) updates.employment_type = mappedEmpType
        }
        if (formData.experienceLevel) {
          const mappedLevel = toDbExperienceLevel(formData.experienceLevel)
          if (mappedLevel) updates.experience_level = mappedLevel
        }
        if (formData.salaryMin || formData.salaryMax) {
          updates.salary_level = `${formData.salaryMin || ''}-${formData.salaryMax || ''} (${formData.period || 'Monthly'})`
        }
        
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobIdToUpdate)}?company=${encodeURIComponent(company?.name || '')}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to save draft')
        }
        try {
          setCreatedJobId(jobIdToUpdate)
          localStorage.setItem(
            `draftFormData:${jobIdToUpdate}`,
            JSON.stringify({ ...formData, status: 'draft' })
          )
          localStorage.setItem(`jobStatus:${jobIdToUpdate}`, 'draft')
          localStorage.setItem(`applyFormEnabled:${jobIdToUpdate}`, 'false')
        } catch {}
        alert('Draft saved successfully!')
      } else {
        // Create new draft
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            status: 'draft',
            auto_schedule_interview: formData.sendInterviewLinkAutomatically === true,
            jobTitle: formData.jobTitle || 'Untitled Draft',
            description: compiledDescription,
            requirements: compiledRequirements,
            companyId: company?.id,
            createdBy: user?.email || null,
            draftJobId: draftJobId || null,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          if (data?.code === 'TRIAL_JD_LIMIT_REACHED') {
            alert('🎉 Free Trial Limit Reached!\n\n' + data?.error)
          } else {
            throw new Error(data?.error || 'Failed to save draft')
          }
          return
        }
        // Store the created job ID for future saves
        if (data.jobId) {
          setCreatedJobId(data.jobId)
          try {
            localStorage.setItem(
              `draftFormData:${data.jobId}`,
              JSON.stringify({ ...formData, status: 'draft' })
            )
            localStorage.setItem(`jobStatus:${data.jobId}`, 'draft')
            localStorage.setItem(`applyFormEnabled:${data.jobId}`, 'false')
          } catch {}
        }
        alert('Draft saved successfully!')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      alert((error as Error).message || 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Detailed agent catalog
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
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
      <div className="mb-5 sm:mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-3 sm:mb-4 hover:bg-gray-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isDraftEdit ? 'Complete the Draft Job' : (isEditing ? 'Edit Job' : 'Create New Job')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isDraftEdit ? 'Finish your draft and publish it when ready' : (isEditing ? 'Review and update the job details' : 'Fill out the details to create a comprehensive job posting')}
        </p>

        {/* Top bar Job Status selector */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div>
            <div className="font-semibold text-gray-900">Job Status</div>
            <div className="text-sm text-gray-600">
              {formData.status === 'draft' ? 'This job is in draft mode. Submit to publish.' : 'Set whether the job is open, on hold, or closed'}
            </div>
          </div>
          <div className="w-full sm:w-auto">
            {/* Draft jobs show only Draft status (not changeable until final submission) */}
            {formData.status === 'draft' ? (
              <div className="w-full sm:w-[200px] px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 font-medium text-sm">
                Draft
              </div>
            ) : (
              <Select
                value={formData.status}
                onValueChange={(val) => handleInputChange('status', val)}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-300">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
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
          {/* Mobile scrollable container */}
          <div className="w-full overflow-x-auto pb-2 -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-7 gap-1 p-0.5 rounded-xl border border-gray-200 bg-transparent shadow-none">
              <TabsTrigger value="basic" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Basic Info</TabsTrigger>
              <TabsTrigger value="requirements" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Requirements</TabsTrigger>
              <TabsTrigger value="responsibilities" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Responsibilities</TabsTrigger>
              <TabsTrigger value="compensation" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Compensation</TabsTrigger>
              <TabsTrigger value="resume-screening" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Screening Questions</TabsTrigger>
              <TabsTrigger value="interview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Interview Process</TabsTrigger>
              <TabsTrigger value="summary" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-emerald-50 data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent px-2 sm:px-3 py-2 text-[9px] sm:text-xs rounded-lg font-medium whitespace-nowrap transition-all flex items-center justify-center">Summary</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic" className="space-y-6">
            <Card className="shadow-sm border-gray-200 rounded-xl bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Briefcase className="h-5 w-5 text-emerald-600" />
                  </div>
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Enter the fundamental details about the job position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Senior Software Engineer"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      required
                      readOnly={isReadOnly}
                      disabled={isReadOnly}
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g. San Francisco, CA"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      required
                      readOnly={isReadOnly}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Work Arrangement *</Label>
                    <Select value={formData.jobType} onValueChange={(value) => handleInputChange('jobType', value)} disabled={isReadOnly}>
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
                  <Select value={formData.experienceLevel} onValueChange={(value) => handleInputChange('experienceLevel', value)} disabled={isReadOnly}>
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
                    <Input id="education" placeholder="e.g., BSc CS; Azure Certs" value={formData.education} onChange={(e)=>handleInputChange('education', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years">Years of Experience <span className="text-red-500">*</span></Label>
                    <Input id="years" placeholder="e.g., 5–8 years (min 5)" value={formData.years} onChange={(e)=>handleInputChange('years', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technical">Primary Skills <span className="text-red-500">*</span></Label>
                  <Textarea id="technical" placeholder="Hard skills, tools, languages, platforms" value={formData.technical} onChange={(e)=>handleInputChange('technical', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain Knowledge</Label>
                  <Textarea id="domain" placeholder="Industry-specific expertise" value={formData.domain} onChange={(e)=>handleInputChange('domain', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soft">Soft Skills</Label>
                  <Textarea id="soft" placeholder="Communication, leadership, problem-solving, adaptability" value={formData.soft} onChange={(e)=>handleInputChange('soft', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages <span className="text-red-500">*</span></Label>
                    <Input id="languages" placeholder="e.g., English (required), Mandarin (nice-to-have)" value={formData.languages} onChange={(e)=>handleInputChange('languages', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-2"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mustHave">Must‑Have Skills</Label>
                    <Textarea id="mustHave" placeholder="List must-haves, one per line" value={formData.mustHave} onChange={(e)=>handleInputChange('mustHave', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="niceToHave">Nice‑to‑Have Skills</Label>
                    <Textarea id="niceToHave" placeholder="List nice-to-haves, one per line" value={formData.niceToHave} onChange={(e)=>handleInputChange('niceToHave', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
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
                  <Textarea id="day" placeholder="Regular tasks (one per line)" value={formData.day} onChange={(e)=>handleInputChange('day', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project">Project / Strategic Duties</Label>
                  <Textarea id="project" placeholder="Long‑term contributions (one per line)" value={formData.project} onChange={(e)=>handleInputChange('project', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collaboration">Team Collaboration / Stakeholders</Label>
                  <Textarea id="collaboration" placeholder="Cross‑functional interactions (one per line)" value={formData.collaboration} onChange={(e)=>handleInputChange('collaboration', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Decision‑Making Scope</Label>
                  <Textarea id="scope" placeholder="Budget, people management, strategic influence" value={formData.scope} onChange={(e)=>handleInputChange('scope', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryCurrency">Currency</Label>
                    <Select value={formData.salaryCurrency} onValueChange={(value)=>handleInputChange('salaryCurrency', value)} disabled={isReadOnly}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                        <SelectItem value="CNY">CNY (¥)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                        <SelectItem value="CHF">CHF (Fr)</SelectItem>
                        <SelectItem value="SGD">SGD ($)</SelectItem>
                        <SelectItem value="HKD">HKD ($)</SelectItem>
                        <SelectItem value="NZD">NZD ($)</SelectItem>
                        <SelectItem value="SEK">SEK (kr)</SelectItem>
                        <SelectItem value="NOK">NOK (kr)</SelectItem>
                        <SelectItem value="DKK">DKK (kr)</SelectItem>
                        <SelectItem value="PLN">PLN (zł)</SelectItem>
                        <SelectItem value="CZK">CZK (Kč)</SelectItem>
                        <SelectItem value="HUF">HUF (Ft)</SelectItem>
                        <SelectItem value="RUB">RUB (₽)</SelectItem>
                        <SelectItem value="BRL">BRL (R$)</SelectItem>
                        <SelectItem value="MXN">MXN ($)</SelectItem>
                        <SelectItem value="ZAR">ZAR (R)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                        <SelectItem value="SAR">SAR (﷼)</SelectItem>
                        <SelectItem value="KWD">KWD (د.ك)</SelectItem>
                        <SelectItem value="QAR">QAR (﷼)</SelectItem>
                        <SelectItem value="BHD">BHD (د.ب)</SelectItem>
                        <SelectItem value="OMR">OMR (ر.ع.)</SelectItem>
                        <SelectItem value="JOD">JOD (د.ا)</SelectItem>
                        <SelectItem value="LKR">LKR (රු)</SelectItem>
                        <SelectItem value="NPR">NPR (रू)</SelectItem>
                        <SelectItem value="BDT">BDT (৳)</SelectItem>
                        <SelectItem value="PKR">PKR (₨)</SelectItem>
                        <SelectItem value="LBP">LBP (ل.ل)</SelectItem>
                        <SelectItem value="EGP">EGP (ج.م)</SelectItem>
                        <SelectItem value="KES">KES (KSh)</SelectItem>
                        <SelectItem value="UGX">UGX (USh)</SelectItem>
                        <SelectItem value="TZS">TZS (TSh)</SelectItem>
                        <SelectItem value="GHS">GHS (GH₵)</SelectItem>
                        <SelectItem value="NGN">NGN (₦)</SelectItem>
                        <SelectItem value="XAF">XAF (FCFA)</SelectItem>
                        <SelectItem value="XOF">XOF (CFA)</SelectItem>
                        <SelectItem value="XPF">XPF (₣)</SelectItem>
                        <SelectItem value="VND">VND (₫)</SelectItem>
                        <SelectItem value="THB">THB (฿)</SelectItem>
                        <SelectItem value="MYR">MYR (RM)</SelectItem>
                        <SelectItem value="IDR">IDR (Rp)</SelectItem>
                        <SelectItem value="PHP">PHP (₱)</SelectItem>
                        <SelectItem value="KRW">KRW (₩)</SelectItem>
                        <SelectItem value="TWD">TWD (NT$)</SelectItem>
                        <SelectItem value="MOP">MOP (MOP$)</SelectItem>
                        <SelectItem value="ISK">ISK (kr)</SelectItem>
                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                        <SelectItem value="ILS">ILS (₪)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Salary Min</Label>
                    <Input id="salaryMin" type="number" placeholder="e.g., 6000" value={formData.salaryMin} onChange={(e)=>handleInputChange('salaryMin', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Salary Max</Label>
                    <Input id="salaryMax" type="number" placeholder="e.g., 9000" value={formData.salaryMax} onChange={(e)=>handleInputChange('salaryMax', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select value={formData.period} onValueChange={(value)=>handleInputChange('period', value)} disabled={isReadOnly}>
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
                  <Input id="bonus" placeholder="e.g., 10% annual bonus; RSUs" value={formData.bonus} onChange={(e)=>handleInputChange('bonus', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perks">Perks & Benefits</Label>
                  <Textarea id="perks" placeholder="Health, insurance, stock options, learning budget, wellness" value={formData.perks} onChange={(e)=>handleInputChange('perks', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeOff">Time Off Policy</Label>
                  <Input id="timeOff" placeholder="e.g., 18 AL, sick leave, parental leave" value={formData.timeOff} onChange={(e)=>handleInputChange('timeOff', e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="interview" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start sm:items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (isEditing) return
                                    handleArrayChange('interviewRounds', round, e.target.checked)
                                  }}
                                  disabled={isReadOnly}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 sm:mt-0"
                                />
                                <Bot className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <CardTitle className="text-base truncate">{cfg.name}</CardTitle>
                                  <CardDescription className="text-xs mt-1 line-clamp-2">
                                    {cfg.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-2">
                                <span className="text-xs text-gray-500 truncate">Phone/Video • {cfg.duration} • Pass/Fail + notes</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                              </div>
                            </div>
                          </CardHeader>

                          {isExpanded && (
                            <CardContent className="pt-4 space-y-6 border-t bg-white">
                              {/* Evaluation Criteria Section - MOVED TO TOP */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold">Creating/Evaluation Criteria</Label>
                                  <span className={`text-xs ${criteria.length > MAX_CRITERIA_SELECTION ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                    {criteria.length}/{MAX_CRITERIA_SELECTION} selected
                                  </span>
                                </div>
                                
                                {criteria.length > MAX_CRITERIA_SELECTION && (
                                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>Maximum {MAX_CRITERIA_SELECTION} criteria allowed. Please deselect some criteria.</span>
                                  </div>
                                )}
                                
                                {/* Selected Criteria Badges */}
                                {criteria.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pb-2">
                                    {criteria.map((criterion, idx) => {
                                      const criteriaInfo = EVALUATION_CRITERIA.find(c => c.name === criterion)
                                      return (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className={`px-3 py-1 text-xs flex items-center gap-1 ${criteriaInfo?.color || 'bg-gray-100 text-gray-800'}`}
                                        >
                                          <span>{criteriaInfo?.icon || '📋'}</span>
                                          {criterion}
                                          {isCreateFlow && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newCriteria = criteria.filter((_, i) => i !== idx)
                                                setAgentCriteria({ ...agentCriteria, [round]: newCriteria })
                                              }}
                                              className="ml-1 hover:text-red-500 font-bold"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                )}
                                
                                {/* Criteria Checkbox Grid */}
                                {!isEditing && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    {EVALUATION_CRITERIA.map((criteriaItem) => {
                                      const isSelected = criteria.includes(criteriaItem.name)
                                      const isDisabled = !isSelected && criteria.length >= MAX_CRITERIA_SELECTION
                                      
                                      return (
                                        <label
                                          key={criteriaItem.id}
                                          className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                            isSelected 
                                              ? 'bg-emerald-50 border border-emerald-200' 
                                              : isDisabled 
                                                ? 'opacity-50 cursor-not-allowed' 
                                                : 'hover:bg-gray-100'
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            disabled={isDisabled}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                if (criteria.length < MAX_CRITERIA_SELECTION) {
                                                  setAgentCriteria({
                                                    ...agentCriteria,
                                                    [round]: [...criteria, criteriaItem.name]
                                                  })
                                                }
                                              } else {
                                                setAgentCriteria({
                                                  ...agentCriteria,
                                                  [round]: criteria.filter(c => c !== criteriaItem.name)
                                                })
                                              }
                                            }}
                                            className="mt-0.5 h-4 w-4 data-[state=checked]:bg-emerald-600"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                              <span className="text-sm">{criteriaItem.icon}</span>
                                              <span className="text-sm font-medium text-gray-900">{criteriaItem.name}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{criteriaItem.description}</p>
                                          </div>
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                                
                                {isEditing && (
                                  <div className="text-sm text-gray-500 py-1">
                                    Evaluation criteria cannot be modified in view mode
                                  </div>
                                )}
                                
                                {/* Info Box */}
                                <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
                                  <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-medium">AI will generate {TOTAL_AI_QUESTIONS} questions</span> distributed across your selected criteria. 
                                    Select criteria that best match the role requirements.
                                  </div>
                                </div>
                              </div>

                              {/* Interview Questions Section */}
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <Label className="text-sm font-semibold">Interview Questions ({questions.length})</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs w-full sm:w-auto"
                                    disabled={generatingQuestions || isEditing}
                                    onClick={() => handleGenerateQuestions(round)}
                                    title={isEditing ? "Cannot generate questions in edit mode" : "Generate questions"}
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
                                          <span className="text-sm text-gray-500 mt-2 flex-shrink-0">{idx + 1}.</span>
                                          <Input
                                            value={question}
                                            onChange={(e) => {
                                              if (!isEditing) {
                                                const newQuestions = [...questions]
                                                newQuestions[idx] = e.target.value
                                                setAgentQuestions({ ...agentQuestions, [round]: newQuestions })
                                              }
                                            }}
                                            className="flex-1 text-sm min-w-0"
                                            placeholder={isEditing ? "Questions are not editable in view mode" : "Enter question..."}
                                            readOnly={isReadOnly}
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
                                        if (!isEditing) {
                                          setAgentQuestions({
                                            ...agentQuestions,
                                            [round]: [...questions, ""]
                                          })
                                        }
                                      }}
                                      disabled={isReadOnly}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      {isEditing ? "View mode - questions cannot be modified" : "Add a custom question..."}
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
                                        if (!isEditing) {
                                          setAgentQuestions({
                                            ...agentQuestions,
                                            [round]: [""]
                                          })
                                        }
                                      }}
                                      disabled={isReadOnly}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      {isEditing ? "View mode - questions cannot be modified" : "Add a custom question..."}
                                    </Button>
                                  </div>
                                )}
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
            <Card className="shadow-sm border-gray-200 rounded-xl bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Resume Screening</CardTitle>
                <CardDescription>Configure resume screening to filter candidates before they can apply.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Resume Screening Feature Toggle */}
                <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Checkbox 
                    id="resume-screening-enabled" 
                    checked={!!formData.resumeScreeningEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, resumeScreeningEnabled: checked === true, screeningEnabled: checked === true }))}
                    className="h-5 w-5 data-[state=checked]:bg-emerald-600"
                    disabled={isReadOnly}
                  />
                  <div>
                    <Label htmlFor="resume-screening-enabled" className="font-medium cursor-pointer">
                      Enable Resume Screening for this Job
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, candidates will be redirected to a screening page before applying. 
                      When disabled, candidates go directly to the application form.
                    </p>
                  </div>
                </div>

                {formData.resumeScreeningEnabled && (
                  <div className="space-y-5">
                    {/* Experience Section */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="screeningOverallExp" className="text-sm text-gray-600">Total Years of Experience <span className="text-red-500">*</span></Label>
                          <Input
                            id="screeningOverallExp"
                            type="number"
                            min="0"
                            placeholder="e.g., 5"
                            value={formData.screeningOverallExp || formData.years?.match(/\d+/)?.[0] || ''}
                            onChange={(e) => handleInputChange('screeningOverallExp', e.target.value)}
                            className="mt-1"
                            required
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor="screeningPrimarySkill" className="text-sm text-gray-600">Primary Skill <span className="text-red-500">*</span></Label>
                          <Input
                            id="screeningPrimarySkill"
                            placeholder="e.g., UiPath, React, Python"
                            value={formData.screeningPrimarySkill || formData.technical || ''}
                            onChange={(e) => handleInputChange('screeningPrimarySkill', e.target.value)}
                            className="mt-1"
                            required
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="screeningCurrentLocation" className="text-sm text-gray-600">Preferred Location <span className="text-red-500">*</span></Label>
                          <Input
                            id="screeningCurrentLocation"
                            placeholder="e.g., Bangalore, India"
                            value={formData.screeningCurrentLocation || formData.location || ''}
                            onChange={(e) => handleInputChange('screeningCurrentLocation', e.target.value)}
                            className="mt-1"
                            required
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor="screeningNationality" className="text-sm text-gray-600">Nationality <span className="text-red-500">*</span></Label>
                          <Select 
                            value={formData.screeningNationality} 
                            onValueChange={(value) => handleInputChange('screeningNationality', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="indian">Indian</SelectItem>
                              <SelectItem value="us">US Citizen</SelectItem>
                              <SelectItem value="uk">UK Citizen</SelectItem>
                              <SelectItem value="eu">EU Citizen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Work Authorization */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Work Authorization <span className="text-red-500">*</span></Label>
                      <div className="flex gap-6">
                        <label className={`flex items-center gap-2 ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="visaRequired"
                            value="yes"
                            checked={formData.screeningVisaRequired === 'yes'}
                            onChange={(e) => handleInputChange('screeningVisaRequired', e.target.value)}
                            className="h-4 w-4 text-emerald-600"
                            disabled={isReadOnly}
                          />
                          <span className="text-sm">Visa sponsorship available</span>
                        </label>
                        <label className={`flex items-center gap-2 ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="visaRequired"
                            value="no"
                            checked={formData.screeningVisaRequired === 'no'}
                            onChange={(e) => handleInputChange('screeningVisaRequired', e.target.value)}
                            className="h-4 w-4 text-emerald-600"
                            disabled={isReadOnly}
                          />
                          <span className="text-sm">Must already have work authorization</span>
                        </label>
                      </div>
                    </div>

                    {/* Expected Salary */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="screeningCurrentSalary" className="text-sm text-gray-600">
                            Expected Salary ({formData.salaryCurrency || 'INR'}) <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              {formData.salaryCurrency === 'INR' && '₹'}
                              {formData.salaryCurrency === 'USD' && '$'}
                              {formData.salaryCurrency === 'EUR' && '€'}
                              {formData.salaryCurrency === 'GBP' && '£'}
                              {formData.salaryCurrency === 'JPY' && '¥'}
                              {formData.salaryCurrency === 'CNY' && '¥'}
                              {formData.salaryCurrency === 'CAD' && '$'}
                              {formData.salaryCurrency === 'AUD' && '$'}
                              {formData.salaryCurrency === 'CHF' && 'Fr'}
                              {formData.salaryCurrency === 'SGD' && '$'}
                              {formData.salaryCurrency === 'HKD' && '$'}
                              {formData.salaryCurrency === 'NZD' && '$'}
                              {formData.salaryCurrency === 'SEK' && 'kr'}
                              {formData.salaryCurrency === 'NOK' && 'kr'}
                              {formData.salaryCurrency === 'DKK' && 'kr'}
                              {formData.salaryCurrency === 'PLN' && 'zł'}
                              {formData.salaryCurrency === 'CZK' && 'Kč'}
                              {formData.salaryCurrency === 'HUF' && 'Ft'}
                              {formData.salaryCurrency === 'RUB' && '₽'}
                              {formData.salaryCurrency === 'BRL' && 'R$'}
                              {formData.salaryCurrency === 'MXN' && '$'}
                              {formData.salaryCurrency === 'ZAR' && 'R'}
                              {formData.salaryCurrency === 'AED' && 'د.إ'}
                              {formData.salaryCurrency === 'SAR' && '﷼'}
                              {formData.salaryCurrency === 'KWD' && 'د.ك'}
                              {formData.salaryCurrency === 'QAR' && '﷼'}
                              {formData.salaryCurrency === 'BHD' && 'د.ب'}
                              {formData.salaryCurrency === 'OMR' && 'ر.ع.'}
                              {formData.salaryCurrency === 'JOD' && 'د.ا'}
                              {formData.salaryCurrency === 'LKR' && 'රු'}
                              {formData.salaryCurrency === 'NPR' && 'रू'}
                              {formData.salaryCurrency === 'BDT' && '৳'}
                              {formData.salaryCurrency === 'PKR' && '₨'}
                              {formData.salaryCurrency === 'LBP' && 'ل.ل'}
                              {formData.salaryCurrency === 'EGP' && 'ج.م'}
                              {formData.salaryCurrency === 'KES' && 'KSh'}
                              {formData.salaryCurrency === 'UGX' && 'USh'}
                              {formData.salaryCurrency === 'TZS' && 'TSh'}
                              {formData.salaryCurrency === 'GHS' && 'GH₵'}
                              {formData.salaryCurrency === 'NGN' && '₦'}
                              {formData.salaryCurrency === 'XAF' && 'FCFA'}
                              {formData.salaryCurrency === 'XOF' && 'CFA'}
                              {formData.salaryCurrency === 'XPF' && '₣'}
                              {formData.salaryCurrency === 'VND' && '₫'}
                              {formData.salaryCurrency === 'THB' && '฿'}
                              {formData.salaryCurrency === 'MYR' && 'RM'}
                              {formData.salaryCurrency === 'IDR' && 'Rp'}
                              {formData.salaryCurrency === 'PHP' && '₱'}
                              {formData.salaryCurrency === 'KRW' && '₩'}
                              {formData.salaryCurrency === 'TWD' && 'NT$'}
                              {formData.salaryCurrency === 'MOP' && 'MOP$'}
                              {formData.salaryCurrency === 'ISK' && 'kr'}
                              {formData.salaryCurrency === 'TRY' && '₺'}
                              {formData.salaryCurrency === 'ILS' && '₪'}
                              {!formData.salaryCurrency && '₹'}
                            </span>
                            <Input
                              id="screeningCurrentSalary"
                              type="number"
                              min="0"
                              placeholder="e.g., 150000"
                              value={formData.screeningCurrentSalary || formData.salaryMax || ''}
                              onChange={(e) => handleInputChange('screeningCurrentSalary', e.target.value)}
                              className="pl-8"
                              required
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="screeningLanguage" className="text-sm text-gray-600">Language Proficiency</Label>
                          <Input
                            id="screeningLanguage"
                            type="text"
                            placeholder="e.g., English, Hindi, Spanish"
                            value={formData.screeningLanguageProficiency || formData.languages || ''}
                            onChange={(e) => handleInputChange('screeningLanguageProficiency', e.target.value)}
                            className="mt-1"
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notice Period */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="noticePeriodMonths" className="text-sm text-gray-600">Notice Period in Months <span className="text-red-500">*</span></Label>
                          <Input
                            id="noticePeriodMonths"
                            type="number"
                            min="0"
                            placeholder="e.g., 1"
                            value={formData.noticePeriodMonths}
                            onChange={(e) => handleInputChange('noticePeriodMonths', e.target.value)}
                            className="mt-1"
                            required
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor="noticePeriodNegotiable" className="text-sm text-gray-600">Notice Period Negotiable <span className="text-red-500">*</span></Label>
                          <Select 
                            value={formData.noticePeriodNegotiable} 
                            onValueChange={(value) => handleInputChange('noticePeriodNegotiable', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab - LinkedIn Style Structure */}
          <TabsContent value="summary" className="space-y-6">
            <Card className="shadow-sm border-gray-200 rounded-xl bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  Job Summary
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Review your job posting before publishing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Checkboxes Section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <Switch
                      id="send-interview-link"
                      checked={!!formData.sendInterviewLinkAutomatically}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendInterviewLinkAutomatically: checked }))}
                      className="mt-0.5 data-[state=checked]:bg-emerald-600"
                    />
                    <div>
                      <Label htmlFor="send-interview-link" className="font-medium cursor-pointer">
                        Send Interview Link to Qualified Candidate Automatically
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">Candidates who pass screening will automatically receive interview links</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="details-confirmed"
                      checked={!!formData.detailsConfirmed}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, detailsConfirmed: checked === true }))}
                      className="h-5 w-5 data-[state=checked]:bg-emerald-600 mt-0.5"
                    />
                    <div>
                      <Label htmlFor="details-confirmed" className="font-medium cursor-pointer text-red-600">
                        Please confirm if all the details in JD is complete as once Submitted, it cannot be updated. *
                      </Label>
                    </div>
                  </div>
                </div>

                {/* LinkedIn Style Job Post Structure */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
                  
                  {/* Header Section */}
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <Briefcase className="h-4 w-4 text-emerald-600" />
                      </div>
                      Job Details
                    </h2>
                    
                    {/* Company */}
                    <div className="mb-4">
                      <Label htmlFor="company-display" className="font-medium text-gray-700">Company</Label>
                      <div id="company-display" className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm">
                        {company?.name || 'Company Name'}
                      </div>
                    </div>

                    {/* Job Title & Location - Inline */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="job-title-display" className="font-medium">Job Title</Label>
                        <div id="job-title-display" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm">
                          {formData.jobTitle || 'Position Title'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location-display" className="font-medium">Job Location</Label>
                        <div id="location-display" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm">
                          {formData.location || 'Location'}
                        </div>
                      </div>
                    </div>

                    {/* Workplace, Employment, Seniority - Inline */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="workplace-display" className="font-medium">Workplace Type</Label>
                        <div id="workplace-display" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm capitalize">
                          {formData.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employment-display" className="font-medium">Employment Type</Label>
                        <div id="employment-display" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm capitalize">
                          {formData.jobType?.replace(/[-_]/g, ' ') || 'Full-time'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="seniority-display" className="font-medium">Seniority Level</Label>
                        <div id="seniority-display" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-900 text-sm capitalize">
                          {formData.experienceLevel || 'Entry'}
                        </div>
                      </div>
                    </div>

                    {/* Skills Tags */}
                    {formData.technical && (
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="skills-display" className="font-medium">Skills</Label>
                        <div id="skills-display" className="flex flex-wrap gap-2 mt-1">
                          {formData.technical.split(/[,\n]/).filter(Boolean).slice(0, 10).map((skill, index) => (
                            <Badge key={index} className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 px-2.5 py-0.5 rounded-md text-xs font-medium">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Job Description Section - Editable */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description-md" className="font-medium text-gray-700">Job Description</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, descriptionMd: generateStructuredDescription() }))}
                          className="text-xs h-7"
                        >
                          Regenerate
                        </Button>
                      </div>
                      <Textarea
                        id="description-md"
                        value={formData.descriptionMd}
                        onChange={(e) => handleInputChange('descriptionMd', e.target.value)}
                        placeholder="Job description will be auto-generated from your inputs..."
                        className="min-h-[400px] bg-gray-50 border-gray-200 rounded-md text-gray-700 text-sm leading-relaxed font-mono whitespace-pre-wrap"
                      />
                      <p className="text-xs text-gray-500">This description is auto-generated from your inputs. You can edit it as needed before submitting.</p>
                    </div>
                  </div>

                  {/* Additional Skills Tags */}
                  {formData.soft && (
                    <div className="p-6 border-b border-gray-200">
                      <div className="space-y-2">
                        <Label htmlFor="soft-skills" className="font-medium">Soft Skills (up to 10)</Label>
                        <p className="text-xs text-gray-500">These skills will appear on the job post and be used to show the listing to relevant candidates.</p>
                        <div id="soft-skills" className="flex flex-wrap gap-2 mt-2">
                          {formData.soft.split(/[,\n]/).filter(Boolean).slice(0, 10).map((skill, index) => (
                            <Badge key={index} className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 px-2.5 py-0.5 rounded-md text-xs font-medium">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Job Link Section */}
                  <div className="p-6">
                    <div className="space-y-2">
                      <Label htmlFor="job-link" className="font-medium">Job Application Link</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <div id="job-link" className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-blue-600 text-sm break-all">
                          {generateJobLink()}
                        </div>
                        <Button 
                          type="button"
                          onClick={() => copyToClipboard(generateJobLink())}
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-9"
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copy Full Description Button */}
                <div className="flex justify-center gap-4">
                  <Button 
                    type="button"
                    onClick={() => copyToClipboard(formData.descriptionMd || generateStructuredDescription())}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Copy Job Description
                  </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="text-sm text-gray-500">
            * Required fields
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            {/* Save as Draft button - available on all tabs in create flow (new job + draft edit) */}
            {isCreateFlow && (
              <Button 
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="flex-1 sm:flex-none border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                {isSavingDraft ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
            )}
            {!isCreateFlow ? (
              // Edit mode: Show Save Status button
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 sm:flex-none min-w-[150px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Status
                  </>
                )}
              </Button>
            ) : (
              // Create mode: Show Next and Create Job buttons
              <>
                {currentTab === 'summary' ? (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !isCurrentTabValid()}
                    className="flex-1 sm:flex-none min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Job...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Create Job
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={handleNext}
                    disabled={!isCurrentTabValid()}
                    className="flex-1 sm:flex-none min-w-[150px]"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
