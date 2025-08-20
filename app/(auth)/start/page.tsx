"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Mail, Phone, ArrowRight, RefreshCw } from "lucide-react"

export default function StartPage() {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [identifierType, setIdentifierType] = useState<"email" | "phone">("email")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const identifier = identifierType === "email" ? email : phone
    if (!identifier) {
      toast({
        title: "Required Field",
        description: `Please enter your ${identifierType}`,
        variant: "destructive",
      })
      return
    }

    if (identifierType === "email" && !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const payload = identifierType === "email" ? { email } : { phone }
      
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.code === 'USER_EXISTS') {
          toast({
            title: "Account Exists",
            description: "Please log in instead",
            variant: "destructive",
          })
          router.push('/login')
          return
        }
        throw new Error(data.message || 'Failed to start verification')
      }
      
      toast({
        title: "OTP Sent",
        description: `Check your ${identifierType} for the verification code`,
      })
      
      // Redirect to verify page with identifier
      router.push(`/verify?to=${encodeURIComponent(identifier)}&type=${identifierType}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <Link href="/">
            <CardTitle className="text-3xl font-bold mb-2">
              <span className="text-slate-800">Hire</span>
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">GenAI</span>
            </CardTitle>
          </Link>
          <CardDescription className="text-slate-600">
            Let's get started with your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Type Toggle */}
            <div className="flex rounded-lg border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setIdentifierType("email")}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  identifierType === "email"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Mail className="inline h-4 w-4 mr-2" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setIdentifierType("phone")}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  identifierType === "phone"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Phone className="inline h-4 w-4 mr-2" />
                Phone
              </button>
            </div>

            {/* Input Field */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                {identifierType === "email" ? "Email Address" : "Phone Number"}
              </Label>
              <div className="relative">
                {identifierType === "email" ? (
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                ) : (
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                )}
                <Input
                  id="identifier"
                  type={identifierType === "email" ? "email" : "tel"}
                  value={identifierType === "email" ? email : phone}
                  onChange={(e) => {
                    if (identifierType === "email") {
                      setEmail(e.target.value)
                    } else {
                      setPhone(e.target.value)
                    }
                  }}
                  className="pl-10 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 h-12"
                  placeholder={identifierType === "email" ? "Enter your email address" : "Enter your phone number"}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-medium" 
              disabled={loading || !(identifierType === "email" ? email : phone)}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Let's Start
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
