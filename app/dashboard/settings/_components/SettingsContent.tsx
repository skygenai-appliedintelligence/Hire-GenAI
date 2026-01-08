"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { MockAuthService } from "@/lib/mock-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { User, Building, Bell, CreditCard, Users as UsersIcon, Plus, Trash, MapPin, FileText, Building2, Lock } from "lucide-react"
import BillingContent from "./BillingContent"

const industries = [
  "Technology",
  "Healthcare", 
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Hospitality",
  "Other",
]

const companySizes = [
  "1-10 employees",
  "11-50 employees", 
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1001-5000 employees",
  "5001-10000 employees",
  "10000+ employees",
]

// Map UI display values to database enum values
const mapCompanySizeToDb = (displayValue: string): string => {
  const mapping: Record<string, string> = {
    "1-10 employees": "1-10",
    "11-50 employees": "11-50",
    "51-200 employees": "51-200",
    "201-500 employees": "201-500",
    "501-1000 employees": "501-1000",
    "1001-5000 employees": "1001-5000",
    "5001-10000 employees": "5001-10000",
    "10000+ employees": "10000+",
  }
  return mapping[displayValue] || displayValue
}

// Map database enum values back to UI display values
const mapDbSizeToDisplay = (dbValue: string): string => {
  const mapping: Record<string, string> = {
    "1-10": "1-10 employees",
    "11-50": "11-50 employees",
    "51-200": "51-200 employees",
    "201-500": "201-500 employees",
    "501-1000": "501-1000 employees",
    "1001-5000": "1001-5000 employees",
    "5001-10000": "5001-10000 employees",
    "10000+": "10000+ employees",
  }
  return mapping[dbValue] || dbValue
}

const countryOptions = [
  { name: "United States", code: "US" },
  { name: "India", code: "IN" },
  { name: "United Kingdom", code: "GB" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Singapore", code: "SG" },
  { name: "UAE", code: "AE" },
  { name: "Other", code: "XX" },
]

// Helper function to map country name to code
const getCountryCode = (countryName: string): string => {
  if (!countryName) return ""
  const country = countryOptions.find(c => 
    c.name.toLowerCase() === countryName.toLowerCase() ||
    c.code.toLowerCase() === countryName.toLowerCase()
  )
  return country?.code || countryName
}

export default function SettingsContent({ section }: { section?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, company, setAuthSession } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const lastSegment = (section || pathname.split("/").pop() || "profile") as string
  const allowedSections = ["profile", "company", "team", "notifications", "billing"] as const
  const current = (allowedSections.includes(lastSegment as any) ? lastSegment : "profile") as
    | "profile"
    | "company"
    | "team"
    | "notifications"
    | "billing"

  const [profileData, setProfileData] = useState({
    name: user?.full_name || user?.email?.split("@")[0] || "",
    email: user?.email || "",
    phone: (user as any)?.phone || "",
    timezone: (user as any)?.timezone || "UTC",
  })

  // Update profile data when user data changes
  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      name: user?.full_name || user?.email?.split("@")[0] || prev.name,
      email: user?.email || prev.email,
      phone: (user as any)?.phone || prev.phone,
      timezone: (user as any)?.timezone || prev.timezone,
    }))
  }, [user])

  const [companyData, setCompanyData] = useState({
    // Basic Information
    name: (company as any)?.name || "",
    website: (company as any)?.website || "",
    industry: (company as any)?.industry || "",
    size: (company as any)?.size || "",
    description: (company as any)?.description || "",
    // Contact Information
    street: (company as any)?.street || "",
    city: (company as any)?.city || "",
    state: (company as any)?.state || "",
    postalCode: (company as any)?.postalCode || "",
    country: (company as any)?.country || "",
    phone: (company as any)?.phone || "",
    // Legal Information
    legalCompanyName: (company as any)?.legalCompanyName || "",
    taxId: (company as any)?.taxId || "",
    registrationNumber: (company as any)?.registrationNumber || "",
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    candidateUpdates: true,
    interviewReminders: true,
  })

  // Get user role for access control
  const [userRole, setUserRole] = useState<string>('')
  const [isAdminRole, setIsAdminRole] = useState(false)
  
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.email) return
      
      try {
        console.log('🔍 Fetching role from database for:', user.email)
        const response = await fetch(`/api/auth/user-role?email=${encodeURIComponent(user.email)}`)
        const data = await response.json()
        
        if (data.ok) {
          console.log('🔍 Role from database:', data.role)
          setUserRole(data.role || '')
          setIsAdminRole(data.role === 'company_admin' || data.role === 'admin')
        } else {
          console.error('Failed to fetch user role:', data.error)
          // Fallback to mock auth service
          const session = MockAuthService.getCurrentUser()
          const role = (session as any)?.user?.role
          console.log('🔍 Fallback to mock auth role:', role)
          setUserRole(role || '')
          setIsAdminRole(role === 'company_admin' || role === 'admin')
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        // Fallback to mock auth service
        const session = MockAuthService.getCurrentUser()
        const role = (session as any)?.user?.role
        console.log('🔍 Fallback to mock auth role:', role)
        setUserRole(role || '')
        setIsAdminRole(role === 'company_admin' || role === 'admin')
      }
    }
    
    fetchUserRole()
  }, [user?.email])
  
  const isBsadmin = (
    ((user as any)?.email?.split("@")[0]?.toLowerCase?.() === "bsadmin") ||
    ((user as any)?.full_name?.toLowerCase?.() === "bsadmin")
  )
  
  // Role-based access control
  const isRecruiterRole = userRole === 'recruiter'
  const isMemberRole = userRole === 'member'
  const isLimitedRole = isRecruiterRole || isMemberRole
  
  const canAccessTab = (tabName: string) => {
    if (isAdminRole || isBsadmin) return true // Admin can access all tabs
    if (isLimitedRole) return tabName === 'profile' // Member/Recruiter can only access profile
    return true // Default: allow access
  }
  
  console.log('🔍 Final role being used:', userRole)
  console.log('🔍 Is recruiter role:', isRecruiterRole)
  console.log('🔍 Is member role:', isMemberRole)
  console.log('🔍 Is admin role:', isAdminRole)
  console.log('🔍 Has limited access:', isLimitedRole)
  console.log('🔍 Can access team tab:', canAccessTab('team'))

  // Redirect limited role users to profile if they try to access restricted tabs
  useEffect(() => {
    if (isLimitedRole && current !== 'profile') {
      toast({
        title: "Access Restricted",
        description: "this tab only accesable by admin .",
        variant: "destructive"
      })
      router.push('/dashboard/settings/profile')
    }
  }, [isLimitedRole, current, router, toast])
  
  // Allow editing based on role and section
  // Members/Recruiters can only view (read-only) profile section
  // Admins can edit everything
  const canEditSection = (isAdminRole || isBsadmin) || !(isLimitedRole && current === 'profile')

  // Team management state
  const [membersLoading, setMembersLoading] = useState(false)
  const [members, setMembers] = useState<Array<{ id: string; email: string; name: string; role: "company_admin" | "user" | "member" }>>([])
  const [newMember, setNewMember] = useState({ email: "", name: "", role: "member" as "company_admin" | "user" | "member" })

  const loadMembers = async () => {
    if (!(company as any)?.id) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/company-members?companyId=${(company as any).id}`)
      const data = await res.json()
      if (data.ok) setMembers(data.members)
    } catch (e) {
      toast({ title: "Error", description: "Failed to load team members", variant: "destructive" })
    } finally {
      setMembersLoading(false)
    }
  }

  // Load members on mount when company is ready
  useEffect(() => {
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(company as any)?.id])

  // Load company data from database
  const loadCompanyData = async () => {
    if (!(company as any)?.id) return
    try {
      console.log('🔄 Fetching company data for ID:', (company as any).id)
      const res = await fetch(`/api/settings/company?companyId=${(company as any).id}`)
      const data = await res.json()
      console.log('🔍 Company data received from API:', data.company)
      console.log('🔍 Full API response:', data)
      
      // Check if address fields are missing
      const addressFields = ['street', 'city', 'state', 'postalCode']
      const missingAddressFields = addressFields.filter(field => !data.company[field])
      if (missingAddressFields.length > 0) {
        console.log('⚠️ Missing address fields:', missingAddressFields)
        console.log('💡 This likely means the addresses table doesn\'t exist or this company has no address data')
      }
      if (data.ok && data.company) {
        console.log('📊 [COMPANY SIZE DEBUG] Received from API:', {
          size: data.company.size,
          size_band: data.company.size_band,
          all_keys: Object.keys(data.company)
        })
        setCompanyData({
          // Basic Information
          name: data.company.name || "",
          website: data.company.website || "",
          industry: data.company.industry || "",
          size: data.company.size ? mapDbSizeToDisplay(data.company.size) : "",
          description: data.company.description || "",
          // Contact Information
          street: data.company.street || "",
          city: data.company.city || "",
          state: data.company.state || "",
          postalCode: data.company.postalCode || "",
          country: getCountryCode(data.company.country || ""),
          phone: data.company.phone || "",
          // Legal Information
          legalCompanyName: data.company.legalCompanyName || "",
          taxId: data.company.taxId || "",
          registrationNumber: data.company.registrationNumber || "",
        })
      }
    } catch (e) {
      console.warn('Failed to load company data:', e)
    }
  }

  // Load company data when company is ready
  useEffect(() => {
    loadCompanyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(company as any)?.id])

  // Sync form state when auth context changes
  useEffect(() => {
    setProfileData((prev) => ({
      ...prev,
      name: (user as any)?.full_name || (user as any)?.email?.split("@")[0] || "",
      email: (user as any)?.email || "",
    }))
  }, [(user as any)?.id, (user as any)?.full_name, (user as any)?.email])


  const addMember = async () => {
    if (!(company as any)?.id || !newMember.email) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/company-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: (company as any).id,
          companyName: (company as any).name,
          email: newMember.email,
          name: newMember.name,
          role: newMember.role,
          actorEmail: (user as any)?.email // Add current user's email for permission check
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Member added", description: `${newMember.email} invited` })
        setNewMember({ email: "", name: "", role: "member" })
        loadMembers()
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to add member"
        toast({ title: "Error", description: msg, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to add member", variant: "destructive" })
    } finally {
      setMembersLoading(false)
    }
  }

  const removeMember = async (email: string) => {
    if (!(company as any)?.id) return
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/company-members?companyId=${(company as any).id}&email=${encodeURIComponent(email)}&actorEmail=${encodeURIComponent((user as any)?.email || '')}`, { method: "DELETE" })
      const data = await res.json()
      if (data.ok) {
        toast({ title: "Member removed" })
        loadMembers()
      } else {
        const msg = typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to remove member'
        toast({ title: "Error", description: msg, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" })
    } finally {
      setMembersLoading(false)
    }
  }

  const updateRole = async (email: string, role: "company_admin" | "user" | "member") => {
    if (!(company as any)?.id) return
    try {
      const res = await fetch(`/api/company-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: (company as any).id, email, role, actorEmail: (user as any)?.email }),
      })
      const data = await res.json()
      if (data.ok) {
        setMembers((prev) => prev.map((m) => (m.email === email ? { ...m, role } : m)))
        toast({ title: "Role updated" })
      } else {
        const msg = typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to update role'
        toast({ title: "Error", description: msg, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" })
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const payload = {
        userId: user.id,
        email: profileData.email,
        name: profileData.name,
        phone: profileData.phone || "", // Ensure phone is not undefined
        timezone: profileData.timezone
      }
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed'))

      // Store phone in user session directly
      const updatedUser = {
        ...(user as any),
        full_name: data.user?.full_name ?? profileData.name,
        phone: profileData.phone || "", // Use the value from form directly
        timezone: profileData.timezone || "UTC"
      }

      // Update auth context with phone number
      setAuthSession(updatedUser, (company as any))

      // Update local state
      setProfileData(prev => ({
        ...prev,
        name: updatedUser.full_name,
        phone: updatedUser.phone,
        timezone: updatedUser.timezone
      }))

      // Log the updated user data
      console.log("Updated user data:", updatedUser)

      toast({ title: 'Success', description: 'Profile updated successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update profile', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!(company as any)?.id) return
    setLoading(true)
    try {
      const payload = {
        companyId: (company as any).id,
        actorEmail: (user as any)?.email,
        // Basic Information
        name: companyData.name,
        website: companyData.website,
        industry: companyData.industry,
        size: mapCompanySizeToDb(companyData.size),
        description: companyData.description,
        // Contact Information
        street: companyData.street,
        city: companyData.city,
        state: companyData.state,
        postalCode: companyData.postalCode,
        country: companyData.country,
        phone: companyData.phone,
        // Legal Information
        legalCompanyName: companyData.legalCompanyName,
        taxId: companyData.taxId,
        registrationNumber: companyData.registrationNumber,
      }
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed'))

      setAuthSession((user as any), { 
        ...(company as any), 
        ...payload,
        verified: data.company?.verified ?? (company as any)?.verified,
        status: data.company?.status ?? (company as any)?.status
      })

      toast({ title: 'Success', description: 'Company information updated successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update company information', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 px-1 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage your account and application preferences</p>
      </div>

      <Tabs value={current} onValueChange={(v) => router.push(`/dashboard/settings/${v}`)} className="space-y-4 md:space-y-6">
        {/* Scrollable tabs on mobile */}
        <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:grid sm:w-full sm:grid-cols-5 gap-1">
            <TabsTrigger value="profile" className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 text-xs sm:text-sm">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="company" 
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 text-xs sm:text-sm"
              disabled={!canAccessTab('company')}
            >
              <Building className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Company</span>
              {!canAccessTab('company') && <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 text-xs sm:text-sm"
              disabled={!canAccessTab('team')}
            >
              <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Team</span>
              {!canAccessTab('team') && <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 text-xs sm:text-sm"
              disabled={!canAccessTab('notifications')}
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Notification</span>
              {!canAccessTab('notifications') && <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 text-xs sm:text-sm"
              disabled={!canAccessTab('billing')}
            >
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Billing</span>
              {!canAccessTab('billing') && <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <Card className="linkedin-card">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    disabled={true}
                    readOnly
                    className="linkedin-input bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled={true}
                    readOnly
                    className="linkedin-input bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={!canEditSection}
                    className="linkedin-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={profileData.timezone}
                    onValueChange={(value) => setProfileData((prev) => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="linkedin-input" disabled={!canEditSection}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                      <SelectItem value="IST">India Standard Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={!canEditSection || loading} className="linkedin-button">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          {!canAccessTab('team') ? (
            <Card className="linkedin-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span>Access Restricted</span>
                </CardTitle>
                <CardDescription>this tab only accesable by admin .</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You don't have permission to access this section.</p>
                  <p className="text-sm text-gray-500 mt-2">Contact your administrator for access.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="linkedin-card">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage recruiter team members and roles</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Member Form - Mobile Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="Member email"
                  value={newMember.email}
                  onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                  disabled={!canEditSection}
                  className="linkedin-input w-full"
                />
                <Input
                  placeholder="Full name (optional)"
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                  disabled={!canEditSection}
                  className="linkedin-input w-full"
                />
                <Select
                  value={newMember.role}
                  onValueChange={(v) => setNewMember((p) => ({ ...p, role: v as any }))}
                >
                  <SelectTrigger className="linkedin-input w-full" disabled={!canEditSection}>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Team Member</SelectItem>
                    <SelectItem value="company_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMember} disabled={!canEditSection || membersLoading} className="linkedin-button w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {/* Members List - Mobile Responsive */}
              <div className="divide-y rounded border">
                {membersLoading && (
                  <div className="p-4 text-sm text-gray-600">Loading members...</div>
                )}
                {!membersLoading && members.length === 0 && (
                  <div className="p-4 text-sm text-gray-600">No team members yet</div>
                )}
                {members.map((m) => (
                  <div key={m.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.name || m.email.split('@')[0]}</div>
                      <div className="text-sm text-gray-600 truncate">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <Select value={m.role} onValueChange={(v) => { if (canEditSection) updateRole(m.email, v as any) }}>
                        <SelectTrigger className="w-full sm:w-32 md:w-40 text-xs sm:text-sm" disabled={!canEditSection || m.email === user?.email}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Team Member</SelectItem>
                          <SelectItem value="company_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => removeMember(m.email)} disabled={!canEditSection} className="flex-shrink-0">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="company">
          {!canAccessTab('company') ? (
            <Card className="linkedin-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span>Access Restricted</span>
                </CardTitle>
                <CardDescription>this tab only accesable by admin .</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You don't have permission to access this section.</p>
                  <p className="text-sm text-gray-500 mt-2">Contact your administrator for access.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-6">
            {/* Company Information */}
            <Card className="linkedin-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">Company Information</CardTitle>
                <CardDescription>Basic details about your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Input
                      id="companyName"
                      value={companyData.name}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={true}
                      className="linkedin-input bg-gray-100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Select
                      value={companyData.industry}
                      onValueChange={(value) => setCompanyData((prev) => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger className="linkedin-input bg-gray-100" disabled={true}>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Select
                      value={companyData.size}
                      onValueChange={(value) => setCompanyData((prev) => ({ ...prev, size: value }))}
                    >
                      <SelectTrigger className="linkedin-input bg-gray-100" disabled={true}>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      placeholder="https://www.example.com"
                      value={companyData.website}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, website: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    placeholder="Brief description of your company and what you do..."
                    value={companyData.description}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={!canEditSection}
                    rows={4}
                    className="linkedin-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="linkedin-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Contact Information</CardTitle>
                <CardDescription>Where is your company located?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                  <Input
                    id="street"
                    value={companyData.street}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, street: e.target.value }))}
                    disabled={true}
                    className="linkedin-input bg-gray-100"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Input
                      id="city"
                      value={companyData.city}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, city: e.target.value }))}
                      disabled={true}
                      className="linkedin-input bg-gray-100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Input
                      id="state"
                      value={companyData.state}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, state: e.target.value }))}
                      disabled={true}
                      className="linkedin-input bg-gray-100"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP/Postal Code * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Input
                      id="postalCode"
                      value={companyData.postalCode}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, postalCode: e.target.value }))}
                      disabled={true}
                      className="linkedin-input bg-gray-100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country * <span className="text-xs text-gray-500">(Cannot be changed)</span></Label>
                    <Select
                      value={companyData.country}
                      onValueChange={(value) => setCompanyData((prev) => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="linkedin-input bg-gray-100" disabled={true}>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((country) => (
                          <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone Number</Label>
                  <Input
                    id="companyPhone"
                    placeholder="+1 (555) 123-4567"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={!canEditSection}
                    className="linkedin-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card className="linkedin-card">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Legal Information</CardTitle>
                <CardDescription>Legal details for compliance and verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="legalCompanyName">Legal Company Name *</Label>
                  <Input
                    id="legalCompanyName"
                    value={companyData.legalCompanyName}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, legalCompanyName: e.target.value }))}
                    disabled={!canEditSection}
                    className="linkedin-input"
                    required
                  />
                  <p className="text-xs text-slate-500">This should match your official business registration</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN</Label>
                    <Input
                      id="taxId"
                      value={companyData.taxId}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, taxId: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Business Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      value={companyData.registrationNumber}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                    />
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 flex items-start gap-2">
                  <Building className="w-4 h-4 text-emerald-600 mt-0.5" />
                  This information is used for verification purposes and is kept secure and confidential.
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveCompany} disabled={!canEditSection || loading} className="linkedin-button">
                {loading ? "Saving..." : "Save All Changes"}
              </Button>
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Notification</h2>
            <p className="text-gray-600 mt-1">Manage your notification preferences</p>
          </div>
          {!canAccessTab('notifications') ? (
            <Card className="linkedin-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span>Access Restricted</span>
                </CardTitle>
                <CardDescription>this tab only accesable by admin .</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You don't have permission to access this section.</p>
                  <p className="text-sm text-gray-500 mt-2">Contact your administrator for access.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="linkedin-card">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified about important updates</CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailNotifications: checked }))}
                  disabled={!canEditSection}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="candidateUpdates">Candidate Updates</Label>
                  <p className="text-sm text-gray-500">Get notified when candidates apply or update their status</p>
                </div>
                <Switch
                  id="candidateUpdates"
                  checked={notifications.candidateUpdates}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, candidateUpdates: checked }))}
                  disabled={!canEditSection}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="interviewReminders">Interview Reminders</Label>
                  <p className="text-sm text-gray-500">Receive reminders before scheduled interviews</p>
                </div>
                <Switch
                  id="interviewReminders"
                  checked={notifications.interviewReminders}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, interviewReminders: checked }))}
                  disabled={!canEditSection}
                />
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {!canAccessTab('billing') ? (
            <Card className="linkedin-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  <span>Access Restricted</span>
                </CardTitle>
                <CardDescription>this tab only accesable by admin .</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You don't have permission to access this section.</p>
                  <p className="text-sm text-gray-500 mt-2">Contact your administrator for access.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <BillingContent companyId={(company as any)?.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
