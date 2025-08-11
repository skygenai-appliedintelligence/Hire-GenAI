"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn(email, password)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message || "Login failed",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Welcome back!",
        })
        // Don't redirect here, let useEffect handle it
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setEmail("demo@company.com")
    setPassword("demo123")

    // Auto-submit with demo credentials
    setLoading(true)
    try {
      const result = await signIn("demo@company.com", "demo123")
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message || "Demo login failed",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Welcome to the demo!",
        })
      }
    } catch (error) {
      console.error("Demo login error:", error)
      toast({
        title: "Error",
        description: "Demo login failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSandeepLogin = async () => {
    setEmail("sandeep@gmail.com")
    setPassword("Demo@12345")

    // Auto-submit with Sandeep's credentials
    setLoading(true)
    try {
      const result = await signIn("sandeep@gmail.com", "Demo@12345")
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message || "Login failed",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Welcome back, Sandeep!",
        })
      }
    } catch (error) {
      console.error("Sandeep login error:", error)
      toast({
        title: "Error",
        description: "Login failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Link href="/">
            <CardTitle className="text-2xl font-bold">
              <span className="text-slate-800">Hire</span>
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">GenAI</span>
            </CardTitle>
          </Link>
          <CardDescription>Sign in to your recruitment automation platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Demo Credentials</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Try the demo:</p>

              <div className="space-y-2">
                <div className="text-xs text-gray-600">
                  <p>
                    <strong>Email:</strong> demo@company.com
                  </p>
                  <p>
                    <strong>Password:</strong> demo123
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={handleDemoLogin}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Use Demo Account"}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-600">
                  <p>
                    <strong>Email:</strong> sandeep@gmail.com
                  </p>
                  <p>
                    <strong>Password:</strong> Demo@12345
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={handleSandeepLogin}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Use Sandeep's Account"}
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="text-emerald-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
