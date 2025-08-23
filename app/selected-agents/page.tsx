"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, Clock, User, ArrowLeft, Home, Plus, Edit2, Trash2, Save, Brain } from 'lucide-react'
import { AIQuestionGeneratorModal } from "@/components/ai-question-generator-modal"

// Agent Types - Each agent handles ONE specific interview round
interface KeySkill {
  id: string
  name: string
  description: string
  weight: number
}

interface Question {
  id: string
  text: string
  type: 'technical' | 'behavioral' | 'situational'
  linkedSkills: string[]
  expectedAnswer?: string
}

interface Task {
  id: string
  name: string
  description: string
  questions: Question[]
}

interface Agent {
  id: string
  name: string
  candidateName: string
  interviewRound: {
    id: string
    name: string
    duration: string
    interviewer: string
    status: 'Pending' | 'Completed' | 'In Progress'
  }
  tasks: Task[]
  keySkills: KeySkill[]
}

// Dummy data generators
const candidateNames = [
  'Candidate A', 'Candidate B', 'Candidate C', 'Candidate D', 'Candidate E'
]

// Each agent handles ONE specific round
const interviewRounds = [
  {
    name: 'Screening Round',
    duration: '15 minutes',
    interviewer: 'Alex Thompson'
  },
  {
    name: 'Initial Interview',
    duration: '30 minutes',
    interviewer: 'Sarah Chen'
  },
  {
    name: 'Technical Interview 1',
    duration: '30 minutes',
    interviewer: 'Michael Rodriguez'
  },
  {
    name: 'Technical Interview 2',
    duration: '30 minutes',
    interviewer: 'Michael Rodriguez'
  },
  {
    name: 'Final Interview',
    duration: '30 minutes',
    interviewer: 'Emily Davis'
  }
]

// Default evaluation skills applied to every agent by default
const DEFAULT_EVAL_SKILLS: Array<Pick<KeySkill, 'name' | 'description' | 'weight'>> = [
  { name: 'Communication', description: 'Clear verbal and written communication', weight: 15 },
  { name: 'Problem Solving', description: 'Analytical thinking and approach', weight: 15 },
  { name: 'Teamwork', description: 'Collaborates effectively with others', weight: 10 },
  { name: 'Leadership', description: 'Influence, ownership, and guidance', weight: 10 },
  { name: 'Adaptability', description: 'Handles change and ambiguity', weight: 10 },
  { name: 'Technical Skills', description: 'Role-relevant technical proficiency', weight: 15 },
  { name: 'Active Listening', description: 'Understands questions and responds thoughtfully', weight: 8 },
  { name: 'Critical Thinking', description: 'Evaluates information to make reasoned decisions', weight: 7 },
  { name: 'Work Ethic', description: 'Reliability, ownership, and follow-through', weight: 5 },
  { name: 'Cultural Fit', description: 'Alignment with company values', weight: 5 },
]

// Generate key skills for each agent type and merge defaults
const generateKeySkills = (roundName: string): KeySkill[] => {
  const skillSets = {
    'Screening Round': [
      { name: 'Communication', description: 'Clear verbal and written communication', weight: 30 },
      { name: 'Cultural Fit', description: 'Alignment with company values', weight: 25 },
      { name: 'Basic Qualifications', description: 'Meets minimum job requirements', weight: 45 }
    ],
    'Initial Interview': [
      { name: 'Problem Solving', description: 'Analytical thinking and approach', weight: 35 },
      { name: 'Experience Relevance', description: 'Past experience alignment', weight: 30 },
      { name: 'Motivation', description: 'Interest and enthusiasm for role', weight: 35 }
    ],
    'Technical Interview 1': [
      { name: 'Coding Skills', description: 'Programming proficiency', weight: 40 },
      { name: 'Algorithm Knowledge', description: 'Data structures and algorithms', weight: 35 },
      { name: 'Code Quality', description: 'Clean, maintainable code', weight: 25 }
    ],
    'Technical Interview 2': [
      { name: 'System Design', description: 'Architecture and scalability', weight: 45 },
      { name: 'Database Knowledge', description: 'Database design and optimization', weight: 30 },
      { name: 'Performance Optimization', description: 'Code and system optimization', weight: 25 }
    ],
    'Final Interview': [
      { name: 'Leadership Potential', description: 'Leadership qualities and experience', weight: 40 },
      { name: 'Team Collaboration', description: 'Working effectively in teams', weight: 35 },
      { name: 'Career Goals', description: 'Long-term career alignment', weight: 25 }
    ]
  }

  const base = skillSets[roundName as keyof typeof skillSets] || skillSets['Screening Round']

  // Merge defaults + base, dedupe by name (case-insensitive), keep first weight/description
  const byName = new Map<string, { name: string; description: string; weight: number }>()
  const put = (s: { name: string; description: string; weight: number }) => {
    const key = s.name.trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, s)
  }
  DEFAULT_EVAL_SKILLS.forEach(put)
  base.forEach(put)

  const merged = Array.from(byName.values())
  return merged.map((skill, index) => ({
    id: `skill-${index + 1}`,
    ...skill,
  }))
}

// No default questions: questions will start empty and be added via modal or manual add
const generateQuestions = (_roundName: string, _keySkills: KeySkill[]): Question[] => []

export default function SelectedAgentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company } = useAuth()
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("")
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [editingSkill, setEditingSkill] = useState<string | null>(null)
  const [jobData, setJobData] = useState<any | null>(null)
  const autoGenStarted = useRef(false)
  const persistDoneForJob = useRef<string | null>(null)

  const normalizeQuestionText = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[\p{P}\p{S}]+/gu, "")
      .trim()

  const dedupeAndLimitQuestions = (existing: Question[], incoming: Question[] = [], max: number = Number.MAX_SAFE_INTEGER, preferIncoming: boolean = false): Question[] => {
    const result: Question[] = []
    const seen = new Set<string>()

    const first = preferIncoming ? incoming : existing
    const second = preferIncoming ? existing : incoming

    // add primary list first
    for (const q of first) {
      const key = normalizeQuestionText(q.text)
      if (!seen.has(key)) {
        result.push(q)
        seen.add(key)
      }
      if (result.length >= max) return result.slice(0, max)
    }

    // then add secondary list uniques
    for (const q of second) {
      const key = normalizeQuestionText(q.text)
      if (!seen.has(key)) {
        result.push(q)
        seen.add(key)
      }
      if (result.length >= max) break
    }

    return result.slice(0, max)
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        const storedData = localStorage.getItem("newJobData")
        if (storedData) {
          setJobData(JSON.parse(storedData))
        }
      } catch (error) {
        console.error('Error loading job data:', error)
      }
    }
    initialize()
  }, [])

  // If jobId is present in URL and company is known, fetch JD from API and prefer it
  useEffect(() => {
    const fetchJD = async () => {
      const jobId = searchParams.get('jobId')
      const companyName = company?.name
      if (!jobId || !companyName) return
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(companyName)}`)
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.ok && data?.job) {
          const j = data.job
          // Prefer multiple fields to build a useful JD for AI
          const jd = [j.description_md, j.description, j.responsibilities_md, j.benefits_md]
            .filter((x: any) => typeof x === 'string' && x.trim().length > 0)
            .join('\n\n') || `Role: ${j.title || 'Unknown'}\nCompany: ${companyName}`
          const next = {
            id: j.id,
            title: j.title,
            company: companyName,
            description: jd,
            location: j.location,
            employment_type: j.employment_type,
            createdAt: j.created_at,
          }
          setJobData(next)
          // keep local copy in case of reloads
          try { localStorage.setItem('newJobData', JSON.stringify(next)) } catch {}
        }
      } catch (e) {
        console.warn('Failed to fetch job by id (non-fatal):', (e as any)?.message)
      }
    }
    fetchJD()
  }, [searchParams, company])

  useEffect(() => {
    try {
      // Get selected agent IDs from localStorage
      const storedAgents = localStorage.getItem('selectedAgents')
      // Also get the specific interview rounds the user chose when creating the JD (if available)
      const storedChosenRounds = localStorage.getItem('selectedInterviewRounds')
      // Read job data passed from Jobs page
      const storedJobData = localStorage.getItem('newJobData')
      if (storedJobData) {
        try { setJobData(JSON.parse(storedJobData)) } catch {}
      }
      // Parse inputs safely
      const parsedAgents: any = storedAgents ? (() => { try { return JSON.parse(storedAgents) } catch { return null } })() : null
      const chosenRounds: string[] = storedChosenRounds ? (() => { try { return JSON.parse(storedChosenRounds) } catch { return [] } })() : []

      // Determine agent count: prefer explicit chosen rounds length, else selectedAgents length
      const roundsCount = Array.isArray(chosenRounds) ? chosenRounds.length : 0
      const storedAgentsCount = Array.isArray(parsedAgents) ? parsedAgents.length : (Number.isFinite(parsedAgents) ? Number(parsedAgents) : 0)
      const agentCount = roundsCount > 0 ? roundsCount : storedAgentsCount

      // If neither is present, redirect to selection
      if (!agentCount || agentCount <= 0) {
        router.push('/dashboard/agents/create')
        return
      }

      // Build selectedAgentIds robustly
      const selectedAgentIds: any[] = Array.isArray(parsedAgents) && parsedAgents.length >= agentCount
        ? parsedAgents
        : Array.from({ length: agentCount }, (_, i) => i + 1)
      
      if (!Array.isArray(selectedAgentIds) || selectedAgentIds.length === 0) {
        router.push('/dashboard/agents/create')
        return
      }

      // Helper to map external round names (from job form) to internal round indices
      const mapExternalRoundToIndex = (roundName: string): number => {
        const key = roundName.trim().toLowerCase()
        switch (key) {
          case 'phone screening':
            return 0 // Screening Round
          case 'technical assessment':
            return 2 // Technical Interview 1
          case 'system design':
            return 3 // Technical Interview 2 (closest match)
          case 'architecture':
          case 'architecture interview':
          case 'architecture round':
          case 'system architecture':
            return 3 // Treat architecture as System Design round
          case 'behavioral interview':
            return 1 // Map behavioral to Initial Interview
          case 'final round':
          case 'final interview':
            return 4 // Final Interview (Agent 5)
          default:
            return -1
        }
      }

      // Generate full agent data for selected IDs with a computed sequence for ordering
      const built = selectedAgentIds.map((agentId: any, index: number) => {
        // Ensure agentId is a string and handle different formats
        const agentIdStr = String(agentId)
        let agentIndex = 0
        
        // Try to extract index from agent ID (e.g., "agent-1" -> 0)
        if (agentIdStr.includes('-')) {
          const parts = agentIdStr.split('-')
          if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
            agentIndex = parseInt(parts[1]) - 1
          }
        } else if (!isNaN(parseInt(agentIdStr))) {
          // If it's just a number, use it directly
          agentIndex = parseInt(agentIdStr) - 1
        } else {
          // Fallback to using the array index
          agentIndex = index
        }
        
        // If user chose explicit interview rounds, prefer those mappings by order
        if (Array.isArray(chosenRounds) && chosenRounds.length > 0) {
          const mapped = mapExternalRoundToIndex(chosenRounds[Math.min(index, chosenRounds.length - 1)] || '')
          if (mapped >= 0) {
            agentIndex = mapped
          }
        }

        // Ensure agentIndex is within bounds
        agentIndex = Math.max(0, Math.min(agentIndex, interviewRounds.length - 1))
        
        const agentName = `Agent ${agentIndex + 1}`
        const candidateName = candidateNames[agentIndex] || `Candidate ${agentIndex + 1}`
        const roundData = interviewRounds[agentIndex]
        
        // Generate key skills and questions for this agent
        const keySkills = generateKeySkills(roundData.name)
        const questions = generateQuestions(roundData.name, keySkills)
        
        // Compute desired sequence: if chosenRounds supplied, use its position; else fallback to original index
        const seq = Array.isArray(chosenRounds) && chosenRounds.length > 0
          ? Math.min(index, chosenRounds.length - 1)
          : index

        return {
          seq,
          agent: {
            id: agentIdStr,
            name: agentName,
            candidateName,
            interviewRound: {
              id: `${agentIdStr}-round`,
              name: roundData.name,
              duration: roundData.duration,
              interviewer: roundData.interviewer,
              status: Math.random() > 0.7 ? 'Completed' : Math.random() > 0.5 ? 'In Progress' : 'Pending'
            },
            tasks: [{
              id: `task-${agentIdStr}`,
              name: `${roundData.name} Assessment`,
              description: `Comprehensive evaluation for ${roundData.name}`,
              questions
            }],
            keySkills
          }
        }
      })
      // Sort by computed sequence and then relabel agents sequentially (Agent 1..N)
      const sorted: Agent[] = built
        .sort((a: any, b: any) => a.seq - b.seq)
        .map((entry: any, i: number) => ({
          ...entry.agent,
          name: `Agent ${i + 1}`,
        }))

      setSelectedAgents(sorted)
      if (sorted.length > 0) {
        // Prefer tab from URL if present
        const urlTab = searchParams.get('tab')
        const initialTab = urlTab && sorted.some(a => a.id === urlTab) ? urlTab : sorted[0].id
        setActiveTab(initialTab)
        // Ensure URL reflects the active tab while preserving jobId (only if changed)
        const jobId = searchParams.get('jobId')
        const qs = new URLSearchParams()
        if (jobId) qs.set('jobId', jobId)
        qs.set('tab', initialTab)
        const nextUrl = `/selected-agents?${qs.toString()}`
        if (typeof window !== 'undefined' && window.location.search !== `?${qs.toString()}`) {
          router.replace(nextUrl, { scroll: false })
        }

        // Persist mapping of selected agents to rounds for this job (best-effort)
        const persist = async () => {
          try {
            const job = JSON.parse(localStorage.getItem('newJobData') || 'null')
            const jobId = job?.id
            if (!jobId) return
            if (persistDoneForJob.current === jobId) { console.debug('[Persist] Skipped: already persisted for', jobId); return }
            // Group agents by their target round sequence
            const byRound = new Map<number, Array<{ agent_type: string; skill_weights: any; config: any }>>()
            sorted.forEach((agent, idx) => {
              const seq = agent.interviewRound.seq
              const list = byRound.get(seq) || []
              list.push({
                agent_type: mapRoundToAgentType(agent.interviewRound.name),
                skill_weights: Object.fromEntries((agent.keySkills || []).map(s => [s.name, s.weight || 1])),
                config: { index: idx + 1 }
              })
              byRound.set(seq, list)
            })
            const mappings = Array.from(byRound.entries()).map(([seq, agents]) => ({ seq, agents }))
            await fetch(`/api/jobs/${encodeURIComponent(jobId)}/round-agents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mappings }),
            })
            persistDoneForJob.current = jobId
          } catch (e) {
            console.warn('Persist selected agents failed (non-fatal):', (e as any)?.message)
          }
        }
        persist()
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading selected agents:', error)
      router.push('/dashboard/agents/create')
    }
  }, [router, searchParams])

  // Helper to map our round names to AI agent types expected by the generator API
  const mapRoundToAgentType = (roundName: string): string => {
    const n = (roundName || '').toLowerCase()
    if (n.includes('screening')) return 'Screening Agent'
    if (n.includes('technical')) return 'Technical Interview Agent'
    if (n.includes('initial')) return 'Initial Interview Agent'
    if (n.includes('final') || n.includes('hr') || n.includes('behavioral')) return 'Behavioral Interview Agent'
    return 'Screening Agent'
  }

  // After agents are loaded and job description is available
  const triggerAIGeneration = async () => {
      if (autoGenStarted.current) { console.debug('[AI Gen] Skipped: already started'); return }
      if (!jobData?.description) { console.debug('[AI Gen] Skipped: missing job description'); return }
      if (!Array.isArray(selectedAgents) || selectedAgents.length === 0) { console.debug('[AI Gen] Skipped: no agents'); return }
      autoGenStarted.current = true

      try {
        // Generate sequentially to avoid rate limits
        const updates: Record<string, Question[]> = {}
        for (const agent of selectedAgents) {
          const jd = String(jobData.description || '')
          const agentType = mapRoundToAgentType(agent.interviewRound.name)
          const skills = (agent.keySkills || []).map(s => s.name).filter(Boolean)
          // Default count removed; generation only via modal path
          const numberOfQuestions = 5
          console.debug('[AI Gen] Request', { agent: agent.id, agentType, numberOfQuestions, hasJD: jd.length > 0, skills })
          const res = await fetch('/api/ai/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobDescription: jd, agentType, numberOfQuestions, skills })
          })
          if (!res.ok) { console.warn('[AI Gen] API failed for agent', agent.id); continue }
          const data = await res.json()
          const aiQs: string[] = Array.isArray(data?.questions) ? data.questions : []
          console.debug('[AI Gen] Response', { agent: agent.id, count: aiQs.length })
          if (aiQs.length === 0) continue
          const newQuestions: Question[] = aiQs.map((q, idx) => ({
            id: `ai-question-${Date.now()}-${idx}`,
            text: q,
            type: agent.interviewRound.name.includes('Technical') ? 'technical' :
                  (agent.interviewRound.name.includes('Final') || agent.interviewRound.name.includes('HR')) ? 'behavioral' :
                  agent.interviewRound.name.includes('Initial') ? 'situational' : 'situational',
            linkedSkills: agent.keySkills.slice(0, Math.min(2, agent.keySkills.length)).map(s => s.id)
          }))
          updates[agent.id] = newQuestions
        }

        // Single state update to minimize re-renders
        setSelectedAgents(prev => prev.map(a => {
          const add = updates[a.id]
          if (!add) return a
          const t0 = a.tasks[0]
          const merged = dedupeAndLimitQuestions(t0.questions, add, add.length, true)
          return { ...a, tasks: [{ ...t0, questions: merged }] }
        }))
      } catch (e) {
        console.warn('Auto AI question generation failed (non-fatal):', (e as any)?.message)
      }
  }

  // Auto-generation disabled: questions will only be generated via the AI modal or manual actions.

  // (Removed) job fetching and inline editing for job summary

  const saveToDatabase = (agentId: string, data: any) => {
    // Simulate database save
    console.log(`Saving to database for agent ${agentId}:`, data)
    // In real implementation, this would make an API call
  }

  const addQuestion = (agentId: string, taskId: string) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          tasks: agent.tasks.map(task => {
            if (task.id === taskId) {
              const newQuestion: Question = {
                id: `question-${Date.now()}`,
                text: 'New question',
                type: 'behavioral',
                linkedSkills: []
              }
              const updatedTask = {
                ...task,
                questions: dedupeAndLimitQuestions(task.questions, [newQuestion])
              }
              saveToDatabase(agentId, { tasks: [updatedTask] })
              return updatedTask
            }
            return task
          })
        }
      }
      return agent
    }))
  }

  const addAIQuestions = (agentId: string, taskId: string, aiQuestions: string[]) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          tasks: agent.tasks.map(task => {
            if (task.id === taskId) {
              const newQuestions: Question[] = aiQuestions.map((questionText, index) => ({
                id: `ai-question-${Date.now()}-${index}`,
                text: questionText,
                type: agent.interviewRound.name.includes('Technical') ? 'technical' : 
                       (agent.interviewRound.name.includes('Final') || agent.interviewRound.name.includes('HR')) ? 'behavioral' : 'situational',
                linkedSkills: agent.keySkills.slice(0, Math.min(2, agent.keySkills.length)).map(skill => skill.id)
              }))

              const mergedUniqueLimited = dedupeAndLimitQuestions(
                task.questions,
                newQuestions,
                newQuestions.length,
                true
              )

              const updatedTask = {
                ...task,
                questions: mergedUniqueLimited
              }
              saveToDatabase(agentId, { tasks: [updatedTask] })
              return updatedTask
            }
            return task
          })
        }
      }
      return agent
    }))
  }

  const updateQuestion = (agentId: string, taskId: string, questionId: string, updates: Partial<Question>) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          tasks: agent.tasks.map(task => {
            if (task.id === taskId) {
              const updatedRaw = task.questions.map(q => 
                q.id === questionId ? { ...q, ...updates } : q
              )
              const updatedTask = {
                ...task,
                questions: dedupeAndLimitQuestions(updatedRaw, [])
              }
              saveToDatabase(agentId, { tasks: [updatedTask] })
              return updatedTask
            }
            return task
          })
        }
      }
      return agent
    }))
  }

  const deleteQuestion = (agentId: string, taskId: string, questionId: string) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          tasks: agent.tasks.map(task => {
            if (task.id === taskId) {
              const updatedTask = {
                ...task,
                questions: task.questions.filter(q => q.id !== questionId)
              }
              saveToDatabase(agentId, { tasks: [updatedTask] })
              return updatedTask
            }
            return task
          })
        }
      }
      return agent
    }))
  }

  const addKeySkill = (agentId: string) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        const newSkill: KeySkill = {
          id: `skill-${Date.now()}`,
          name: 'New Skill',
          description: 'Description for new skill',
          weight: 20
        }
        const updatedAgent = {
          ...agent,
          keySkills: [...agent.keySkills, newSkill]
        }
        saveToDatabase(agentId, { keySkills: updatedAgent.keySkills })
        return updatedAgent
      }
      return agent
    }))
  }

  const updateKeySkill = (agentId: string, skillId: string, updates: Partial<KeySkill>) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        const updatedAgent = {
          ...agent,
          keySkills: agent.keySkills.map(skill => 
            skill.id === skillId ? { ...skill, ...updates } : skill
          )
        }
        saveToDatabase(agentId, { keySkills: updatedAgent.keySkills })
        return updatedAgent
      }
      return agent
    }))
  }

  const deleteKeySkill = (agentId: string, skillId: string) => {
    setSelectedAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        const updatedAgent = {
          ...agent,
          keySkills: agent.keySkills.filter(skill => skill.id !== skillId)
        }
        saveToDatabase(agentId, { keySkills: updatedAgent.keySkills })
        return updatedAgent
      }
      return agent
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'In Progress':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'In Progress':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const handleBackToSelection = () => {
    router.push('/dashboard/agents/create')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading selected agents...</p>
        </div>
      </div>
    )
  }

  if (selectedAgents.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Agents Selected</h2>
          <p className="text-gray-600 mb-6">Please go back and select some agents first.</p>
          <Button onClick={handleBackToSelection}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agent Selection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg inline-block">
          <CheckCircle className="w-6 h-6 inline mr-2" />
          Successfully configured {selectedAgents.length} specialized AI agents!
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Agent Management Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Configure tasks, questions, and key skills for each specialized agent
        </p>
      </div>

      {/* Job Summary removed as requested */}

      {/* Agent Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v)
          const jobId = searchParams.get('jobId')
          const qs = new URLSearchParams()
          if (jobId) qs.set('jobId', jobId)
          qs.set('tab', v)
          router.replace(`/selected-agents?${qs.toString()}`, { scroll: false })
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 h-auto p-2">
          {selectedAgents.map((agent) => (
            <TabsTrigger 
              key={agent.id} 
              value={agent.id}
              className="flex flex-col items-center p-4 h-auto data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
            >
              <User className="w-5 h-5 mb-2" />
              <span className="font-semibold">{agent.name}</span>
              <span className="text-xs text-gray-600">{agent.interviewRound.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedAgents.map((agent) => (
          <TabsContent key={agent.id} value={agent.id} className="space-y-6">
            {/* Agent Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-500" />
                  {agent.name} - {agent.interviewRound.name}
                </CardTitle>
                <CardDescription>
                  Candidate: {agent.candidateName} | Duration: {agent.interviewRound.duration} | Interviewer: {agent.interviewRound.interviewer}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(agent.interviewRound.status)}`}>
                  {getStatusIcon(agent.interviewRound.status)}
                  <span className="ml-2">{agent.interviewRound.status}</span>
                </div>
              </CardContent>
            </Card>

            {/* Key Skills Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Key Skills for Evaluation</CardTitle>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {agent.keySkills.length} skills
                    </span>
                  </div>
                  <Button onClick={() => addKeySkill(agent.id)} size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Skill
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {agent.keySkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="relative rounded-lg p-3 space-y-2 border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 hover:from-white hover:to-blue-100/70 shadow-sm hover:shadow-md transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        {editingSkill === skill.id ? (
                          <Input
                            value={skill.name}
                            onChange={(e) => updateKeySkill(agent.id, skill.id, { name: e.target.value })}
                            className="font-semibold"
                          />
                        ) : (
                          <h4 className="font-semibold text-gray-900 truncate" title={skill.name}>{skill.name}</h4>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSkill(editingSkill === skill.id ? null : skill.id)}
                          >
                            {editingSkill === skill.id ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteKeySkill(agent.id, skill.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {editingSkill === skill.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={skill.description}
                            onChange={(e) => updateKeySkill(agent.id, skill.id, { description: e.target.value })}
                            placeholder="Skill description"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 truncate" title={skill.description}>{skill.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tasks & Questions Section */}
            {agent.tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button onClick={() => addQuestion(agent.id, task.id)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                      <AIQuestionGeneratorModal
                        agentType={agent.interviewRound.name}
                        keySkills={agent.keySkills}
                        onQuestionsGenerated={(questions) => addAIQuestions(agent.id, task.id, questions)}
                        initialJobDescription={jobData?.description || ''}
                        agentId={agent.id}
                        taskId={task.id}
                        basePath="/selected-agents"
                        existingQuestions={(task.questions || []).map(q => q.text)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {task.questions.map((question, index) => (
                      <div key={question.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500">Q{index + 1}:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                question.type === 'technical' ? 'bg-blue-100 text-blue-800' :
                                question.type === 'behavioral' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {question.type}
                              </span>
                            </div>
                            
                            {editingQuestion === question.id ? (
                              <div className="space-y-3">
                                <Textarea
                                  value={question.text}
                                  onChange={(e) => updateQuestion(agent.id, task.id, question.id, { text: e.target.value })}
                                  placeholder="Enter question text"
                                  className="min-h-[80px]"
                                />
                                <div className="space-y-2">
                                  <Label>Linked Skills:</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {agent.keySkills.map((skill) => (
                                      <label key={skill.id} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={question.linkedSkills.includes(skill.id)}
                                          onChange={(e) => {
                                            const linkedSkills = e.target.checked
                                              ? [...question.linkedSkills, skill.id]
                                              : question.linkedSkills.filter(id => id !== skill.id)
                                            updateQuestion(agent.id, task.id, question.id, { linkedSkills })
                                          }}
                                        />
                                        {skill.name}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-gray-900">{question.text}</p>
                                {question.linkedSkills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    <span className="text-sm text-gray-600">Linked skills:</span>
                                    {question.linkedSkills.map((skillId) => {
                                      const skill = agent.keySkills.find(s => s.id === skillId)
                                      return skill ? (
                                        <span key={skillId} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                          {skill.name}
                                        </span>
                                      ) : null
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingQuestion(editingQuestion === question.id ? null : question.id)}
                            >
                              {editingQuestion === question.id ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(agent.id, task.id, question.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-6">
        <Button 
          onClick={handleBackToSelection}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Selection
        </Button>
        
        <Button 
          onClick={handleGoToDashboard}
          size="lg"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Home className="w-4 h-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
