"use client"

import { useEffect, useState } from "react"
import { PDFReportService } from "@/lib/pdf-report-service"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft } from "lucide-react"

export default function ReportViewerPage({ params }: { params: { reportId: string } }) {
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const content = PDFReportService.getStoredReport(params.reportId)
    setReportContent(content)
    setLoading(false)
  }, [params.reportId])

  const downloadReport = () => {
    if (reportContent) {
      PDFReportService.downloadReport(reportContent, `interview-report-${params.reportId}.html`)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading report...</div>
  }

  if (!reportContent) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Report Not Found</h1>
          <p className="text-gray-600 mb-8">The requested interview report could not be found or has expired.</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Interview Report</h1>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={downloadReport} className="sr-button-primary">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div dangerouslySetInnerHTML={{ __html: reportContent }} className="prose max-w-none" />
        </div>
      </div>
    </div>
  )
}
