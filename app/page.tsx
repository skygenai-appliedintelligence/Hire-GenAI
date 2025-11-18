"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LoginModal } from "@/components/auth/login-modal"
import Link from "next/link"
import {
  Zap,
  Brain,
  Phone,
  ArrowRight,
  Play,
  Globe,
  Search,
  Target,
  Clock,
  BarChart3,
  MessageSquare,
} from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (user) {
    return null
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
                onClick={() => setShowLoginModal(true)}
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

      {/* Announcement Banner */}
      <div className="bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">HireGenAI Launches All-New AI-Powered Recruitment Suite</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="sr-hero-bg py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight">
                AI-Recruiter: Your <span className="sr-text-gradient">24/7 Screening Partner</span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Automate the most time-consuming parts of your recruitment funnel. Focus on the top 60% of qualified candidates while AI handles the rest.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="sr-button-dark">Explore the Benefits</Button>
                <Button className="sr-button-secondary" asChild>
                  <Link href="/demo-en">
                    <Play className="w-4 h-4 mr-2" />
                    Try Demo
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10">
                <video
                  src="https://storage.googleapis.com/ai_recruiter_bucket_prod/assets/videos/olivia_character_no_audio.mp4"
                  className="w-full rounded-2xl shadow-2xl object-cover h-[360px] sm:h-[440px] md:h-[450px] lg:h-[500px]"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
              <div className="absolute -top-4 -right-4 w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-8">
              TRUSTED BY THESE INDUSTRY LEADERS AROUND THE GLOBE
            </p>
            <div className="relative overflow-hidden opacity-60">
              <style jsx>{`
                @keyframes scroll-infinite { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
                .animate-scroll { animation: scroll-infinite 40s linear infinite; will-change: transform; }
                @media (prefers-reduced-motion: reduce) { .animate-scroll { animation: none; } }
              `}</style>
              <div className="flex animate-scroll">
                <div className="flex items-center gap-12 md:gap-16 px-4 md:px-6 min-w-max">
                  <div className="text-2xl font-bold text-slate-400">TechCorp</div>
                  <div className="text-2xl font-bold text-slate-400">InnovateCo</div>
                  <div className="text-2xl font-bold text-slate-400">GlobalTech</div>
                  <div className="text-2xl font-bold text-slate-400">FutureSoft</div>
                  <div className="text-2xl font-bold text-slate-400">NextGen</div>
                  <div className="text-2xl font-bold text-slate-400">SmartHire</div>
                </div>
                <div className="flex items-center gap-12 md:gap-16 px-4 md:px-6 min-w-max">
                  <div className="text-2xl font-bold text-slate-400">TechCorp</div>
                  <div className="text-2xl font-bold text-slate-400">InnovateCo</div>
                  <div className="text-2xl font-bold text-slate-400">GlobalTech</div>
                  <div className="text-2xl font-bold text-slate-400">FutureSoft</div>
                  <div className="text-2xl font-bold text-slate-400">NextGen</div>
                  <div className="text-2xl font-bold text-slate-400">SmartHire</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="product" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              Everything you need for <span className="sr-text-gradient">modern recruitment</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our comprehensive AI-powered platform handles every aspect of your hiring process, from job posting to
              final decision-making.
            </p>
          </div>

          {/* Features Grid - 2x2 Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Intelligent CV Parsing */}
            <Card className="sr-card p-8 text-center transition-all duration-300 hover:shadow-emerald-500/50 hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-transform duration-300 hover:rotate-12">
                  <Search className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Intelligent CV Parsing</h3>
                <p className="text-slate-600 leading-relaxed">
                  Instantly scans and scores all incoming CVs against your job description. Identifies key skills, experience, and qualifications with over 95% accuracy.
                </p>
              </CardContent>
            </Card>

            {/* AI-Powered Initial Interview */}
            <Card className="sr-card p-8 text-center transition-all duration-300 hover:shadow-emerald-500/50 hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-transform duration-300 hover:rotate-12">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">AI-Powered Initial Interview</h3>
                <p className="text-slate-600 leading-relaxed">
                  Engages qualified candidates in natural, conversational video interviews. Asks role-specific questions and analyzes responses for content, communication skills, and cultural fit.
                </p>
              </CardContent>
            </Card>

            {/* Data-Driven Shortlisting */}
            <Card className="sr-card p-8 text-center transition-all duration-300 hover:shadow-emerald-500/50 hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-transform duration-300 hover:rotate-12">
                  <Phone className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Data-Driven Shortlisting</h3>
                <p className="text-slate-600 leading-relaxed">
                  Provides a ranked shortlist of the top 60% of candidates who are genuinely qualified and interested. Delivers detailed reports and video clips for efficient review.
                </p>
              </CardContent>
            </Card>

            {/* Advanced Analytics */}
            <Card className="sr-card p-8 text-center transition-all duration-300 hover:shadow-emerald-500/50 hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-transform duration-300 hover:rotate-12">
                  <BarChart3 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Advanced Analytics</h3>
                <p className="text-slate-600 leading-relaxed">
                  Real-time insights into your hiring pipeline with predictive analytics and performance metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* AI-Recruiter Funnel Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              The Quantifiable Benefit: <span className="sr-text-gradient">Transforming Your Pipeline</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how AI-Recruiter automatically filters out unqualified candidates, letting your TA team focus on high-potential talent.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Before AI-Recruiter */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Before AI-Recruiter</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-24 h-24 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl mr-4">
                    100
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">Applicants enter pipeline</p>
                    <p className="text-sm text-slate-600">All CVs require manual review</p>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-red-200 pt-6">
                  <div className="flex items-center">
                    <div className="w-24 h-24 bg-red-400 rounded-lg flex items-center justify-center text-white font-bold text-2xl mr-4">
                      100
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-800">TA team must screen</p>
                      <p className="text-sm text-slate-600">Including unqualified candidates</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 mt-6">
                  <p className="text-red-800 font-semibold">Result:</p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1">
                    <li>• Fatigued recruiters</li>
                    <li>• Slow hiring process</li>
                    <li>• High risk of human error</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* After AI-Recruiter */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">After AI-Recruiter</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-24 h-24 bg-slate-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl mr-4">
                    100
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">Applicants enter pipeline</p>
                    <p className="text-sm text-slate-600">AI automatically screens all CVs</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="bg-emerald-100 rounded-full px-6 py-3">
                    <p className="text-emerald-800 font-bold text-sm">🤖 AI-Recruiter filters out bottom 40%</p>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-emerald-200 pt-6">
                  <div className="flex items-center">
                    <div className="w-24 h-24 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl mr-4">
                      60
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-800">Qualified candidates</p>
                      <p className="text-sm text-slate-600">Pre-vetted, high-potential talent</p>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 mt-6">
                  <p className="text-emerald-800 font-semibold">Result:</p>
                  <ul className="text-sm text-emerald-700 mt-2 space-y-1">
                    <li>• Focused recruiters</li>
                    <li>• Faster hiring process</li>
                    <li>• Higher-quality engagements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Stats Section with Continuous Scroll */}
          <div className="mt-16 overflow-hidden">
            <div className="relative">
              <style jsx>{`
                @keyframes scroll-infinite {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-100%); }
                }
                .animate-scroll { 
                  animation: scroll-infinite 40s linear infinite;
                  will-change: transform;
                }
                @media (prefers-reduced-motion: reduce) {
                  .animate-scroll { animation: none; }
                }
                .animate-scroll:hover { animation-play-state: paused; }
              `}</style>
              <div className="flex animate-scroll">
                {/* First set of stats */}
                <div className="flex items-center gap-8 md:gap-10 px-4 md:px-6 min-w-max">
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">40%</div>
                    <div className="text-slate-700 font-medium">Candidates Filtered</div>
                    <div className="text-xs text-slate-500 mt-1">Unqualified removed</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">60%</div>
                    <div className="text-slate-700 font-medium">Qualified Shortlist</div>
                    <div className="text-xs text-slate-500 mt-1">Pre-vetted candidates</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">95%</div>
                    <div className="text-slate-700 font-medium">Parsing Accuracy</div>
                    <div className="text-xs text-slate-500 mt-1">Skills identification</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">10K+</div>
                    <div className="text-slate-700 font-medium">Jobs Posted</div>
                    <div className="text-xs text-slate-500 mt-1">Across platforms</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">50K+</div>
                    <div className="text-slate-700 font-medium">Candidates Screened</div>
                    <div className="text-xs text-slate-500 mt-1">With AI precision</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">500+</div>
                    <div className="text-slate-700 font-medium">Companies</div>
                    <div className="text-xs text-slate-500 mt-1">Trust our platform</div>
                  </div>
                </div>
                {/* Duplicate set for seamless loop */}
                <div className="flex items-center gap-8 md:gap-10 px-4 md:px-6 min-w-max">
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">40%</div>
                    <div className="text-slate-700 font-medium">Candidates Filtered</div>
                    <div className="text-xs text-slate-500 mt-1">Unqualified removed</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">60%</div>
                    <div className="text-slate-700 font-medium">Qualified Shortlist</div>
                    <div className="text-xs text-slate-500 mt-1">Pre-vetted candidates</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">95%</div>
                    <div className="text-slate-700 font-medium">Parsing Accuracy</div>
                    <div className="text-xs text-slate-500 mt-1">Skills identification</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">10K+</div>
                    <div className="text-slate-700 font-medium">Jobs Posted</div>
                    <div className="text-xs text-slate-500 mt-1">Across platforms</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">50K+</div>
                    <div className="text-slate-700 font-medium">Candidates Screened</div>
                    <div className="text-xs text-slate-500 mt-1">With AI precision</div>
                  </div>
                  <div className="text-center min-w-[220px] md:min-w-[260px] px-4">
                    <div className="text-4xl md:text-5xl font-bold sr-text-gradient mb-1 md:mb-2">500+</div>
                    <div className="text-slate-700 font-medium">Companies</div>
                    <div className="text-xs text-slate-500 mt-1">Trust our platform</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sr-gradient text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to revolutionize your hiring?</h2>
          <p className="text-xl mb-8 text-emerald-100">
            Join thousands of companies already using AI to hire better, faster, and smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/pricing')}
              className="bg-white text-emerald-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg rounded-full"
            >
              View pricing
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-emerald-600 font-semibold px-8 py-4 text-lg rounded-full bg-transparent"
            >
              Schedule a demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-slate-400 mb-6 max-w-md">
                The future of recruitment is here. Automate your hiring process with AI and transform how you discover,
                evaluate, and hire top talent.
              </p>
              <div className="flex space-x-4">
                <Globe className="w-5 h-5 text-slate-400" />
                <MessageSquare className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Product</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Support</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Status
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2024 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
