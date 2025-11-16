"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function CompaniesTab() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      console.log("🔍 Fetching companies...")
      const res = await fetch("/api/admin/companies")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to load companies")
      }
      const data = await res.json()
      console.log("✅ Companies loaded:", data.companies?.length || 0)
      console.log("📊 Full response:", data)
      console.log("📋 Companies data:", data.companies)
      if (data.companies && data.companies.length > 0) {
        console.log("🏢 First company:", data.companies[0])
      }
      setCompanies(data.companies || [])
    } catch (error) {
      console.error("❌ Failed to load companies:", error)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-900 text-green-200"
      case "trial":
        return "bg-blue-900 text-blue-200"
      case "past_due":
        return "bg-red-900 text-red-200"
      default:
        return "bg-slate-700 text-slate-200"
    }
  }

  const filteredCompanies = companies.filter((c) =>
    (c?.name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-white">Companies</CardTitle>
              <CardDescription>{filteredCompanies.length} companies</CardDescription>
            </div>
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No companies found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Company</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Wallet Balance</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">This Month</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-medium">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-300">{company.name}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                        ${company.walletBalance?.toFixed(2) || "0.00"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${company.monthSpent?.toFixed(2) || "0.00"}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${company.totalSpent?.toFixed(2) || "0.00"}
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
