"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { DemoDataGenerator } from "@/lib/demo-data-generator"
import { ExternalLink, Users, Briefcase, Calendar, Database, Trash2 } from "lucide-react"
import Link from "next/link"

export default function DemoPage() {
  const [loading, setLoading] = useState(false)
  const [demoData, setDemoData] = useState<any>(null)
  const { toast } = useToast()

  const generateDemoData = async () => {
    setLoading(true)
    try {
      const data = await DemoDataGenerator.generateSampleData()
      setDemoData(data)
      toast({
        title: "Demo Data Generated! 🎉",
        description: "Sample applications and interview pipelines have been created.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate demo data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearDemoData = () => {
    DemoDataGenerator.clearDemoData()
    setDemoData(null)
    toast({
      title: "Demo Data Cleared",
      description: "All sample data has been removed.",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demo & Testing</h1>
        <p className="text-gray-600">Generate sample data and access all AIP modules for testing</p>
      </div>

      {/* Demo Data Generator */}
      <Card className="sr-card">
        <CardHeader>
          <CardTitle>Demo Data Generator</CardTitle>
          <CardDescription>
            Generate sample candidate applications and interview pipelines to test the AIP system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button onClick={generateDemoData} disabled={loading} className="sr-button-primary">
              <Database className="h-4 w-4 mr-2" />
              {loading ? "Generating..." : "Generate Demo Data"}
            </Button>
            {demoData && (
              <Button
                onClick={clearDemoData}
                variant="outline"
                className="text-red-600 hover:text-red-700 bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Demo Data
              </Button>
            )}
          </div>

          {demoData && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Demo Data Generated Successfully!</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Applications:</span> {demoData.applications.length}
                </div>
                <div>
                  <span className="font-medium">Pipelines:</span> {demoData.pipelines.length}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Apply Form Access */}
        <Card className="sr-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <span>Apply Form</span>
            </CardTitle>
            <CardDescription>Test the candidate application form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Access the application form for different job positions:</p>
              <div className="space-y-2">
                <Link href="/apply/job-1" target="_blank">
                  <Button variant="outline" size="sm" className="w-full justify-between bg-transparent">
                    Senior Software Engineer
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/apply/job-2" target="_blank">
                  <Button variant="outline" size="sm" className="w-full justify-between bg-transparent">
                    Frontend Developer
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              URL: /apply/[jobId]
            </Badge>
          </CardContent>
        </Card>

        {/* Interview Pipeline Access */}
        <Card className="sr-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span>Interview Pipeline</span>
            </CardTitle>
            <CardDescription>View individual interview pipelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {demoData ? "Access demo interview pipelines:" : "Generate demo data to see sample pipelines"}
              </p>
              {demoData && (
                <div className="space-y-2">
                  {demoData.pipelines.map((pipeline: any, index: number) => {
                    const candidate = demoData.applications.find((app: any) => app.id === pipeline.candidateId)
                    return (
                      <Link key={pipeline.id} href={`/interview-pipeline/${pipeline.id}`} target="_blank">
                        <Button variant="outline" size="sm" className="w-full justify-between bg-transparent">
                          {candidate?.fullName || `Pipeline ${index + 1}`}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              URL: /interview-pipeline/[pipelineId]
            </Badge>
          </CardContent>
        </Card>

        {/* Dashboard Access */}
        <Card className="sr-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Interview Dashboard</span>
            </CardTitle>
            <CardDescription>Manage all interview pipelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Access the main interview management dashboard:</p>
              <Link href="/dashboard/interviews">
                <Button variant="outline" size="sm" className="w-full justify-between bg-transparent">
                  Interview Management
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              URL: /dashboard/interviews
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="sr-card">
        <CardHeader>
          <CardTitle>How to Test the AIP System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Step 1: Generate Demo Data</h4>
              <p className="text-sm text-gray-600">
                Click "Generate Demo Data" to create sample applications and interview pipelines with different stages
                of completion.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-600">Step 2: Test Application Form</h4>
              <p className="text-sm text-gray-600">
                Use the Apply Form links to test the candidate application process. The AI will automatically evaluate
                and create interview pipelines.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Step 3: Manage Interviews</h4>
              <p className="text-sm text-gray-600">
                Visit the Interview Dashboard to see all active pipelines, conduct interviews, and view final
                recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
