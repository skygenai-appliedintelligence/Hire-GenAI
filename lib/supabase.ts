import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { MockAuthService } from "./mock-auth"

/**
 * Returns a real Supabase client when the env vars exist,
 * otherwise falls back to a mock client for preview environments
 */

function createMockClient(): SupabaseClient {
  // Mock client that uses localStorage and mock data
  const mockAuth = {
    getSession: () => {
      if (typeof window === "undefined") return Promise.resolve({ data: { session: null } })
      return Promise.resolve(MockAuthService.getSession())
    },
    onAuthStateChange: (callback: any) => {
      // Simulate auth state change listener
      const checkAuth = () => {
        if (typeof window === "undefined") return
        const session = MockAuthService.getSession().data.session
        callback("SIGNED_IN", session ? { user: session.user } : null)
      }

      // Check immediately
      setTimeout(checkAuth, 100)

      // Return unsubscribe function
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      return MockAuthService.signIn(email, password)
    },
    signUp: async ({ email, password }: { email: string; password: string }) => {
      return MockAuthService.signUp(email, password, "New Company", "New User")
    },
    signOut: async () => {
      return MockAuthService.signOut()
    },
  }

  const mockDatabase = {
    from: (table: string) => {
      const mockData = getMockData(table)

      const chain = {
        select: (columns = "*") => chain,
        insert: (data: any) => {
          // Save data to localStorage
          saveToMockDatabase(table, data)
          return { ...chain, single: () => Promise.resolve({ data: data, error: null }) }
        },
        update: (data: any) => {
          // Update data in localStorage
          updateMockDatabase(table, data)
          return chain
        },
        delete: () => {
          // Delete from localStorage
          deleteFromMockDatabase(table)
          return chain
        },
        eq: (column: string, value: any) => {
          // Filter mock data based on the condition
          const filtered = mockData.filter((item: any) => item[column] === value)
          return {
            ...chain,
            single: () => Promise.resolve({ data: filtered[0] || null, error: null }),
            then: (callback: any) => callback({ data: filtered, error: null }),
          }
        },
        order: (column: string, options?: any) => chain,
        limit: (count: number) => chain,
        single: () => Promise.resolve({ data: mockData[0] || null, error: null }),
        then: (callback: any) => callback({ data: mockData, error: null }),
      }

      return chain
    },
  }

  // @ts-expect-error - Mock implementation
  return {
    auth: mockAuth,
    from: mockDatabase.from,
  } as SupabaseClient
}

function saveToMockDatabase(table: string, data: any) {
  if (typeof window === "undefined") return

  const key = `mock_${table}`
  const existing = JSON.parse(localStorage.getItem(key) || "[]")
  existing.push(data)
  localStorage.setItem(key, JSON.stringify(existing))
}

function updateMockDatabase(table: string, data: any) {
  if (typeof window === "undefined") return

  const key = `mock_${table}`
  const existing = JSON.parse(localStorage.getItem(key) || "[]")
  // Simple update - in real app would need proper ID matching
  existing.push(data)
  localStorage.setItem(key, JSON.stringify(existing))
}

function deleteFromMockDatabase(table: string) {
  if (typeof window === "undefined") return

  const key = `mock_${table}`
  localStorage.removeItem(key)
}

function getMockData(table: string) {
  if (typeof window === "undefined") return []

  const currentUser = MockAuthService.getCurrentUser()
  if (!currentUser) return []

  // First check localStorage for saved data
  const savedKey = `mock_${table}`
  const savedData = localStorage.getItem(savedKey)
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      // Filter by company_id if applicable
      return parsed.filter((item: any) => !item.company_id || item.company_id === currentUser.company.id)
    } catch (error) {
      console.error("Error parsing saved data:", error)
    }
  }

  switch (table) {
    case "companies":
      return [currentUser.company]

    case "users":
      return [
        {
          id: currentUser.user.id,
          company_id: currentUser.company.id,
          email: currentUser.user.email,
          name: currentUser.user.name,
          role: "company_admin",
          companies: currentUser.company,
        },
      ]

    case "job_descriptions":
      // Get jobs from JobService
      const jobsKey = `jobs_${currentUser.company.id}`
      const jobsData = localStorage.getItem(jobsKey)
      if (jobsData) {
        try {
          return JSON.parse(jobsData)
        } catch (error) {
          console.error("Error parsing jobs data:", error)
        }
      }
      return []

    case "candidates":
      // Get candidates from localStorage
      const candidatesData = localStorage.getItem("interviewCandidates")
      if (candidatesData) {
        try {
          const candidates = JSON.parse(candidatesData)
          return candidates.map((candidate: any) => ({
            id: candidate.id,
            job_id: candidate.jobId,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            source_platform: candidate.source || "direct_application",
            current_stage: candidate.current_stage || "screening",
            qualification_status: candidate.status || "qualified",
            job_descriptions: { company_id: currentUser.company.id },
          }))
        } catch (error) {
          console.error("Error parsing candidates data:", error)
        }
      }
      return []

    case "interview_rounds":
      // Get interview rounds from localStorage
      const interviewData = localStorage.getItem("interviewPipelines")
      if (interviewData) {
        try {
          const pipelines = JSON.parse(interviewData)
          return pipelines.map((pipeline: any) => ({
            id: pipeline.id,
            candidate_id: pipeline.candidateId,
            job_id: pipeline.jobId,
            round_type: "screening",
            status: "scheduled",
            scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            job_descriptions: { company_id: currentUser.company.id },
          }))
        } catch (error) {
          console.error("Error parsing interview data:", error)
        }
      }
      return []

    case "activity_logs":
      // Get activity logs from localStorage
      const activityKey = `activity_logs_${currentUser.company.id}`
      const activityData = localStorage.getItem(activityKey)
      if (activityData) {
        try {
          return JSON.parse(activityData)
        } catch (error) {
          console.error("Error parsing activity data:", error)
        }
      }
      return [
        {
          id: "activity-1",
          company_id: currentUser.company.id,
          action: "Candidate Applied",
          details: { source: "linkedin", status: "new" },
          created_at: new Date().toISOString(),
        },
        {
          id: "activity-2",
          company_id: currentUser.company.id,
          action: "Interview Scheduled",
          details: { round: "technical_1", status: "scheduled" },
          created_at: new Date().toISOString(),
        },
      ]

    default:
      return []
  }
}

function isPlaceholder(value: string) {
  const trimmed = (value || "").trim().toLowerCase()
  return trimmed === "your_supabase_url_here" || trimmed === "your_supabase_anon_key_here"
}

function isValidHttpUrl(url: string) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const hasValidSupabaseConfig =
  isValidHttpUrl(supabaseUrl) && !!supabaseAnonKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)

export const supabase: SupabaseClient =
  hasValidSupabaseConfig
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (() => {
        console.warn(
          "⚠️  Supabase env config missing or invalid. Falling back to mock auth. Set valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable real database.",
        )
        console.warn(
          "Using mock authentication for preview. Use these credentials:\n" +
            "Email: demo@company.com, Password: demo123\n" +
            "Email: sandeep@gmail.com, Password: Demo@12345",
        )
        return createMockClient()
      })()

export const createServerClient = () => {
  const serverUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (isValidHttpUrl(serverUrl) && !!serviceKey && !isPlaceholder(serverUrl)) {
    return createClient(serverUrl, serviceKey)
  }
  return createMockClient()
}
