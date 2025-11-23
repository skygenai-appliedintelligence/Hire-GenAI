"use client"

import { CVEvaluationReport } from "@/components/cv-evaluation-report"

const sampleData = {
  candidateName: "Shivdeep Kumar Yadav",
  role: "Robotic Process Automation Developer",
  experience: "4 yrs",
  overallScore: 76,
  qualified: true,
  keyMetrics: {
    skillsMatch: 75,
    domainKnowledge: 70,
    communication: 90,
    problemSolving: 80,
  },
  strengths: [
    "Strong proficiency in Automation Anywhere (90% match)",
    "Excellent SQL and database management skills (85% match)",
    "Recent project experience with RPA tools (last 2 years)",
    "Experience range matches JD requirements (4 years)",
    "Professional CV structure with clear formatting",
    "Relevant Bachelor's degree in Computer Applications",
  ],
  gaps: [
    "Missing critical skills: UiPath, Blue Prism",
    "Missing important skills: Python, C#",
    "No recent projects showing Python usage",
    "Location information not specified in CV",
    "AWS Certified Solutions Architect certification missing",
  ],
  matchedSkills: [
    { name: "Automation Anywhere", score: 90 },
    { name: "SQL", score: 85 },
    { name: "Excel", score: 80 },
    { name: "VBA", score: 75 },
  ],
  missingSkills: ["UiPath", "Blue Prism", "Python", "C#"],
  recommendation: "✅ Qualified - The candidate demonstrates strong RPA experience with Automation Anywhere and meets the experience requirements. While some tools like UiPath and Blue Prism are missing, the core competencies and recent project work align well with the role.",
  candidateProfile: {
    university: "non-targeted" as const,
    employer: "targeted" as const,
    experience: 4,
    hasRelevantExperience: true,
  },
  extractedInfo: {
    name: "Shivdeep Kumar Yadav",
    email: "shivdeep2skyadav@gmail.com",
    phone: "+91-9616913002",
    totalExperience: "4 years",
    skills: [
      "Automation Anywhere",
      "SQL",
      "VBA",
      "Excel",
      "Agile",
      "Waterfall"
    ],
    notes: [
      "Missing location information",
      "No evidence of UiPath or Blue Prism experience",
      "Pursuing Automation Anywhere A360 certification"
    ]
  },
  evaluationBreakdown: [
    {
      category: "1. Skill Set Match (30%)",
      score: 75,
      weight: 30,
      details: [
        "✓ Matched Skills: Automation Anywhere, SQL, Excel, VBA (4/8 = 50%)",
        "✗ Missing Skills: UiPath, Blue Prism, Python, C#",
        "Match Percentage: 50%",
        "Score reflects partial match with core RPA tools"
      ],
    },
    {
      category: "2. Missed Skills Analysis (10%)",
      score: 60,
      weight: 10,
      details: [
        "Critical Missing: UiPath, Blue Prism",
        "Important Missing: Python",
        "Nice-to-Have Missing: C#, Docker",
        "Impact: Moderate - alternative RPA tool experience present"
      ],
    },
    {
      category: "3. Skills in Recent Projects (15%)",
      score: 80,
      weight: 15,
      details: [
        "Recent Skills Used: Automation Anywhere, SQL, Excel",
        "Projects Analyzed: 2 (last 2 years)",
        "Evidence: RPA bot development, database automation",
        "Strong recent hands-on experience with matched skills"
      ],
    },
    {
      category: "4. Experience Range Match (15%)",
      score: 85,
      weight: 15,
      details: [
        "Actual Experience: 4 years",
        "Required: 3-5 years",
        "Match Level: Within range (Excellent)",
        "Relevant RPA experience throughout career"
      ],
    },
    {
      category: "5. Location Match (5%)",
      score: 50,
      weight: 5,
      details: [
        "Candidate Location: Not specified",
        "Job Location: Mumbai",
        "Remote Possible: No",
        "Impact: Moderate - location needs clarification"
      ],
    },
    {
      category: "6. Written Communication (5%)",
      score: 90,
      weight: 5,
      details: [
        "Grammar Score: 90/100",
        "Structure Score: 95/100",
        "Formatting Score: 85/100",
        "Issues: None major",
        "Professional and well-organized CV"
      ],
    },
    {
      category: "7. Education Qualification (10%)",
      score: 80,
      weight: 10,
      details: [
        "Candidate Degree: Bachelor of Computer Applications",
        "Required Degree: Bachelor's in CS/IT",
        "Field Match: Yes (Related field)",
        "Institution Rank: Tier 2",
        "Good educational background for the role"
      ],
    },
    {
      category: "8. Certifications (5%)",
      score: 70,
      weight: 5,
      details: [
        "Matched: Automation Anywhere A360 (In Progress)",
        "Missing: AWS Certified Solutions Architect",
        "Expired: None",
        "Pursuing relevant RPA certification"
      ],
    },
    {
      category: "9. Language Skills (2%)",
      score: 95,
      weight: 2,
      details: [
        "Matched: English (Fluent), Hindi (Native)",
        "Missing: None",
        "All required languages covered with good proficiency"
      ],
    },
    {
      category: "10. Nationality (1%)",
      score: 100,
      weight: 1,
      details: [
        "Candidate: Indian",
        "Required: No restriction",
        "Match: Yes",
        "No visa or work permit issues"
      ],
    },
    {
      category: "11. Profile Quality (2%)",
      score: 75,
      weight: 2,
      details: [
        "Education Rank: Tier 2 university",
        "Employer Rank: Mid-size companies",
        "Industry Relevance: Highly relevant (Finance/RPA)",
        "Good overall profile quality"
      ],
    },
  ],
}

export default function CVEvaluationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <CVEvaluationReport data={sampleData} />
        <div className="text-center mt-8 text-sm text-slate-500">
          &copy; 2025 HireGenAI. All rights reserved.
        </div>
      </div>
    </div>
  )
}
