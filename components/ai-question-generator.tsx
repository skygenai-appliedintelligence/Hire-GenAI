"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Brain, Zap } from "lucide-react"
import { AIService } from "@/lib/ai-service"
import { useToast } from "@/hooks/use-toast"

interface QuestionGeneratorProps {
  className?: string
}

export function AIQuestionGenerator({ className }: QuestionGeneratorProps) {
  const [jobDescription, setJobDescription] = useState("")
  const [agentType, setAgentType] = useState<"Screening Agent" | "Initial Interview Agent" | "Technical Interview Agent" | "Behavioral Interview Agent">("Screening Agent")
  const getRandomQuestionCount = () => {
    const min = 5
    const max = 12
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  const [numberOfQuestions, setNumberOfQuestions] = useState(getRandomQuestionCount())
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
      const generatedQuestions = await AIService.generateStagedInterviewQuestions(
        jobDescription,
        agentType,
        numberOfQuestions
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

  const handleClear = () => {
    setJobDescription("")
    setQuestions([])
    setAgentType("Screening Agent")
    setNumberOfQuestions(getRandomQuestionCount())
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Interview Question Generator
          </CardTitle>
          <CardDescription>
            Generate relevant interview questions based on job description and interview stage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Description Input */}
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the complete job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Agent Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="agentType">Interview Stage/Agent Type</Label>
            <Select value={agentType} onValueChange={(value: any) => setAgentType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Screening Agent">Screening Agent</SelectItem>
                <SelectItem value="Initial Interview Agent">Initial Interview Agent</SelectItem>
                <SelectItem value="Technical Interview Agent">Technical Interview Agent</SelectItem>
                <SelectItem value="Behavioral Interview Agent">Behavioral Interview Agent</SelectItem>
              </SelectContent>
            </Select>
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
                <span className="text-sm text-muted-foreground">
                  {questions.length} questions for {agentType}
                </span>
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
        </CardContent>
      </Card>
    </div>
  )
}
