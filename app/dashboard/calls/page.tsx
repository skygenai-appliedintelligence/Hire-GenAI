"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Phone, PhoneCall, Clock, User, Play, Download } from "lucide-react"

const calls = [
  {
    id: "call-1",
    candidateName: "John Smith",
    jobTitle: "Senior Software Engineer",
    callType: "screening",
    duration: "12:34",
    status: "completed",
    result: "qualified",
    scheduledAt: "2024-01-15T10:00:00Z",
    transcript: "Available",
  },
  {
    id: "call-2",
    candidateName: "Sarah Johnson",
    jobTitle: "Frontend Developer",
    callType: "technical_1",
    duration: "18:45",
    status: "completed",
    result: "qualified",
    scheduledAt: "2024-01-14T14:30:00Z",
    transcript: "Available",
  },
  {
    id: "call-3",
    candidateName: "Mike Davis",
    jobTitle: "Senior Software Engineer",
    callType: "screening",
    duration: "08:12",
    status: "completed",
    result: "unqualified",
    scheduledAt: "2024-01-13T11:15:00Z",
    transcript: "Available",
  },
  {
    id: "call-4",
    candidateName: "Emily Chen",
    jobTitle: "Frontend Developer",
    callType: "hr",
    duration: "00:00",
    status: "scheduled",
    result: null,
    scheduledAt: "2024-01-16T15:00:00Z",
    transcript: null,
  },
]

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "in-progress":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getResultColor = (result: string | null) => {
    if (!result) return ""
    switch (result) {
      case "qualified":
        return "bg-green-100 text-green-800"
      case "unqualified":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCallTypeIcon = (callType: string) => {
    switch (callType) {
      case "screening":
        return <Phone className="h-4 w-4" />
      case "technical_1":
      case "technical_2":
        return <PhoneCall className="h-4 w-4" />
      case "hr":
        return <User className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Voice Calls</h1>
          <p className="text-gray-600">Manage automated voice interviews and screening calls</p>
        </div>
        <Button className="linkedin-button">
          <Phone className="h-4 w-4 mr-2" />
          Schedule Call
        </Button>
      </div>

      <div className="grid gap-6">
        {calls.map((call) => (
          <Card key={call.id} className="linkedin-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {call.candidateName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{call.candidateName}</CardTitle>
                    <CardDescription>
                      {call.jobTitle} • {call.callType.replace("_", " ")} interview
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(call.status)}>{call.status}</Badge>
                  {call.result && <Badge className={getResultColor(call.result)}>{call.result}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {getCallTypeIcon(call.callType)}
                  <span className="capitalize">{call.callType.replace("_", " ")} Call</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{call.status === "completed" ? `Duration: ${call.duration}` : "Scheduled"}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>{new Date(call.scheduledAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {call.transcript ? "Transcript available" : "No transcript yet"}
                </div>
                <div className="flex space-x-2">
                  {call.status === "completed" && (
                    <>
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Play Recording
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                  {call.status === "scheduled" && (
                    <Button size="sm" className="linkedin-button">
                      <Phone className="h-4 w-4 mr-1" />
                      Start Call
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
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
