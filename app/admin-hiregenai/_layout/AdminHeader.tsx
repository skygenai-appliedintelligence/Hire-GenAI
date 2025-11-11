"use client"

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
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "interviews", label: "Interviews", icon: Activity },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "companies", label: "Companies", icon: Users },
  { id: "billing", label: "Billing & Usage", icon: DollarSign },
  { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
  { id: "settings", label: "Settings", icon: Settings },
]

export default function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = pathname.split("/").pop() || "overview"

  return (
    <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">HireGenAI Admin</span>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/admin-hiregenai/${item.id}`)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Exit Button */}
          <Button
            variant="outline"
            size="sm"
            className="text-slate-300 border-slate-700 hover:bg-slate-800"
            onClick={() => router.push("/")}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  )
}
