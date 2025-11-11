"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BarChart3,
  Activity,
  Briefcase,
  Users,
  DollarSign,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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

  useEffect(() => {
    // Check if user is authenticated and is admin
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth-check")
        if (!res.ok) {
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
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">HireGenAI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/admin-hiregenai/${item.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/50 border border-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-emerald-400 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
            onClick={() => router.push("/")}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {sidebarOpen && "Exit"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
