"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Mail, Phone, User } from "lucide-react"

const messages = [
  {
    id: "msg-1",
    candidateName: "John Smith",
    jobTitle: "Senior Software Engineer",
    type: "email",
    subject: "Interview Invitation - Senior Software Engineer",
    preview: "Thank you for your interest in our Senior Software Engineer position...",
    status: "sent",
    timestamp: "2024-01-15T10:30:00Z",
    unread: false,
  },
  {
    id: "msg-2",
    candidateName: "Sarah Johnson",
    jobTitle: "Frontend Developer",
    type: "linkedin",
    subject: "Follow-up on Technical Interview",
    preview: "Hi Sarah, I wanted to follow up on your technical interview...",
    status: "delivered",
    timestamp: "2024-01-14T16:45:00Z",
    unread: true,
  },
  {
    id: "msg-3",
    candidateName: "Mike Davis",
    jobTitle: "Senior Software Engineer",
    type: "email",
    subject: "Application Status Update",
    preview: "Thank you for taking the time to interview with us...",
    status: "opened",
    timestamp: "2024-01-13T14:20:00Z",
    unread: false,
  },
]

export default function MessagesPage() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "linkedin":
        return <User className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "opened":
        return "bg-purple-100 text-purple-800"
      case "replied":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Manage candidate communications and outreach</p>
        </div>
        <Button className="linkedin-button">
          <MessageSquare className="h-4 w-4 mr-2" />
          Compose Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="linkedin-card">
            <CardHeader>
              <CardTitle className="text-lg">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedMessage === message.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    }`}
                    onClick={() => setSelectedMessage(message.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {message.candidateName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{message.candidateName}</p>
                          {message.unread && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{message.subject}</p>
                        <p className="text-xs text-gray-400 truncate mt-1">{message.preview}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            {getTypeIcon(message.type)}
                            <Badge className={getStatusColor(message.status)} variant="outline">
                              {message.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(message.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="linkedin-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{messages.find((m) => m.id === selectedMessage)?.subject}</CardTitle>
                    <CardDescription>
                      To: {messages.find((m) => m.id === selectedMessage)?.candidateName}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(messages.find((m) => m.id === selectedMessage)?.status || "")}>
                    {messages.find((m) => m.id === selectedMessage)?.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm">
                    Thank you for your interest in our Senior Software Engineer position. We were impressed with your
                    background and would like to invite you for an initial screening call.
                  </p>
                  <p className="text-sm mt-2">
                    Please let us know your availability for a 30-minute call this week. We're flexible with timing and
                    can accommodate your schedule.
                  </p>
                  <p className="text-sm mt-2">Looking forward to speaking with you soon!</p>
                  <p className="text-sm mt-4 text-gray-500">
                    Best regards,
                    <br />
                    HireGenAI Team
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reply</label>
                  <Textarea
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={4}
                    className="linkedin-input"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">Save Draft</Button>
                    <Button className="linkedin-button">
                      <Send className="h-4 w-4 mr-1" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="linkedin-card">
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a message</h3>
                <p className="text-gray-600">Choose a message from the list to view its details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
