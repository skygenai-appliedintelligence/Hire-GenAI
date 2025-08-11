"use client"

import { AIQuestionGenerator } from "@/components/ai-question-generator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Zap, Target, Users } from "lucide-react"

export default function AIQuestionGeneratorPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Interview Question Generator</h1>
          <p className="text-muted-foreground">
            Generate relevant interview questions based on job descriptions and interview stages
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Powered
        </Badge>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Role-Specific</h3>
                <p className="text-sm text-muted-foreground">
                  Questions tailored to job requirements and skills
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Stage-Aware</h3>
                <p className="text-sm text-muted-foreground">
                  Different question types for each interview stage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">AI Generated</h3>
                <p className="text-sm text-muted-foreground">
                  Powered by advanced AI for quality questions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Types Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Agent Types</CardTitle>
          <CardDescription>
            Understanding the different types of interview agents and their purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50">Screening Agent</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Basic qualification, work experience, and general fit questions. Focuses on basic qualifications, 
                work experience, general fit, availability, salary expectations, and company knowledge.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50">Initial Interview Agent</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Skill-based, role-relevant, and scenario-based questions. Focuses on relevant experience, 
                problem-solving abilities, work style, and role-specific scenarios.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-orange-50">Technical Interview Agent</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                In-depth technical or domain-specific questions. Focuses on technical skills, problem-solving, 
                system design, coding challenges, and technical decision-making.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50">Behavioral Interview Agent</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Soft skills, teamwork, and conflict resolution questions. Focuses on leadership, teamwork, 
                communication, conflict resolution, and cultural fit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Question Generator Component */}
      <AIQuestionGenerator />
    </div>
  )
}
