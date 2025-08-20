"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { MockAuthService } from "@/lib/mock-auth"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Company {
  id: string
  name: string
  slug: string
  industry: string
  size: string
  website: string
}

interface AuthContextType {
  user: User | null
  company: Company | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error?: { message: string } }>
  signUp: (
    email: string,
    password: string,
    companyName: string,
    fullName: string,
  ) => Promise<{ error?: { message: string } }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize the auth system
    const initAuth = async () => {
      try {
        console.log("🔄 Initializing auth system...")

        // Initialize mock users and storage
        MockAuthService.initializeUsers()

        // Check for existing session
        const session = MockAuthService.getSession()
        if (session.data.session?.user) {
          const currentUser = MockAuthService.getCurrentUser()
          if (currentUser) {
            setUser(currentUser.user)
            setCompany(currentUser.company)
            console.log("✅ Restored session for:", currentUser.user.email)
          }
        } else {
          console.log("ℹ️ No existing session found")
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])



  const signUp = async (email: string, password: string, companyName: string, fullName: string) => {
    try {
      setLoading(true)
      console.log("📝 Signing up user:", email)

      const result = await MockAuthService.signUp(email, password, companyName, fullName)

      if (result.error) {
        console.log("❌ Sign up failed:", result.error.message)
        return { error: result.error }
      }

      if (result.data.user) {
        const currentUser = MockAuthService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser.user)
          setCompany(currentUser.company)
          console.log("✅ Sign up successful for:", currentUser.user.email)
        }
      }

      return {}
    } catch (error) {
      console.error("❌ Sign up error:", error)
      return { error: { message: "An unexpected error occurred" } }
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string) => {
    try {
      setLoading(true)
      const result = await MockAuthService.signInWithEmail(email)
      if (result.error) {
        return { error: result.error }
      }
      const currentUser = MockAuthService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser.user)
        setCompany(currentUser.company)
      }
      return {}
    } catch (error) {
      return { error: { message: "An unexpected error occurred" } }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log("🚪 Signing out user")

      await MockAuthService.signOut()
      setUser(null)
      setCompany(null)

      console.log("✅ Sign out successful")
    } catch (error) {
      console.error("❌ Sign out error:", error)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    company,
    loading,
    signInWithEmail,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
