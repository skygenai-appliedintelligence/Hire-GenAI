"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import DateRangeFilter from "@/components/filters/DateRangeFilter"

interface BillingContentProps {
  companyId: string
}

export default function BillingContent({ companyId }: BillingContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<any>(null)
  const [usageData, setUsageData] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [profitMargin, setProfitMargin] = useState<number>(20)
  const [companyData, setCompanyData] = useState<any>(null)
  const [showFreeTrialPopup, setShowFreeTrialPopup] = useState(false)
  
  // Settings
  const [autoRecharge, setAutoRecharge] = useState(true)
  const [monthlyCapEnabled, setMonthlyCapEnabled] = useState(false)
  const [monthlyCapAmount, setMonthlyCapAmount] = useState("1000")
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const paypalButtonRef = useRef<HTMLDivElement>(null)

  // Filters for Usage Tab
  const [selectedJob, setSelectedJob] = useState<string>("all")
  const [usageDateRange, setUsageDateRange] = useState<string>("30") // in days
  const [usageStartDate, setUsageStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date
  })
  const [usageEndDate, setUsageEndDate] = useState<Date>(new Date())
  
  // Filters for Overview Tab
  const [overviewStartDate, setOverviewStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date
  })
  const [overviewEndDate, setOverviewEndDate] = useState<Date>(new Date())
  const [overviewData, setOverviewData] = useState<any>(null)
  
  // Invoice Filters - REMOVED
  const [invoiceUsageData, setInvoiceUsageData] = useState<any>(null)

  // Tab state management
  const [currentTab, setCurrentTab] = useState<string>("overview")
  const lastSyncedTabRef = useRef<string>("overview")

  // Show free trial popup when on overview tab and wallet balance is $0
  useEffect(() => {
    if (currentTab === 'overview' && billingData && billingData.walletBalance <= 0 && billingData.status === 'trial') {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowFreeTrialPopup(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentTab, billingData])

  useEffect(() => {
    if (companyId) {
      loadBillingData()
      loadUsageData()
      loadInvoices()
      loadJobs()
      loadProfitMargin()
      loadCompanyData()
    }
  }, [companyId])
  
  const loadCompanyData = async () => {
    try {
      const res = await fetch(`/api/company?companyId=${companyId}`)
      const data = await res.json()
      if (data.ok) {
        setCompanyData(data.company)
      }
    } catch (error) {
      console.error('Failed to load company data:', error)
    }
  }

  // Handle URL tab synchronization
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    const validTabs = ['overview', 'usage', 'invoices', 'settings']
    
    if (urlTab && validTabs.includes(urlTab)) {
      if (urlTab !== lastSyncedTabRef.current) {
        setCurrentTab(urlTab)
        lastSyncedTabRef.current = urlTab
      }
    } else if (!urlTab) {
      // If no tab in URL, set to overview and update URL
      setCurrentTab('overview')
      lastSyncedTabRef.current = 'overview'
      const sp = new URLSearchParams(Array.from(searchParams.entries()))
      sp.set('tab', 'overview')
      router.replace(`${pathname}?${sp.toString()}`)
    }
  }, [searchParams, pathname, router])

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

  const loadUsageData = async (startOverride?: Date, endOverride?: Date) => {
    try {
      setLoading(true)
      
      // Decide which dates to use
      const startToUse = startOverride || usageStartDate
      const endToUse = endOverride || usageEndDate

      // Build query
      const params = new URLSearchParams({
        startDate: startToUse.toISOString(),
        endDate: endToUse.toISOString(),
        companyId
      })
      if (selectedJob && selectedJob !== 'all') {
        params.append('jobId', selectedJob)
      }

      console.log('📊 [Billing] Fetching usage for company:', companyId, 'Date range:', startToUse.toLocaleDateString(), 'to', endToUse.toLocaleDateString())
      const res = await fetch(`/api/billing/openai-usage?${params.toString()}`)
      const data = await res.json()
      
      if (data.ok) {
        console.log('✅ [Billing] Usage data loaded:', data.totals)
        setUsageData(data)
      } else {
        console.error('❌ [Billing] OpenAI usage API error:', data.error)
        toast({
          title: 'Error',
          description: data.error || 'Failed to load usage data from OpenAI',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to load usage data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch usage data. Please check your OpenAI API key.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadOverviewData = async () => {
    try {
      const params = new URLSearchParams({
        startDate: overviewStartDate.toISOString(),
        endDate: overviewEndDate.toISOString(),
        companyId
      })
      
      console.log('📊 [Overview] Fetching usage for date range:', overviewStartDate.toLocaleDateString(), 'to', overviewEndDate.toLocaleDateString())
      const res = await fetch(`/api/billing/openai-usage?${params.toString()}`)
      const data = await res.json()
      
      if (data.ok) {
        console.log('✅ [Overview] Usage data loaded:', data.totals)
        setOverviewData(data)
      }
    } catch (error) {
      console.error('Failed to load overview usage data:', error)
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

  const [generating, setGenerating] = useState(false)
  const generateInvoice = async () => {
    if (!companyId) return
    try {
      setGenerating(true)
      
      const res = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to generate invoice')
      await loadInvoices()
      toast({ title: 'Invoice generated', description: `Invoice ${data.invoice.invoiceNumber} created.` })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate invoice', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  // REMOVED: applyInvoiceFilters function

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

  const loadProfitMargin = async () => {
    try {
      const res = await fetch('/api/billing/profit-margin')
      const data = await res.json()
      if (data.profitMarginPercentage !== undefined) {
        setProfitMargin(data.profitMarginPercentage)
      }
    } catch (error) {
      console.error('Failed to load profit margin:', error)
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

  // Load overview data when filters change
  useEffect(() => {
    if (companyId && currentTab === 'overview') {
      loadOverviewData()
    }
  }, [overviewStartDate, overviewEndDate, companyId, currentTab])

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
      trial: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle, label: 'Free Trial' },
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
      {/* Free Trial Popup Dialog - Simple & Compact */}
      <Dialog open={showFreeTrialPopup} onOpenChange={setShowFreeTrialPopup}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Welcome to HireGenAI! You're currently on a free trial with limited access.
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Trial Limits - Compact */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h4 className="font-medium text-amber-900">Your Free Trial Includes:</h4>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  {billingData?.trialInfo?.canCreateJD ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Create <strong>1 Job Description</strong></span>
                  <span className="text-xs text-red-600">
                    {billingData?.trialInfo?.canCreateJD ? '' : 'Used - Recharge to create more jobs'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {billingData?.trialInfo?.canRunInterview ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Conduct <strong>1 Interview</strong></span>
                  <span className="text-xs text-red-600">
                    {billingData?.trialInfo?.canRunInterview ? '' : 'Used - Recharge to conduct more interviews'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Send <strong>1 Interview Link</strong></span>
                  <span className="text-xs text-gray-600">Share interview invitations with candidates</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons - Compact */}
            <div className="flex items-center gap-3 pt-2">
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setShowFreeTrialPopup(false)
                  setTimeout(() => {
                    const paypalSection = document.getElementById('paypal-subscription-section')
                    if (paypalSection) {
                      paypalSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }, 100)
                }}
              >
                Recharge Wallet
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowFreeTrialPopup(false)}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Removed inline banner - now shown as popup */}

      <Tabs 
        value={currentTab} 
        onValueChange={(val) => {
          if (val !== currentTab) {
            setCurrentTab(val)
            const sp = new URLSearchParams(Array.from(searchParams.entries()))
            sp.set('tab', val)
            lastSyncedTabRef.current = val
            router.replace(`${pathname}?${sp.toString()}`)
          }
        }}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Date Range Filter for Overview */}
          <DateRangeFilter
            onApply={(start, end) => {
              setOverviewStartDate(start)
              setOverviewEndDate(end)
            }}
            loading={loading}
          />

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
          <Card id="paypal-subscription-section">
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
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
              <p className="text-muted-foreground">Track your AI service consumption and costs</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Filters - original card UI */}
          <Card className="border-dashed">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Filter Usage Data
              </CardTitle>
              <CardDescription>Customize your view of usage analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-sm font-medium">Job Description</Label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger className="mt-2">
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
                  <Label className="text-sm font-medium">Date Range</Label>
                  <Select
                    value={usageDateRange}
                    onValueChange={(val) => {
                      setUsageDateRange(val)
                    }}
                  >
                    <SelectTrigger className="mt-2">
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
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const days = parseInt(usageDateRange || "30")
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - days)
                      setUsageStartDate(start)
                      setUsageEndDate(end)
                      loadUsageData(start, end)
                    }}
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Overview Cards */}
          {usageData?.totals && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">CV Parsing</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">${usageData.totals.cvParsing.toFixed(2)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {usageData.totals.cvCount} CVs
                    </Badge>
                    <span className="text-xs text-muted-foreground">parsed</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">JD Questions</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">${usageData.totals.jdQuestions.toFixed(2)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {usageData.totals.questionCount || 0}
                    </Badge>
                    <span className="text-xs text-muted-foreground">questions</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Video Interviews</CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">${usageData.totals.video.toFixed(2)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {usageData.totals.interviewCount || 0}
                    </Badge>
                    <span className="text-xs text-muted-foreground">interviews</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Total Usage</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">
                    ${(usageData.totals.cvParsing + usageData.totals.jdQuestions + usageData.totals.video).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      All Services
                    </Badge>
                    <span className="text-xs text-muted-foreground">combined</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Usage Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Usage Type Analysis
              </CardTitle>
              <CardDescription>Cost breakdown by service type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Service Categories</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-800">CV Parsing</span>
                        </div>
                        <Badge variant="secondary">${usageData?.totals?.cvParsing?.toFixed(2) || '0.00'}</Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">JD Questions</span>
                        </div>
                        <Badge variant="secondary">${usageData?.totals?.jdQuestions?.toFixed(2) || '0.00'}</Badge>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-purple-800">Video Interviews</span>
                        </div>
                        <Badge variant="secondary">${usageData?.totals?.video?.toFixed(2) || '0.00'}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Usage Statistics</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total CVs Processed</span>
                        <span className="font-semibold">{usageData?.totals?.cvCount || 0}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Tokens Used</span>
                        <span className="font-semibold">{(usageData?.totals?.tokenCount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Video Minutes</span>
                        <span className="font-semibold">{(usageData?.totals?.videoMinutes || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage by Job - Enhanced Design */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage Breakdown by Job
              </CardTitle>
              <CardDescription>Detailed cost analysis for each job description</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {usageData?.jobUsage?.length > 0 ? (
                  usageData.jobUsage.map((job: any, index: number) => (
                    <div key={job.jobId} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{job.jobTitle}</h4>
                            <p className="text-sm text-muted-foreground">Job ID: {job.jobId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">${job.totalCost.toFixed(2)}</div>
                          <Badge variant="outline" className="mt-1">Total Cost</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">CV Parsing</span>
                          </div>
                          <div className="text-lg font-semibold text-blue-900">${job.cvParsingCost.toFixed(2)}</div>
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Questions</span>
                          </div>
                          <div className="text-lg font-semibold text-green-900">${job.jdQuestionsCost.toFixed(2)}</div>
                        </div>
                        
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">Video</span>
                          </div>
                          <div className="text-lg font-semibold text-purple-900">${job.videoCost.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Usage Data Available</h3>
                    <p className="text-sm text-gray-500">Start using our AI services to see detailed usage analytics here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          {/* REMOVED: Filter Invoice Data Card */}

          {/* REMOVED: Usage Summary Cards */}

          {/* Invoice History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice History
              </CardTitle>
              <CardDescription>Download and view your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="text-sm text-gray-600">Generate an invoice from recent usage.</div>
                <Button size="sm" onClick={generateInvoice} disabled={generating} className="w-full sm:w-auto">
                  {generating ? 'Generating…' : 'Generate Invoice'}
                </Button>
              </div>
              <div className="space-y-3">
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 gap-4">
                      {/* Invoice Info */}
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                        <div className="p-2 bg-gray-100 rounded flex-shrink-0">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{invoice.invoiceNumber}</p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {new Date(invoice.createdAt).toLocaleDateString()} • {invoice.description}
                          </p>
                        </div>
                      </div>
                      {/* Price & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-sm sm:text-base">${invoice.total.toFixed(2)}</p>
                          <Badge className={`text-xs ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-shrink-0"
                          onClick={async () => {
                            const { generateInvoicePDF } = await import('@/lib/invoice-pdf')
                            // Build full address with all available fields
                            let fullAddress = ''
                            if (companyData?.street) {
                              fullAddress = companyData.street
                              if (companyData.city) fullAddress += ', ' + companyData.city
                              if (companyData.state) fullAddress += ', ' + companyData.state
                              if (companyData.zipCode) fullAddress += ' ' + companyData.zipCode
                              if (companyData.country) fullAddress += ', ' + companyData.country
                            }
                            console.log('📄 [Invoice] Company Address:', fullAddress)
                            console.log('📄 [Invoice] Company Data:', companyData)
                            const invoiceWithCompany = {
                              ...invoice,
                              companyName: companyData?.name || 'Your Company',
                              companyAddress: fullAddress || 'Company Address'
                            }
                            await generateInvoicePDF(invoiceWithCompany)
                          }}
                        >
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
