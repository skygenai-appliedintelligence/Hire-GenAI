"use client"

import { Bell, User, LogOut, Settings, AlertTriangle, Menu } from "lucide-react"
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

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, company, signOut } = useAuth()
  const router = useRouter()
  const [applicationsCount, setApplicationsCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

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

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!(company as any)?.id) {
        console.log('⚠️ No company ID found')
        return
      }

      try {
        console.log('🔍 Fetching wallet balance for company:', (company as any).id)
        const res = await fetch(`/api/billing/status?companyId=${(company as any).id}`)
        const data = await res.json()
        
        console.log('📊 Billing API response:', data)
        
        if (data.ok && data.billing && typeof data.billing.walletBalance === 'number') {
          console.log('✅ Wallet balance fetched:', data.billing.walletBalance)
          setWalletBalance(data.billing.walletBalance)
        } else if (!data.ok) {
          console.log('⚠️ API returned error:', data.error)
          // Set to 0 to show warning if billing not initialized
          setWalletBalance(0)
        }
      } catch (error) {
        console.error('❌ Failed to fetch wallet balance:', error)
        // Set to 0 to show warning on error
        setWalletBalance(0)
      }
    }

    fetchWalletBalance()
    
    // Refresh balance every 60 seconds
    const interval = setInterval(fetchWalletBalance, 60000)
    return () => clearInterval(interval)
  }, [company])

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
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 h-16 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
          title="Toggle menu"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center space-x-4 flex-1">
          {/* Low Balance Warning */}
          {walletBalance !== null && walletBalance < 100 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-800">
                {walletBalance === 0 
                  ? "Your balance is low - Please recharge" 
                  : `Your balance is low ($${walletBalance.toFixed(2)})`
                }
              </span>
              <button
                onClick={() => router.push('/dashboard/settings/billing')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline ml-1"
              >
                Add Funds
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" onClick={handleNotificationClick}>
            <Bell className="w-4 h-4" />
            {applicationsCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {applicationsCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-9 px-2">
                <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium leading-tight">{user?.full_name || user?.email?.split('@')[0] || "User"}</div>
                  <div className="text-xs text-gray-500 leading-tight">{company?.name || "Company"}</div>
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
