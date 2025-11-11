"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle } from "lucide-react"

export default function SettingsTab() {
  const [settings, setSettings] = useState<any>(null)
  const [profitMargin, setProfitMargin] = useState("20")
  const [apiKeyStatus, setApiKeyStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error("Failed to load settings")
      const data = await res.json()
      setSettings(data.settings)
      setProfitMargin(data.settings?.profitMargin || "20")
      setApiKeyStatus(data.apiKeyStatus)
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfitMargin = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profitMargin: parseFloat(profitMargin) }),
      })
      if (res.ok) {
        alert("Profit margin updated successfully")
        loadSettings()
      }
    } catch (error) {
      console.error("Failed to update settings:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profit Margin */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Profit Margin</CardTitle>
          <CardDescription>Configure markup on OpenAI costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Margin Percentage (%)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <Button onClick={updateProfitMargin} className="bg-emerald-600 hover:bg-emerald-700">
                  Save
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Example: 20% margin on $1.00 cost = $1.20 final price
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OpenAI API Key Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">OpenAI API Status</CardTitle>
          <CardDescription>Admin key health check</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
              {apiKeyStatus?.isValid ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-white font-semibold">API Key Valid</p>
                    <p className="text-xs text-slate-400">Admin key is configured and working</p>
                  </div>
                  <Badge className="ml-auto bg-green-900 text-green-200">Active</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="text-white font-semibold">API Key Invalid</p>
                    <p className="text-xs text-slate-400">Check OPENAI_API_KEY environment variable</p>
                  </div>
                  <Badge className="ml-auto bg-red-900 text-red-200">Error</Badge>
                </>
              )}
            </div>
            {apiKeyStatus?.lastChecked && (
              <p className="text-xs text-slate-400">
                Last checked: {new Date(apiKeyStatus.lastChecked).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Feature Toggles</CardTitle>
          <CardDescription>Enable/disable admin features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div>
                <p className="text-white font-medium">Anomaly Detection</p>
                <p className="text-xs text-slate-400">Detect unusual patterns and alerts</p>
              </div>
              <Badge className="bg-green-900 text-green-200">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div>
                <p className="text-white font-medium">Real-time Alerts</p>
                <p className="text-xs text-slate-400">Send notifications for critical issues</p>
              </div>
              <Badge className="bg-green-900 text-green-200">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
