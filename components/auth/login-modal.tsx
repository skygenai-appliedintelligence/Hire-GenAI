"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn(email, password)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Welcome back!",
        })
        onClose()
        router.push("/dashboard")
      }
    } catch (error) {
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
    setLoading(true)
    try {
      const result = await signIn("demo@company.com", "demo123")
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Welcome to the demo!",
        })
        onClose()
        router.push("/dashboard")
      }
    } catch (error) {
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
    setLoading(true)
    try {
      const result = await signIn("sandeep@gmail.com", "Demo@12345")
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Welcome back, Sandeep!",
        })
        onClose()
        router.push("/dashboard")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Sign in</DialogTitle>
          <DialogDescription className="text-center">Welcome back to HireGenAI</DialogDescription>
        </DialogHeader>

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
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Demo Accounts</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoLogin}
              className="text-xs bg-transparent"
              disabled={loading}
            >
              {loading ? "..." : "Demo Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSandeepLogin}
              className="text-xs bg-transparent"
              disabled={loading}
            >
              {loading ? "..." : "Sandeep's Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
