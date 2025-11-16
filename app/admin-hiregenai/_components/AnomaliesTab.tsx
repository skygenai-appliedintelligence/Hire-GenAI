"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function AnomaliesTab() {
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Load initial anomalies
    loadAnomalies()

    // Connect to SSE stream for live alerts
    connectToAlertStream()

    return () => {
      // Cleanup on unmount
    }
  }, [])

  const loadAnomalies = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/anomalies")
      if (!res.ok) throw new Error("Failed to load anomalies")
      const data = await res.json()
      setAnomalies(data.anomalies || [])
    } catch (error) {
      console.error("Failed to load anomalies:", error)
    } finally {
      setLoading(false)
    }
  }

  const connectToAlertStream = () => {
    try {
      const eventSource = new EventSource("/api/admin/alerts/stream")

      eventSource.onopen = () => {
        setConnected(true)
        console.log("Connected to alerts stream")
      }

      eventSource.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data)
          if (alert.type === "alert") {
            // Add new alert to the top of the list, avoid duplicates
            setAnomalies((prev) => {
              const filtered = prev.filter((a) => a.id !== alert.id)
              return [alert, ...filtered].slice(0, 20) // Keep last 20 alerts
            })
          }
        } catch (err) {
          console.error("Failed to parse alert:", err)
        }
      }

      eventSource.onerror = () => {
        setConnected(false)
        console.error("Alert stream error")
        eventSource.close()
        // Reconnect after 5 seconds
        setTimeout(() => connectToAlertStream(), 5000)
      }

      return () => eventSource.close()
    } catch (err) {
      console.error("Failed to connect to alert stream:", err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-900 text-red-200"
      case "warning":
        return "bg-yellow-900 text-yellow-200"
      case "info":
        return "bg-blue-900 text-blue-200"
      default:
        return "bg-slate-700 text-slate-200"
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-white">Anomalies & Alerts</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-slate-400">{connected ? "Live" : "Offline"}</span>
            </div>
          </div>
          <CardDescription>Detected issues and unusual patterns (live updates every 10s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400">No anomalies detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <div key={idx} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{anomaly.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">{anomaly.description}</p>
                    </div>
                    <Badge className={getSeverityColor(anomaly.severity)}>
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-3">
                    <div>
                      <span className="text-slate-500">Company:</span> {anomaly.company}
                    </div>
                    <div>
                      <span className="text-slate-500">Detected:</span>{" "}
                      {new Date(anomaly.detectedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
