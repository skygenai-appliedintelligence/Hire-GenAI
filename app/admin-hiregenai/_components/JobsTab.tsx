"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadCompanies()
    loadJobs()
  }, [])

  useEffect(() => {
    loadJobs()
  }, [selectedCompany])

  const loadCompanies = async () => {
    try {
      const res = await fetch("/api/admin/companies")
      if (!res.ok) throw new Error("Failed to load companies")
      const data = await res.json()
      setCompanies(data.companies || [])
    } catch (error) {
      console.error("Failed to load companies:", error)
    }
  }

  const loadJobs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCompany !== "all") {
        params.append("companyId", selectedCompany)
      }
      console.log("Fetching jobs with params:", params.toString())
      const res = await fetch(`/api/admin/jobs?${params}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to load jobs")
      }
      const data = await res.json()
      console.log("Jobs loaded:", data.jobs?.length || 0)
      setJobs(data.jobs || [])
    } catch (error) {
      console.error("Failed to load jobs:", error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportToCSV = () => {
    const headers = ["Job ID", "Title", "Company", "Status", "Interviews", "Total Cost", "CV Cost", "Questions Cost", "Video Cost"]
    const rows = filteredJobs.map((job) => [
      job.id,
      job.title,
      job.company,
      job.status,
      job.interviewCount,
      job.totalCost?.toFixed(2),
      job.cvCost?.toFixed(2),
      job.questionsCost?.toFixed(2),
      job.videoCost?.toFixed(2),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jobs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id} className="text-white">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Jobs</CardTitle>
            <CardDescription>{filteredJobs.length} jobs found</CardDescription>
          </div>
          <Button
            onClick={exportToCSV}
            disabled={filteredJobs.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No jobs found</p>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-slate-400">{job.company}</p>
                      <p className="text-xs text-slate-500 mt-1">ID: {job.id}</p>
                    </div>
                    <Badge className={job.status === "open" ? "bg-green-900 text-green-200" : "bg-slate-700 text-slate-200"}>
                      {job.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Interviews</p>
                      <p className="text-white font-semibold">{job.interviewCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total Cost</p>
                      <p className="text-emerald-400 font-semibold">${(job.totalCost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">CV Cost</p>
                      <p className="text-white font-semibold">${(job.cvCost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Questions Cost</p>
                      <p className="text-white font-semibold">${(job.questionsCost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Video Cost</p>
                      <p className="text-white font-semibold">${(job.videoCost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
