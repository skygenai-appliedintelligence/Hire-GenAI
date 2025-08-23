"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Brain, Zap, Plus } from "lucide-react"
import { AIService } from "@/lib/ai-service"
import { useToast } from "@/hooks/use-toast"

interface AIQuestionGeneratorModalProps {
  agentType: string
  keySkills: Array<{ id: string; name: string; description: string; weight: number }>
  onQuestionsGenerated: (questions: string[]) => void
  trigger?: React.ReactNode
  initialJobDescription?: string
  agentId?: string
  taskId?: string
  basePath?: string // default: '/selected-agents'
}

export function AIQuestionGeneratorModal({ 
  agentType, 
  keySkills, 
  onQuestionsGenerated,
  trigger,
  initialJobDescription,
  agentId,
  taskId,
  basePath = '/selected-agents'
}: AIQuestionGeneratorModalProps) {
  const [open, setOpen] = useState(false)
  const [jobDescription, setJobDescription] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const getRandomQuestionCount = () => {
    const min = 5
    const max = 12
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  const [numberOfQuestions, setNumberOfQuestions] = useState(getRandomQuestionCount())
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Map agent types to AI service agent types
  const getAgentTypeForAI = (agentType: string) => {
    const typeMapping: Record<string, "Screening Agent" | "Initial Interview Agent" | "Technical Interview Agent" | "Behavioral Interview Agent"> = {
      'Screening Round': 'Screening Agent',
      'Initial Interview': 'Initial Interview Agent',
      'Technical Interview 1': 'Technical Interview Agent',
      'Technical Interview 2': 'Technical Interview Agent',
      'HR Interview': 'Behavioral Interview Agent'
    }
    return typeMapping[agentType] || 'Screening Agent'
  }

  const handleGenerateQuestions = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Error",
        description: "Please provide a job description",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const aiAgentType = getAgentTypeForAI(agentType)
      const skills = keySkills.map(s => s.name)
      const generatedQuestions = await AIService.generateStagedInterviewQuestions(
        jobDescription,
        aiAgentType,
        numberOfQuestions,
        skills
      )
      
      setQuestions(generatedQuestions)
      
      toast({
        title: "Success",
        description: `Generated ${generatedQuestions.length} questions for ${agentType}`,
      })
    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUseQuestions = () => {
    if (questions.length > 0) {
      onQuestionsGenerated(questions)
      setOpen(false)
      setQuestions([])
      setJobDescription("")
      toast({
        title: "Success",
        description: `${questions.length} questions have been added to your agent`,
      })
    }
  }

  const handleClear = () => {
    setJobDescription("")
    setQuestions([])
    setNumberOfQuestions(getRandomQuestionCount())
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setNumberOfQuestions(getRandomQuestionCount())
      // Prefill job description on open if provided and current is empty
      if (!jobDescription && initialJobDescription) {
        setJobDescription(initialJobDescription)
      }
      // Update URL to reflect AI modal open state
      try {
        const params = new URLSearchParams(searchParams.toString())
        params.set('ai', '1')
        if (agentId) params.set('agent', agentId)
        if (taskId) params.set('task', taskId)
        router.replace(`${basePath}?${params.toString()}`, { scroll: false })
      } catch {}
    }
    if (!next) {
      // Remove AI-related params, keep others (like tab)
      try {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('ai')
        params.delete('agent')
        params.delete('task')
        const qs = params.toString()
        router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false })
      } catch {}
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Brain className="w-4 h-4 mr-2" />
            AI Generate Questions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Generate relevant interview questions for {agentType} using AI
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Job Description Input */}
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the complete job description here to generate relevant questions..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Number of Questions */}
          <div className="space-y-2">
            <Label htmlFor="numberOfQuestions">Number of Questions</Label>
            <Input
              id="numberOfQuestions"
              type="number"
              min={1}
              max={20}
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || getRandomQuestionCount())}
              className="w-32"
            />
          </div>

          {/* Key Skills Display */}
          {keySkills.length > 0 && (
            <div className="space-y-2">
              <Label>Key Skills for {agentType}</Label>
              <div className="flex flex-wrap gap-2">
                {keySkills.map((skill) => (
                  <span key={skill.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateQuestions} 
              disabled={loading || !jobDescription.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Questions
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={loading}>
              Clear
            </Button>
          </div>

          {/* Generated Questions */}
          {questions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Questions</h3>
                <Button onClick={handleUseQuestions} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Use These Questions
                </Button>
              </div>
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <Card key={index} className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium text-blue-900">{question}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
