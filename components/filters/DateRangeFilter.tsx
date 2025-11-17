"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Filter, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface DateRangeFilterProps {
  onApply: (startDate: Date, endDate: Date) => void
  showJobFilter?: boolean
  jobs?: Array<{ id: string; title: string }>
  selectedJob?: string
  onJobChange?: (jobId: string) => void
  loading?: boolean
}

export default function DateRangeFilter({
  onApply,
  showJobFilter = false,
  jobs = [],
  selectedJob = "all",
  onJobChange,
  loading = false
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [filterType, setFilterType] = useState<"preset" | "custom">("preset")
  const [presetDays, setPresetDays] = useState<string>("30")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [activeFilter, setActiveFilter] = useState<string>("Last 30 days")

  const handleApply = () => {
    let start: Date
    let end: Date = new Date()
    let filterLabel = ""

    if (filterType === "preset") {
      start = new Date()
      start.setDate(start.getDate() - parseInt(presetDays))
      
      // Set filter label
      const days = parseInt(presetDays)
      if (days === 7) filterLabel = "Last 7 days"
      else if (days === 30) filterLabel = "Last 30 days"
      else if (days === 60) filterLabel = "Last 60 days"
      else if (days === 90) filterLabel = "Last 90 days"
      else if (days === 180) filterLabel = "Last 6 months"
      else if (days === 365) filterLabel = "Last year"
    } else {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates")
        return
      }
      start = new Date(startDate)
      end = new Date(endDate)
      
      // Set end date to end of day
      end.setHours(23, 59, 59, 999)
      
      filterLabel = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }

    console.log('🔍 [DateRangeFilter] Applying filters', {
      filterType,
      presetDays,
      startDate,
      endDate,
      filterLabel,
    })

    setActiveFilter(filterLabel)
    onApply(start, end)
    setOpen(false) // Close popup after applying
  }

  return (
    <div className="flex items-center gap-3">
      {/* Active Filter Badge */}
      <Badge
        variant="outline"
        className="px-3 py-1.5 text-sm bg-slate-800/70 border-slate-600 text-slate-100 flex items-center"
      >
        <Calendar className="h-3.5 w-3.5 mr-2 text-emerald-400" />
        <span className="truncate max-w-[180px]">{activeFilter}</span>
      </Badge>
      
      {/* Job Filter Badge (if enabled) */}
      {showJobFilter && selectedJob !== "all" && (
        <Badge variant="outline" className="px-3 py-1.5 text-sm">
          {jobs.find(j => j.id === selectedJob)?.title || "Job Selected"}
        </Badge>
      )}

      {/* Filter Button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-emerald-600" />
              Filter Data
            </DialogTitle>
            <DialogDescription>
              Select date range and other filters
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filter Type Selection */}
            <div>
              <Label className="text-sm font-medium">Filter Type</Label>
              <Select value={filterType} onValueChange={(val: "preset" | "custom") => setFilterType(val)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preset">Quick Range</SelectItem>
                  <SelectItem value="custom">Custom Dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preset Date Range */}
            {filterType === "preset" && (
              <div>
                <Label className="text-sm font-medium">Date Range</Label>
                <Select value={presetDays} onValueChange={setPresetDays}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 6 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Date Range */}
            {filterType === "custom" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setFilterType("custom")
                    }}
                    className="mt-2"
                    max={endDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setFilterType("custom")
                    }}
                    className="mt-2"
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            {/* Job Filter (if enabled) */}
            {showJobFilter && (
              <div>
                <Label className="text-sm font-medium">Job Description</Label>
                <Select value={selectedJob} onValueChange={onJobChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All Jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? "Loading..." : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
