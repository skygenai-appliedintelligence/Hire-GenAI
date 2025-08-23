"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
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
    name: 'HR Interview',
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
    'HR Interview': [
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

// Generate dummy questions for each agent type
const generateQuestions = (roundName: string, keySkills: KeySkill[]): Question[] => {
  const questionSets = {
    'Screening Round': [
      'Tell me about yourself and your background',
      'Why are you interested in this position?',
      'What are your salary expectations?',
      'When can you start?',
      'What do you know about our company?',
      'Why are you looking to leave your current role?'
    ],
    'Initial Interview': [
      'Describe a challenging project you worked on',
      'How do you handle tight deadlines?',
      'Tell me about a time you had to learn something new quickly',
      'How do you prioritize your work?',
      'Describe a situation where you had to work with a difficult team member',
      'What motivates you in your work?'
    ],
    'Technical Interview 1': [
      'Implement a function to reverse a linked list',
      'How would you find the duplicate number in an array?',
      'Explain the difference between stack and heap memory',
      'Write a function to check if a string is a palindrome',
      'How would you optimize a slow database query?',
      'Describe the time complexity of your solution'
    ],
    'Technical Interview 2': [
      'Design a URL shortening service like bit.ly',
      'How would you design a chat application?',
      'Explain database indexing and when to use it',
      'How would you handle millions of concurrent users?',
      'Design a caching strategy for a web application',
      'Explain microservices architecture pros and cons'
    ],
    'HR Interview': [
      'Describe your leadership style',
      'How do you handle conflict in a team?',
      'Where do you see yourself in 5 years?',
      'Tell me about a time you had to make a difficult decision',
      'How do you give and receive feedback?',
      'What would you do in your first 90 days in this role?'
    ]
  }

  const questions = questionSets[roundName as keyof typeof questionSets] || questionSets['Screening Round']
  return questions.map((question, index) => ({
    id: `question-${index + 1}`,
    text: question,
    type: roundName.includes('Technical') ? 'technical' : roundName.includes('HR') ? 'behavioral' : 'situational' as const,
    linkedSkills: keySkills.slice(0, Math.min(2, keySkills.length)).map(skill => skill.id)
  }))
}

export default function SelectedAgentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("")
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [editingSkill, setEditingSkill] = useState<string | null>(null)
  const [jobData, setJobData] = useState<any | null>(null)

  const normalizeQuestionText = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[\p{P}\p{S}]+/gu, "")
      .trim()

  const dedupeAndLimitQuestions = (existing: Question[], incoming: Question[] = [], max: number = 6, preferIncoming: boolean = false): Question[] => {
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
      if (!storedAgents) {
        router.push('/dashboard/agents/create')
        return
      }

      const selectedAgentIds = JSON.parse(storedAgents)
      const chosenRounds: string[] = storedChosenRounds ? (() => { try { return JSON.parse(storedChosenRounds) } catch { return [] } })() : []
      
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
          case 'behavioral interview':
            return 4 // HR Interview
          case 'final round':
            return 1 // Initial Interview (fallback)
          default:
            return -1
        }
      }

      // Generate full agent data for selected IDs
      const agents: Agent[] = selectedAgentIds.map((agentId: any, index: number) => {
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
        
        return {
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
      })

      setSelectedAgents(agents)
      if (agents.length > 0) {
        // Prefer tab from URL if present
        const urlTab = searchParams.get('tab')
        const initialTab = urlTab && agents.some(a => a.id === urlTab) ? urlTab : agents[0].id
        setActiveTab(initialTab)
        // Ensure URL reflects the active tab
        router.replace(`/selected-agents?tab=${encodeURIComponent(initialTab)}`, { scroll: false })
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading selected agents:', error)
      router.push('/dashboard/agents/create')
    }
  }, [router, searchParams])

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
                       agent.interviewRound.name.includes('HR') ? 'behavioral' : 'situational',
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
          router.replace(`/selected-agents?tab=${encodeURIComponent(v)}`, { scroll: false })
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
