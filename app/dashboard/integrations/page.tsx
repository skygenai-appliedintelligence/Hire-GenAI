"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"

const integrations = [
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Post jobs and source candidates from LinkedIn",
    status: "connected",
    logo: "🔗",
  },
  {
    id: "indeed",
    name: "Indeed",
    description: "Automatically post jobs to Indeed",
    status: "connected",
    logo: "💼",
  },
  {
    id: "monster",
    name: "Monster",
    description: "Reach candidates on Monster.com",
    status: "disconnected",
    logo: "👹",
  },
  {
    id: "naukri",
    name: "Naukri.com",
    description: "Connect with Indian job market",
    status: "disconnected",
    logo: "🇮🇳",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "AI-powered candidate screening and analysis",
    status: "connected",
    logo: "🤖",
  },
  {
    id: "vapi",
    name: "VAPI",
    description: "Voice AI for automated interviews",
    status: "disconnected",
    logo: "🎙️",
  },
]

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})

  const handleToggle = (integrationId: string) => {
    // Handle integration toggle
    console.log(`Toggling ${integrationId}`)
  }

  const handleApiKeyChange = (integrationId: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [integrationId]: value }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600">Connect your favorite tools and platforms</p>
      </div>

      <div className="grid gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="linkedin-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{integration.logo}</div>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    className={
                      integration.status === "connected" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }
                  >
                    {integration.status === "connected" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {integration.status}
                  </Badge>
                  <Switch
                    checked={integration.status === "connected"}
                    onCheckedChange={() => handleToggle(integration.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${integration.id}-key`}>API Key</Label>
                    <Input
                      id={`${integration.id}-key`}
                      type="password"
                      placeholder="Enter API key..."
                      value={apiKeys[integration.id] || ""}
                      onChange={(e) => handleApiKeyChange(integration.id, e.target.value)}
                      className="linkedin-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${integration.id}-secret`}>API Secret (if required)</Label>
                    <Input
                      id={`${integration.id}-secret`}
                      type="password"
                      placeholder="Enter API secret..."
                      className="linkedin-input"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Documentation
                  </Button>
                  <Button size="sm" className="linkedin-button">
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
