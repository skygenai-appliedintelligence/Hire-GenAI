"use client"

import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function DemoBanner() {
  const { user } = useAuth()

  if (!user || user.email !== "demo@company.com") {
    return null
  }

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Demo Mode:</strong> You're using the demo account. All data is for demonstration purposes only.
      </AlertDescription>
    </Alert>
  )
}
