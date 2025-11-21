"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function DemoReport() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [score, setScore] = useState(0)
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", company: "" })

  useEffect(() => {
    // Get data from localStorage
    const storedScore = localStorage.getItem('questionnaireScore')
    const storedContact = localStorage.getItem('questionnaireContact')

    if (storedScore) {
      setScore(parseInt(storedScore))
    } else {
      setScore(40) // Default for demo
    }

    if (storedContact) {
      setContactInfo(JSON.parse(storedContact))
    } else {
      setContactInfo({ name: "Dheeraj Yadav", email: "", company: "" })
    }
  }, [])

  const timeSaving = Math.round((score / 100) * 40)
  const improvementPotential = Math.round(((100 - score) / 100) * 80)
  const timeToHireReduction = Math.round((score / 100) * 21)

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

      {/* Report Content */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-600 to-purple-600 text-white p-6 sm:p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{contactInfo.name}'s Recruitment Efficiency Report</h2>
              <p className="text-emerald-100">Personalized analysis and actionable recommendations</p>
            </div>

            <CardContent className="p-6 sm:p-10">
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-emerald-600 mb-4 pb-2 border-b-2 border-emerald-100">Executive Summary</h3>
                <p className="text-slate-600 mb-6">
                  Based on your assessment, your recruitment process has significant opportunities for improvement through AI automation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-50 text-center p-6">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{score}</div>
                    <div className="text-sm text-slate-600">Efficiency Score</div>
                  </Card>
                  <Card className="bg-slate-50 text-center p-6">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{timeSaving}</div>
                    <div className="text-sm text-slate-600">Hours Saved Per Hire</div>
                  </Card>
                  <Card className="bg-slate-50 text-center p-6">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{improvementPotential}%</div>
                    <div className="text-sm text-slate-600">Improvement Potential</div>
                  </Card>
                  <Card className="bg-slate-50 text-center p-6">
                    <div className="text-4xl font-bold text-emerald-600 mb-2">{timeToHireReduction}</div>
                    <div className="text-sm text-slate-600">Days Reduction</div>
                  </Card>
                </div>
              </div>

              <Card className="bg-gradient-to-r from-emerald-600 to-purple-600 text-white p-6 sm:p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Recruitment?</h3>
                <p className="mb-6">Start your 14-day free trial and experience the power of AI-driven recruitment</p>
                <Link href="/signup?section=company">
                  <Button className="bg-white text-emerald-600 hover:bg-gray-100 font-bold px-8 py-6 text-lg rounded-full">
                    Start My 14-Day Free Trial
                  </Button>
                </Link>
                <p className="text-sm mt-4 text-emerald-100">No credit card required • Cancel anytime</p>
              </Card>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Results
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
