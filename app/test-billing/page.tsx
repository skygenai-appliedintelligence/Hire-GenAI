"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function TestBillingPage() {
  const { company } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const initializeBilling = async (withSampleData: boolean) => {
    if (!company?.id) {
      setError("No company found. Please log in first.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/billing/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          insertSampleData: withSampleData
        })
      })

      const data = await res.json()

      if (data.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to initialize billing')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Billing System Test & Initialization</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Current logged-in company details</CardDescription>
          </CardHeader>
          <CardContent>
            {company ? (
              <div className="space-y-2">
                <p><strong>Company ID:</strong> {company.id}</p>
                <p><strong>Company Name:</strong> {company.name}</p>
              </div>
            ) : (
              <p className="text-red-600">No company found. Please log in first.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initialize Billing Tables</CardTitle>
            <CardDescription>
              This will create the necessary billing tables in the database and optionally insert sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => initializeBilling(false)}
                disabled={loading || !company}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Initialize Billing Only'
                )}
              </Button>

              <Button
                onClick={() => initializeBilling(true)}
                disabled={loading || !company}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Initialize with Sample Data'
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800 mb-2">{result.message}</p>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Status:</strong> {result.billing?.status}</p>
                    <p><strong>Wallet Balance:</strong> ${result.billing?.walletBalance?.toFixed(2)}</p>
                    <p><strong>Auto-Recharge:</strong> {result.billing?.autoRechargeEnabled ? 'Enabled' : 'Disabled'}</p>
                    {result.sampleDataInserted && (
                      <p className="text-green-800 font-semibold mt-2">✓ Sample data inserted successfully</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Initialize with Sample Data" to set up billing tables and add test data</li>
              <li>Visit <a href="/dashboard/settings/billing?tab=overview" className="text-blue-600 hover:underline">/dashboard/settings/billing?tab=overview</a> to see billing overview</li>
              <li>Visit <a href="/dashboard/settings/billing?tab=usage" className="text-blue-600 hover:underline">/dashboard/settings/billing?tab=usage</a> to see usage analytics</li>
              <li>Visit <a href="/dashboard/settings/billing?tab=invoices" className="text-blue-600 hover:underline">/dashboard/settings/billing?tab=invoices</a> to see invoices</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Database Schema Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-800">
            <p className="mb-2">The billing system uses the following tables:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>company_billing</code> - Company billing settings and wallet</li>
              <li><code>cv_parsing_usage</code> - CV parsing usage tracking</li>
              <li><code>question_generation_usage</code> - Question generation usage</li>
              <li><code>video_interview_usage</code> - Video interview usage</li>
              <li><code>job_usage_summary</code> - Aggregated usage by job</li>
              <li><code>usage_ledger</code> - Audit trail of all charges</li>
              <li><code>invoices</code> - Invoice records</li>
              <li><code>pricing_history</code> - Pricing configuration</li>
            </ul>
            <p className="mt-4 font-semibold">
              Make sure to run the SQL migration file first: <code>migrations/billing_system.sql</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
