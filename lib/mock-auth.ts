export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Company {
  id: string
  name: string
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
  company: Company
}

export class MockAuthService {
  private static readonly STORAGE_KEY = "mockAuth"
  private static readonly USERS_KEY = "mockUsers"
  private static readonly GLOBAL_USERS_KEY = "hire_genai_all_users"

  // No default demo users in production build
  private static defaultUsers: MockUserData[] = []

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
    } catch (error) {
      console.error("Error parsing current user:", error)
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(`${this.STORAGE_KEY}_backup`)
    }

    return null
  }
}
