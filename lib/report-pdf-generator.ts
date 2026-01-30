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
  overall?: { score_percent?: number; reason_summary?: string }
  extracted?: {
    name?: string
    email?: string
    phone?: string
    location?: string
    total_experience_years_estimate?: number
    skills?: string[]
    education?: Array<{ institution?: string; degree?: string }>
    work_experience?: Array<{ company: string; title: string; duration: string; start_date?: string; end_date?: string }>
    recent_projects?: Array<{ title?: string; duration?: string; technologies?: string[] }>
    certifications?: Array<{ name?: string; status?: string }>
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
  // New fields for Production & Tenure
  production_exposure?: {
    has_prod_experience?: boolean
    evidence?: string[]
  }
  tenure_analysis?: {
    average_tenure_months?: number
    job_hopping_risk?: string
  }
}

export interface RiskAdjustments {
  critical_gaps?: string[]
  risk_flags?: string[]
  score_cap_applied?: number | null
}

export interface ExplainableScore {
  skill_contribution?: number
  project_contribution?: number
  experience_contribution?: number
  edu_certs_contribution?: number
  location_contribution?: number
  quality_contribution?: number
}

export interface EligibilityData {
  domain_fit?: string
  must_have_fit?: string
  experience_fit?: string
  language_fit?: string
  fail_reasons?: string[]
  missing_must_have?: string[]
}

// New ReportData interface matching the UI layout
export interface ReportDataHeader {
  candidateName: string
  position: string
  recommendation: string
  overallScore: number
  reportDate: string
  expectedSalary: string
  experience: string
  resumeUrl?: string
}

export interface ReportDataProfileSnapshot {
  name: string
  expectedSalary: string
  availability: string
  classification: string
  education: string
  employerHistory: string
  locationPreference: string
}

export interface ReportDataSkillsAlignment {
  area: string
  score: string
  points: string
  details: string
}

export interface ReportDataCertificationsAndProjects {
  certifications: string[]
  projects: Array<{
    title: string
    company: string
    year: string
    description?: string
    technologies?: string[]
  }>
}

export interface ReportDataRecommendation {
  decision: string
  strengths: string
  gaps: string
  nextSteps: string[]
}

export interface ReportData {
  header: ReportDataHeader
  profileSnapshot: ReportDataProfileSnapshot
  skillsAlignment: ReportDataSkillsAlignment[]
  certificationsAndProjects: ReportDataCertificationsAndProjects
  recommendation: ReportDataRecommendation
}

export interface ReportPDFData {
  candidate: CandidateData
  evaluation: EvaluationData | null
  transcript: TranscriptData | null
  jobTitle: string
  resumeScore: number
  qualificationDetails: QualificationDetails | null
  interviewScore?: number
  verificationPhotos?: {
    appliedPhoto: string | null
    preInterviewPhoto: string | null
    postInterviewPhoto: string | null
  }
  // New props to match React component
  totalScore?: number
  explainableScore?: ExplainableScore | null
  riskAdjustments?: RiskAdjustments | null
  missingMustHave?: string[]
  eligibility?: EligibilityData | null
  candidateLocation?: string | null
  extractedData?: {
    skills?: string[]
    languages?: any[]
    total_experience_years_estimate?: number
  } | null
  experienceRequired?: string
  // NEW: ReportData from UI
  reportData?: ReportData | null
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
  const { 
    candidate, 
    evaluation, 
    transcript, 
    jobTitle, 
    resumeScore, 
    qualificationDetails, 
    interviewScore, 
    verificationPhotos,
    // New props matching React component
    totalScore,
    explainableScore,
    riskAdjustments,
    missingMustHave,
    eligibility,
    candidateLocation,
    extractedData,
    experienceRequired,
    // NEW: ReportData from UI
    reportData
  } = data
  
  const overallScore = evaluation?.overallScore ?? 0
  const overallScoreDisplay = overallScore <= 10 ? Math.round(overallScore * 10) : Math.round(overallScore)
  
  // If reportData is available, use new 3-page layout
  if (reportData) {
    return generateNewLayoutPDF(data, reportData, overallScoreDisplay)
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(candidate.name)} - Evaluation Report</title>
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
    
    /* Page numbering when printing */
    @page {
      margin: 0.5in;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #9ca3af;
      }
      @top-center {
        content: "";
      }
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
  
  <!-- VERIFICATION PHOTOS SECTION - Matching UI exactly -->
  <div class="section avoid-break" style="margin-top: 16px;">
    <div class="section-header" style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-bottom: 1px solid #e9d5ff;">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        <span>📷</span> Verification Photos
      </div>
      <div class="section-subtitle">Identity verification photos captured during the application process</div>
    </div>
    <div class="section-content">
      <div style="display: flex; justify-content: center; gap: 50px; padding: 20px 0;">
        <!-- Applied Photo -->
        <div style="text-align: center;">
          <div style="width: 90px; height: 90px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 4px solid #a78bfa; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
            ${verificationPhotos?.appliedPhoto 
              ? `<img src="${verificationPhotos.appliedPhoto}" alt="Applied Photo" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />`
              : `<span style="color: #a78bfa; font-size: 28px;">👤</span>`
            }
          </div>
          <p style="font-size: 11px; font-weight: 600; color: #7c3aed;">Applied Photo</p>
        </div>
        
        <!-- Pre-Interview Photo -->
        <div style="text-align: center;">
          <div style="width: 90px; height: 90px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 4px solid #94a3b8; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center;">
            ${verificationPhotos?.preInterviewPhoto 
              ? `<img src="${verificationPhotos.preInterviewPhoto}" alt="Pre-Interview Photo" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />`
              : `<span style="color: #94a3b8; font-size: 28px;">📷</span>`
            }
          </div>
          <p style="font-size: 11px; font-weight: 600; color: #64748b;">Pre-Interview</p>
        </div>
        
        <!-- Post-Interview Photo -->
        <div style="text-align: center;">
          <div style="width: 90px; height: 90px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 4px solid #94a3b8; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center;">
            ${verificationPhotos?.postInterviewPhoto 
              ? `<img src="${verificationPhotos.postInterviewPhoto}" alt="Post-Interview Photo" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />`
              : `<span style="color: #94a3b8; font-size: 28px;">📷</span>`
            }
          </div>
          <p style="font-size: 11px; font-weight: 600; color: #64748b;">Post-Interview</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- SECTION 2: RESUME EVALUATION -->
  ${qualificationDetails ? generateResumeEvaluationSection(
    resumeScore, 
    qualificationDetails, 
    candidate, 
    jobTitle, 
    interviewScore || 0,
    totalScore,
    explainableScore,
    riskAdjustments,
    missingMustHave,
    eligibility,
    extractedData,
    experienceRequired
  ) : ''}
  
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

function generateResumeEvaluationSection(
  resumeScore: number, 
  qualificationDetails: QualificationDetails, 
  candidate: CandidateData, 
  jobTitle: string, 
  interviewScore: number = 0,
  totalScore?: number,
  explainableScore?: ExplainableScore | null,
  riskAdjustments?: RiskAdjustments | null,
  missingMustHave?: string[],
  eligibility?: EligibilityData | null,
  extractedData?: { skills?: string[]; languages?: any[]; total_experience_years_estimate?: number } | null,
  experienceRequired?: string
): string {
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
  <!-- RESUME EVALUATION REPORT - Separate Card (Matching UI exactly) -->
  <div class="section avoid-break" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 16px;">
    <!-- Header with Icon, Title, and Qualified Badge -->
    <div style="padding: 16px 20px; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-bottom: 1px solid #e9d5ff;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <span style="color: white; font-size: 18px;">📄</span>
          </div>
          <div>
            <h2 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0;">Resume Evaluation Report</h2>
            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Generated on ${new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: ${qualified ? '#059669' : '#dc2626'};">${qualified ? '✓' : '✗'}</span>
          <span style="background: ${qualified ? '#dcfce7' : '#fee2e2'}; color: ${qualified ? '#059669' : '#dc2626'}; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">
            ${qualified ? 'Qualified' : 'Unqualified'}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Candidate Overview Bar with Score Circle -->
    <div style="background: #ffffff; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <!-- Candidate Info with Avatar -->
        <div style="display: flex; align-items: center;">
          <div style="width: 50px; height: 50px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #e2e8f0; margin-right: 12px;">
            <span style="font-size: 24px; color: #64748b;">👤</span>
          </div>
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin: 0;">${escapeHtml(qualificationDetails.extracted?.name || candidate.name)}</h3>
            <div style="display: flex; align-items: center; color: #059669; font-size: 11px; margin-top: 3px;">
              <span style="margin-right: 4px;">💼</span>
              <span>${escapeHtml(jobTitle || 'N/A')}</span>
            </div>
          </div>
        </div>
        
        <!-- Resume Score Label -->
        <div style="text-align: center;">
          <p style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; margin: 0 0 4px 0;">Resume Score</p>
          <div style="display: flex; align-items: baseline; justify-content: center;">
            <span style="margin-right: 4px; color: #94a3b8; font-size: 12px;">📊</span>
            <span style="font-size: 20px; font-weight: 700; color: ${qualified ? '#059669' : '#dc2626'};">${resumeScore}</span>
            <span style="font-size: 11px; color: #94a3b8;">/100</span>
          </div>
        </div>
        
        <!-- Score Circle (Green for Qualified, Red for Unqualified) -->
        <div style="width: 64px; height: 64px; border-radius: 50%; background: conic-gradient(${qualified ? '#059669' : '#dc2626'} ${resumeScore * 3.6}deg, ${qualified ? '#d1fae5' : '#fee2e2'} ${resumeScore * 3.6}deg); display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 18px; font-weight: 700; color: ${qualified ? '#059669' : '#dc2626'};">${resumeScore}</span>
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
  
  <!-- ELIGIBILITY GATES (Matching React component) -->
  ${generateEligibilityGates(eligibility, extractedData, experienceRequired)}
  
  <!-- DETAILED EVALUATION BREAKDOWN (Exact match with candidate page) - Force page break to prevent cutoff -->
  <div style="page-break-before: always;"></div>
  ${generateDetailedEvaluationBreakdown(explainableScore, totalScore)}
  
  <!-- SKILL & GAP ANALYSIS -->
  ${generateSkillGapAnalysis(strengths, gaps, riskAdjustments, missingMustHave, extractedData)}
  
  <!-- PRODUCTION EXPOSURE & TENURE ANALYSIS -->
  ${generateProductionAndTenure(qualificationDetails)}
  
  <!-- RECENT PROJECTS -->
  ${generateRecentProjects(qualificationDetails)}
  
  <!-- CERTIFICATIONS -->
  ${generateCertifications(qualificationDetails)}
  
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

function generateDetailedEvaluationBreakdown(explainableScore?: ExplainableScore | null, totalScore?: number): string {
  // Calculate raw score (sum of all contributions) - EXACTLY like React component
  const rawScore = Math.round(
    (explainableScore?.skill_contribution || 0) +
    (explainableScore?.project_contribution || 0) +
    (explainableScore?.experience_contribution || 0) +
    (explainableScore?.edu_certs_contribution || 0) +
    (explainableScore?.location_contribution || 0) +
    (explainableScore?.quality_contribution || 0)
  )
  // Scale factor to adjust points so they sum to final score
  const finalScore = totalScore ?? rawScore
  const scaleFactor = rawScore > 0 ? finalScore / rawScore : 1
  
  // Adjusted points - EXACTLY like React component
  const skillPts = Math.round((explainableScore?.skill_contribution || 0) * scaleFactor)
  const projectPts = Math.round((explainableScore?.project_contribution || 0) * scaleFactor)
  const expPts = Math.round((explainableScore?.experience_contribution || 0) * scaleFactor)
  const eduPts = Math.round((explainableScore?.edu_certs_contribution || 0) * scaleFactor)
  const locPts = Math.round((explainableScore?.location_contribution || 0) * scaleFactor)
  const qualityPts = Math.round((explainableScore?.quality_contribution || 0) * scaleFactor)

  // Simple 6-category table matching the UI exactly
  const simpleTableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
          <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">#</th>
          <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Category</th>
          <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Weight</th>
          <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Points</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; color: #64748b;">1</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">Skills Match</td>
          <td style="padding: 12px 16px; color: #64748b;">30%</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #3b82f6;">+${skillPts}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; color: #64748b;">2</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">Project Relevance</td>
          <td style="padding: 12px 16px; color: #64748b;">20%</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #6366f1;">+${projectPts}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; color: #64748b;">3</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">Experience Match</td>
          <td style="padding: 12px 16px; color: #64748b;">20%</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #8b5cf6;">+${expPts}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; color: #64748b;">4</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">Education & Certifications</td>
          <td style="padding: 12px 16px; color: #64748b;">15%</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #f59e0b;">+${eduPts}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; color: #64748b;">5</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">Location & Availability</td>
          <td style="padding: 12px 16px; color: #64748b;">10%</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #10b981;">+${locPts}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 16px; color: #64748b;">6</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">Resume Quality</td>
          <td style="padding: 12px 16px; color: #64748b;">5%</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b;">+${qualityPts}</td>
        </tr>
        <tr style="background: #ecfdf5; border-top: 2px solid #a7f3d0;">
          <td style="padding: 12px 16px;"></td>
          <td style="padding: 12px 16px; font-weight: 700; color: #065f46;">Total Score</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #065f46;">100%</td>
          <td style="padding: 12px 16px; font-weight: 700; font-size: 16px; color: #065f46;">${finalScore} / 100</td>
        </tr>
      </tbody>
    </table>
  `

  return `
  <div class="section">
    <div class="section-header" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-bottom: 1px solid #e5e7eb;">
      <div class="section-title" style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #059669;">📊</span> Detailed Evaluation Breakdown
      </div>
      <div class="section-subtitle">Weighted category assessment</div>
    </div>
    <div class="section-content" style="padding: 0;">
      ${simpleTableHtml}
    </div>
  </div>
  `
}

function generateEligibilityGates(
  eligibility?: EligibilityData | null,
  extractedData?: { skills?: string[]; languages?: any[]; total_experience_years_estimate?: number } | null,
  experienceRequired?: string
): string {
  if (!eligibility) return ''
  
  const hasFailures = eligibility.fail_reasons && eligibility.fail_reasons.length > 0
  
  return `
  <div class="section avoid-break">
    <div class="section-header" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-bottom: 1px solid #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="section-title" style="display: flex; align-items: center; gap: 10px;">
          <span style="color: #6366f1;">🎯</span> Eligibility Gates
        </div>
        <span style="padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${hasFailures ? '#fee2e2' : '#dcfce7'}; color: ${hasFailures ? '#991b1b' : '#166534'};">
          ${hasFailures ? 'Gates Failed' : 'All Gates Passed'}
        </span>
      </div>
    </div>
    <div class="section-content" style="padding: 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569; width: 25%;">Gate</th>
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569; width: 15%;">Status</th>
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 16px; color: #1e293b;">Domain Fit</td>
            <td style="padding: 12px 16px;">
              <span style="font-weight: 600; color: ${eligibility.domain_fit === 'PASS' ? '#059669' : '#dc2626'};">
                ${eligibility.domain_fit || 'N/A'}
              </span>
            </td>
            <td style="padding: 12px 16px; color: #64748b;">
              ${eligibility.domain_fit === 'PASS' 
                ? 'Relevant platforms detected from resume'
                : 'Required domain platforms not found'}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 16px; color: #1e293b;">Must-Have Skills</td>
            <td style="padding: 12px 16px;">
              <span style="font-weight: 600; color: ${eligibility.must_have_fit === 'PASS' ? '#059669' : '#dc2626'};">
                ${eligibility.must_have_fit || 'N/A'}
              </span>
            </td>
            <td style="padding: 12px 16px; color: #64748b;">
              ${eligibility.must_have_fit === 'PASS' 
                ? 'All critical skills present' 
                : `Missing: ${eligibility.missing_must_have?.slice(0, 5).join(', ') || 'critical skills'}`}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 16px; color: #1e293b;">Experience Fit</td>
            <td style="padding: 12px 16px;">
              <span style="font-weight: 600; color: ${eligibility.experience_fit === 'PASS' ? '#059669' : '#dc2626'};">
                ${eligibility.experience_fit || 'N/A'}
              </span>
            </td>
            <td style="padding: 12px 16px; color: #64748b;">
              ${extractedData?.total_experience_years_estimate 
                ? `${extractedData.total_experience_years_estimate} years vs required ${experienceRequired || '3+'} years`
                : eligibility.experience_fit === 'PASS' 
                  ? 'Experience meets requirements' 
                  : 'Experience below requirement'}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 16px; color: #1e293b;">Language Fit</td>
            <td style="padding: 12px 16px;">
              <span style="font-weight: 600; color: ${eligibility.language_fit === 'PASS' ? '#059669' : '#f59e0b'};">
                ${eligibility.language_fit || 'N/A'}
              </span>
            </td>
            <td style="padding: 12px 16px; color: #64748b;">
              ${eligibility.language_fit === 'PASS' 
                ? `${(extractedData?.languages || []).map((l: any) => l.language || l).slice(0, 2).join(', ') || 'English'} present`
                : 'Required language not found'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `
}

function generateSkillGapAnalysis(
  strengths: string[], 
  gaps: string[], 
  riskAdjustments?: RiskAdjustments | null,
  missingMustHave?: string[],
  extractedData?: { skills?: string[]; languages?: any[]; total_experience_years_estimate?: number } | null
): string {
  // Get matched skills - use strengths, fallback to extractedData skills (EXACTLY like React component)
  const matchedSkills = strengths.length > 0 ? strengths : (extractedData?.skills || [])
  
  return `
  <div class="section avoid-break">
    <div class="section-header" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-bottom: 1px solid #e5e7eb;">
      <div class="section-title" style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #059669;">💡</span> Skill & Gap Analysis
      </div>
      <div class="section-subtitle">Matched skills and gaps from candidate assessment</div>
    </div>
    <div class="section-content">
      <!-- Matched Skills Section -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 8px 12px; background: #f0fdf4; border-radius: 6px;">
          <span style="color: #059669;">✓</span>
          <span style="font-size: 12px; font-weight: 600; color: #166534;">Matched Skills</span>
        </div>
        ${matchedSkills.length > 0 ? `
          <p style="font-size: 11px; color: #374151; margin-bottom: 12px; line-height: 1.5;">
            The candidate demonstrates proficiency in ${matchedSkills.slice(0, 5).join(', ')}${matchedSkills.length > 5 ? ` and ${matchedSkills.length - 5} more skills` : ''}.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${matchedSkills.map((skill: string) => `
              <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; background: #dcfce7; color: #166534; font-size: 10px; font-weight: 500;">
                ✓ ${escapeHtml(skill)}
              </span>
            `).join('')}
          </div>
        ` : `
          <p style="font-size: 11px; color: #6b7280;">No matched skills identified.</p>
        `}
      </div>
      
      <!-- Gaps Section -->
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 8px 12px; background: #fffbeb; border-radius: 6px;">
          <span style="color: #d97706;">⚠</span>
          <span style="font-size: 12px; font-weight: 600; color: #92400e;">Gaps</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0;">
          <!-- Original gaps -->
          ${gaps.map((gap: string) => `
            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: #d97706; font-size: 10px;">✗</span>
              </div>
              <span style="font-size: 11px; color: #64748b;">${escapeHtml(gap)}</span>
            </div>
          `).join('')}
          
          <!-- Critical gaps from risk analysis -->
          ${(riskAdjustments?.critical_gaps || []).map((gap: string) => `
            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: #fef2f2; border-bottom: 1px solid #fecaca;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: #dc2626; font-size: 10px;">✗</span>
              </div>
              <span style="font-size: 11px; color: #991b1b;">${escapeHtml(gap)}</span>
            </div>
          `).join('')}
          
          <!-- Risk flags -->
          ${(riskAdjustments?.risk_flags || []).map((flag: string) => `
            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: #fffbeb; border-bottom: 1px solid #fde68a;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: #d97706; font-size: 10px;">⚠</span>
              </div>
              <span style="font-size: 11px; color: #92400e;">${escapeHtml(flag)}</span>
            </div>
          `).join('')}
          
          <!-- Missing must-have skills -->
          ${missingMustHave && missingMustHave.length > 0 ? `
            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: #fff7ed; border-bottom: 1px solid #fed7aa;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #ffedd5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: #ea580c; font-size: 10px;">✗</span>
              </div>
              <span style="font-size: 11px; color: #c2410c;">Missing skills: ${missingMustHave.join(', ')}</span>
            </div>
          ` : ''}
          
          ${gaps.length === 0 && (!riskAdjustments?.critical_gaps || riskAdjustments.critical_gaps.length === 0) && (!riskAdjustments?.risk_flags || riskAdjustments.risk_flags.length === 0) && (!missingMustHave || missingMustHave.length === 0) ? `
            <p style="font-size: 11px; color: #6b7280; padding: 12px 16px;">No significant gaps identified.</p>
          ` : ''}
        </div>
        
      </div>
    </div>
  </div>
  `
}

function generateProductionAndTenure(qualificationDetails: QualificationDetails): string {
  const production = qualificationDetails.production_exposure
  const tenure = qualificationDetails.tenure_analysis
  
  if (!production && !tenure) return ''
  
  return `
  <div class="section avoid-break">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      ${production ? `
      <!-- Production Experience -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="padding: 12px 16px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-bottom: 1px solid #bfdbfe;">
          <div style="font-size: 13px; font-weight: 600; color: #1e40af; display: flex; align-items: center; gap: 8px;">
            💼 Production Experience
          </div>
        </div>
        <div style="padding: 16px;">
          <div style="padding: 12px; border-radius: 8px; border: 2px solid ${production.has_prod_experience ? '#a7f3d0' : '#fde68a'}; background: ${production.has_prod_experience ? '#ecfdf5' : '#fffbeb'};">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 24px;">${production.has_prod_experience ? '✓' : '⚠'}</span>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: ${production.has_prod_experience ? '#166534' : '#92400e'};">
                  ${production.has_prod_experience ? 'Has Production Experience' : 'No Production Experience'}
                </div>
                <div style="font-size: 10px; color: ${production.has_prod_experience ? '#15803d' : '#b45309'};">
                  ${production.has_prod_experience ? 'Candidate has worked in live/production environments' : 'No evidence of production deployment experience'}
                </div>
              </div>
            </div>
          </div>
          ${production.evidence && production.evidence.length > 0 ? `
            <div style="margin-top: 12px;">
              <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">Evidence</div>
              <ul style="margin: 0; padding-left: 16px;">
                ${production.evidence.map(e => `<li style="font-size: 10px; color: #64748b; margin-bottom: 4px;">${escapeHtml(e)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      ${tenure ? `
      <!-- Tenure Analysis -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="padding: 12px 16px; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-bottom: 1px solid #e9d5ff;">
          <div style="font-size: 13px; font-weight: 600; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
            ⏱️ Tenure Stability
          </div>
        </div>
        <div style="padding: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 700; color: #1e293b;">
                ${tenure.average_tenure_months ?? '—'}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Avg. Tenure (months)</div>
            </div>
            <div style="text-align: center; padding: 12px; border-radius: 8px; background: ${tenure.job_hopping_risk === 'Low' ? '#ecfdf5' : tenure.job_hopping_risk === 'Medium' ? '#fffbeb' : '#fef2f2'};">
              <div style="font-size: 16px; font-weight: 700; color: ${tenure.job_hopping_risk === 'Low' ? '#059669' : tenure.job_hopping_risk === 'Medium' ? '#d97706' : '#dc2626'};">
                ${tenure.job_hopping_risk || 'Unknown'}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Job Hopping Risk</div>
            </div>
          </div>
          <div style="margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
            <div style="font-size: 10px; color: #64748b;">
              ${tenure.job_hopping_risk === 'Low' 
                ? '✓ Candidate shows good job stability with consistent tenure.' 
                : tenure.job_hopping_risk === 'Medium'
                ? '⚠ Moderate tenure - some job changes but within acceptable range.'
                : '⚠ High turnover pattern detected - may need discussion during interview.'}
            </div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  </div>
  `
}

function generateRecentProjects(qualificationDetails: QualificationDetails): string {
  const projects = qualificationDetails.extracted?.recent_projects
  if (!projects || projects.length === 0) return ''
  
  return `
  <div class="section avoid-break">
    <div class="section-header" style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-bottom: 1px solid #c7d2fe;">
      <div class="section-title" style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #4f46e5;">💼</span> Recent Projects
      </div>
    </div>
    <div class="section-content" style="padding: 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Project</th>
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Duration</th>
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Technologies</th>
          </tr>
        </thead>
        <tbody>
          ${projects.map(project => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #1e293b;">${escapeHtml(project.title || 'N/A')}</td>
              <td style="padding: 12px 16px; color: #64748b;">${escapeHtml(project.duration || 'N/A')}</td>
              <td style="padding: 12px 16px; color: #64748b;">${(project.technologies || []).join(', ') || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  `
}

function generateCertifications(qualificationDetails: QualificationDetails): string {
  const certs = qualificationDetails.extracted?.certifications
  if (!certs || certs.length === 0) return ''
  
  return `
  <div class="section avoid-break">
    <div class="section-header" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-bottom: 1px solid #fde68a;">
      <div class="section-title" style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #d97706;">🏆</span> Certifications
      </div>
    </div>
    <div class="section-content" style="padding: 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Name</th>
            <th style="text-align: left; padding: 12px 16px; font-weight: 600; color: #475569;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${certs.map(cert => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 16px; color: #1e293b;">${escapeHtml(cert.name || 'N/A')}</td>
              <td style="padding: 12px 16px;">
                <span style="font-weight: 600; color: ${cert.status === 'issued' ? '#059669' : '#d97706'};">
                  ${cert.status === 'issued' ? 'Issued' : 'Pursuing'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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
  
  // Collect criteria-based performance
  const criteriaScores: Record<string, { total: number, count: number }> = {}
  
  questions.forEach((q: any) => {
    const score = q.score || 0
    const criteria = q.criteria || q.category || 'General'
    
    // Track criteria scores
    if (!criteriaScores[criteria]) {
      criteriaScores[criteria] = { total: 0, count: 0 }
    }
    criteriaScores[criteria].total += score
    criteriaScores[criteria].count += 1
    
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
  
  // Generate additional strengths based on criteria performance
  Object.entries(criteriaScores).forEach(([criteria, data]) => {
    const avgScore = data.total / data.count
    if (avgScore >= 70 && criteria !== 'General') {
      const strengthText = `Strong performance in ${criteria} (${Math.round(avgScore)}% avg)`
      if (!generatedStrengths.some(s => s.includes(criteria))) {
        generatedStrengths.push(strengthText)
      }
    }
    if (avgScore < 50 && criteria !== 'General') {
      const weaknessText = `Needs improvement in ${criteria} (${Math.round(avgScore)}% avg)`
      if (!generatedWeaknesses.some(w => w.includes(criteria))) {
        generatedWeaknesses.push(weaknessText)
      }
    }
  })
  
  // Add overall performance-based strengths
  if (overallScoreDisplay >= 70) {
    if (!generatedStrengths.some(s => s.toLowerCase().includes('overall'))) {
      generatedStrengths.push('Demonstrated strong overall interview performance')
    }
  }
  
  const answeredCount = questions.filter((q: any) => q.answered !== false).length
  const totalQuestions = questions.length
  if (answeredCount === totalQuestions && totalQuestions > 0) {
    if (!generatedStrengths.some(s => s.toLowerCase().includes('all questions'))) {
      generatedStrengths.push('Successfully answered all interview questions')
    }
  }
  
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
 * Generate transcript section for new PDF layout
 */
function generateTranscriptSectionNew(transcript: TranscriptData | null): string {
  if (!transcript || !transcript.text) {
    return `
    <div style="text-align: center; padding: 60px 40px; background: #f8fafc; border-radius: 12px;">
      <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
      <div style="font-size: 16px; font-weight: 600; color: #374151;">No Transcript Available</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">The interview transcript has not been recorded yet.</div>
    </div>
    `
  }
  
  // Header with interview details
  let html = `
  <div style="background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
    <div style="display: flex; gap: 20px; font-size: 11px; color: #64748b;">
      ${transcript.interviewDate ? `<span>📅 ${formatDate(transcript.interviewDate)}</span>` : ''}
      ${transcript.duration ? `<span>⏱️ ${escapeHtml(transcript.duration)}</span>` : ''}
      ${transcript.interviewer ? `<span>👤 ${escapeHtml(transcript.interviewer)}</span>` : ''}
    </div>
  </div>
  `
  
  // Check for rounds format
  if (transcript.rounds && transcript.rounds.length > 0) {
    for (const round of transcript.rounds) {
      html += `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 600; color: #1e40af; border-bottom: 2px solid #bfdbfe; padding-bottom: 8px; margin-bottom: 12px;">
          ${escapeHtml(round.round)}
        </div>
      `
      for (const qa of round.questions) {
        const scoreClass = qa.score !== undefined ? (qa.score >= 70 ? 'high' : qa.score >= 50 ? 'medium' : 'low') : ''
        html += `
        <div style="margin-bottom: 12px; padding-left: 12px; border-left: 3px solid #bfdbfe;">
          <div style="font-size: 11px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">Q: ${escapeHtml(qa.question)}</div>
          <div style="font-size: 11px; color: #4b5563; padding-left: 12px;">A: ${escapeHtml(qa.answer)}</div>
          ${qa.score !== undefined ? `<div style="margin-top: 4px;"><span class="score-badge ${scoreClass}">Score: ${qa.score}/100</span></div>` : ''}
        </div>
        `
      }
      html += `</div>`
    }
    return html
  }
  
  // Parse text-based transcript
  const lines = transcript.text.split('\n').filter(line => line.trim())
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
  
  if (messages.length > 0) {
    for (const msg of messages) {
      html += `
      <div class="transcript-message">
        <div class="transcript-bubble ${msg.role}">
          <div class="transcript-role ${msg.role}">${msg.role === 'agent' ? '🤖 Agent' : '👤 Candidate'}</div>
          <div class="transcript-text">${escapeHtml(msg.text)}</div>
        </div>
      </div>
      `
    }
  } else {
    html += `<div style="text-align: center; padding: 40px; color: #6b7280;">No transcript messages found</div>`
  }
  
  return html
}

/**
 * NEW 3-PAGE PDF LAYOUT
 * Page 1: Resume Evaluation Report
 * Page 2: Interview Evaluation  
 * Page 3: Interview Transcript
 */
function generateNewLayoutPDF(data: ReportPDFData, reportData: ReportData, overallScoreDisplay: number): string {
  const { candidate, evaluation, transcript, jobTitle, resumeScore } = data
  const isQualified = reportData.header.recommendation.includes('RECOMMENDED')
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(candidate.name)} - Evaluation Report</title>
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
      }
      .page-break { page-break-before: always; }
      .avoid-break { page-break-inside: avoid; }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
      padding: 24px;
    }
    
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }
    
    /* Page Title */
    .page-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 3px solid #3b82f6;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    /* Header Card */
    .header-card {
      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .header-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .header-position {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    
    .recommendation-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .recommendation-badge.qualified {
      background: #22c55e;
      color: white;
    }
    
    .recommendation-badge.not-qualified {
      background: #ef4444;
      color: white;
    }
    
    .score-circle {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255,255,255,0.4);
    }
    
    .score-value {
      font-size: 24px;
      font-weight: 700;
    }
    
    .score-label {
      font-size: 9px;
      opacity: 0.8;
    }
    
    /* Section Card */
    .section-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    
    .section-header {
      background: #f8fafc;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
      font-weight: 600;
      color: #1e40af;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-content {
      padding: 0;
    }
    
    /* Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .data-table th,
    .data-table td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .data-table th {
      background: #f1f5f9;
      font-weight: 600;
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
    }
    
    .data-table tr:last-child td {
      border-bottom: none;
    }
    
    .data-table .label-cell {
      background: #f8fafc;
      font-weight: 500;
      color: #64748b;
      width: 30%;
    }
    
    /* Score Badge */
    .score-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .score-badge.high { background: #dcfce7; color: #166534; }
    .score-badge.medium { background: #fef3c7; color: #92400e; }
    .score-badge.low { background: #fee2e2; color: #991b1b; }
    
    /* Points Badge */
    .points-badge {
      font-weight: 700;
      color: #2563eb;
    }
    
    /* Certification Item */
    .cert-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 11px;
    }
    
    .cert-icon {
      color: #22c55e;
    }
    
    /* Project Item */
    .project-item {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .project-item:last-child {
      border-bottom: none;
    }
    
    .project-title {
      font-weight: 600;
      color: #1e293b;
      font-size: 12px;
    }
    
    .project-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    
    .project-desc {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
    }
    
    .tech-badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      margin-right: 4px;
      margin-top: 4px;
    }
    
    /* Recommendation Card */
    .recommendation-card {
      padding: 16px;
      border-radius: 10px;
      margin-top: 16px;
    }
    
    .recommendation-card.qualified {
      background: #f0fdf4;
      border: 2px solid #86efac;
    }
    
    .recommendation-card.not-qualified {
      background: #fef2f2;
      border: 2px solid #fecaca;
    }
    
    .recommendation-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .recommendation-title.qualified { color: #166534; }
    .recommendation-title.not-qualified { color: #991b1b; }
    
    .recommendation-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .recommendation-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .recommendation-label.green { color: #059669; }
    .recommendation-label.orange { color: #ea580c; }
    
    .recommendation-value {
      font-size: 11px;
      color: #374151;
    }
    
    .next-steps {
      margin-top: 10px;
    }
    
    .next-step-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 11px;
      color: #374151;
      padding: 4px 0;
    }
    
    .next-step-arrow {
      color: #3b82f6;
      font-weight: 700;
    }
    
    /* Interview Section */
    .interview-hero {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .interview-score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255,255,255,0.4);
    }
    
    .criteria-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .criteria-card {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
    }
    
    .criteria-card.blue { background: #eff6ff; border-color: #93c5fd; }
    .criteria-card.green { background: #f0fdf4; border-color: #86efac; }
    .criteria-card.purple { background: #faf5ff; border-color: #d8b4fe; }
    .criteria-card.orange { background: #fff7ed; border-color: #fdba74; }
    
    .criteria-name {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
    }
    
    .criteria-score {
      font-size: 20px;
      font-weight: 700;
    }
    
    .progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 3px;
    }
    
    .progress-fill.green { background: #22c55e; }
    .progress-fill.blue { background: #3b82f6; }
    .progress-fill.yellow { background: #eab308; }
    .progress-fill.red { background: #ef4444; }
    
    /* Q&A Section */
    .qa-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    
    .qa-header {
      background: #f8fafc;
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .qa-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      margin-right: 10px;
      flex-shrink: 0;
    }
    
    .qa-question {
      font-size: 11px;
      font-weight: 500;
      color: #1e293b;
      flex: 1;
    }
    
    .qa-score {
      text-align: right;
    }
    
    .qa-score-value {
      font-size: 18px;
      font-weight: 700;
    }
    
    .qa-score-max {
      font-size: 9px;
      color: #64748b;
    }
    
    .qa-content {
      padding: 12px 14px;
    }
    
    .qa-response {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
    }
    
    .qa-response-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 6px;
    }
    
    .qa-response-text {
      font-size: 11px;
      color: #374151;
    }
    
    /* Transcript Section */
    .transcript-message {
      margin-bottom: 10px;
    }
    
    .transcript-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 85%;
    }
    
    .transcript-bubble.agent {
      background: #f1f5f9;
      margin-right: auto;
      border-bottom-left-radius: 4px;
    }
    
    .transcript-bubble.candidate {
      background: #dbeafe;
      margin-left: auto;
      border-bottom-right-radius: 4px;
    }
    
    .transcript-role {
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .transcript-role.agent { color: #64748b; }
    .transcript-role.candidate { color: #1e40af; }
    
    .transcript-text {
      font-size: 11px;
      color: #1e293b;
    }
    
    /* Footer */
    .pdf-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

<!-- ==================== PAGE 1: RESUME EVALUATION REPORT ==================== -->
<div class="page-title">📄 Resume Evaluation Report</div>

<!-- Header Card -->
<div class="header-card">
  <div class="header-top">
    <div>
      <div class="header-name">${escapeHtml(reportData.header.candidateName)}</div>
      <div class="header-position">${escapeHtml(reportData.header.position)}</div>
      <span class="recommendation-badge ${isQualified ? 'qualified' : 'not-qualified'}">
        ${escapeHtml(reportData.header.recommendation)}
      </span>
    </div>
    <div class="score-circle">
      <div class="score-value">${reportData.header.overallScore}</div>
      <div class="score-label">/ 100</div>
    </div>
  </div>
</div>

<!-- Profile Snapshot -->
<div class="section-card avoid-break">
  <div class="section-header">👤 Candidate Profile Snapshot</div>
  <div class="section-content">
    <table class="data-table">
      <tbody>
        <tr>
          <td class="label-cell">Name</td>
          <td>${escapeHtml(reportData.profileSnapshot.name) || '—'}</td>
        </tr>
        <tr>
          <td class="label-cell">Expected Salary</td>
          <td>${escapeHtml(reportData.profileSnapshot.expectedSalary) || '—'}</td>
        </tr>
        <tr>
          <td class="label-cell">Availability</td>
          <td>${reportData.profileSnapshot.availability ? formatDate(reportData.profileSnapshot.availability) : 'Immediately'}</td>
        </tr>
        <tr>
          <td class="label-cell">Classification</td>
          <td><strong>${escapeHtml(reportData.profileSnapshot.classification) || '—'}</strong></td>
        </tr>
        <tr>
          <td class="label-cell">Education</td>
          <td>${escapeHtml(reportData.profileSnapshot.education) || '—'}</td>
        </tr>
        <tr>
          <td class="label-cell">Employer History</td>
          <td>${escapeHtml(reportData.profileSnapshot.employerHistory) || '—'}</td>
        </tr>
        <tr>
          <td class="label-cell">Location</td>
          <td>${escapeHtml(reportData.profileSnapshot.locationPreference) || '—'}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Skills & Experience Alignment -->
<div class="section-card avoid-break">
  <div class="section-header">📊 Skills & Experience Alignment</div>
  <div class="section-content">
    <table class="data-table">
      <thead>
        <tr>
          <th>Area</th>
          <th style="text-align: center;">Score</th>
          <th style="text-align: center;">Points</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${(reportData.skillsAlignment || []).map(item => {
          const scoreNum = parseInt(item.score) || 0
          const scoreClass = scoreNum >= 70 ? 'high' : scoreNum >= 50 ? 'medium' : 'low'
          return `
          <tr>
            <td><strong>${escapeHtml(item.area)}</strong></td>
            <td style="text-align: center;">
              <span class="score-badge ${scoreClass}">${escapeHtml(item.score)}</span>
            </td>
            <td style="text-align: center;">
              <span class="points-badge">${escapeHtml(item.points)}</span>
            </td>
            <td style="font-size: 10px; color: #64748b; white-space: pre-line;">${escapeHtml(item.details)}</td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Certifications & Recent Projects -->
<div class="section-card avoid-break">
  <div class="section-header">🏆 Certifications & Recent Projects</div>
  <div class="section-content" style="padding: 16px;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Certifications -->
      <div>
        <div style="font-weight: 600; color: #374151; margin-bottom: 10px; font-size: 12px;">Certifications</div>
        ${(reportData.certificationsAndProjects?.certifications || []).length > 0 
          ? (reportData.certificationsAndProjects.certifications || []).map(cert => `
            <div class="cert-item">
              <span class="cert-icon">✓</span>
              <span>${escapeHtml(typeof cert === 'string' ? cert : (cert as any)?.name || 'Certification')}</span>
            </div>
          `).join('')
          : '<div style="font-size: 11px; color: #94a3b8;">No certifications listed</div>'
        }
      </div>
      
      <!-- Projects -->
      <div>
        <div style="font-weight: 600; color: #374141; margin-bottom: 10px; font-size: 12px;">Recent Projects</div>
        ${(reportData.certificationsAndProjects?.projects || []).length > 0
          ? (reportData.certificationsAndProjects.projects || []).slice(0, 3).map(p => `
            <div class="project-item">
              <div class="project-title">${escapeHtml(p.title)}</div>
              <div class="project-meta">${escapeHtml(p.company)} • ${escapeHtml(p.year)}</div>
              ${p.description ? `<div class="project-desc">${escapeHtml(p.description)}</div>` : ''}
              ${(p.technologies || []).length > 0 
                ? `<div>${(p.technologies || []).slice(0, 3).map(t => `<span class="tech-badge">${escapeHtml(t)}</span>`).join('')}</div>`
                : ''
              }
            </div>
          `).join('')
          : '<div style="font-size: 11px; color: #94a3b8;">No projects listed</div>'
        }
      </div>
    </div>
  </div>
</div>

<!-- Final Recommendation -->
<div class="recommendation-card ${isQualified ? 'qualified' : 'not-qualified'} avoid-break">
  <div class="recommendation-title ${isQualified ? 'qualified' : 'not-qualified'}">
    ${isQualified ? '✅' : '⚠️'} Recommendation: ${escapeHtml(reportData.recommendation.decision)}
  </div>
  
  <div class="recommendation-grid">
    <div>
      <div class="recommendation-label green">Strengths</div>
      <div class="recommendation-value">${escapeHtml(reportData.recommendation.strengths) || 'None identified'}</div>
    </div>
    <div>
      <div class="recommendation-label orange">Gaps</div>
      <div class="recommendation-value">${escapeHtml(reportData.recommendation.gaps) || 'None identified'}</div>
    </div>
  </div>
  
  <div class="next-steps">
    <div class="recommendation-label" style="color: #374151;">Next Steps</div>
    ${(reportData.recommendation.nextSteps || []).map(step => `
      <div class="next-step-item">
        <span class="next-step-arrow">→</span>
        <span>${escapeHtml(step)}</span>
      </div>
    `).join('')}
  </div>
</div>

<!-- ==================== PAGE 2: INTERVIEW EVALUATION ==================== -->
<div class="page-break"></div>
<div class="page-title">🎤 Interview Evaluation</div>

${evaluation ? `
<!-- Interview Hero -->
<div class="interview-hero">
  <div style="display: flex; align-items: center; gap: 16px;">
    <div class="interview-score-circle">
      <div class="score-value">${overallScoreDisplay}</div>
      <div class="score-label">/ 100</div>
    </div>
    <div>
      <div style="font-size: 18px; font-weight: 600;">Interview Evaluation</div>
      <div style="font-size: 11px; opacity: 0.9;">Score based on ${(evaluation.questions || []).length || 5} questions</div>
      <div style="margin-top: 8px;">
        <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600;">
          ${evaluation.decision === 'qualified' ? '✓ Qualified' : evaluation.decision === 'unqualified' ? '✗ Not Qualified' : '⏳ Pending'}
        </span>
      </div>
    </div>
  </div>
  <div style="text-align: right;">
    <div style="font-size: 10px; opacity: 0.8;">Recommendation</div>
    <div style="font-size: 16px; font-weight: 600;">${overallScoreDisplay >= 60 ? 'Hire' : 'Not Hire'}</div>
  </div>
</div>

<!-- Criteria Breakdown -->
${evaluation.scores ? `
<div style="margin-bottom: 16px;">
  <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 12px;">Criteria-Based Score Breakdown</div>
  <div class="criteria-grid">
    <div class="criteria-card blue">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="criteria-name">Technical Skills</div>
        <div class="criteria-score" style="color: ${getScoreColor(evaluation.scores.technical || 0)}">${evaluation.scores.technical || 0}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${(evaluation.scores.technical || 0) >= 70 ? 'green' : (evaluation.scores.technical || 0) >= 50 ? 'blue' : 'red'}" style="width: ${evaluation.scores.technical || 0}%"></div>
      </div>
    </div>
    <div class="criteria-card green">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="criteria-name">Communication</div>
        <div class="criteria-score" style="color: ${getScoreColor(evaluation.scores.communication || 0)}">${evaluation.scores.communication || 0}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${(evaluation.scores.communication || 0) >= 70 ? 'green' : (evaluation.scores.communication || 0) >= 50 ? 'blue' : 'red'}" style="width: ${evaluation.scores.communication || 0}%"></div>
      </div>
    </div>
    <div class="criteria-card purple">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="criteria-name">Experience</div>
        <div class="criteria-score" style="color: ${getScoreColor(evaluation.scores.experience || 0)}">${evaluation.scores.experience || 0}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${(evaluation.scores.experience || 0) >= 70 ? 'green' : (evaluation.scores.experience || 0) >= 50 ? 'blue' : 'red'}" style="width: ${evaluation.scores.experience || 0}%"></div>
      </div>
    </div>
    <div class="criteria-card orange">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="criteria-name">Cultural Fit</div>
        <div class="criteria-score" style="color: ${getScoreColor(evaluation.scores.cultural_fit || 0)}">${evaluation.scores.cultural_fit || 0}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${(evaluation.scores.cultural_fit || 0) >= 70 ? 'green' : (evaluation.scores.cultural_fit || 0) >= 50 ? 'blue' : 'red'}" style="width: ${evaluation.scores.cultural_fit || 0}%"></div>
      </div>
    </div>
  </div>
</div>
` : ''}

<!-- Q&A Analysis -->
${(evaluation.questions || []).length > 0 ? `
<div style="margin-bottom: 16px;">
  <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 12px;">Q&A Analysis</div>
  ${(evaluation.questions || []).map((q: any, idx: number) => {
    const score = q.score || q.marks_obtained || 0
    const maxScore = q.max_score || q.max_marks || 100
    return `
    <div class="qa-card avoid-break">
      <div class="qa-header">
        <div style="display: flex; align-items: flex-start;">
          <div class="qa-number">${idx + 1}</div>
          <div class="qa-question">${escapeHtml(q.question_text || q.question || 'Question')}</div>
        </div>
        <div class="qa-score">
          <div class="qa-score-value" style="color: ${getScoreColor(score)}">${score}</div>
          <div class="qa-score-max">/ ${maxScore}</div>
        </div>
      </div>
      <div class="qa-content">
        <div class="qa-response">
          <div class="qa-response-label">Candidate Response</div>
          <div class="qa-response-text">${escapeHtml(q.candidate_response || q.answer || 'No response recorded')}</div>
        </div>
        ${q.criteria_reasoning ? `
        <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
          <strong>Analysis:</strong> ${escapeHtml(q.criteria_reasoning)}
        </div>
        ` : ''}
      </div>
    </div>
    `
  }).join('')}
</div>
` : ''}

<!-- Interview Strengths & Weaknesses -->
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 14px;">
    <div style="font-size: 11px; font-weight: 600; color: #166534; margin-bottom: 8px;">💪 Strengths</div>
    ${(evaluation.strengths || []).length > 0 
      ? (evaluation.strengths || []).map(s => `<div style="font-size: 10px; color: #15803d; padding: 3px 0;">• ${escapeHtml(s)}</div>`).join('')
      : '<div style="font-size: 10px; color: #6b7280;">No specific strengths identified</div>'
    }
  </div>
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px;">
    <div style="font-size: 11px; font-weight: 600; color: #991b1b; margin-bottom: 8px;">⚠️ Areas for Improvement</div>
    ${(evaluation.weaknesses || []).length > 0 
      ? (evaluation.weaknesses || []).map(w => `<div style="font-size: 10px; color: #b91c1c; padding: 3px 0;">• ${escapeHtml(w)}</div>`).join('')
      : '<div style="font-size: 10px; color: #6b7280;">No specific weaknesses identified</div>'
    }
  </div>
</div>
` : `
<div style="text-align: center; padding: 60px 40px; background: #f8fafc; border-radius: 12px;">
  <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
  <div style="font-size: 16px; font-weight: 600; color: #374151;">No Interview Evaluation Available</div>
  <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">The interview evaluation has not been completed yet.</div>
</div>
`}

<!-- ==================== PAGE 3: INTERVIEW TRANSCRIPT ==================== -->
<div class="page-break"></div>
<div class="page-title">💬 Interview Transcript</div>

${generateTranscriptSectionNew(transcript)}

<!-- Footer -->
<div class="pdf-footer">
  <div>Generated by HireGenAI • Confidential Candidate Report</div>
  <div style="margin-top: 4px;">${new Date().toISOString()}</div>
</div>

</body>
</html>
`
}

/**
 * Opens PDF in new window for printing/saving
 */
export function openReportPDF(data: ReportPDFData): void {
  const html = generateReportPDFHTML(data)
  const printWindow = window.open()
  
  if (printWindow) {
    // Write HTML to the window
    printWindow.document.write(html)
    printWindow.document.close()
    
    // Set the title for the window
    printWindow.document.title = `${data.candidate.name} - Evaluation Report`
    
    // Auto-trigger print dialog after content loads
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}
