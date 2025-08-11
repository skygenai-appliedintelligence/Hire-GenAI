import type { InterviewPipeline, CandidateApplication } from "./ai-interview-service"

export class PDFReportService {
  static async generateInterviewReport(
    pipeline: InterviewPipeline,
    candidate: CandidateApplication,
    jobTitle = "Software Engineer",
  ): Promise<string> {
    // In a real implementation, you would use a library like jsPDF or Puppeteer
    // For now, we'll generate an HTML report that can be converted to PDF

    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Interview Report - ${candidate.fullName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
        }
        .candidate-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .recommendation {
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .recommend {
            background: #dcfce7;
            border: 2px solid #16a34a;
            color: #15803d;
        }
        .reject {
            background: #fef2f2;
            border: 2px solid #dc2626;
            color: #dc2626;
        }
        .stage {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .stage-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .stage-title {
            font-size: 18px;
            font-weight: 600;
        }
        .score {
            font-size: 20px;
            font-weight: bold;
        }
        .passed { color: #16a34a; }
        .failed { color: #dc2626; }
        .highlights {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 6px;
            margin-top: 10px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .summary-section h3 {
            color: #374151;
            margin-bottom: 10px;
        }
        .summary-section ul {
            padding-left: 20px;
        }
        .summary-section li {
            margin-bottom: 5px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .progress-bar {
            background: #e5e7eb;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            background: #10b981;
            height: 100%;
            transition: width 0.3s ease;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">HireGenAI</div>
        <h1>Automated Interview Pipeline Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="candidate-info">
        <h2>Candidate Information</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <p><strong>Name:</strong> ${candidate.fullName}</p>
                <p><strong>Email:</strong> ${candidate.email}</p>
                <p><strong>Phone:</strong> ${candidate.phone}</p>
                <p><strong>Experience:</strong> ${candidate.yearsOfExperience} years</p>
            </div>
            <div>
                <p><strong>Position:</strong> ${jobTitle}</p>
                <p><strong>Applied:</strong> ${new Date(candidate.submittedAt).toLocaleDateString()}</p>
                <p><strong>Availability:</strong> ${candidate.availability}</p>
                <p><strong>Pipeline ID:</strong> ${pipeline.id}</p>
            </div>
        </div>
        <div style="margin-top: 15px;">
            <p><strong>Technical Skills:</strong></p>
            <p style="background: white; padding: 10px; border-radius: 4px;">${candidate.technicalSkills}</p>
        </div>
    </div>

    ${
      pipeline.finalRecommendation
        ? `
    <div class="recommendation ${pipeline.finalRecommendation.decision === "recommend" ? "recommend" : "reject"}">
        <h2>${pipeline.finalRecommendation.decision === "recommend" ? "✅ RECOMMEND FOR HIRE" : "❌ DO NOT RECOMMEND"}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div>
                <div style="font-size: 24px; font-weight: bold;">${pipeline.finalRecommendation.overallScore}/100</div>
                <div>Overall Score</div>
            </div>
            <div>
                <div style="font-size: 24px; font-weight: bold;">${pipeline.finalRecommendation.successRate}%</div>
                <div>Success Rate</div>
            </div>
            <div>
                <div style="font-size: 24px; font-weight: bold;">${pipeline.stages.filter((s) => s.status === "passed").length}/${pipeline.stages.length}</div>
                <div>Stages Passed</div>
            </div>
        </div>
    </div>
    `
        : ""
    }

    <h2>Interview Stages</h2>
    ${pipeline.stages
      .map(
        (stage, index) => `
    <div class="stage">
        <div class="stage-header">
            <div class="stage-title">${index + 1}. ${stage.name}</div>
            ${
              stage.score !== undefined
                ? `
            <div class="score ${stage.status === "passed" ? "passed" : "failed"}">
                ${stage.score}/${stage.maxScore}
            </div>
            `
                : ""
            }
        </div>
        
        ${
          stage.score !== undefined
            ? `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(stage.score / stage.maxScore) * 100}%"></div>
        </div>
        `
            : ""
        }
        
        <p><strong>Duration:</strong> ${stage.duration} minutes</p>
        <p><strong>Status:</strong> ${stage.status.toUpperCase()}</p>
        
        ${
          stage.feedback
            ? `
        <p><strong>Feedback:</strong></p>
        <p style="background: #f9fafb; padding: 10px; border-radius: 4px;">${stage.feedback}</p>
        `
            : ""
        }
        
        ${
          stage.keyHighlights && stage.keyHighlights.length > 0
            ? `
        <div class="highlights">
            <strong>Key Highlights:</strong>
            <ul>
                ${stage.keyHighlights.map((highlight) => `<li>${highlight}</li>`).join("")}
            </ul>
        </div>
        `
            : ""
        }
        
        ${
          stage.completedAt
            ? `
        <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
            Completed: ${new Date(stage.completedAt).toLocaleString()}
        </p>
        `
            : ""
        }
    </div>
    `,
      )
      .join("")}

    ${
      pipeline.finalRecommendation
        ? `
    <h2>Final Assessment</h2>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3>Summary</h3>
        <p>${pipeline.finalRecommendation.summary}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-section">
            <h3 style="color: #16a34a;">Strengths</h3>
            <ul>
                ${pipeline.finalRecommendation.strengths.map((strength) => `<li>${strength}</li>`).join("")}
            </ul>
        </div>
        <div class="summary-section">
            <h3 style="color: #dc2626;">Areas for Improvement</h3>
            <ul>
                ${pipeline.finalRecommendation.weaknesses.map((weakness) => `<li>${weakness}</li>`).join("")}
            </ul>
        </div>
    </div>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
        <h3>Reasoning</h3>
        <p>${pipeline.finalRecommendation.reasoning}</p>
    </div>
    `
        : ""
    }

    <div class="footer">
        <p>This report was generated by HireGenAI's Automated Interview Pipeline</p>
        <p>Report ID: ${pipeline.id} | Generated: ${new Date().toISOString()}</p>
        <p>© 2024 HireGenAI. All rights reserved.</p>
    </div>
</body>
</html>
    `

    return reportHtml
  }

  static async downloadReport(htmlContent: string, filename: string) {
    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    // Create a temporary link and trigger download
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  static async shareReport(htmlContent: string, candidate: CandidateApplication): Promise<string> {
    // In a real implementation, you would upload this to a cloud storage service
    // and return a shareable URL. For demo purposes, we'll create a data URL
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)

    // Store in localStorage for demo purposes (in real app, use cloud storage)
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(`report_${reportId}`, htmlContent)

    return `${window.location.origin}/report/${reportId}`
  }

  static getStoredReport(reportId: string): string | null {
    return localStorage.getItem(`report_${reportId}`)
  }
}
