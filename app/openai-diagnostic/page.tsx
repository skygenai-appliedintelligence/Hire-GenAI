"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface OpenAIStatus {
  ok: boolean
  aiEnabled: boolean
  hasKey: boolean
  hasPermissions: boolean
  error?: string
  suggestions?: string[]
}

export default function OpenAIDiagnosticPage() {
  const [status, setStatus] = useState<OpenAIStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/openai/status')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to check OpenAI status:', error)
      setStatus({
        ok: false,
        aiEnabled: false,
        hasKey: false,
        hasPermissions: false,
        error: 'Failed to check status'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OpenAI API Diagnostic</h1>
          <p className="text-gray-600">Check your OpenAI API key configuration and permissions</p>
        </div>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Status
                {status?.hasPermissions && <Badge className="bg-green-100 text-green-800">Working</Badge>}
                {!status?.hasPermissions && status?.hasKey && <Badge className="bg-yellow-100 text-yellow-800">Needs Fix</Badge>}
                {!status?.hasKey && <Badge className="bg-red-100 text-red-800">Not Configured</Badge>}
              </CardTitle>
              <CardDescription>
                Real-time check of your OpenAI API configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">AI Enabled:</span>
                  <div className="mt-1">
                    {status?.aiEnabled ?
                      <Badge className="bg-green-100 text-green-800">Yes</Badge> :
                      <Badge className="bg-red-100 text-red-800">No</Badge>
                    }
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">API Key:</span>
                  <div className="mt-1">
                    {status?.hasKey ?
                      <Badge className="bg-green-100 text-green-800">Present</Badge> :
                      <Badge className="bg-red-100 text-red-800">Missing</Badge>
                    }
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Permissions:</span>
                  <div className="mt-1">
                    {status?.hasPermissions ?
                      <Badge className="bg-green-100 text-green-800">Valid</Badge> :
                      <Badge className="bg-red-100 text-red-800">Invalid</Badge>
                    }
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Real AI:</span>
                  <div className="mt-1">
                    {status?.hasPermissions ?
                      <Badge className="bg-green-100 text-green-800">Available</Badge> :
                      <Badge className="bg-yellow-100 text-yellow-800">Fallback Mode</Badge>
                    }
                  </div>
                </div>
              </div>

              {status?.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 font-medium">Error:</p>
                  <p className="text-red-700 text-sm">{status.error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          {status?.suggestions && (
            <Card>
              <CardHeader>
                <CardTitle>Fix Suggestions</CardTitle>
                <CardDescription>Steps to resolve the issue</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {status.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Manual Check */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Check</CardTitle>
              <CardDescription>Click to re-check your OpenAI configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={checkStatus} disabled={loading}>
                {loading ? 'Checking...' : 'Check Again'}
              </Button>
            </CardContent>
          </Card>

          {/* Features Affected */}
          <Card>
            <CardHeader>
              <CardTitle>Features Affected</CardTitle>
              <CardDescription>Which features work in fallback mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="font-medium">CV Parsing</span>
                  <Badge className="bg-green-100 text-green-800">Works (Mock Data)</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="font-medium">Question Generation</span>
                  <Badge className="bg-green-100 text-green-800">Works (Mock Data)</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="font-medium">Video Interviews</span>
                  <Badge className="bg-green-100 text-green-800">Works (Mock Data)</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                  <span className="font-medium">Real AI Evaluation</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Needs Fix</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
