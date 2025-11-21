"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function QuestionnaireResults() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [score, setScore] = useState(0)
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", company: "" })

  useEffect(() => {
    // Get data from URL params or localStorage
    const scoreParam = searchParams.get('score')
    const nameParam = searchParams.get('name')
    const emailParam = searchParams.get('email')
    const companyParam = searchParams.get('company')

    if (scoreParam) {
      setScore(parseInt(scoreParam))
      setContactInfo({
        name: nameParam || '',
        email: emailParam || '',
        company: companyParam || ''
      })
    } else {
      // Fallback to localStorage if no params
      const storedScore = localStorage.getItem('questionnaireScore')
      const storedContact = localStorage.getItem('questionnaireContact')

      if (storedScore) {
        setScore(parseInt(storedScore))
      }
      if (storedContact) {
        setContactInfo(JSON.parse(storedContact))
      }
    }
  }, [searchParams])

  const getResultsText = () => {
    if (score >= 80) {
      return {
        title: "Excellent Recruitment Efficiency!",
        description: "Your recruitment process is highly efficient, but there are still opportunities to optimize further with AI automation.",
      }
    } else if (score >= 60) {
      return {
        title: "Good Recruitment Foundation",
        description: "Your recruitment process is solid, but AI automation could help you save significant time and improve candidate quality.",
      }
    } else if (score >= 40) {
      return {
        title: "Moderate Efficiency - Room for Improvement",
        description: "There are clear opportunities to streamline your recruitment process and reduce time-to-hire with AI-powered tools.",
      }
    } else {
      return {
        title: "High-Impact Improvement Opportunities",
        description: "Your recruitment process has significant inefficiencies that AI can help solve, potentially saving dozens of hours per hire.",
      }
    }
  }

  const getRecommendations = () => {
    const recommendations: string[] = []

    // Get answers from localStorage or URL params
    const answers = JSON.parse(localStorage.getItem('questionnaireAnswers') || '{}')

    if (answers["question-2"] && parseInt(answers["question-2"]) >= 3) {
      recommendations.push("Implement AI-powered CV screening to reduce manual review time by up to 80%")
    }
    if (answers["question-3"] && parseInt(answers["question-3"]) >= 3) {
      recommendations.push("Use automated candidate engagement to reduce time-to-hire by weeks")
    }
    if (answers["question-5"] && parseInt(answers["question-5"]) <= 2) {
      recommendations.push("Improve candidate quality with AI-powered matching and skills assessment")
    }
    if (answers["question-7"] && parseInt(answers["question-7"]) <= 2) {
      recommendations.push("Enhance candidate experience with automated communication and feedback")
    }
    if (answers["question-9"] && parseInt(answers["question-9"]) <= 2) {
      recommendations.push("Upgrade your recruitment technology stack with AI-powered tools")
    }

    const defaultRecommendations = [
      "Create standardized scoring rubrics to ensure consistent candidate evaluation",
      "Leverage analytics to identify bottlenecks in your hiring process",
      "Automate interview scheduling to reduce administrative overhead",
      "Implement skills-based assessments to objectively evaluate candidates",
    ]

    while (recommendations.length < 5) {
      const randomRec = defaultRecommendations[Math.floor(Math.random() * defaultRecommendations.length)]
      if (!recommendations.includes(randomRec)) {
        recommendations.push(randomRec)
      }
    }

    return recommendations
  }

  const resultsText = getResultsText()
  const recommendations = getRecommendations()

  const handleGetFullReport = () => {
    // Navigate to demo-report page
    router.push('/demo-report')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold">
                  <span className="text-slate-800">Hire</span>
                  <span className="sr-text-gradient">GenAI</span>
                </h1>
              </div>
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <a
                  href="#product"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Product
                </a>
                <a
                  href="#solutions"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Solutions
                </a>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <a
                  href="#resources"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Resources
                </a>
                <a
                  href="#company"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Company
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
                className="text-gray-700 hover:text-emerald-600 font-medium"
              >
                Login
              </Button>
              <Link href="/signup">
                <Button className="sr-button-primary">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Results Content */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div
              className="w-32 h-32 sm:w-48 sm:h-48 mx-auto rounded-full flex flex-col items-center justify-center relative"
              style={{
                background: `conic-gradient(#059669 0% ${score}%, #f0f4ff ${score}% 100%)`,
              }}
            >
              <div className="absolute w-24 h-24 sm:w-40 sm:h-40 bg-white rounded-full flex flex-col items-center justify-center">
                <div className="text-3xl sm:text-5xl font-bold text-emerald-600">{score}</div>
                <div className="text-xs sm:text-sm text-slate-600">Efficiency Score</div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-slate-800 mb-4">{resultsText.title}</h2>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">{resultsText.description}</p>

          <Card className="bg-slate-50 p-6 sm:p-8 mb-8 text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">Your Personalized Recommendations</h3>
            <ul className="space-y-4">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start pb-4 border-b border-slate-200 last:border-0">
                  <span className="text-emerald-600 font-bold mr-4">✓</span>
                  <span className="text-slate-700">{rec}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-slate-50 p-6 sm:p-8 max-w-lg mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Get Your Full Detailed Report</h3>
            <p className="text-slate-600 mb-6">
              Enter your email to receive your complete recruitment efficiency analysis with customized action plan.
            </p>
            <Button
              onClick={handleGetFullReport}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg"
            >
              Get My Full Report
            </Button>
            <p className="text-sm text-slate-500 mt-4">It's completely free and you get immediate recommendations</p>
          </Card>

          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assessment
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
