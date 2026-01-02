export interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  timezone?: string
}

export interface Company {
  id: string
  name: string
  slug: string
  industry: string
  size: string
  website: string
}

export interface AuthSession {
  user: User
  company: Company
}

interface MockUserData {
  id: string
  email: string
  password: string
  name: string
  role: string
  phone?: string
  timezone?: string
  company: Company
}

export class MockAuthService {
  private static readonly STORAGE_KEY = "mockAuth"
  private static readonly USERS_KEY = "mockUsers"
  private static readonly GLOBAL_USERS_KEY = "hire_genai_all_users"

  // Default demo users for development
  private static defaultUsers: MockUserData[] = [
    {
      id: "user_demo_001",
      email: "demo@example.com",
      password: "demo123",
      name: "Demo User",
      role: "company_admin",
      company: {
        id: "company_demo_001",
        name: "Demo Company",
        slug: "demo-company",
        industry: "Technology",
        size: "1-10",
        website: "https://demo.example.com"
      }
    },
    {
      id: "user_admin_001",
      email: "ashwini2kyadav@gmail.com",
      password: "admin123",
      name: "Ashwini Yadav",
      role: "admin",
      company: {
        id: "company_demo_001",
        name: "Demo Company",
        slug: "demo-company",
        industry: "Technology",
        size: "1-10",
        website: "https://demo.example.com"
      }
    },
    {
      id: "user_recruiter_001",
      email: "member1@gmail.com",
      password: "recruiter123",
      name: "Member One",
      role: "recruiter",
      company: {
        id: "company_demo_001",
        name: "Demo Company",
        slug: "demo-company",
        industry: "Technology",
        size: "1-10",
        website: "https://demo.example.com"
      }
    }
  ]

  static initializeUsers() {
    if (typeof window === "undefined") return

    try {
      // Initialize both local and global user storage
      const existingUsers = localStorage.getItem(this.USERS_KEY)
      const existingGlobalUsers = localStorage.getItem(this.GLOBAL_USERS_KEY)

      if (!existingUsers) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(this.defaultUsers))
      }

      if (!existingGlobalUsers) {
        localStorage.setItem(this.GLOBAL_USERS_KEY, JSON.stringify(this.defaultUsers))
      }

      console.log("✅ Mock users initialized in both storages")
    } catch (error) {
      console.error("Error initializing users:", error)
    }
  }

  private static slugify(text: string): string {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 40)
  }

  static getUsers(): MockUserData[] {
    if (typeof window === "undefined") return this.defaultUsers

    try {
      this.initializeUsers()

      // Try global storage first
      const globalStored = localStorage.getItem(this.GLOBAL_USERS_KEY)
      if (globalStored) {
        const users = JSON.parse(globalStored)
        // Sync to local storage
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
        return users
      }

      // Fallback to local storage
      const stored = localStorage.getItem(this.USERS_KEY)
      return stored ? JSON.parse(stored) : this.defaultUsers
    } catch (error) {
      console.error("Error getting users:", error)
      return this.defaultUsers
    }
  }

  static saveUsers(users: MockUserData[]) {
    if (typeof window === "undefined") return

    try {
      // Save to both local and global storage
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
      localStorage.setItem(this.GLOBAL_USERS_KEY, JSON.stringify(users))
      console.log("✅ Users saved to both storages")
    } catch (error) {
      console.error("Error saving users:", error)
    }
  }

  static async signIn(email: string, password: string) {
    console.log("🔐 Attempting sign in for:", email)

    try {
      const users = this.getUsers()
      console.log(
        "👥 Available users:",
        users.map((u) => ({ email: u.email, id: u.id })),
      )

      const user = users.find((u) => u.email === email && u.password === password)

      if (user) {
        const session: AuthSession = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          company: user.company,
        }

        // Sync company data to database
        try {
          await fetch('/api/auth/sync-company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company: user.company })
          })
        } catch (syncError) {
          console.warn('Failed to sync company to database:', syncError)
        }

        // Save session to localStorage with enhanced key
        if (typeof window !== "undefined") {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
          localStorage.setItem(`${this.STORAGE_KEY}_backup`, JSON.stringify(session))
          console.log("✅ Session saved for user:", user.email)
        }

        return {
          data: { session: { user: session.user } },
          error: null,
        }
      }

      console.log("❌ Invalid credentials for:", email)
      return {
        data: { session: null },
        error: { message: "Invalid email or password" },
      }
    } catch (error) {
      console.error("Sign in error:", error)
      return {
        data: { session: null },
        error: { message: "Sign in failed" },
      }
    }
  }

  static async signUp(email: string, password: string, companyName: string, userName: string) {
    console.log("📝 Attempting sign up for:", email)

    try {
      const users = this.getUsers()
      const existingUser = users.find((u) => u.email === email)

      if (existingUser) {
        return {
          data: { user: null },
          error: { message: "User already exists" },
        }
      }

      const newUser: MockUserData = {
        id: `user_${Date.now()}`,
        email,
        password,
        name: userName,
        role: "company_admin",
        company: {
          id: `company_${Date.now()}`,
          name: companyName,
          slug: this.slugify(companyName) || `company-${Date.now()}`,
          industry: "Technology",
          size: "1-10",
          website: "",
        },
      }

      users.push(newUser)
      this.saveUsers(users)

      const session: AuthSession = {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        company: newUser.company,
      }

      // Sync company data to database
      try {
        await fetch('/api/auth/sync-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: newUser.company })
        })
      } catch (syncError) {
        console.warn('Failed to sync company to database:', syncError)
      }

      // Save session to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
        localStorage.setItem(`${this.STORAGE_KEY}_backup`, JSON.stringify(session))
        console.log("✅ New user registered and session saved:", email)
      }

      return {
        data: { user: session.user },
        error: null,
      }
    } catch (error) {
      console.error("Sign up error:", error)
      return {
        data: { user: null },
        error: { message: "Sign up failed" },
      }
    }
  }

  // OTP-style sign in: DEV-only convenience to sign in by email (after OTP verification)
  static async signInWithEmail(email: string) {
    try {
      // Try to get user from database first
      const dbResponse = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: 'dummy' }) // This will fail but we can check if user exists
      })

      // If user exists in database, get their data
      if (dbResponse.status === 400) {
        const errorData = await dbResponse.json()
        if (errorData.error && errorData.error.includes('Invalid OTP')) {
          // User exists, get their data from database
          const userResponse = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`)
          if (userResponse.ok) {
            const userData = await userResponse.json()
            const session: AuthSession = {
              user: userData.user,
              company: userData.company,
            }

            if (typeof window !== "undefined") {
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
              localStorage.setItem(`${this.STORAGE_KEY}_backup`, JSON.stringify(session))
            }

            return {
              data: { session: { user: session.user } },
              error: null,
            }
          }
        }
      }

      // Fallback to localStorage users
      const users = this.getUsers()
      const user = users.find((u) => u.email === email)
      if (!user) {
        return {
          data: { session: null },
          error: { message: "User not found. Please register first." },
        }
      }

      const session: AuthSession = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        company: user.company,
      }

      // Sync company data to database
      try {
        await fetch('/api/auth/sync-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: user.company })
        })
      } catch (syncError) {
        console.warn('Failed to sync company to database:', syncError)
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
        localStorage.setItem(`${this.STORAGE_KEY}_backup`, JSON.stringify(session))
      }

      return {
        data: { session: { user: session.user } },
        error: null,
      }
    } catch (error) {
      console.error("Sign in with email error:", error)
      return {
        data: { session: null },
        error: { message: "Sign in failed" },
      }
    }
  }

  // Team management helpers (localStorage-based)
  static getCompanyMembers(companyId: string): Array<Pick<MockUserData, "id" | "email" | "name" | "role">> {
    const users = this.getUsers()
    return users
      .filter((u) => u.company.id === companyId)
      .map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role }))
  }

  static addCompanyMember(
    companyId: string,
    memberEmail: string,
    memberName: string,
    role: "company_admin" | "user" = "user",
  ) {
    const users = this.getUsers()
    const exists = users.find((u) => u.email === memberEmail)
    if (exists) return { error: { message: "User email already exists" } }

    // Find a company to copy details (name, slug, etc.)
    const companyOwner = users.find((u) => u.company.id === companyId)
    if (!companyOwner) return { error: { message: "Company not found" } }

    const newUser: MockUserData = {
      id: `user_${Date.now()}`,
      email: memberEmail,
      password: Math.random().toString(36).slice(2, 10),
      name: memberName || memberEmail.split("@")[0],
      role,
      company: companyOwner.company,
    }

    users.push(newUser)
    this.saveUsers(users)
    return { ok: true }
  }

  static removeCompanyMember(companyId: string, memberEmail: string) {
    const users = this.getUsers()
    const filtered = users.filter((u) => !(u.company.id === companyId && u.email === memberEmail))
    if (filtered.length === users.length) return { error: { message: "Member not found" } }
    this.saveUsers(filtered)
    return { ok: true }
  }

  static updateMemberRole(companyId: string, memberEmail: string, role: "company_admin" | "user") {
    const users = this.getUsers()
    const idx = users.findIndex((u) => u.company.id === companyId && u.email === memberEmail)
    if (idx === -1) return { error: { message: "Member not found" } }
    users[idx].role = role
    this.saveUsers(users)
    return { ok: true }
  }

  static async signOut() {
    console.log("🚪 Signing out user")

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(this.STORAGE_KEY)
        localStorage.removeItem(`${this.STORAGE_KEY}_backup`)
        console.log("✅ Session cleared")
      }
      return { error: null }
    } catch (error) {
      console.error("Sign out error:", error)
      return { error: { message: "Sign out failed" } }
    }
  }

  static getSession() {
    if (typeof window === "undefined") {
      return { data: { session: null } }
    }

    try {
      let stored = localStorage.getItem(this.STORAGE_KEY)

      // Try backup if main session is not found
      if (!stored) {
        stored = localStorage.getItem(`${this.STORAGE_KEY}_backup`)
      }

      if (stored) {
        const session = JSON.parse(stored)
        // Restore main session if using backup
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          localStorage.setItem(this.STORAGE_KEY, stored)
        }
        return { data: { session: { user: session.user } } }
      }
    } catch (error) {
      console.error("Error parsing session:", error)
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(`${this.STORAGE_KEY}_backup`)
    }

    return { data: { session: null } }
  }

  static getCurrentUser(): AuthSession | null {
    if (typeof window === "undefined") return null

    try {
      let stored = localStorage.getItem(this.STORAGE_KEY)

      // Try backup if main session is not found
      if (!stored) {
        stored = localStorage.getItem(`${this.STORAGE_KEY}_backup`)
      }

      if (stored) {
        const session = JSON.parse(stored)
        // Restore main session if using backup
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          localStorage.setItem(this.STORAGE_KEY, stored)
        }
        return session
      }
    } catch (error: any) {
      console.error("Error parsing current user:", error)
      if (typeof window !== "undefined") {
        localStorage.removeItem(this.STORAGE_KEY)
        localStorage.removeItem(`${this.STORAGE_KEY}_backup`)
      }
    }

    return null
  }

  // Allow setting session from server response (OTP flow)
  static setSessionFromServer(user: User, company: Company) {
    if (typeof window === "undefined") return

    try {
      // Store user profile data including phone number and timezone
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({ 
          user: {
            ...user,
            // Ensure phone and timezone are included
            phone: user.phone || '',
            timezone: user.timezone || 'UTC'
          }, 
          company 
        })
      )
      
      // Also store a backup
      localStorage.setItem(
        `${this.STORAGE_KEY}_backup`,
        JSON.stringify({ 
          user: {
            ...user,
            phone: user.phone || '',
            timezone: user.timezone || 'UTC'
          }, 
          company 
        })
      )
      
      console.log('📱 Saved user profile with phone:', user.phone)
    } catch (e) {
      console.error("Failed to set mock auth session:", e)
    }
  }
}
