"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Wallet, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  DollarSign,
  Zap,
  Settings as SettingsIcon,
  Shield
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BillingContentProps {
  companyId: string
}

export default function BillingContent({ companyId }: BillingContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<any>(null)
  const [usageData, setUsageData] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  
  // Settings
  const [autoRecharge, setAutoRecharge] = useState(true)
  const [monthlyCapEnabled, setMonthlyCapEnabled] = useState(false)
  const [monthlyCapAmount, setMonthlyCapAmount] = useState("1000")
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const paypalButtonRef = useRef<HTMLDivElement>(null)

  // Filters
  const [selectedJob, setSelectedJob] = useState<string>("all")
  const [usageTypeFilter, setUsageTypeFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("30")

  useEffect(() => {
    if (companyId) {
      loadBillingData()
      loadUsageData()
      loadInvoices()
      loadJobs()
    }
  }, [companyId])

  const loadBillingData = async () => {
    try {
      const res = await fetch(`/api/billing/status?companyId=${companyId}`)
      const data = await res.json()
      if (data.ok) {
        setBillingData(data.billing)
        setAutoRecharge(data.billing.autoRechargeEnabled)
        if (data.billing.monthlySpendCap) {
          setMonthlyCapEnabled(true)
          setMonthlyCapAmount(data.billing.monthlySpendCap.toString())
        }
      }
    } catch (error) {
      console.error('Failed to load billing data:', error)
    }
  }

  const loadUsageData = async () => {
    try {
      const params = new URLSearchParams({ companyId })
      if (selectedJob !== 'all') params.append('jobId', selectedJob)
      if (usageTypeFilter !== 'all') params.append('entryType', usageTypeFilter)
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      params.append('startDate', startDate.toISOString())

      const res = await fetch(`/api/billing/usage?${params}`)
      const data = await res.json()
      if (data.ok) {
        setUsageData(data)
      }
    } catch (error) {
      console.error('Failed to load usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoices = async () => {
    try {
      const res = await fetch(`/api/billing/invoices?companyId=${companyId}&limit=20`)
      const data = await res.json()
      if (data.ok) {
        setInvoices(data.invoices)
      }
    } catch (error) {
      console.error('Failed to load invoices:', error)
    }
  }

  const loadJobs = async () => {
    try {
      const res = await fetch(`/api/jobs/titles?companyId=${companyId}`)
      const data = await res.json()
      if (data.ok) {
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const updateSettings = async () => {
    try {
      const res = await fetch('/api/billing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          autoRechargeEnabled: autoRecharge,
          monthlySpendCap: monthlyCapEnabled ? parseFloat(monthlyCapAmount) : null
        })
      })
      const data = await res.json()
      if (data.ok) {
        toast({ title: 'Success', description: 'Billing settings updated' })
        loadBillingData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    if (companyId) {
      loadUsageData()
    }
  }, [selectedJob, usageTypeFilter, dateRange])

  // Load PayPal SDK and render button
  useEffect(() => {
    if (paypalLoaded && paypalButtonRef.current && (window as any).paypal) {
      // Clear existing buttons
      paypalButtonRef.current.innerHTML = ''
      
      // Render PayPal button
      ;(window as any).paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: function (data: any, actions: any) {
          return actions.subscription.create({
            plan_id: 'P-4N498891U73853430ND4MFXY'
          })
        },
        onApprove: function (data: any, actions: any) {
          toast({
            title: 'Success!',
            description: `Subscription successful! ID: ${data.subscriptionID}`,
          })
          // Reload billing data after successful subscription
          loadBillingData()
        },
        onError: function (err: any) {
          toast({
            title: 'Error',
            description: 'Failed to process subscription. Please try again.',
            variant: 'destructive'
          })
          console.error('PayPal error:', err)
        }
      }).render(paypalButtonRef.current)
    }
  }, [paypalLoaded])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      trial: { color: 'bg-blue-100 text-blue-800', icon: Zap, label: 'Free Trial' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      past_due: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Past Due' },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Suspended' },
    }
    
    const config = statusConfig[status] || statusConfig.active
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {billingData?.status === 'trial' && billingData?.trialInfo && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Free Trial Active</h3>
                <p className="text-sm text-blue-700 mb-3">
                  You can create <strong>1 Job Description</strong> and run <strong>1 interview</strong> for free. 
                  All usage is complimentary during your trial.
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${billingData.trialInfo.trialJdId ? 'text-green-600' : 'text-gray-400'}`} />
                    <span>Trial JD {billingData.trialInfo.trialJdId ? 'Created' : 'Available'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${billingData.trialInfo.trialInterviewCount > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                    <span>Trial Interview ({billingData.trialInfo.trialInterviewCount}/1)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Due Banner */}
      {billingData?.status === 'past_due' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Payment Required</h3>
                <p className="text-sm text-red-700">
                  Your account is past due. Please update your payment method to continue using the service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${billingData?.walletBalance?.toFixed(2) || '0.00'}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {getStatusBadge(billingData?.status || 'trial')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${billingData?.currentMonthSpent?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {billingData?.monthlySpendCap 
                    ? `Cap: $${billingData.monthlySpendCap.toFixed(2)}`
                    : 'No cap set'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${billingData?.totalSpent?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All-time usage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Recharge</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {billingData?.autoRechargeEnabled ? 'ON' : 'OFF'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {billingData?.autoRechargeEnabled ? 'Automatic $100' : 'Manual top-up'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* PayPal Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscribe with PayPal
              </CardTitle>
              <CardDescription>Subscribe to our service using PayPal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto">
                {!paypalLoaded ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PayPal...</p>
                  </div>
                ) : (
                  <div ref={paypalButtonRef} id="paypal-button-container-P-4N498891U73853430ND4MFXY"></div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PayPal SDK Script */}
          <Script
            src="https://www.paypal.com/sdk/js?client-id=AQbce0p4a4o3MirF8A9e3B8QjmxcyvdM7sElrPr9yj985xukZ7w0sCQaeY95UO0SLgv91tOREpx94rkQ&vault=true&intent=subscription"
            onLoad={() => setPaypalLoaded(true)}
            strategy="lazyOnload"
          />
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Job Description</Label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      {jobs.map((job: any) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Usage Type</Label>
                  <Select value={usageTypeFilter} onValueChange={setUsageTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="CV_PARSE">CV Parsing</SelectItem>
                      <SelectItem value="JD_QUESTIONS">JD Questions</SelectItem>
                      <SelectItem value="VIDEO_MINUTES">Video Minutes</SelectItem>
                      <SelectItem value="TRIAL_CREDIT">Trial Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Summary */}
          {usageData?.totals && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">CV Parsing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${usageData.totals.cvParsing.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{usageData.totals.cvCount} CVs parsed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">JD Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${usageData.totals.jdQuestions.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{usageData.totals.tokenCount.toLocaleString()} tokens</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Video Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${usageData.totals.video.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{usageData.totals.videoMinutes.toFixed(1)} minutes</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per-Job Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Job</CardTitle>
              <CardDescription>Detailed breakdown per job description</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageData?.jobUsage?.length > 0 ? (
                  usageData.jobUsage.map((job: any) => (
                    <div key={job.jobId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{job.jobTitle}</h4>
                        <Badge variant="outline">${job.totalCost.toFixed(2)}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">CV Parsing</p>
                          <p className="font-medium">{job.cvParsingCount} × ${job.cvParsingCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Questions</p>
                          <p className="font-medium">{(job.jdQuestionTokensIn + job.jdQuestionTokensOut).toLocaleString()} tok × ${job.jdQuestionsCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Video</p>
                          <p className="font-medium">{job.videoMinutes.toFixed(1)} min × ${job.videoCost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No usage data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice History
              </CardTitle>
              <CardDescription>Download and view your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(invoice.createdAt).toLocaleDateString()} • {invoice.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">${invoice.total.toFixed(2)}</p>
                          <Badge className={
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No invoices yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Billing Settings
              </CardTitle>
              <CardDescription>Configure auto-recharge and spending limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="auto-recharge" className="text-base font-medium">Auto-Recharge</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically add $100 to your wallet when balance is low
                  </p>
                </div>
                <Switch 
                  id="auto-recharge"
                  checked={autoRecharge} 
                  onCheckedChange={setAutoRecharge}
                />
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="monthly-cap" className="text-base font-medium">Monthly Spend Cap</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Set a maximum monthly spending limit
                    </p>
                  </div>
                  <Switch 
                    id="monthly-cap"
                    checked={monthlyCapEnabled} 
                    onCheckedChange={setMonthlyCapEnabled}
                  />
                </div>
                {monthlyCapEnabled && (
                  <div className="pt-4">
                    <Label htmlFor="cap-amount">Monthly Cap Amount ($)</Label>
                    <Input
                      id="cap-amount"
                      type="number"
                      value={monthlyCapAmount}
                      onChange={(e) => setMonthlyCapAmount(e.target.value)}
                      placeholder="1000.00"
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={updateSettings}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Current Pricing</CardTitle>
              <CardDescription>Your usage rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">CV Parsing</span>
                  <span className="font-medium">$0.05 per CV</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">JD Question Generation</span>
                  <span className="font-medium">$0.002 per 1K tokens</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Video Interview</span>
                  <span className="font-medium">$0.03 per minute</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Auto-Recharge Amount</span>
                  <span className="font-medium">$100.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
