"use client"

import { Bell, User, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

export function Header() {
  const { user, company, signOut } = useAuth()
  const router = useRouter()
  const [applicationsCount, setApplicationsCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize timestamp on first load if it doesn't exist
  useEffect(() => {
    if ((company as any)?.id && !initialized) {
      const lastSeenKey = `lastSeenApplicationsTime_${(company as any).id}`
      if (!localStorage.getItem(lastSeenKey)) {
        // First time - set timestamp to now so no old applications show as new
        localStorage.setItem(lastSeenKey, Date.now().toString())
      }
      setInitialized(true)
    }
  }, [company, initialized])

  // Fetch applications count on component mount and when company changes
  useEffect(() => {
    if (!initialized) return

    const fetchApplicationsCount = async () => {
      if (!(company as any)?.id) return

      setLoading(true)
      try {
        const res = await fetch(`/api/analytics/applications?companyId=${(company as any).id}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        
        if (json.ok && Array.isArray(json.applications)) {
          // Get the last seen timestamp from localStorage
          const lastSeenKey = `lastSeenApplicationsTime_${(company as any).id}`
          const lastSeenTime = parseInt(localStorage.getItem(lastSeenKey) || '0', 10)
          
          // Count only applications created AFTER the last seen time
          const newApplicationsCount = json.applications.filter((app: any) => {
            const appCreatedTime = new Date(app.created_at || app.createdAt || 0).getTime()
            return appCreatedTime > lastSeenTime
          }).length
          
          setApplicationsCount(newApplicationsCount)
        }
      } catch (error) {
        console.error('Failed to fetch applications count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplicationsCount()
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchApplicationsCount, 30000)
    return () => clearInterval(interval)
  }, [company, initialized])

  const handleNotificationClick = async () => {
    // Mark current time as the last seen time
    if ((company as any)?.id) {
      const lastSeenKey = `lastSeenApplicationsTime_${(company as any).id}`
      // Store current timestamp
      localStorage.setItem(lastSeenKey, Date.now().toString())
      
      // Reset the badge count to 0
      setApplicationsCount(0)
    }
    
    // Navigate to applications page
    router.push('/dashboard/analytics/applications')
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Search bar removed - replaced with job filter on analytics page */}
        </div>

        <div className="flex items-center space-x-4">

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative" onClick={handleNotificationClick}>
            <Bell className="w-5 h-5" />
            {applicationsCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {applicationsCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{user?.full_name || user?.email?.split('@')[0] || "User"}</div>
                  <div className="text-xs text-gray-500">{company?.name || "Company"}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
