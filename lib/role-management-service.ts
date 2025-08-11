export interface UserRole {
  id: string
  name: string
  email: string
  role: "admin" | "interviewer" | "ai_recruiter"
  permissions: Permission[]
  assignedCandidates?: string[]
  createdAt: string
  lastActive: string
}

export interface Permission {
  resource: string
  actions: string[]
}

export class RoleManagementService {
  private static readonly STORAGE_KEY = "user_roles"
  private static readonly CURRENT_USER_KEY = "current_user_role"

  // Default role configurations
  private static readonly DEFAULT_ROLES = {
    admin: {
      permissions: [
        { resource: "candidates", actions: ["create", "read", "update", "delete", "assign"] },
        { resource: "jobs", actions: ["create", "read", "update", "delete", "publish"] },
        { resource: "interviews", actions: ["schedule", "conduct", "submit_feedback", "view_all"] },
        { resource: "analytics", actions: ["view", "export"] },
        { resource: "users", actions: ["create", "read", "update", "delete", "assign_roles"] },
        { resource: "ai_recruiter", actions: ["configure", "monitor", "override"] },
      ],
    },
    interviewer: {
      permissions: [
        { resource: "candidates", actions: ["read"] },
        { resource: "interviews", actions: ["conduct", "submit_feedback"] },
        { resource: "jobs", actions: ["read"] },
      ],
    },
    ai_recruiter: {
      permissions: [
        { resource: "candidates", actions: ["read", "update", "screen"] },
        { resource: "jobs", actions: ["read"] },
        { resource: "interviews", actions: ["generate_feedback", "progress_candidates"] },
      ],
    },
  }

  static initializeDefaultUsers(): void {
    const existingUsers = this.getAllUsers()
    if (existingUsers.length === 0) {
      const defaultUsers: UserRole[] = [
        {
          id: "admin_1",
          name: "Admin User",
          email: "admin@company.com",
          role: "admin",
          permissions: this.DEFAULT_ROLES.admin.permissions,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        {
          id: "interviewer_1",
          name: "John Interviewer",
          email: "john@company.com",
          role: "interviewer",
          permissions: this.DEFAULT_ROLES.interviewer.permissions,
          assignedCandidates: ["cand_1", "cand_2"],
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        {
          id: "interviewer_2",
          name: "Sarah Interviewer",
          email: "sarah@company.com",
          role: "interviewer",
          permissions: this.DEFAULT_ROLES.interviewer.permissions,
          assignedCandidates: ["cand_3", "cand_4"],
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        {
          id: "ai_recruiter_system",
          name: "AI Recruiter",
          email: "ai@system.com",
          role: "ai_recruiter",
          permissions: this.DEFAULT_ROLES.ai_recruiter.permissions,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
      ]

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultUsers))
    }
  }

  static getAllUsers(): UserRole[] {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  static getUsersByRole(role: string): UserRole[] {
    return this.getAllUsers().filter((user) => user.role === role)
  }

  static getUserById(id: string): UserRole | null {
    return this.getAllUsers().find((user) => user.id === id) || null
  }

  static createUser(userData: Omit<UserRole, "id" | "createdAt" | "lastActive">): UserRole {
    const users = this.getAllUsers()
    const newUser: UserRole = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    }

    users.push(newUser)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    return newUser
  }

  static updateUser(id: string, updates: Partial<UserRole>): UserRole | null {
    const users = this.getAllUsers()
    const userIndex = users.findIndex((user) => user.id === id)

    if (userIndex === -1) return null

    users[userIndex] = { ...users[userIndex], ...updates, lastActive: new Date().toISOString() }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users))
    return users[userIndex]
  }

  static assignCandidateToInterviewer(candidateId: string, interviewerId: string): boolean {
    const interviewer = this.getUserById(interviewerId)
    if (!interviewer || interviewer.role !== "interviewer") return false

    const updatedAssignments = [...(interviewer.assignedCandidates || []), candidateId]
    this.updateUser(interviewerId, { assignedCandidates: updatedAssignments })
    return true
  }

  static getAccessibleCandidates(userRole: UserRole, allCandidates: any[]): any[] {
    if (userRole.role === "admin" || userRole.role === "ai_recruiter") {
      return allCandidates
    }

    if (userRole.role === "interviewer") {
      return allCandidates.filter((candidate) => userRole.assignedCandidates?.includes(candidate.id))
    }

    return []
  }

  static hasPermission(userRole: UserRole, resource: string, action: string): boolean {
    return userRole.permissions.some(
      (permission) => permission.resource === resource && permission.actions.includes(action),
    )
  }

  static getCurrentUser(): UserRole | null {
    const stored = localStorage.getItem(this.CURRENT_USER_KEY)
    return stored ? JSON.parse(stored) : null
  }

  static setCurrentUser(user: UserRole): void {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user))
  }

  static clearCurrentUser(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY)
  }
}

export const roleManagementService = new RoleManagementService()
