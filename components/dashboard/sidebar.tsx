"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Briefcase, Settings, BarChart3, MessageSquare, LogOut, ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Job Descriptions", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings/profile", icon: Settings },
  { name: "Support", href: "/support-hiregenai", icon: HelpCircle },
]

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // For mobile, use the isMobileOpen prop instead of internal state
  const isOpen = isMobileOpen !== undefined ? isMobileOpen : sidebarOpen
  const setOpen = onMobileClose ? (value: boolean) => {
    if (!value) onMobileClose()
  } : setSidebarOpen

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div
      className={cn(
        "bg-white shadow-sm border-r border-gray-200 transition-all duration-300 flex flex-col h-full",
        isOpen ? "w-52" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        {isOpen ? (
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="text-lg font-bold">
                <span className="text-slate-800">Hire</span>
                <span className="text-emerald-600">GenAI</span>
              </h1>
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full flex justify-center p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 mt-4 overflow-y-auto">
        <div className="px-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.name === "Settings" && pathname.startsWith("/dashboard/settings"))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500"
                    : "text-gray-700 hover:bg-gray-50 hover:text-emerald-600",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isOpen ? "mr-2.5" : "mx-auto",
                    isActive ? "text-emerald-500" : "text-gray-400 group-hover:text-emerald-500",
                  )}
                />
                {isOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer - Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className={cn("w-4 h-4", isOpen && "mr-2")} />
          {isOpen && "Logout"}
        </Button>
      </div>
    </div>
  )
}
