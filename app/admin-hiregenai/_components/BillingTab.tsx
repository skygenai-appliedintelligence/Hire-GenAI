"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function BillingTab() {
  const [usage, setUsage] = useState<any>(null)
  const [ledger, setLedger] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/billing")
      if (!res.ok) throw new Error("Failed to load billing")
      const data = await res.json()
      setUsage(data.usage)
      setLedger(data.ledger || [])
    } catch (error) {
      console.error("Failed to load billing:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">CV Parsing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${usage?.cvParsing?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-slate-400 mt-1">{usage?.cvCount || 0} CVs parsed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Question Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${usage?.questions?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-slate-400 mt-1">{usage?.tokenCount || 0} tokens used</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Video Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${usage?.video?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-slate-400 mt-1">{usage?.videoMinutes || 0} minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Ledger */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Usage Ledger</CardTitle>
          <CardDescription>Complete billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : ledger.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No ledger entries</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Category</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Company</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Job</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Base Cost</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Margin</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Final Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-slate-700 text-slate-200 text-xs">
                          {entry.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{entry.company}</td>
                      <td className="py-3 px-4 text-slate-300">{entry.job}</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${entry.baseCost?.toFixed(4) || "0.00"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {entry.margin?.toFixed(1) || "0"}%
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                        ${entry.finalCost?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
