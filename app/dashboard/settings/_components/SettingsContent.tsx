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
import { User, Building, Bell, CreditCard, Users as UsersIcon, Plus, Trash, MapPin, FileText, Building2 } from "lucide-react"

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
  "1000+ employees",
]

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
    weeklyReports: false,
  })

  // Allow edit on Profile tab for all users
  const [isAdminRole, setIsAdminRole] = useState(false)
  useEffect(() => {
    const session = MockAuthService.getCurrentUser()
    const role = (session as any)?.user?.role
    setIsAdminRole(role === 'company_admin' || role === 'admin')
  }, [])
  const isBsadmin = (
    ((user as any)?.email?.split("@")[0]?.toLowerCase?.() === "bsadmin") ||
    ((user as any)?.full_name?.toLowerCase?.() === "bsadmin")
  )
  // Allow all users to edit all settings
  const canEditSection = true

  // Team management state
  const [membersLoading, setMembersLoading] = useState(false)
  const [members, setMembers] = useState<Array<{ id: string; email: string; name: string; role: "company_admin" | "user" }>>([])
  const [newMember, setNewMember] = useState({ email: "", name: "", role: "user" as "company_admin" | "user" })

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
        setCompanyData({
          // Basic Information
          name: data.company.name || "",
          website: data.company.website || "",
          industry: data.company.industry || "",
          size: data.company.size || "",
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
        setNewMember({ email: "", name: "", role: "user" })
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

  const updateRole = async (email: string, role: "company_admin" | "user") => {
    if (!(company as any)?.id) return
    try {
      const res = await fetch(`/api/company-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: (company as any).id, email, role }),
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
    if (!(user as any)?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: (user as any).id, 
          email: profileData.email,
          name: profileData.name,
          phone: profileData.phone,
          timezone: profileData.timezone
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed'))

      setAuthSession(
        { 
          ...(user as any), 
          full_name: data.user?.full_name ?? profileData.name,
          phone: data.user?.phone ?? profileData.phone,
          timezone: data.user?.timezone ?? profileData.timezone
        },
        (company as any)
      )

      setProfileData(prev => ({
        ...prev,
        name: data.user?.full_name ?? prev.name,
        phone: data.user?.phone ?? prev.phone,
        timezone: data.user?.timezone ?? prev.timezone
      }))

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
        // Basic Information
        name: companyData.name,
        website: companyData.website,
        industry: companyData.industry,
        size: companyData.size,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      <Tabs value={current} onValueChange={(v) => router.push(`/dashboard/settings/${v}`)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Company</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <UsersIcon className="h-4 w-4" />
            <span>Team</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </TabsTrigger>
        </TabsList>

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
                    onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={!canEditSection}
                    className="linkedin-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={!canEditSection}
                    className="linkedin-input"
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
          <Card className="linkedin-card">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage recruiter team members and roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Member email"
                  value={newMember.email}
                  onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                  disabled={!canEditSection}
                  className="linkedin-input"
                />
                <Input
                  placeholder="Full name (optional)"
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                  disabled={!canEditSection}
                  className="linkedin-input"
                />
                <Select
                  value={newMember.role}
                  onValueChange={(v) => setNewMember((p) => ({ ...p, role: v as any }))}
                >
                  <SelectTrigger className="linkedin-input" disabled={!canEditSection}>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Team member</SelectItem>
                    <SelectItem value="company_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMember} disabled={!canEditSection || membersLoading} className="linkedin-button">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              <div className="divide-y rounded border">
                {membersLoading && (
                  <div className="p-4 text-sm text-gray-600">Loading members...</div>
                )}
                {!membersLoading && members.length === 0 && (
                  <div className="p-4 text-sm text-gray-600">No team members yet</div>
                )}
                {members.map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.name || m.email.split('@')[0]}</div>
                      <div className="text-sm text-gray-600">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={m.role} onValueChange={(v) => { if (canEditSection) updateRole(m.email, v as any) }}>
                        <SelectTrigger className="w-40" disabled={!canEditSection}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Team member</SelectItem>
                          <SelectItem value="company_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => removeMember(m.email)} disabled={!canEditSection}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
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
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyData.name}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={companyData.industry}
                      onValueChange={(value) => setCompanyData((prev) => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger className="linkedin-input" disabled={!canEditSection}>
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
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select
                      value={companyData.size}
                      onValueChange={(value) => setCompanyData((prev) => ({ ...prev, size: value }))}
                    >
                      <SelectTrigger className="linkedin-input" disabled={!canEditSection}>
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
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={companyData.street}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, street: e.target.value }))}
                    disabled={!canEditSection}
                    className="linkedin-input"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={companyData.city}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, city: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      value={companyData.state}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, state: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP/Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={companyData.postalCode}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, postalCode: e.target.value }))}
                      disabled={!canEditSection}
                      className="linkedin-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={companyData.country}
                      onValueChange={(value) => setCompanyData((prev) => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="linkedin-input" disabled={!canEditSection}>
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
        </TabsContent>

        <TabsContent value="notifications">
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
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weeklyReports">Weekly Reports</Label>
                  <p className="text-sm text-gray-500">Get weekly summaries of your recruitment activity</p>
                </div>
                <Switch
                  id="weeklyReports"
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, weeklyReports: checked }))}
                  disabled={!canEditSection}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        

        <TabsContent value="billing">
          <Card className="linkedin-card">
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your subscription and billing information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Current Plan: Premium</h3>
                <p className="text-blue-700">$99/month • Unlimited jobs and candidates</p>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Payment Method</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm">**** **** **** 4242</p>
                  <p className="text-sm text-gray-500">Expires 12/25</p>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button variant="outline" disabled={!canEditSection}>Change Plan</Button>
                <Button variant="outline" disabled={!canEditSection}>Update Payment Method</Button>
                <Button variant="outline" disabled={!canEditSection}>Download Invoice</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
