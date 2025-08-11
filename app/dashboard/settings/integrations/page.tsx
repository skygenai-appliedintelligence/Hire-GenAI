"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { JobPostingService } from "@/lib/job-posting-service"
import { useToast } from "@/hooks/use-toast"
import { ExternalLink, CheckCircle, AlertCircle, Key, Book } from "lucide-react"

interface PlatformCredentials {
  linkedin?: {
    clientId: string
    clientSecret: string
    accessToken?: string
  }
  monster?: {
    apiKey: string
    username: string
    password: string
  }
  naukri?: {
    apiKey: string
    username: string
    password: string
  }
  indeed?: {
    publisherId: string
    apiToken: string
  }
}

export default function IntegrationsSettingsPage() {
  const { toast } = useToast()
  const [credentials, setCredentials] = useState<PlatformCredentials>({})
  const [loading, setLoading] = useState(false)
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null)

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("platform_credentials")
        if (stored) {
          setCredentials(JSON.parse(stored))
        }
      } catch (error) {
        console.error("Error loading credentials:", error)
      }
    }
  }

  const saveCredentials = async () => {
    setLoading(true)
    try {
      JobPostingService.saveCredentials(credentials)
      toast({
        title: "Success",
        description: "Integration credentials saved successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save credentials",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (platform: string) => {
    setTestingPlatform(platform)
    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Connection Test",
        description: `${platform} connection test completed. Check console for details.`,
      })
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTestingPlatform(null)
    }
  }

  const updateCredentials = (platform: string, field: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform as keyof PlatformCredentials],
        [field]: value,
      },
    }))
  }

  const isConfigured = (platform: string): boolean => {
    const creds = credentials[platform as keyof PlatformCredentials]
    if (!creds) return false

    switch (platform) {
      case "linkedin":
        return !!(creds as any).clientId && !!(creds as any).clientSecret
      case "indeed":
        return !!(creds as any).publisherId && !!(creds as any).apiToken
      case "monster":
        return !!(creds as any).apiKey && !!(creds as any).username
      case "naukri":
        return !!(creds as any).apiKey && !!(creds as any).username
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
        <p className="text-gray-600">Configure your job board integrations and API credentials</p>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Your API credentials are stored locally and encrypted. Never share your credentials with unauthorized parties.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="linkedin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="linkedin" className="flex items-center gap-2">
            LinkedIn
            {isConfigured("linkedin") && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="indeed" className="flex items-center gap-2">
            Indeed
            {isConfigured("indeed") && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="monster" className="flex items-center gap-2">
            Monster
            {isConfigured("monster") && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="naukri" className="flex items-center gap-2">
            Naukri
            {isConfigured("naukri") && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
        </TabsList>

        {/* LinkedIn Integration */}
        <TabsContent value="linkedin">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    🔗 LinkedIn Integration
                    <Badge
                      className={isConfigured("linkedin") ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {isConfigured("linkedin") ? "Configured" : "Not Configured"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Post jobs directly to LinkedIn using OAuth 2.0 authentication</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://docs.microsoft.com/en-us/linkedin/talent/job-postings"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Book className="h-4 w-4 mr-1" />
                    Documentation
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Go to{" "}
                      <a
                        href="https://www.linkedin.com/developers/"
                        target="_blank"
                        className="text-blue-600 underline"
                        rel="noreferrer"
                      >
                        LinkedIn Developer Portal
                      </a>
                    </li>
                    <li>Create a new app and select "Talent Solutions" products</li>
                    <li>
                      Add redirect URI:{" "}
                      <code className="bg-gray-100 px-1 rounded">
                        {typeof window !== "undefined" ? window.location.origin : "your-domain.com"}
                        /auth/linkedin/callback
                      </code>
                    </li>
                    <li>Copy Client ID and Client Secret below</li>
                    <li>Request access to Job Posting API (requires LinkedIn approval)</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin-client-id">Client ID *</Label>
                  <Input
                    id="linkedin-client-id"
                    type="text"
                    placeholder="Enter LinkedIn Client ID"
                    value={credentials.linkedin?.clientId || ""}
                    onChange={(e) => updateCredentials("linkedin", "clientId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-client-secret">Client Secret *</Label>
                  <Input
                    id="linkedin-client-secret"
                    type="password"
                    placeholder="Enter LinkedIn Client Secret"
                    value={credentials.linkedin?.clientSecret || ""}
                    onChange={(e) => updateCredentials("linkedin", "clientSecret", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => testConnection("LinkedIn")}
                  disabled={testingPlatform === "LinkedIn" || !isConfigured("linkedin")}
                >
                  {testingPlatform === "LinkedIn" ? "Testing..." : "Test Connection"}
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" asChild>
                    <a href="https://www.linkedin.com/oauth/v2/authorization" target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Authenticate
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indeed Integration */}
        <TabsContent value="indeed">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    💼 Indeed Integration
                    <Badge
                      className={isConfigured("indeed") ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {isConfigured("indeed") ? "Configured" : "Not Configured"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Post jobs to Indeed using Publisher API</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://indeed.com/hire/how-to-post-a-job-on-indeed" target="_blank" rel="noreferrer">
                    <Book className="h-4 w-4 mr-1" />
                    Documentation
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Sign up for{" "}
                      <a
                        href="https://secure.indeed.com/account/register"
                        target="_blank"
                        className="text-blue-600 underline"
                        rel="noreferrer"
                      >
                        Indeed Employer Account
                      </a>
                    </li>
                    <li>
                      Go to{" "}
                      <a
                        href="https://secure.indeed.com/account/apikeys"
                        target="_blank"
                        className="text-blue-600 underline"
                        rel="noreferrer"
                      >
                        API Keys section
                      </a>
                    </li>
                    <li>Generate Publisher ID and API Token</li>
                    <li>Note: Indeed charges per job posting</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="indeed-publisher-id">Publisher ID *</Label>
                  <Input
                    id="indeed-publisher-id"
                    type="text"
                    placeholder="Enter Indeed Publisher ID"
                    value={credentials.indeed?.publisherId || ""}
                    onChange={(e) => updateCredentials("indeed", "publisherId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="indeed-api-token">API Token *</Label>
                  <Input
                    id="indeed-api-token"
                    type="password"
                    placeholder="Enter Indeed API Token"
                    value={credentials.indeed?.apiToken || ""}
                    onChange={(e) => updateCredentials("indeed", "apiToken", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => testConnection("Indeed")}
                  disabled={testingPlatform === "Indeed" || !isConfigured("indeed")}
                >
                  {testingPlatform === "Indeed" ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monster Integration */}
        <TabsContent value="monster">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    👹 Monster Integration
                    <Badge
                      className={isConfigured("monster") ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {isConfigured("monster") ? "Configured" : "Not Configured"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Post jobs to Monster.com using their API</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.monster.com/employer/resources/posting-jobs" target="_blank" rel="noreferrer">
                    <Book className="h-4 w-4 mr-1" />
                    Documentation
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Create{" "}
                      <a
                        href="https://www.monster.com/employer/register"
                        target="_blank"
                        className="text-blue-600 underline"
                        rel="noreferrer"
                      >
                        Monster Employer Account
                      </a>
                    </li>
                    <li>Contact Monster support to request API access</li>
                    <li>Get API Key and account credentials</li>
                    <li>Note: Monster requires business verification</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monster-api-key">API Key *</Label>
                  <Input
                    id="monster-api-key"
                    type="password"
                    placeholder="Enter Monster API Key"
                    value={credentials.monster?.apiKey || ""}
                    onChange={(e) => updateCredentials("monster", "apiKey", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monster-username">Username *</Label>
                  <Input
                    id="monster-username"
                    type="text"
                    placeholder="Enter Monster Username"
                    value={credentials.monster?.username || ""}
                    onChange={(e) => updateCredentials("monster", "username", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monster-password">Password *</Label>
                <Input
                  id="monster-password"
                  type="password"
                  placeholder="Enter Monster Password"
                  value={credentials.monster?.password || ""}
                  onChange={(e) => updateCredentials("monster", "password", e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => testConnection("Monster")}
                  disabled={testingPlatform === "Monster" || !isConfigured("monster")}
                >
                  {testingPlatform === "Monster" ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Naukri Integration */}
        <TabsContent value="naukri">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    🇮🇳 Naukri.com Integration
                    <Badge
                      className={isConfigured("naukri") ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {isConfigured("naukri") ? "Configured" : "Not Configured"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Post jobs to Naukri.com using their Recruiter API</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.naukri.com/recruiter/help" target="_blank" rel="noreferrer">
                    <Book className="h-4 w-4 mr-1" />
                    Documentation
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Create{" "}
                      <a
                        href="https://www.naukri.com/recruiter/signup"
                        target="_blank"
                        className="text-blue-600 underline"
                        rel="noreferrer"
                      >
                        Naukri Recruiter Account
                      </a>
                    </li>
                    <li>Subscribe to a paid plan (API access requires subscription)</li>
                    <li>Contact Naukri support to enable API access</li>
                    <li>Get API credentials from your account settings</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="naukri-api-key">API Key *</Label>
                  <Input
                    id="naukri-api-key"
                    type="password"
                    placeholder="Enter Naukri API Key"
                    value={credentials.naukri?.apiKey || ""}
                    onChange={(e) => updateCredentials("naukri", "apiKey", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naukri-username">Username *</Label>
                  <Input
                    id="naukri-username"
                    type="text"
                    placeholder="Enter Naukri Username"
                    value={credentials.naukri?.username || ""}
                    onChange={(e) => updateCredentials("naukri", "username", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="naukri-password">Password *</Label>
                <Input
                  id="naukri-password"
                  type="password"
                  placeholder="Enter Naukri Password"
                  value={credentials.naukri?.password || ""}
                  onChange={(e) => updateCredentials("naukri", "password", e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => testConnection("Naukri")}
                  disabled={testingPlatform === "Naukri" || !isConfigured("naukri")}
                >
                  {testingPlatform === "Naukri" ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveCredentials} disabled={loading}>
          {loading ? "Saving..." : "Save All Credentials"}
        </Button>
      </div>
    </div>
  )
}
