"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Briefcase, Users, Calendar, Settings, BarChart3, Building2, Phone, MessageSquare, Bot } from 'lucide-react'

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Job Descriptions", href: "/dashboard/jobs", icon: Briefcase },
  { name: "AI Agents", href: "/dashboard/agents/create", icon: Bot },
  { name: "Candidates", href: "/dashboard/candidates", icon: Users },
  { name: "Interviews", href: "/dashboard/interviews", icon: Calendar },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Integrations", href: "/dashboard/integrations", icon: Building2 },
  { name: "AI Calls", href: "/dashboard/calls", icon: Phone },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <Link href="/">
          <h1 className="text-xl font-bold">
            <span className="text-slate-800">Hire</span>
            <span className="sr-text-gradient">GenAI</span>
          </h1>
        </Link>
      </div>
      <nav className="mt-6">
        <div className="px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href === "/dashboard/agents/create" && pathname.startsWith("/dashboard/agents"))
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
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-emerald-500" : "text-gray-400 group-hover:text-emerald-500",
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
