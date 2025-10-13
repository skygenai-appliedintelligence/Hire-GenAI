"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { MockAuthService } from "@/lib/mock-auth"
import { RoleManagementService, UserRole } from "@/lib/role-management-service"

interface User {
  id: string
  email: string
  full_name: string
  status: string
  phone?: string
  timezone?: string
  role?: "admin" | "interviewer" | "ai_recruiter"
}

interface Company {
  id: string
  name: string
  status: string
  verified: boolean
  website?: string
  industry?: string
  size?: string
  description?: string
}

interface AuthContextType {
  user: User | null
  company: Company | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: { message: string } }>
  signInWithEmail: (email: string) => Promise<{ error?: { message: string } }>
  signUp: (
    email: string,
    password: string,
    companyName: string,
    fullName: string,
  ) => Promise<{ error?: { message: string } }>
  signOut: () => Promise<void>
  setAuthSession: (user: User, company: Company) => void
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
            // Convert mock format to new format
            const newUser: User = {
              id: currentUser.user.id,
              email: currentUser.user.email,
              full_name: currentUser.user.name,
              status: 'active',
              phone: undefined,
              timezone: 'UTC'
            }
            const newCompany: Company = {
              id: currentUser.company.id,
              name: currentUser.company.name,
              status: 'active',
              verified: false
            }
            setUser(newUser)
            setCompany(newCompany)
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



  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const result = await MockAuthService.signIn(email, password)
      if (result.error) {
        return { error: result.error }
      }
      const currentUser = MockAuthService.getCurrentUser()
      if (currentUser) {
        // Convert mock format to new format
        const newUser: User = {
          id: currentUser.user.id,
          email: currentUser.user.email,
          full_name: currentUser.user.name,
          status: 'active',
          phone: undefined,
          timezone: 'UTC'
        }
        const newCompany: Company = {
          id: currentUser.company.id,
          name: currentUser.company.name,
          status: 'active',
          verified: false
        }
        setUser(newUser)
        setCompany(newCompany)
      }
      return {}
    } catch (error) {
      return { error: { message: "An unexpected error occurred" } }
    } finally {
      setLoading(false)
    }
  }

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
          const newUser: User = {
            id: currentUser.user.id,
            email: currentUser.user.email,
            full_name: currentUser.user.name,
            status: 'active',
            phone: undefined,
            timezone: 'UTC'
          }
          const newCompany: Company = {
            id: currentUser.company.id,
            name: currentUser.company.name,
            status: 'active',
            verified: false
          }
          setUser(newUser)
          setCompany(newCompany)
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
        // Convert mock format to new format
        const newUser: User = {
          id: currentUser.user.id,
          email: currentUser.user.email,
          full_name: currentUser.user.name,
          status: 'active',
          phone: undefined,
          timezone: 'UTC'
        }
        const newCompany: Company = {
          id: currentUser.company.id,
          name: currentUser.company.name,
          status: 'active',
          verified: false
        }
        setUser(newUser)
        setCompany(newCompany)
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

  // Allow setting session directly from server response (e.g., OTP verify)
  const setAuthSession = (userObj: User, companyObj: Company) => {
    try {
      // Convert new format to mock format for compatibility
      const mockUser = {
        id: userObj.id,
        email: userObj.email,
        name: userObj.full_name,
        role: 'admin'
      }
      const mockCompany = {
        id: companyObj.id,
        name: companyObj.name,
        slug: companyObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        industry: 'Technology',
        size: '1-10',
        website: ''
      }
      
      MockAuthService.setSessionFromServer(mockUser, mockCompany)
      setUser(userObj)
      setCompany(companyObj)
    } catch (e) {
      console.error("Failed to set auth session:", e)
    }
  }

  const value: AuthContextType = {
    user,
    company,
    loading,
    signIn,
    signInWithEmail,
    signUp,
    signOut,
    setAuthSession,
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
