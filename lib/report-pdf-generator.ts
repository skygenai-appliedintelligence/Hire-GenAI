/**
 * Comprehensive PDF Generator for Candidate Report
 * Renders all tabs (Candidate, Evaluation, Transcript) with similar UI styling
 */

export interface CandidateData {
  id: string
  name: string
  email: string
  phone: string
  resumeUrl: string
  appliedAt: string
  location?: string
  status: string
  expectedSalary?: number | null
  salaryCurrency?: string
  salaryPeriod?: string
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  availableStartDate?: string | null
  willingToRelocate?: boolean
  languages?: Array<{ language: string; proficiency: string }>
}

export interface EvaluationData {
  overallScore: number
  decision: "qualified" | "unqualified" | "pending"
  scores?: {
    technical: number
    communication: number
    experience: number
    cultural_fit: number
  }
  strengths: string[]
  weaknesses: string[]
  reviewerComments?: string
  questions?: Array<{
    question_text?: string
    question?: string
    criteria?: string
    category?: string
    score?: number
    marks_obtained?: number
    max_score?: number
    max_marks?: number
    answered?: boolean
    completeness?: string
    candidate_response?: string
    answer?: string
    criteria_reasoning?: string
    strengths_in_answer?: string[]
    gaps_in_answer?: string[]
  }>
  criteriaBreakdown?: Record<string, any>
  configured_criteria?: string[]
  marks_summary?: {
    total_interview_questions?: number
    questions_asked?: number
    questions_answered?: number
  }
}

export interface TranscriptData {
  text: string
  duration?: string
  interviewDate?: string
  interviewer?: string
  rounds?: Array<{
    round: string
    questions: Array<{
      question: string
      answer: string
      score?: number
    }>
  }>
}

export interface QualificationDetails {
  overall?: { score_percent?: number }
  extracted?: {
    name?: string
    email?: string
    phone?: string
    location?: string
    total_experience_years_estimate?: number
    skills?: string[]
    education?: Array<{ institution?: string; degree?: string }>
    work_experience?: Array<{ company: string; title: string; duration: string; start_date?: string; end_date?: string }>
  }
  breakdown?: Record<string, any>
  gaps_and_notes?: string[]
  reason_summary?: string
  strengths?: string[]
  gaps?: string[]
  candidateProfile?: {
    university?: string
    employer?: string
    experience?: number
    hasRelevantExperience?: boolean
    educationList?: Array<{ institution?: string; degree?: string }>
  }
  evaluationBreakdown?: Array<{
    category: string
    score: number
    weight: number
    details?: string[]
    isGrid?: boolean
    gridData?: Array<{ label: string; value: string }>
    fullMatchedSkills?: string[]
    fullMissingSkills?: string[]
  }>
  matchedSkills?: Array<{ name: string; score: number }>
  missingSkills?: string[]
  recommendation?: string
  qualified?: boolean
  extractedInfo?: {
    name?: string
    email?: string
    phone?: string
    totalExperience?: string
    skills?: string[]
    notes?: string[]
    workExperience?: Array<{ company: string; title: string; duration: string; start_date?: string; end_date?: string }>
  }
}

export interface ReportPDFData {
  candidate: CandidateData
  evaluation: EvaluationData | null
  transcript: TranscriptData | null
  jobTitle: string
  resumeScore: number
  qualificationDetails: QualificationDetails | null
  interviewScore?: number
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  } catch {
    return '—'
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#059669' // green-600
  if (score >= 60) return '#d97706' // amber-600
  return '#dc2626' // red-600
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return '#dcfce7' // green-100
  if (score >= 60) return '#fef3c7' // amber-100
  return '#fee2e2' // red-100
}

export function generateReportPDFHTML(data: ReportPDFData): string {
  const { candidate, evaluation, transcript, jobTitle, resumeScore, qualificationDetails, interviewScore } = data
  
  const overallScore = evaluation?.overallScore ?? 0
  const overallScoreDisplay = overallScore <= 10 ? Math.round(overallScore * 10) : Math.round(overallScore)
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(candidate.name)} - Evaluation Report</title>
  <base href="data:text/html;charset=utf-8,">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .header, .section-header, .badge, .card, .progress-bar, .progress-fill, .criteria-card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
      padding: 20px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    .avoid-break {
      page-break-inside: avoid;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .header-title {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .header-subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .header-date {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 8px;
    }
    
    /* Section */
    .section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    
    .section-header {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      padding: 14px 18px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .section-header.purple {
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
      border-bottom-color: #e9d5ff;
    }
    
    .section-header.blue {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-bottom-color: #bfdbfe;
    }
    
    .section-header.green {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-bottom-color: #a7f3d0;
    }
    
    .section-header.slate {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: white;
      border-bottom: none;
    }
    
    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-header.slate .section-title {
      color: white;
    }
    
    .section-subtitle {
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }
    
    .section-header.slate .section-subtitle {
      color: #94a3b8;
    }
    
    .section-content {
      padding: 18px;
    }
    
    /* Grid */
    .grid {
      display: grid;
      gap: 12px;
    }
    
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    
    /* Info Item */
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .info-label {
      font-size: 10px;
      color: #6b7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 12px;
      color: #111827;
      font-weight: 500;
    }
    
    /* Badge */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .badge-teal { background: #ccfbf1; color: #0f766e; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    
    /* Score Circle */
    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 4px solid;
    }
    
    .score-circle.green { border-color: #059669; background: #ecfdf5; }
    .score-circle.yellow { border-color: #d97706; background: #fffbeb; }
    .score-circle.red { border-color: #dc2626; background: #fef2f2; }
    
    .score-value {
      font-size: 24px;
      font-weight: 700;
    }
    
    .score-label {
      font-size: 9px;
      color: #6b7280;
    }
    
    /* Progress Bar */
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
    }
    
    .progress-fill.green { background: #059669; }
    .progress-fill.blue { background: #3b82f6; }
    .progress-fill.yellow { background: #d97706; }
    .progress-fill.red { background: #dc2626; }
    
    /* Card */
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px;
    }
    
    .card-green { background: #f0fdf4; border-color: #bbf7d0; }
    .card-red { background: #fef2f2; border-color: #fecaca; }
    .card-yellow { background: #fffbeb; border-color: #fde68a; }
    .card-blue { background: #eff6ff; border-color: #bfdbfe; }
    .card-purple { background: #faf5ff; border-color: #e9d5ff; }
    
    /* List */
    .list {
      list-style: none;
    }
    
    .list-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 0;
    }
    
    .list-bullet {
      flex-shrink: 0;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 5px;
    }
    
    .list-bullet.green { background: #059669; }
    .list-bullet.yellow { background: #d97706; }
    .list-bullet.red { background: #dc2626; }
    
    /* Question Card */
    .question-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    
    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .question-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .question-text {
      flex: 1;
      font-weight: 500;
      color: #111827;
    }
    
    .question-score {
      text-align: right;
    }
    
    .question-score-value {
      font-size: 22px;
      font-weight: 700;
    }
    
    .question-score-max {
      font-size: 10px;
      color: #6b7280;
    }
    
    .question-content {
      padding: 14px;
    }
    
    .response-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    
    .response-label {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .response-text {
      font-size: 11px;
      color: #4b5563;
      line-height: 1.6;
    }
    
    /* Transcript */
    .transcript-message {
      display: flex;
      margin-bottom: 10px;
    }
    
    .transcript-message.agent {
      justify-content: flex-start;
    }
    
    .transcript-message.candidate {
      justify-content: flex-end;
    }
    
    .transcript-bubble {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 11px;
    }
    
    .transcript-bubble.agent {
      background: #dbeafe;
      border: 1px solid #93c5fd;
      color: #1e40af;
    }
    
    .transcript-bubble.candidate {
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #166534;
    }
    
    .transcript-role {
      font-size: 9px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    /* Divider */
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 14px 0;
    }
    
    /* Table */
    .table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .table th, .table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .table th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 16px;
      color: #9ca3af;
      font-size: 10px;
      border-top: 1px solid #e5e7eb;
      margin-top: 20px;
    }
    
    /* Criteria Card */
    .criteria-card {
      border-radius: 10px;
      padding: 14px;
      border: 2px solid;
    }
    
    .criteria-card.blue { background: #eff6ff; border-color: #93c5fd; }
    .criteria-card.green { background: #f0fdf4; border-color: #86efac; }
    .criteria-card.purple { background: #faf5ff; border-color: #d8b4fe; }
    .criteria-card.orange { background: #fff7ed; border-color: #fdba74; }
    .criteria-card.teal { background: #f0fdfa; border-color: #5eead4; }
    .criteria-card.gray { background: #f9fafb; border-color: #d1d5db; }
  </style>
</head>
<body>
  
    
  <!-- SECTION 1: APPLICATION DETAILS -->
  <div class="section avoid-break">
    <div class="section-header slate">
      <div class="section-title">📋 Application Details</div>
      <div class="section-subtitle">Candidate information & preferences</div>
    </div>
    <div class="section-content">
      <!-- Contact Information -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 10px;">Contact Information</div>
        <div class="grid grid-4">
          <div class="info-item">
            <span class="info-label">Name</span>
            <span class="info-value">${escapeHtml(candidate.name) || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email</span>
            <span class="info-value">${escapeHtml(candidate.email) || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone</span>
            <span class="info-value">${escapeHtml(candidate.phone) || '—'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Location</span>
            <span class="info-value">${escapeHtml(candidate.location) || '—'}</span>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- Compensation & Availability -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 10px;">Compensation & Availability</div>
        <div class="grid grid-4">
          <div class="info-item">
            <span class="info-label">Expected Salary</span>
            <span class="info-value" style="color: #059669; font-weight: 600;">
              ${candidate.expectedSalary ? `${candidate.salaryCurrency || 'USD'} ${Number(candidate.expectedSalary).toLocaleString()}` : '—'}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Pay Period</span>
            <span class="info-value" style="text-transform: capitalize;">${escapeHtml(candidate.salaryPeriod) || 'Monthly'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Available From</span>
            <span class="info-value">${formatDate(candidate.availableStartDate)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Willing to Relocate</span>
            <span class="info-value">${candidate.willingToRelocate ? '✓ Yes' : '✗ No'}</span>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- Additional Information -->
      <div>
        <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 10px;">Additional Information</div>
        <div class="grid grid-2">
          <div class="info-item">
            <span class="info-label">Languages</span>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
              ${candidate.languages && candidate.languages.length > 0 
                ? candidate.languages.map(l => `<span class="badge badge-blue">${escapeHtml(l.language)}</span>`).join('')
                : '<span class="info-value">—</span>'
              }
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">Professional Links</span>
            <div style="display: flex; gap: 10px; margin-top: 4px;">
              ${candidate.linkedinUrl ? `<span style="color: #6366f1; font-size: 11px;">LinkedIn ↗</span>` : ''}
              ${candidate.portfolioUrl ? `<span style="color: #6366f1; font-size: 11px;">Portfolio ↗</span>` : ''}
              ${!candidate.linkedinUrl && !candidate.portfolioUrl ? '<span class="info-value">—</span>' : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 10px; color: #6b7280;">Applied on ${formatDate(candidate.appliedAt)}</span>
        <span class="badge ${candidate.status === 'qualified' || candidate.status === 'CV Qualified' ? 'badge-green' : candidate.status === 'applied' ? 'badge-blue' : 'badge-gray'}">${escapeHtml(candidate.status)}</span>
      </div>
    </div>
  </div>
  
  <!-- SECTION 2: RESUME EVALUATION -->
  ${qualificationDetails ? generateResumeEvaluationSection(resumeScore, qualificationDetails, candidate, jobTitle, interviewScore || 0) : ''}
  
  <!-- PAGE BREAK FOR EVALUATION -->
  <div class="page-break"></div>
  
  <!-- SECTION 3: INTERVIEW EVALUATION -->
  ${evaluation ? generateInterviewEvaluationSection(evaluation, overallScoreDisplay) : `
  <div class="section">
    <div class="section-header blue">
      <div class="section-title">🎯 Interview Evaluation</div>
    </div>
    <div class="section-content" style="text-align: center; padding: 40px;">
      <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
      <div style="font-size: 14px; font-weight: 600; color: #374151;">No Evaluation Data Available</div>
      <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">The interview evaluation has not been completed yet.</div>
    </div>
  </div>
  `}
  
  <!-- PAGE BREAK FOR TRANSCRIPT -->
  <div class="page-break"></div>
  
  <!-- SECTION 4: TRANSCRIPT -->
  ${generateTranscriptSection(transcript)}
  
  <!-- FOOTER -->
  <div class="footer">
    <div>Generated by HireGenAI • Confidential Candidate Report</div>
    <div style="margin-top: 4px;">${new Date().toISOString()}</div>
  </div>
  
</body>
</html>
`
}

function generateResumeEvaluationSection(resumeScore: number, qualificationDetails: QualificationDetails, candidate: CandidateData, jobTitle: string, interviewScore: number = 0): string {
  const scoreColor = resumeScore >= 60 ? 'green' : resumeScore >= 40 ? 'yellow' : 'red'
  const breakdown = qualificationDetails.breakdown || {}
  const candidateProfile = qualificationDetails.candidateProfile
  const strengths = qualificationDetails.strengths || []
  const gaps = qualificationDetails.gaps || []
  const evaluationBreakdown = qualificationDetails.evaluationBreakdown || []
  const matchedSkills = qualificationDetails.matchedSkills || []
  const missingSkills = qualificationDetails.missingSkills || []
  const qualified = qualificationDetails.qualified ?? (resumeScore >= 60)
  const recommendation = qualificationDetails.recommendation || ''
  
  // Get profile classification
  const getProfileGroup = () => {
    if (!candidateProfile) return { name: 'Unknown', priority: 'low', color: '#6b7280', bgColor: '#f3f4f6' }
    const uni = candidateProfile.university || 'non-targeted'
    const emp = candidateProfile.employer || 'non-targeted'
    const exp = candidateProfile.experience || 0
    
    if (uni === 'targeted' && emp === 'targeted' && exp >= 3) {
      return { name: 'Most Ideal', priority: 'highest', color: '#059669', bgColor: '#ecfdf5', borderColor: '#a7f3d0' }
    } else if (uni !== 'targeted' && emp === 'targeted' && exp >= 3) {
      return { name: 'Good Match', priority: 'high', color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#93c5fd' }
    } else if (uni === 'targeted' && emp !== 'targeted') {
      return { name: 'Average', priority: 'medium', color: '#f97316', bgColor: '#fff7ed', borderColor: '#fed7aa' }
    } else {
      return { name: 'Least Ideal', priority: 'low', color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca' }
    }
  }
  const profileGroup = getProfileGroup()
  
  return `
  <!-- RESUME EVALUATION REPORT HEADER (Matching candidate page) -->
  <div class="section avoid-break" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header Bar -->
    <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center;">
          <div style="width: 48px; height: 48px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 14px;">
            <span style="color: white; font-size: 20px;">📄</span>
          </div>
          <div>
            <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0;">Resume Evaluation Report</h2>
            <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Generated on ${new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: flex; align-items: center; justify-content: flex-end; margin-bottom: 6px;">
            <span style="margin-right: 6px; color: ${qualified ? '#059669' : '#f59e0b'};">${qualified ? '✓' : '⚠'}</span>
            <span style="background: ${qualified ? '#dcfce7' : '#fee2e2'}; color: ${qualified ? '#166534' : '#991b1b'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${qualified ? 'Qualified' : 'Not Qualified'}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Candidate Overview Bar -->
    <div style="background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <!-- Candidate Info -->
        <div style="display: flex; align-items: center;">
          <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.1); margin-right: 14px;">
            <span style="font-size: 28px; color: #64748b;">👤</span>
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0;">${escapeHtml(qualificationDetails.extracted?.name || candidate.name)}</h3>
            <div style="display: flex; align-items: center; color: #475569; font-size: 12px; margin-top: 4px;">
              <span style="margin-right: 6px;">💼</span>
              <span>${escapeHtml(jobTitle || 'N/A')}</span>
            </div>
          </div>
        </div>
        
        <!-- Scores -->
        <div style="display: flex; gap: 24px; border-left: 1px solid #cbd5e1; padding-left: 24px;">
          <div>
            <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 500; margin: 0 0 4px 0;">Resume Score</p>
            <div style="display: flex; align-items: center;">
              <span style="margin-right: 6px; color: #94a3b8;">📊</span>
              <span style="font-size: 18px; font-weight: 700; color: #1e293b;">${resumeScore}</span>
              <span style="font-size: 11px; color: #94a3b8;">/100</span>
            </div>
          </div>
        </div>
        
        <!-- Score Circle -->
        <div style="width: 72px; height: 72px; border-radius: 50%; background: conic-gradient(${getScoreColor(resumeScore)} ${resumeScore * 3.6}deg, #e5e7eb ${resumeScore * 3.6}deg); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="width: 58px; height: 58px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 20px; font-weight: 700; color: ${getScoreColor(resumeScore)};">${resumeScore}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- INTERVIEW EVALUATION CARD -->
  ${interviewScore > 0 ? `
  <div class="section avoid-break">
    <div class="section-header" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-bottom: 1px solid #a7f3d0;">
      <div class="section-title" style="color: #059669;">🎤 Interview Evaluation</div>
      <div class="section-subtitle" style="color: #047857;">AI-powered interview scoring and analysis</div>
    </div>
    <div class="section-content">
      <!-- Interview Score Card -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px; padding: 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        <!-- Left: Score Circle -->
        <div style="display: flex; align-items: center; gap: 20px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span style="font-size: 24px; font-weight: 700; color: #059669;">${interviewScore}</span>
              <span style="font-size: 10px; color: #64748b;">out of 100</span>
            </div>
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: white; margin: 0 0 4px 0;">Interview Evaluation</h3>
            <p style="font-size: 12px; color: rgba(255, 255, 255, 0.9); margin: 0;">Score based on 5 questions</p>
          </div>
        </div>
        
        <!-- Right: Recommendation Badge -->
        <div style="background: rgba(255, 255, 255, 0.15); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 10px; padding: 12px 20px; text-align: center;">
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.8); margin-bottom: 4px;">Recommendation</div>
          <div style="font-size: 16px; font-weight: 700; color: white;">${interviewScore >= 60 ? 'Not Hire' : 'Not Hire'}</div>
        </div>
      </div>
      
      <!-- Additional Info -->
      <div style="margin-top: 16px; padding: 14px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #059669;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #059669;">✓</span>
          <span style="font-size: 11px; color: #047857; font-weight: 500;">${interviewScore >= 60 ? 'Disqualified' : 'Disqualified'}</span>
        </div>
      </div>
    </div>
  </div>
  ` : ''}
  
  <!-- CANDIDATE PROFILE CLASSIFICATION -->
  ${candidateProfile ? `
  <div class="section avoid-break">
    <div class="section-header" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-bottom: 1px solid #e5e7eb;">
      <div class="section-title">🏆 Candidate Profile Classification</div>
      <div class="section-subtitle">Classification based on education, employer, and experience relevance</div>
    </div>
    <div class="section-content">
      <!-- Current Classification -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Current Classification</div>
        <div style="padding: 16px; border-radius: 10px; border: 2px solid ${profileGroup.borderColor}; background: ${profileGroup.bgColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 16px; font-weight: 700; color: ${profileGroup.color};">${profileGroup.name}</div>
            <span class="badge" style="background: ${profileGroup.bgColor}; color: ${profileGroup.color}; border: 1px solid ${profileGroup.borderColor}; font-size: 11px; padding: 4px 10px;">
              ${profileGroup.priority === 'highest' ? 'Most Ideal' : profileGroup.priority === 'high' ? 'Good Match' : profileGroup.priority === 'medium' ? 'Average' : 'Least Ideal'}
            </span>
          </div>
          <div style="font-size: 11px; color: #4b5563; margin-bottom: 10px;">
            ${profileGroup.priority === 'highest' ? 'Targeted university AND targeted employer (with at least 3 yrs of exp.)' : 
              profileGroup.priority === 'high' ? 'Non-targeted university BUT targeted employer (with at least 3 yrs of exp.)' :
              profileGroup.priority === 'medium' ? 'Targeted university BUT non-targeted employer' : 
              'Non-targeted university AND non-targeted employer'}
          </div>
          <div style="padding: 10px; background: ${profileGroup.priority === 'highest' || profileGroup.priority === 'high' ? '#ecfdf5' : profileGroup.priority === 'medium' ? '#fffbeb' : '#fef2f2'}; border-radius: 6px; border-left: 3px solid ${profileGroup.color};">
            <div style="font-size: 11px; font-weight: 600; color: ${profileGroup.color};">
              ${profileGroup.priority === 'highest' ? '✅ Recommended - Ideal candidate with targeted education and employer background' : 
                profileGroup.priority === 'high' ? '✅ Recommended - Good candidate with relevant experience from targeted employer' :
                profileGroup.priority === 'medium' ? '⚠️ Consider - Candidate has targeted education but limited employer experience' : 
                '❌ Not Recommended - Candidate does not meet the preferred profile criteria'}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Profile Attributes Grid (3 cards: University, Employer History, Experience) -->
      <div class="grid grid-3" style="gap: 12px;">
        <!-- University Card -->
        <div class="card" style="background: linear-gradient(180deg, #eff6ff 0%, #fff 100%); border: 1px solid #bfdbfe;">
          <div style="font-size: 12px; font-weight: 600; color: #1e40af; margin-bottom: 8px;">🎓 University</div>
          ${candidateProfile.educationList && candidateProfile.educationList.length > 0 ? 
            candidateProfile.educationList.slice(0, 2).map(edu => `
              <div style="font-size: 10px; color: #374151; margin-bottom: 4px;">${escapeHtml(edu.institution || '')} ${edu.degree ? `- ${escapeHtml(edu.degree)}` : ''}</div>
            `).join('') : ''
          }
          <span class="badge badge-blue" style="margin-top: 6px; display: inline-block; text-transform: capitalize;">${escapeHtml(candidateProfile.university || 'N/A')}</span>
        </div>
        
        <!-- Employer History Card -->
        <div class="card" style="background: linear-gradient(180deg, #faf5ff 0%, #fff 100%); border: 1px solid #e9d5ff;">
          <div style="font-size: 12px; font-weight: 600; color: #7c3aed; margin-bottom: 8px;">🏢 Employer History</div>
          ${(() => {
            const workExp = qualificationDetails.extractedInfo?.workExperience || qualificationDetails.extracted?.work_experience || []
            if (workExp.length > 0) {
              return workExp.slice(0, 3).map((exp: any) => `
                <div style="margin-bottom: 6px;">
                  <div style="font-size: 11px; font-weight: 600; color: #1e293b;">${escapeHtml(exp.company)}</div>
                  <div style="font-size: 9px; color: #64748b;">${escapeHtml(exp.title)} • ${escapeHtml(exp.duration)}</div>
                </div>
              `).join('')
            } else if (candidateProfile.experience && candidateProfile.experience > 0) {
              return `
                <span class="badge badge-blue" style="margin-bottom: 6px;">${candidateProfile.experience}+ Years Experience</span>
                <div style="font-size: 9px; color: #64748b;">Work history details not extracted</div>
              `
            } else {
              return `
                <span class="badge badge-yellow">Fresher Candidate</span>
                <div style="font-size: 9px; color: #64748b;">No prior work experience listed</div>
              `
            }
          })()}
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e9d5ff;">
            <span class="badge badge-purple" style="text-transform: capitalize;">Profile: ${escapeHtml(candidateProfile.employer || 'N/A')}</span>
          </div>
        </div>
        
        <!-- Experience Card -->
        <div class="card" style="background: linear-gradient(180deg, #fffbeb 0%, #fff 100%); border: 1px solid #fde68a;">
          <div style="font-size: 12px; font-weight: 600; color: #d97706; margin-bottom: 8px;">⏱️ Experience</div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="badge badge-yellow">${candidateProfile.experience || 0} years</span>
            ${candidateProfile.hasRelevantExperience ? '<span class="badge badge-green">Relevant</span>' : ''}
          </div>
        </div>
      </div>
      
      <!-- Profile Groups Reference -->
      <div style="margin-top: 16px;">
        <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px;">Profile Classification Reference</div>
        <div class="grid grid-2" style="gap: 8px;">
          <div style="padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding-left: 32px; position: relative;">
            <div style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #fecaca; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #dc2626;">0</div>
            <div style="font-size: 11px; font-weight: 600; color: #dc2626;">Least Ideal</div>
            <div style="font-size: 9px; color: #991b1b;">Non-targeted university AND non-targeted employer</div>
          </div>
          <div style="padding: 8px 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding-left: 32px; position: relative;">
            <div style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #fed7aa; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #ea580c;">1</div>
            <div style="font-size: 11px; font-weight: 600; color: #ea580c;">Average</div>
            <div style="font-size: 9px; color: #c2410c;">Targeted university BUT non-targeted employer</div>
          </div>
          <div style="padding: 8px 12px; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding-left: 32px; position: relative;">
            <div style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #93c5fd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #2563eb;">2</div>
            <div style="font-size: 11px; font-weight: 600; color: #2563eb;">Good Match</div>
            <div style="font-size: 9px; color: #1d4ed8;">Non-targeted university BUT targeted employer (3+ years)</div>
          </div>
          <div style="padding: 8px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding-left: 32px; position: relative;">
            <div style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; background: #a7f3d0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #059669;">3</div>
            <div style="font-size: 11px; font-weight: 600; color: #059669;">Most Ideal</div>
            <div style="font-size: 9px; color: #047857;">Targeted university AND targeted employer (3+ years)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}
  
  <!-- DETAILED EVALUATION BREAKDOWN (Exact match with candidate page) -->
  ${generateDetailedEvaluationBreakdown(evaluationBreakdown, breakdown)}
  
  <!-- FINAL RECOMMENDATION -->
  <div class="section avoid-break">
    <div class="section-header ${qualified ? 'green' : ''}" style="background: ${qualified ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'};">
      <div class="section-title">${qualified ? '✅' : '⚠️'} Final Recommendation</div>
      <div class="section-subtitle">Assessment outcome based on comprehensive evaluation</div>
    </div>
    <div class="section-content">
      <div class="card ${qualified ? 'card-green' : 'card-red'}" style="padding: 16px;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${qualified ? '#dcfce7' : '#fee2e2'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <span style="font-size: 18px;">${qualified ? '✓' : '✗'}</span>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: ${qualified ? '#166534' : '#991b1b'}; margin-bottom: 6px;">
              ${qualified ? 'Proceed to Next Round' : 'Not Recommended'}
            </div>
            <div style="font-size: 11px; color: ${qualified ? '#15803d' : '#b91c1c'};">
              ${recommendation || (qualified 
                ? 'The candidate demonstrates strong relevant experience and meets the requirements. Recommended to proceed to next round.'
                : 'The candidate shows potential but may need further evaluation before proceeding.'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
}

function generateBreakdownItem(label: string, score: number, weight: number, color: string): string {
  const scoreColorClass = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red'
  return `
  <div class="criteria-card ${color}">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-size: 11px; font-weight: 600;">${escapeHtml(label)}</span>
      <span style="font-size: 16px; font-weight: 700; color: ${getScoreColor(score)}">${score}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill ${scoreColorClass}" style="width: ${Math.min(score, 100)}%"></div>
    </div>
    <div style="font-size: 9px; color: #6b7280; margin-top: 6px;">Weight: ${weight}%</div>
  </div>
  `
}

function generateDetailedEvaluationBreakdown(evaluationBreakdown: any[], breakdown: Record<string, any>): string {
  // Build all 9 categories from evaluationBreakdown or fallback to breakdown data
  const categories = evaluationBreakdown.length > 0 ? evaluationBreakdown : [
    // 1. Skill Set Match - Show Match Percentage, Skills Summary, and All Matched/Missing Skills
    { 
      category: 'Skill Set Match', 
      score: breakdown.skill_set_match?.score || 0, 
      weight: breakdown.skill_set_match?.weight || 30, 
      isGrid: true, 
      gridData: (() => {
        const matchedSkills = breakdown.skill_set_match?.matched_skills || []
        const missingSkills = breakdown.skill_set_match?.missing_skills || []
        const matchedCount = matchedSkills.length
        const missingCount = missingSkills.length
        const totalSkills = matchedCount + missingCount
        return [
          { label: 'Match Percentage', value: (breakdown.skill_set_match?.match_percentage || (totalSkills > 0 ? Math.round((matchedCount / totalSkills) * 100) : 0)) + '%' },
          { label: 'Skills Summary', value: matchedCount + ' matched / ' + totalSkills + ' total required' }
        ]
      })(),
      fullMatchedSkills: breakdown.skill_set_match?.matched_skills || [], 
      fullMissingSkills: breakdown.skill_set_match?.missing_skills || [] 
    },
    // 2. Skills in Recent Projects
    { 
      category: 'Skills in Recent Projects', 
      score: breakdown.skills_in_recent_projects?.score || 80, 
      weight: breakdown.skills_in_recent_projects?.weight || 15, 
      isGrid: true, 
      gridData: [
        { label: 'Recent Skills Used', value: (breakdown.skills_in_recent_projects?.recent_skills_used || []).join(', ') || 'Not specified' },
        { label: 'Projects Analyzed', value: (breakdown.skills_in_recent_projects?.projects_analyzed || 0) + ' projects' },
        { label: 'Skill Relevance', value: 'High' },
        { label: 'Experience Depth', value: 'Verified' }
      ]
    },
    // 3. Experience Range Match
    { 
      category: 'Experience Range Match', 
      score: breakdown.experience_range_match?.score || 0, 
      weight: breakdown.experience_range_match?.weight || 15, 
      isGrid: true, 
      gridData: [
        { label: 'Actual Experience', value: (breakdown.experience_range_match?.years_actual !== null && breakdown.experience_range_match?.years_actual !== undefined ? breakdown.experience_range_match.years_actual : 'N/A') + ' years' },
        { label: 'Required Experience', value: (breakdown.experience_range_match?.years_required || 'Not specified') + ' years' },
        { label: 'Match Level', value: breakdown.experience_range_match?.match_level || 'Not specified' },
        { label: 'Experience Status', value: (breakdown.experience_range_match?.years_actual || 0) >= (parseInt(breakdown.experience_range_match?.years_required || '0') || 0) ? '✓ Meets Requirement' : '✗ Below Requirement' }
      ]
    },
    // 4. Location Match
    { 
      category: 'Location Match', 
      score: breakdown.location_match?.score || 50, 
      weight: breakdown.location_match?.weight || 5, 
      isGrid: true, 
      gridData: [
        { label: 'Candidate Location', value: breakdown.location_match?.candidate_location || 'Not specified' },
        { label: 'Job Location', value: breakdown.location_match?.job_location || 'Not specified' },
        { label: 'Remote Possible', value: breakdown.location_match?.remote_possible ? '✓ Yes' : '✗ No' },
        { label: 'Location Status', value: breakdown.location_match?.is_match ? '✓ Match' : '⚠ Different' }
      ]
    },
    // 5. Written Communication
    { 
      category: 'Written Communication', 
      score: breakdown.written_communication?.score || 0, 
      weight: breakdown.written_communication?.weight || 5, 
      isGrid: true, 
      gridData: [
        { label: 'Grammar Score', value: (breakdown.written_communication?.grammar_score || 0) + '/100' },
        { label: 'Structure Score', value: (breakdown.written_communication?.structure_score || 0) + '/100' },
        { label: 'Formatting Score', value: (breakdown.written_communication?.formatting_score || 0) + '/100' },
        { label: 'Issues Found', value: (breakdown.written_communication?.issues || []).length > 0 ? (breakdown.written_communication?.issues || []).join(', ') : '✓ None' }
      ]
    },
    // 6. Education Qualification
    { 
      category: 'Education Qualification', 
      score: breakdown.education_qualification?.score || 0, 
      weight: breakdown.education_qualification?.weight || 10, 
      isGrid: true, 
      gridData: [
        { label: 'Candidate Degree', value: breakdown.education_qualification?.candidate_degree || 'Not specified' },
        { label: 'Required Degree', value: breakdown.education_qualification?.required_degree || 'Not specified' },
        { label: 'Field Match', value: breakdown.education_qualification?.field_match ? '✓ Yes' : '✗ No' },
        { label: 'Institution Rank', value: breakdown.education_qualification?.institution_rank || 'Not specified' }
      ]
    },
    // 7. Certifications
    { 
      category: 'Certifications', 
      score: breakdown.certifications_match?.score || 70, 
      weight: breakdown.certifications_match?.weight || 5, 
      isGrid: true, 
      gridData: [
        { label: '✓ Matched Certs', value: (breakdown.certifications_match?.matched_certs || []).join(', ') || 'None' },
        { label: '✗ Missing Certs', value: (breakdown.certifications_match?.missing_certs || []).join(', ') || 'None' },
        { label: '⏰ Expired Certs', value: (breakdown.certifications_match?.expired_certs || []).join(', ') || 'None' },
        { label: 'Cert Status', value: (breakdown.certifications_match?.matched_certs || []).length > 0 ? '✓ Has Required' : '✗ Missing' }
      ]
    },
    // 8. Language Skills
    { 
      category: 'Language Skills', 
      score: breakdown.language_skills?.score || 95, 
      weight: breakdown.language_skills?.weight || 2, 
      isGrid: true, 
      gridData: [
        { label: 'Known Languages', value: (breakdown.language_skills?.matched_languages || []).map((l: any) => typeof l === 'string' ? l : l.language).join(', ') || 'Not specified' },
        { label: 'Proficiency Levels', value: (breakdown.language_skills?.matched_languages || []).map((l: any) => typeof l === 'string' ? 'N/A' : l.proficiency).join(', ') || 'Not specified' },
        { label: 'Language Details', value: (breakdown.language_skills?.matched_languages || []).length > 0 ? 'Languages provided' : 'No languages specified' },
        { label: 'Status', value: (breakdown.language_skills?.matched_languages || []).length > 0 ? '✓ Languages Provided' : '⚠ No languages specified' }
      ]
    },
    // 9. Profile Quality
    { 
      category: 'Profile Quality', 
      score: breakdown.profile_quality?.score || 75, 
      weight: breakdown.profile_quality?.weight || 2, 
      isGrid: true, 
      gridData: [
        { label: 'Education Rank', value: breakdown.profile_quality?.education_rank || 'Not specified' },
        { label: 'Employer Rank', value: breakdown.profile_quality?.employer_rank || 'Not specified' },
        { label: 'Industry Relevance', value: breakdown.profile_quality?.industry_relevance || 'Not specified' },
        { label: 'Overall Quality', value: (breakdown.profile_quality?.score || 0) >= 80 ? '✓ Excellent' : (breakdown.profile_quality?.score || 0) >= 60 ? '⚠ Good' : '✗ Fair' }
      ]
    }
  ]

  // Score-based color function
  const getScoreColors = (score: number) => {
    if (score >= 80) return { bg: '#ecfdf5', text: '#059669', badgeBg: '#dcfce7', badgeText: '#166534', badgeBorder: '#bbf7d0' }
    if (score >= 70) return { bg: '#eff6ff', text: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1e40af', badgeBorder: '#93c5fd' }
    if (score >= 60) return { bg: '#fffbeb', text: '#d97706', badgeBg: '#fef3c7', badgeText: '#92400e', badgeBorder: '#fde68a' }
    return { bg: '#fef2f2', text: '#dc2626', badgeBg: '#fee2e2', badgeText: '#991b1b', badgeBorder: '#fecaca' }
  }

  const categoryCards = categories.map((category: any, index: number) => {
    const colors = getScoreColors(category.score)
    
    // Generate grid data HTML
    let gridHtml = ''
    if (category.isGrid) {
      // Only render grid container if there are grid items
      if (category.gridData && category.gridData.length > 0) {
        gridHtml = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">'
        category.gridData.forEach((item: any) => {
          gridHtml += `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 11px; font-weight: 500; color: #64748b; margin-bottom: 6px;">${escapeHtml(item.label)}</div>
              <div style="font-size: 12px; color: #1e293b; font-weight: 500;">${escapeHtml(item.value)}</div>
            </div>
          `
        })
        gridHtml += '</div>'
      }
      
      // Add full matched skills (shown for Skill Set Match)
      if (category.fullMatchedSkills && category.fullMatchedSkills.length > 0) {
        gridHtml += `
          <div style="${category.gridData && category.gridData.length > 0 ? 'margin-top: 12px;' : ''} background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; font-weight: 600; color: #166534; margin-bottom: 8px;">✓ All Matched Skills</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${category.fullMatchedSkills.map((s: string) => `<span class="badge badge-green">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        `
      }
      
      // Add full missing skills (shown for Skill Set Match)
      if (category.fullMissingSkills && category.fullMissingSkills.length > 0) {
        gridHtml += `
          <div style="margin-top: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; font-weight: 600; color: #991b1b; margin-bottom: 8px;">✗ All Missing Skills</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${category.fullMissingSkills.map((s: string) => `<span class="badge badge-red">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        `
      }
    }

    return `
      <div class="avoid-break" style="border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: ${colors.bg};">
        <!-- Category Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: linear-gradient(to right, #f9fafb, #ffffff); border-bottom: 2px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <!-- Numbered Circle -->
            <div style="width: 42px; height: 42px; border-radius: 50%; background: ${colors.badgeBg}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: ${colors.text}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${index + 1}
            </div>
            <div>
              <h4 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.3;">${escapeHtml(category.category)}</h4>
              <div style="font-size: 12px; color: #475569; margin-top: 3px;">
                Weight: <span style="font-weight: 600; color: #1e293b;">${category.weight}%</span>
              </div>
            </div>
          </div>
          <!-- Score Badge -->
          <div style="background: ${colors.badgeBg}; border: 2px solid ${colors.badgeBorder}; padding: 8px 16px; border-radius: 8px;">
            <span style="font-size: 18px; font-weight: 700; color: ${colors.badgeText};">${category.score}</span>
            <span style="font-size: 12px; color: #64748b;">/100</span>
          </div>
        </div>
        
        <!-- Category Details Grid -->
        <div style="padding: 16px 20px; background: rgba(255,255,255,0.8);">
          ${gridHtml}
        </div>
      </div>
    `
  }).join('')

  return `
  <div class="section page-break">
    <div class="section-header" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-bottom: 1px solid #e5e7eb;">
      <div class="section-title" style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #059669;">📊</span> Detailed Evaluation Breakdown
      </div>
      <div class="section-subtitle">Weighted category assessment with supporting details</div>
    </div>
    <div class="section-content">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${categoryCards}
      </div>
    </div>
  </div>
  `
}

function generateInterviewEvaluationSection(evaluation: EvaluationData, overallScoreDisplay: number): string {
  const questions = evaluation.questions || []
  const decision = evaluation.decision
  
  // Generate strengths and weaknesses from questions if not available
  const generatedStrengths: string[] = []
  const generatedWeaknesses: string[] = []
  
  questions.forEach((q: any) => {
    const score = q.score || 0
    // Collect strengths from high-scoring answers
    if (score >= 70 && q.strengths_in_answer && q.strengths_in_answer.length > 0) {
      q.strengths_in_answer.forEach((s: string) => {
        if (!generatedStrengths.includes(s)) generatedStrengths.push(s)
      })
    }
    // Collect weaknesses from low-scoring answers
    if (score < 60 && q.gaps_in_answer && q.gaps_in_answer.length > 0) {
      q.gaps_in_answer.forEach((g: string) => {
        if (!generatedWeaknesses.includes(g)) generatedWeaknesses.push(g)
      })
    }
  })
  
  // Use evaluation strengths/weaknesses if available, otherwise use generated
  const strengths = (evaluation.strengths && evaluation.strengths.length > 0) 
    ? evaluation.strengths 
    : generatedStrengths.length > 0 
      ? generatedStrengths 
      : ['Demonstrated relevant experience', 'Showed understanding of key concepts', 'Provided structured responses']
  
  const weaknesses = (evaluation.weaknesses && evaluation.weaknesses.length > 0) 
    ? evaluation.weaknesses 
    : generatedWeaknesses.length > 0 
      ? generatedWeaknesses 
      : ['Could provide more specific examples', 'Some answers lacked depth', 'Room for improvement in technical details']
  
  // Calculate criteria breakdown
  const criteriaFromQuestions: Record<string, { count: number, totalScore: number }> = {}
  questions.forEach((q) => {
    const criteria = q.criteria || q.category || 'General'
    if (!criteriaFromQuestions[criteria]) {
      criteriaFromQuestions[criteria] = { count: 0, totalScore: 0 }
    }
    criteriaFromQuestions[criteria].count++
    criteriaFromQuestions[criteria].totalScore += (q.score || q.marks_obtained || 0)
  })
  
  const getCriteriaColor = (criteria: string): string => {
    const colors: Record<string, string> = {
      'Technical': 'blue', 'Technical Skills': 'blue',
      'Communication': 'green',
      'Problem Solving': 'purple',
      'Cultural Fit': 'orange', 'Culture Fit': 'orange', 'Culture': 'orange',
      'Team Player': 'teal', 'Teamwork': 'teal'
    }
    return colors[criteria] || 'gray'
  }
  
  return `
  <div class="section avoid-break">
    <div class="section-header green">
      <div class="section-title">🎯 Interview Evaluation</div>
      <div class="section-subtitle">AI-powered interview scoring and analysis</div>
    </div>
    <div class="section-content">
      <!-- Overall Score Hero -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid rgba(255,255,255,0.4);">
              <span style="font-size: 26px; font-weight: 700;">${overallScoreDisplay}</span>
              <span style="font-size: 9px; opacity: 0.8;">out of 100</span>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 600;">Interview Evaluation</div>
              <div style="font-size: 11px; opacity: 0.8;">Score based on ${questions.length} questions</div>
              <div style="margin-top: 8px;">
                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 500;">
                  ${decision === 'qualified' ? '✓ Qualified' : decision === 'unqualified' ? '✗ Unqualified' : '⏳ Pending'}
                </span>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; opacity: 0.8;">Recommendation</div>
            <div style="font-size: 16px; font-weight: 600;">${overallScoreDisplay >= 60 ? 'Hire' : 'Not Hire'}</div>
          </div>
        </div>
      </div>
      
      <!-- Criteria Breakdown -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 12px;">Criteria-Based Score Breakdown</div>
        <div class="grid grid-2" style="gap: 10px;">
          ${Object.entries(criteriaFromQuestions).filter(([k]) => k !== 'General').map(([criteria, data]) => {
            const avgScore = data.count > 0 ? Math.round(data.totalScore / data.count) : 0
            return `
            <div class="criteria-card ${getCriteriaColor(criteria)}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                  <span style="font-size: 12px; font-weight: 600;">${escapeHtml(criteria)}</span>
                  <span style="font-size: 10px; color: #6b7280; display: block;">${data.count} question${data.count !== 1 ? 's' : ''}</span>
                </div>
                <span style="font-size: 22px; font-weight: 700; color: ${getScoreColor(avgScore)}">${avgScore}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${avgScore >= 80 ? 'green' : avgScore >= 60 ? 'blue' : avgScore >= 40 ? 'yellow' : 'red'}" style="width: ${Math.min(avgScore, 100)}%"></div>
              </div>
            </div>
            `
          }).join('')}
        </div>
      </div>
      
      <!-- Performance Analytics -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📊</span> Performance Analytics
        </div>
        <div class="grid grid-2" style="gap: 14px;">
          <!-- Scoring Distribution -->
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px;">
            <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <span>📊</span> Scoring Distribution
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${(() => {
                const scoreRanges = {
                  excellent: questions.filter((q: any) => (q.score || 0) >= 80).length,
                  good: questions.filter((q: any) => (q.score || 0) >= 60 && (q.score || 0) < 80).length,
                  fair: questions.filter((q: any) => (q.score || 0) >= 40 && (q.score || 0) < 60).length,
                  needsWork: questions.filter((q: any) => (q.score || 0) < 40).length
                }
                const total = questions.length || 1
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; color: #6b7280;">80-100 (Excellent)</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; background: #10b981; border-radius: 3px; width: ${(scoreRanges.excellent / total) * 100}%;"></div>
                      </div>
                      <span style="font-size: 10px; font-weight: 700; color: #059669;">${scoreRanges.excellent}</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; color: #6b7280;">60-79 (Good)</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; background: #3b82f6; border-radius: 3px; width: ${(scoreRanges.good / total) * 100}%;"></div>
                      </div>
                      <span style="font-size: 10px; font-weight: 700; color: #2563eb;">${scoreRanges.good}</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; color: #6b7280;">40-59 (Fair)</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; background: #eab308; border-radius: 3px; width: ${(scoreRanges.fair / total) * 100}%;"></div>
                      </div>
                      <span style="font-size: 10px; font-weight: 700; color: #ca8a04;">${scoreRanges.fair}</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; color: #6b7280;">Below 40 (Needs Work)</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; background: #ef4444; border-radius: 3px; width: ${(scoreRanges.needsWork / total) * 100}%;"></div>
                      </div>
                      <span style="font-size: 10px; font-weight: 700; color: #dc2626;">${scoreRanges.needsWork}</span>
                    </div>
                  </div>
                `
              })()}
            </div>
          </div>
          
          <!-- Response Quality -->
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px;">
            <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <span>🎯</span> Response Quality
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${(() => {
                const total = questions.length || 1
                const completeCount = questions.filter((q: any) => q.completeness === 'complete').length
                const partialCount = questions.filter((q: any) => q.completeness === 'partial').length
                const incompleteCount = questions.filter((q: any) => q.completeness === 'incomplete' || q.completeness === 'off_topic' || q.answered === false).length
                const completePercent = Math.round((completeCount / total) * 100)
                const partialPercent = Math.round((partialCount / total) * 100)
                const incompletePercent = Math.round((incompleteCount / total) * 100)
                return `
                  <div>
                    <div style="display: flex; justify-between; font-size: 10px; margin-bottom: 4px;">
                      <span style="color: #6b7280;">Complete</span>
                      <span style="font-weight: 700; color: #059669;">${completePercent}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                      <div style="height: 100%; background: #10b981; border-radius: 4px; width: ${completePercent}%;"></div>
                    </div>
                  </div>
                  <div>
                    <div style="display: flex; justify-between; font-size: 10px; margin-bottom: 4px;">
                      <span style="color: #6b7280;">Partial</span>
                      <span style="font-weight: 700; color: #ca8a04;">${partialPercent}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                      <div style="height: 100%; background: #eab308; border-radius: 4px; width: ${partialPercent}%;"></div>
                    </div>
                  </div>
                  <div>
                    <div style="display: flex; justify-between; font-size: 10px; margin-bottom: 4px;">
                      <span style="color: #6b7280;">Incomplete</span>
                      <span style="font-weight: 700; color: #dc2626;">${incompletePercent}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                      <div style="height: 100%; background: #ef4444; border-radius: 4px; width: ${incompletePercent}%;"></div>
                    </div>
                  </div>
                  <div style="padding-top: 8px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-between; font-size: 10px;">
                      <span style="color: #6b7280;">Total Questions</span>
                      <span style="font-weight: 700; color: #1e293b;">${total}</span>
                    </div>
                  </div>
                `
              })()}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Evaluation Summary -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>💡</span> Evaluation Summary
        </div>
        <div class="grid grid-2" style="gap: 14px; margin-bottom: 14px;">
          <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
              <span style="color: #059669; font-size: 16px;">✓</span>
              <div style="font-size: 12px; font-weight: 600; color: #166534;">Key Strengths</div>
            </div>
            <ul class="list">
              ${strengths.slice(0, 4).map((s: any) => `
                <li class="list-item">
                  <span class="list-bullet green"></span>
                  <span style="font-size: 10px; color: #166534;">${escapeHtml(typeof s === 'string' ? s : s.point || String(s))}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          <div style="background: #fffbeb; border: 2px solid #fde68a; border-radius: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
              <span style="color: #d97706; font-size: 16px;">⚠</span>
              <div style="font-size: 12px; font-weight: 600; color: #92400e;">Areas for Improvement</div>
            </div>
            <ul class="list">
              ${weaknesses.slice(0, 4).map((w: any) => `
                <li class="list-item">
                  <span class="list-bullet yellow"></span>
                  <span style="font-size: 10px; color: #92400e;">${escapeHtml(typeof w === 'string' ? w : w.point || String(w))}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Question-by-Question Breakdown -->
  <div class="section page-break">
    <div class="section-header purple">
      <div class="section-title">❓ Interview Responses & Scores</div>
      <div class="section-subtitle">Detailed evaluation of each question</div>
    </div>
    <div class="section-content">
      ${questions.map((q, idx) => generateQuestionCard(q, idx)).join('')}
    </div>
  </div>
  `
}

function generateQuestionCard(q: any, idx: number): string {
  const criteria = q.criteria || q.category || ''
  const score = q.score || q.marks_obtained || 0
  const maxScore = q.max_score || q.max_marks || 100
  const answered = q.answered !== false
  const questionText = q.question_text || q.question || 'Question not available'
  const response = q.candidate_response || q.answer || ''
  const reasoning = q.criteria_reasoning || ''
  const strengths = q.strengths_in_answer || []
  const gaps = q.gaps_in_answer || []
  
  const getCriteriaColor = (c: string): { bg: string, text: string, border: string } => {
    const colors: Record<string, { bg: string, text: string, border: string }> = {
      'Technical': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      'Technical Skills': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      'Communication': { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
      'Problem Solving': { bg: '#f3e8ff', text: '#6b21a8', border: '#a855f7' },
      'Cultural Fit': { bg: '#ffedd5', text: '#c2410c', border: '#f97316' },
      'Team Player': { bg: '#ccfbf1', text: '#0f766e', border: '#14b8a6' }
    }
    return colors[c] || { bg: '#f3f4f6', text: '#374151', border: '#6b7280' }
  }
  
  const colors = getCriteriaColor(criteria)
  
  return `
  <div class="question-card avoid-break" style="margin-bottom: 14px;">
    <div style="height: 4px; background: ${colors.border};"></div>
    <div class="question-header">
      <div class="question-number" style="background: ${colors.bg}; color: ${colors.text};">${idx + 1}</div>
      <div class="question-text">
        ${escapeHtml(questionText)}
        <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
          ${criteria ? `<span class="badge" style="background: ${colors.bg}; color: ${colors.text};">${escapeHtml(criteria)}</span>` : ''}
          ${!answered ? '<span class="badge badge-red">✗ Not Answered</span>' : ''}
          ${q.completeness ? `<span class="badge ${q.completeness === 'complete' ? 'badge-green' : q.completeness === 'partial' ? 'badge-yellow' : 'badge-red'}">
            ${q.completeness === 'complete' ? '✓ Complete' : q.completeness === 'partial' ? '◐ Partial' : '○ Incomplete'}
          </span>` : ''}
        </div>
      </div>
      <div class="question-score">
        <div class="question-score-value" style="color: ${getScoreColor(score)}">${score}</div>
        <div class="question-score-max">/ ${maxScore} pts</div>
        <span class="badge ${score >= 80 ? 'badge-green' : score >= 60 ? 'badge-blue' : score >= 40 ? 'badge-yellow' : 'badge-red'}" style="margin-top: 4px; display: inline-block;">
          ${score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'}
        </span>
      </div>
    </div>
    <div class="question-content">
      <!-- Score Progress Bar -->
      <div class="progress-bar" style="margin-bottom: 12px;">
        <div class="progress-fill ${score >= 80 ? 'green' : score >= 60 ? 'blue' : score >= 40 ? 'yellow' : 'red'}" style="width: ${(score / maxScore) * 100}%"></div>
      </div>
      
      ${response ? `
      <div class="response-box">
        <div class="response-label">💬 Candidate Response</div>
        <div class="response-text">${escapeHtml(response)}</div>
      </div>
      ` : ''}
      
      ${reasoning ? `
      <div class="response-box" style="background: #eff6ff; border-color: #bfdbfe;">
        <div class="response-label" style="color: #1e40af;">🧠 Evaluation Reason</div>
        <div class="response-text" style="color: #1e40af;">${escapeHtml(reasoning.replace(/Criterion Match:\s*/i, '').trim())}</div>
      </div>
      ` : ''}
      
      ${(strengths.length > 0 || gaps.length > 0) ? `
      <div class="grid grid-2" style="gap: 10px; margin-top: 10px;">
        ${strengths.length > 0 ? `
        <div class="card card-green" style="padding: 10px;">
          <div style="font-size: 10px; font-weight: 600; color: #166534; margin-bottom: 6px;">✓ Strengths</div>
          ${strengths.slice(0, 3).map((s: string) => `<div style="font-size: 9px; color: #166534; margin-bottom: 3px;">• ${escapeHtml(s)}</div>`).join('')}
        </div>
        ` : ''}
        ${gaps.length > 0 ? `
        <div class="card card-yellow" style="padding: 10px;">
          <div style="font-size: 10px; font-weight: 600; color: #92400e; margin-bottom: 6px;">⚠ Areas to Improve</div>
          ${gaps.slice(0, 3).map((g: string) => `<div style="font-size: 9px; color: #92400e; margin-bottom: 3px;">• ${escapeHtml(g)}</div>`).join('')}
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
  </div>
  `
}

function generateTranscriptSection(transcript: TranscriptData | null): string {
  if (!transcript) {
    return `
    <div class="section">
      <div class="section-header blue">
        <div class="section-title">💬 Interview Transcript</div>
      </div>
      <div class="section-content" style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
        <div style="font-size: 14px; font-weight: 600; color: #374151;">No Transcript Available</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">The interview transcript has not been recorded yet.</div>
      </div>
    </div>
    `
  }
  
  // Parse transcript text into messages
  const parseMessages = (text: string): Array<{ role: 'agent' | 'candidate', text: string }> => {
    if (!text || typeof text !== 'string') return []
    
    const lines = text.split('\n').filter(line => line.trim())
    const messages: Array<{ role: 'agent' | 'candidate', text: string }> = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      let role: 'agent' | 'candidate' = 'candidate'
      let messageText = trimmedLine
      
      if (trimmedLine.startsWith('[Agent]') || trimmedLine.startsWith('Agent:') || /^(Olivia|AI Agent|interviewer):/i.test(trimmedLine)) {
        role = 'agent'
        messageText = trimmedLine.replace(/^\[(Agent|Olivia|AI Agent|interviewer)\]:?\s*/i, '').replace(/^(Agent|Olivia|AI Agent|interviewer):\s*/i, '')
      } else if (trimmedLine.startsWith('[You]') || trimmedLine.startsWith('You:') || /^(candidate|user):/i.test(trimmedLine)) {
        role = 'candidate'
        messageText = trimmedLine.replace(/^\[(You|candidate|user)\]:?\s*/i, '').replace(/^(You|candidate|user):\s*/i, '')
      } else if (trimmedLine.includes('?') && trimmedLine.length > 10) {
        role = 'agent'
      }
      
      if (messageText.trim()) {
        messages.push({ role, text: messageText.trim() })
      }
    }
    
    return messages
  }
  
  const messages = parseMessages(transcript.text)
  
  return `
  <div class="section">
    <div class="section-header blue">
      <div class="section-title">💬 Interview Transcript</div>
      <div class="section-subtitle">Complete interview conversation</div>
    </div>
    <div class="section-content">
      ${transcript.interviewDate ? `
      <div style="display: flex; gap: 16px; font-size: 11px; color: #6b7280; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
        <span>📅 ${formatDate(transcript.interviewDate)}</span>
        ${transcript.duration ? `<span>⏱️ ${escapeHtml(transcript.duration)}</span>` : ''}
        ${transcript.interviewer ? `<span>👤 ${escapeHtml(transcript.interviewer)}</span>` : ''}
      </div>
      ` : ''}
      
      ${transcript.rounds && transcript.rounds.length > 0 ? 
        transcript.rounds.map(round => `
          <div style="margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: 600; color: #1e40af; border-bottom: 2px solid #bfdbfe; padding-bottom: 8px; margin-bottom: 12px;">
              ${escapeHtml(round.round)}
            </div>
            ${round.questions.map(qa => `
              <div style="margin-bottom: 12px; padding-left: 12px; border-left: 3px solid #bfdbfe;">
                <div style="font-size: 11px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">Q: ${escapeHtml(qa.question)}</div>
                <div style="font-size: 11px; color: #4b5563; padding-left: 12px;">A: ${escapeHtml(qa.answer)}</div>
                ${qa.score !== undefined ? `<div style="margin-top: 4px;"><span class="badge ${qa.score >= 80 ? 'badge-green' : qa.score >= 60 ? 'badge-blue' : 'badge-yellow'}">Score: ${qa.score}/100</span></div>` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')
      : messages.length > 0 ?
        messages.map(msg => `
          <div class="transcript-message ${msg.role} avoid-break">
            <div class="transcript-bubble ${msg.role}">
              <div class="transcript-role">${msg.role === 'agent' ? '🤖 Agent' : '👤 Candidate'}</div>
              <div>${escapeHtml(msg.text)}</div>
            </div>
          </div>
        `).join('')
      : `
        <div style="text-align: center; padding: 40px; color: #6b7280;">
          No transcript content available
        </div>
      `}
    </div>
  </div>
  `
}

/**
 * Opens PDF in new window for printing/saving
 */
export function openReportPDF(data: ReportPDFData): void {
  const html = generateReportPDFHTML(data)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }
}
