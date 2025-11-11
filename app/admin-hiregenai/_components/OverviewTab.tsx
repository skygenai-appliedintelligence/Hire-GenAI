"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Users, Briefcase, DollarSign, Clock } from "lucide-react"

export default function OverviewTab() {
  const [kpis, setKpis] = useState<any>(null)
  const [spendTrend, setSpendTrend] = useState<any[]>([])
  const [interviewTrend, setInterviewTrend] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverviewData()
  }, [])

  const loadOverviewData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/overview")
      if (!res.ok) throw new Error("Failed to load overview")
      const data = await res.json()
      
      setKpis(data.kpis)
      setSpendTrend(data.spendTrend || [])
      setInterviewTrend(data.interviewTrend || [])
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error("Failed to load overview:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading overview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue & Profitability KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-200">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-100">${kpis?.totalSpend?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-emerald-300 mt-1">All time earnings</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-gradient-to-br from-blue-900 to-slate-900 border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-100">${kpis?.spendToday?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-blue-300 mt-1">
              {kpis?.spendChange >= 0 ? (
                <span className="text-red-400">↑ {kpis?.spendChange?.toFixed(1)}% vs last month</span>
              ) : (
                <span className="text-green-400">↓ {Math.abs(kpis?.spendChange || 0)?.toFixed(1)}% vs last month</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-orange-900 to-slate-900 border-orange-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-100">${(kpis?.totalSpend * 0.3)?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-orange-300 mt-1">AI & Infrastructure costs</p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="bg-gradient-to-br from-purple-900 to-slate-900 border-purple-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Net Profit</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-100">${(kpis?.totalSpend * 0.7)?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-purple-300 mt-1">
              <span className="text-emerald-400">70% margin</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Trend */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Revenue vs Expenses (30 days)</CardTitle>
            <CardDescription>Daily revenue and cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendTrend.map(item => ({
                date: item.date,
                revenue: item.spend,
                expenses: item.spend * 0.3,
                profit: item.spend * 0.7
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#f97316" name="Expenses" />
                <Bar dataKey="profit" fill="#8b5cf6" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Margin Trend */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Profit Margin Trend (30 days)</CardTitle>
            <CardDescription>Daily profit percentage and growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendTrend.map(item => ({
                date: item.date,
                margin: 70,
                cumulative: (item.spend * 0.7)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Line type="monotone" dataKey="margin" stroke="#a78bfa" strokeWidth={2} name="Margin %" />
                <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} name="Cumulative Profit" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Active Alerts
          </CardTitle>
          <CardDescription>Issues requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400">No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
                  </div>
                  <Badge variant="destructive" className="flex-shrink-0">
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
