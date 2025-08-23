"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { User, Building, Bell, CreditCard, Users as UsersIcon, Plus, Trash } from "lucide-react"

export default function SettingsContent({ section }: { section?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, company, setAuthSession } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const current = (section || pathname.split("/").pop() || "profile") as
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
    name: (company as any)?.name || "",
    website: (company as any)?.website || "",
    industry: (company as any)?.industry || "",
    size: (company as any)?.size || "",
    description: "",
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    candidateUpdates: true,
    interviewReminders: true,
    weeklyReports: false,
  })

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

  // Sync form state when auth context changes
  useEffect(() => {
    setProfileData((prev) => ({
      ...prev,
      name: (user as any)?.full_name || (user as any)?.email?.split("@")[0] || "",
      email: (user as any)?.email || "",
    }))
  }, [(user as any)?.id, (user as any)?.full_name, (user as any)?.email])

  useEffect(() => {
    setCompanyData((prev) => ({
      ...prev,
      name: (company as any)?.name || "",
      website: (company as any)?.website || "",
      industry: (company as any)?.industry || "",
      size: (company as any)?.size || "",
    }))
  }, [(company as any)?.id, (company as any)?.name, (company as any)?.website, (company as any)?.industry, (company as any)?.size])

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
        }),
      })
      const data = await res.json()
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
      const res = await fetch(`/api/company-members?companyId=${(company as any).id}&email=${encodeURIComponent(email)}`, { method: "DELETE" })
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
        name: companyData.name,
        website: companyData.website,
        industry: companyData.industry,
        size: companyData.size,
        description: companyData.description,
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
        name: data.company?.name ?? companyData.name,
        website: data.company?.website ?? companyData.website,
        industry: data.company?.industry ?? companyData.industry,
        size: data.company?.size ?? companyData.size,
        description: data.company?.description ?? companyData.description,
        verified: data.company?.verified ?? (company as any)?.verified,
        status: data.company?.status ?? (company as any)?.status
      })

      setCompanyData(prev => ({
        ...prev,
        name: data.company?.name ?? prev.name,
        website: data.company?.website ?? prev.website,
        industry: data.company?.industry ?? prev.industry,
        size: data.company?.size ?? prev.size,
        description: data.company?.description ?? prev.description
      }))

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
                    className="linkedin-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={profileData.timezone}
                    onValueChange={(value) => setProfileData((prev) => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="linkedin-input">
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
                <Button onClick={handleSaveProfile} disabled={loading} className="linkedin-button">
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
                  className="linkedin-input"
                />
                <Input
                  placeholder="Full name (optional)"
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                  className="linkedin-input"
                />
                <Select
                  value={newMember.role}
                  onValueChange={(v) => setNewMember((p) => ({ ...p, role: v as any }))}
                >
                  <SelectTrigger className="linkedin-input">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Team member</SelectItem>
                    <SelectItem value="company_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMember} disabled={membersLoading} className="linkedin-button">
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
                      <Select value={m.role} onValueChange={(v) => updateRole(m.email, v as any)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Team member</SelectItem>
                          <SelectItem value="company_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => removeMember(m.email)}>
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
          <Card className="linkedin-card">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your company details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyData.name}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, name: e.target.value }))}
                  className="linkedin-input"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companyData.website}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, website: e.target.value }))}
                    className="linkedin-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={companyData.industry}
                    onValueChange={(value) => setCompanyData((prev) => ({ ...prev, industry: value }))}
                  >
                    <SelectTrigger className="linkedin-input">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Company Size</Label>
                <Select
                  value={companyData.size}
                  onValueChange={(value) => setCompanyData((prev) => ({ ...prev, size: value }))}
                >
                  <SelectTrigger className="linkedin-input">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="500+">500+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={companyData.description}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="linkedin-input"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} disabled={loading} className="linkedin-button">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
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
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">Update Payment Method</Button>
                <Button variant="outline">Download Invoice</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
