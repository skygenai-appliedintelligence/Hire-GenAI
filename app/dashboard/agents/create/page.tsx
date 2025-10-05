"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Bot, CheckCircle, Users, Clock, User, Briefcase } from 'lucide-react'

// Agent configuration based on interview rounds
const agentConfigurations = {
  "Phone Screening": {
    name: "Screening Agent",
    description: "Initial candidate screening and basic qualification assessment",
    duration: "15 minutes",
    skills: ["Communication", "Basic Qualifications", "Cultural Fit"],
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  "Technical Assessment": {
    name: "Technical Agent",
    description: "Coding skills, algorithms, and technical problem-solving evaluation",
    duration: "30 minutes", 
    skills: ["Coding Skills", "Algorithm Knowledge", "Problem Solving"],
    color: "bg-green-100 text-green-800 border-green-200"
  },
  "System Design": {
    name: "System Design Agent",
    description: "Architecture design, scalability, and system thinking assessment",
    duration: "30 minutes",
    skills: ["System Architecture", "Scalability", "Database Design"],
    color: "bg-purple-100 text-purple-800 border-purple-200"
  },
  "Behavioral Interview": {
    name: "Behavioral Agent", 
    description: "Leadership, teamwork, and soft skills evaluation",
    duration: "30 minutes",
    skills: ["Leadership", "Team Collaboration", "Communication"],
    color: "bg-orange-100 text-orange-800 border-orange-200"
  },
  "Final Round": {
    name: "Final Round Agent",
    description: "Comprehensive evaluation and final decision making",
    duration: "30 minutes",
    skills: ["Overall Assessment", "Cultural Fit", "Decision Making"],
    color: "bg-red-100 text-red-800 border-red-200"
  }
}

interface Agent {
  id: string
  roundName: string
  name: string
  description: string
  duration: string
  skills: string[]
  color: string
  selected: boolean
}

export default function CreateAgentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [jobData, setJobData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [roundsFromJob, setRoundsFromJob] = useState<string[] | null>(null)
  const [showingAll, setShowingAll] = useState<boolean>(false)

  useEffect(() => {
    const initializeAgents = () => {
      try {
        // Get selected interview rounds from job creation
        const selectedRounds = localStorage.getItem('selectedInterviewRounds')
        const jobDataStr = localStorage.getItem('newJobData')
        
        // Always show all agents by default
        if (selectedRounds) {
          const rounds = JSON.parse(selectedRounds)
          setRoundsFromJob(Array.isArray(rounds) ? rounds : null)
        }
        if (jobDataStr) {
          setJobData(JSON.parse(jobDataStr))
        }

        const allRounds = Object.keys(agentConfigurations)
        const agents: Agent[] = allRounds.map((roundName, index) => {
          const config = agentConfigurations[roundName as keyof typeof agentConfigurations]
          return {
            id: `agent-${index + 1}`,
            roundName,
            name: config.name,
            description: config.description,
            duration: config.duration,
            skills: config.skills,
            color: config.color,
            selected: false
          }
        })
        setAvailableAgents(agents)
        setShowingAll(true)
        
        setLoading(false)
      } catch (error) {
        console.error('Error initializing agents:', error)
        setLoading(false)
      }
    }

    initializeAgents()
  }, [])

  const showAllAgents = () => {
    const allRounds = Object.keys(agentConfigurations)
    const agents: Agent[] = allRounds.map((roundName, index) => {
      const config = agentConfigurations[roundName as keyof typeof agentConfigurations]
      return {
        id: `agent-${index + 1}`,
        roundName,
        name: config.name,
        description: config.description,
        duration: config.duration,
        skills: config.skills,
        color: config.color,
        selected: false
      }
    })
    setAvailableAgents(agents)
    setSelectedAgents([])
    setShowingAll(true)
  }

  const showSelectedRoundsAgents = () => {
    if (!roundsFromJob || roundsFromJob.length === 0) return
    const agents: Agent[] = roundsFromJob.map((roundName: string, index: number) => {
      const config = agentConfigurations[roundName as keyof typeof agentConfigurations]
      return {
        id: `agent-${index + 1}`,
        roundName,
        name: config.name,
        description: config.description,
        duration: config.duration,
        skills: config.skills,
        color: config.color,
        selected: false
      }
    })
    setAvailableAgents(agents)
    setSelectedAgents([])
    setShowingAll(false)
  }

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAgents.length === availableAgents.length) {
      setSelectedAgents([])
    } else {
      setSelectedAgents(availableAgents.map(agent => agent.id))
    }
  }

  const handleContinue = () => {
    if (selectedAgents.length === 0) {
      alert('Please select at least one agent to continue.')
      return
    }

    // Save selected agents to localStorage
    localStorage.setItem('selectedAgents', JSON.stringify(selectedAgents))
    
    // Navigate back to jobs page
    router.push('/dashboard/jobs')
  }

  const handleBack = () => {
    const fromJobCreation = searchParams.get('from') === 'job-creation'
    if (fromJobCreation) {
      router.push('/dashboard/jobs/new')
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Create AI Interview Agents</h1>
          <p className="text-gray-600 mt-2">
            Select specialized agents for your interview process
            {jobData && (
              <span className="block text-sm mt-1">
                Job: <span className="font-semibold">{jobData.jobTitle}</span> at <span className="font-semibold">{jobData.company}</span>
              </span>
            )}
          </p>
        </div>
        <div className="w-20"></div>
      </div>

      {/* Available Agents Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">
                {availableAgents.length} Specialized Agents Available
              </h3>
              <p className="text-sm text-blue-700">
                Based on your selected interview rounds: {availableAgents.map(agent => agent.roundName).join(', ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSelectAll}
            variant="outline"
            size="sm"
          >
            {selectedAgents.length === availableAgents.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-gray-600">
            {selectedAgents.length} of {availableAgents.length} agents selected
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!showingAll && (
            <Button onClick={showAllAgents} variant="secondary" size="sm">
              Show All Agents
            </Button>
          )}
          {showingAll && roundsFromJob && roundsFromJob.length > 0 && (
            <Button onClick={showSelectedRoundsAgents} variant="outline" size="sm">
              Show Selected Rounds
            </Button>
          )}
        </div>
        
        {selectedAgents.length > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {selectedAgents.length} Selected
          </Badge>
        )}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableAgents.map((agent) => (
          <Card 
            key={agent.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedAgents.includes(agent.id) 
                ? 'ring-2 ring-blue-500 shadow-md' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleAgentToggle(agent.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedAgents.includes(agent.id)}
                    className="pointer-events-none"
                  />
                  <Bot className="w-5 h-5 text-blue-500" />
                </div>
                <Badge className={agent.color}>
                  {agent.roundName}
                </Badge>
              </div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="text-sm">
                {agent.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{agent.duration}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Briefcase className="w-4 h-4 mr-2" />
                  <span>Key Skills:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Agents Available */}
      {availableAgents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agents Available</h3>
            <p className="text-gray-600 mb-4">
              No interview rounds were selected during job creation.
            </p>
            <Button onClick={() => router.push('/dashboard/jobs/new')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back to Job Creation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {availableAgents.length > 0 && (
        <div className="flex justify-center space-x-4 pt-6">
          <Button 
            onClick={handleBack}
            variant="outline" 
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button 
            onClick={handleContinue}
            disabled={selectedAgents.length === 0}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Continue with {selectedAgents.length} Agent{selectedAgents.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  )
}
