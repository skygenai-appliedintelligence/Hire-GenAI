"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BarChart3,
  Briefcase,
  Users,
  DollarSign,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "companies", label: "Companies", icon: Users },
  { id: "billing", label: "Billing & Usage", icon: DollarSign },
  { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
  { id: "settings", label: "Settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const currentTab = pathname.split("/").pop() || "overview"

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout-direct", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }
    router.push("/owner-login")
  }

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth-check-direct")
        if (!res.ok) {
          console.log("Auth check failed, redirecting to home")
          router.push("/")
          return
        }
        setAuthenticated(true)
        setLoading(false)
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Dashboard Style */}
      <div
        className={cn(
          "bg-white shadow-sm border-r border-gray-200 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-52" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold">
                <span className="text-slate-800">Hire</span>
                <span className="text-emerald-600">GenAI</span>
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex justify-center p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 mt-4">
          <div className="px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/admin-hiregenai/${item.id}`)}
                  className={cn(
                    "w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500"
                      : "text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      sidebarOpen ? "mr-2.5" : "mx-auto",
                      isActive ? "text-emerald-500" : "text-gray-400 group-hover:text-emerald-500"
                    )}
                  />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
            onClick={handleLogout}
          >
            <LogOut className={cn("w-4 h-4", sidebarOpen && "mr-2")} />
            {sidebarOpen && "Logout"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
