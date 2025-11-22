"use client"

import { CVEvaluationReport } from "@/components/cv-evaluation-report"

const sampleData = {
  candidateName: "Shivdeep Kumar Yadav",
  role: "Robotic Process Automation",
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
    "Strong proficiency in Automation Anywhere",
    "Strong proficiency in SQL",
    "Strong proficiency in Excel",
    "Excellent role alignment with job requirements",
  ],
  gaps: [
    "Missing experience with UiPath",
    "Missing experience with Blue Prism",
    "Missing experience with Python",
    "Missing location information",
    "No evidence of UiPath or Blue Prism experience",
  ],
  matchedSkills: [
    { name: "Automation Anywhere", score: 90 },
    { name: "SQL", score: 85 },
    { name: "Excel", score: 80 },
    { name: "VBA", score: 75 },
  ],
  missingSkills: ["UiPath", "Blue Prism", "Python", "C#"],
  recommendation: "✅ Next Round - The candidate has relevant RPA experience and skills, particularly with Automation Anywhere. Education and certifications align well, though some nice-to-have skills are missing.",
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
      category: "Role/Title Alignment",
      score: 80,
      weight: 15,
      details: ["RPA Developer", "RPA Support/Developer"],
    },
    {
      category: "Hard Skills & Tools",
      score: 75,
      weight: 35,
      details: [
        "✓ Matched: Automation Anywhere, SQL, Excel",
        "✗ Missing: UiPath, Blue Prism, Python, VB, C#",
      ],
    },
    {
      category: "Experience Depth",
      score: 80,
      weight: 20,
      details: [
        "Estimated Experience: 2 years",
        "2+ years in dealing with Robotic Process Automation",
      ],
    },
    {
      category: "Domain/Industry Relevance",
      score: 70,
      weight: 10,
      details: ["Finance Domain"],
    },
    {
      category: "Education & Certifications",
      score: 80,
      weight: 10,
      details: [
        "✓ Bachelor of Computer Applications",
        "✓ Automation Anywhere A360",
      ],
    },
    {
      category: "Nice-to-Have Skills",
      score: 40,
      weight: 5,
      details: ["Limited coverage of preferred skills"],
    },
    {
      category: "Communication & Quality",
      score: 90,
      weight: 5,
      details: ["Clear and professional communication style"],
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
