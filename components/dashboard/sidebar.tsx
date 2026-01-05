"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Briefcase, Settings, BarChart3, MessageSquare, LogOut, Menu, X, HelpCircle } from 'lucide-react'
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

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Desktop uses sidebarOpen state, Mobile uses isMobileOpen prop
  const isMobile = onMobileClose !== undefined
  const isOpen = isMobile ? (isMobileOpen ?? false) : sidebarOpen
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

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
        "bg-white shadow-sm border-r border-gray-200 transition-all duration-300 flex flex-col h-full overflow-x-hidden",
        isOpen ? "w-56" : "w-16"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "p-4 border-b border-gray-200 flex items-center",
          isOpen ? "justify-between" : "justify-center"
        )}
      >
        {isOpen && (
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold">
                <span className="text-slate-800">Hire</span>
                <span className="text-emerald-600">GenAI</span>
              </h1>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
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
                "w-full flex items-center rounded-lg transition-all font-medium",
                isOpen ? "gap-3 px-4 py-3 justify-start" : "gap-0 px-0 py-3 justify-center",
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-500"
                  : "text-gray-700 hover:bg-gray-50 hover:text-emerald-600 border border-transparent",
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-emerald-600",
                )}
              />
              {isOpen && <span className="text-sm">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer - Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          {isOpen && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
