"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { RoleManagementService } from "@/lib/role-management-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Shield, Bot } from "lucide-react"

export function RoleSwitcher() {
  const { user, company, switchRole } = useAuth()
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    // Get all available users for role switching
    const allUsers = RoleManagementService.getAllUsers()
    setUsers(allUsers)
  }, [])

  const handleRoleSwitch = (userId: string) => {
    const selectedUser = users.find((u) => u.id === userId)
    if (selectedUser) {
      switchRole(selectedUser)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-3 w-3" />
      case "ai_recruiter":
        return <Bot className="h-3 w-3" />
      case "interviewer":
        return <User className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "ai_recruiter":
        return "bg-blue-100 text-blue-800"
      case "interviewer":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge className={getRoleColor(user?.role || "")}> 
        {getRoleIcon(user?.role || "")}
        <span className="ml-1 capitalize">{user?.role?.replace("_", " ") || "User"}</span>
      </Badge>

      <Select value={user?.id} onValueChange={handleRoleSwitch}>
        <SelectTrigger className="w-44">
          <div className="flex flex-col text-left leading-tight">
            <span className="text-sm font-medium truncate">{user?.full_name || user?.email?.split('@')[0] || 'User'}</span>
            <span className="text-[11px] text-gray-500 truncate">{company?.name || 'Company'}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <div className="flex items-center space-x-2">
                {getRoleIcon(u.role)}
                <div className="flex flex-col leading-tight">
                  <span className="text-sm">{u.name || u.email?.split('@')[0] || 'User'}</span>
                  {u.company?.name && (
                    <span className="text-[11px] text-gray-500">{u.company.name}</span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
