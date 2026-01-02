"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Lock,
  Star,
  TrendingUp,
  Users,
  Menu,
  X,
} from "lucide-react"
import { RecruitmentQuestionnaire } from "@/components/recruitment-questionnaire"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  useEffect(() => {
    const scrollTo = searchParams?.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        // Remove the scroll parameter from URL after scrolling
        window.history.replaceState({}, '', '/')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

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
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
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
                <Link
                  href="/demo-en"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Product
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/roi"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  ROI
                </Link>
                <Link
                  href="/about"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Company
                </Link>
              </nav>
            </div>
            <div className="hidden md:flex items-center space-x-4">
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

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-emerald-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <Link
                href="/demo-en"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Product
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/roi"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                ROI
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                Company
              </Link>
              <div className="pt-4 pb-3 border-t border-gray-100">
                <div className="px-3 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowLoginModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start text-gray-700 hover:text-emerald-600 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Login
                  </Button>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full sr-button-primary">Get started</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
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
                <Button 
                  className="sr-button-dark"
                  asChild
                >
                  <Link href="/roi">
                    Explore the Benefits
                  </Link>
                </Button>
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

      {/* Recruitment Questionnaire Section */}
      <section id="assessment">
        <RecruitmentQuestionnaire />
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

      {/* Problem Statement Section */}
      <section className="py-20 bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              Traditional Recruitment Is <span className="text-red-600">Holding You Back</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Every day you wait, top talent slips away to faster competitors. Here&apos;s what&apos;s really costing you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pain Point 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Slow & Inefficient</h3>
              <p className="text-slate-600 leading-relaxed">
                Manual resume screening and scheduling create bottlenecks that stretch hiring cycles to <span className="font-semibold text-red-600">40+ days</span>, causing you to lose top candidates to faster competitors.
              </p>
            </div>

            {/* Pain Point 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Expensive & Resource-Heavy</h3>
              <p className="text-slate-600 leading-relaxed">
                Labor-intensive processes drain your budget with high cost-per-hire and dependency on external agencies, while your HR team drowns in administrative work.
              </p>
            </div>

            {/* Pain Point 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-amber-500 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Limited & Biased</h3>
              <p className="text-slate-600 leading-relaxed">
                Human limitations restrict your reach to active applicants only, while unconscious bias compromises diversity goals and leads to poor hiring decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              AI Recruitment: <span className="sr-text-gradient">The Complete Hiring Transformation</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our platform combines cutting-edge artificial intelligence with human expertise to deliver unprecedented hiring results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Lightning-Fast Hiring</h3>
              <p className="text-emerald-600 font-semibold mb-3">Reduce time-to-hire from 40 days to just 4-11 days</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Automate resume screening, candidate ranking, and interview scheduling in minutes. Fill critical roles before your competition even starts searching.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Dramatic Cost Savings</h3>
              <p className="text-emerald-600 font-semibold mb-3">Cut recruitment costs by 20-50%</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Eliminate manual labor expenses, reduce agency dependency, and decrease turnover through superior candidate matching—delivering measurable ROI from day one.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Unlimited Scalability</h3>
              <p className="text-emerald-600 font-semibold mb-3">Handle thousands of applications 24/7</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Process high-volume hiring periods effortlessly without adding HR headcount. Our AI never sleeps, never tires, and scales instantly with your growth.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Data-Driven Precision</h3>
              <p className="text-emerald-600 font-semibold mb-3">Match candidates with predictive accuracy</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Advanced algorithms analyze skills, experience, and historical performance data to identify candidates most likely to succeed and stay long-term.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Diversity & Fairness</h3>
              <p className="text-emerald-600 font-semibold mb-3">Reduce unconscious bias by design</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Evaluate candidates on objective criteria—skills, qualifications, and potential—rather than demographics, helping you build truly diverse teams.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Proactive Talent Discovery</h3>
              <p className="text-emerald-600 font-semibold mb-3">Access passive candidates automatically</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our AI actively searches internal and external databases to find qualified professionals who aren&apos;t actively job hunting, expanding your talent pool exponentially.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - For Companies */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-emerald-400 font-semibold mb-2">FOR COMPANIES</p>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Transform Your Hiring Outcomes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Build Better Teams, Faster</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Fill critical positions <span className="text-emerald-400 font-semibold">4x faster</span> than traditional methods, minimizing productivity losses and keeping projects on track.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Hire Smarter, Not Harder</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Our AI-powered screening analyzes candidate qualifications and experience to identify top performers, significantly improving quality of hire and reducing costly turnover.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Grow Without Growing Pains</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Scale your hiring seamlessly during growth periods or seasonal peaks without proportionally increasing your HR budget or headcount.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Champion Real Diversity</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Move beyond good intentions to measurable results with bias-reduced screening that evaluates candidates fairly and objectively.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - For HR Teams */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-emerald-600 font-semibold mb-2">FOR HR TEAMS & RECRUITERS</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              Elevate Your Impact, Reclaim Your Time
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-100">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Focus on What Matters</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Eliminate <span className="font-semibold text-emerald-600">70% of administrative work</span>—resume screening, data entry, scheduling—and dedicate your expertise to relationship-building, cultural assessment, and strategic planning.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Make Better Decisions</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Access data-driven insights and predictive analytics that complement your intuition, helping you identify top talent with confidence.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-100">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delight Every Candidate</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                AI-powered chatbots provide instant, 24/7 responses and updates, creating a positive candidate experience that strengthens your employer brand.
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border border-amber-100">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Multiply Your Productivity</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Manage more requisitions and candidates simultaneously without sacrificing quality, making you a more valuable strategic partner to your organization.
              </p>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-6 border border-rose-100 md:col-span-2 lg:col-span-1">
              <div className="text-3xl mb-4">💎</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Discover Hidden Talent</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Proactively identify qualified passive candidates who would never have applied, giving you access to talent your competitors don&apos;t even know exists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              See The Difference <span className="sr-text-gradient">AI Makes</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Compare traditional recruitment with HireGenAI and see why leading companies are making the switch.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-12 border border-slate-200">
            <div className="grid grid-cols-3 text-center py-6 bg-slate-800 text-white">
              <div className="px-4">
                <h3 className="text-lg md:text-xl font-semibold">What Matters Most</h3>
              </div>
              <div className="px-4 border-l border-slate-600">
                <h3 className="text-lg md:text-xl font-semibold text-emerald-400">With HireGenAI</h3>
              </div>
              <div className="px-4 border-l border-slate-600">
                <h3 className="text-lg md:text-xl font-semibold text-red-400">Traditional Approach</h3>
              </div>
            </div>

            {/* Speed Row */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Speed</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Zap className="w-5 h-5" /> 4-11 days
                </p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-5 h-5" /> 40+ days
                </p>
              </div>
            </div>

            {/* Cost Row */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Cost Per Hire</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="font-semibold text-emerald-700">💰 20-50% lower</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="text-slate-500">💸 Significantly higher</p>
              </div>
            </div>

            {/* Volume Row */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Volume Capacity</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="font-semibold text-emerald-700">🚀 Thousands 24/7</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="text-slate-500">👥 Limited by staff</p>
              </div>
            </div>

            {/* Consistency Row */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Consistency</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="font-semibold text-emerald-700">✅ Same criteria for all</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="text-slate-500">❌ Varies by recruiter</p>
              </div>
            </div>

            {/* Reach Row */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Candidate Reach</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="font-semibold text-emerald-700">🌍 Active + passive</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="text-slate-500">📝 Active only</p>
              </div>
            </div>

            {/* Scalability Row */}
            <div className="grid grid-cols-3 border-b border-slate-200">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Scalability</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="font-semibold text-emerald-700">♾️ Instant, unlimited</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="text-slate-500">⚠️ Requires more staff</p>
              </div>
            </div>

            {/* Bias Row */}
            <div className="grid grid-cols-3">
              <div className="p-5 flex items-center bg-slate-50">
                <h4 className="font-semibold text-slate-800">Bias Reduction</h4>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200 bg-emerald-50">
                <p className="font-semibold text-emerald-700">🎯 Objective, skills-focused</p>
              </div>
              <div className="p-5 flex items-center justify-center border-l border-slate-200">
                <p className="text-slate-500">⚠️ Unconscious bias</p>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-slate-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to know about HireGenAI
            </p>
          </div>

          <Card className="sr-card p-0">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full space-y-1">
                <AccordionItem value="item-1" className="border-slate-200 rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center">
                    <span className="font-medium text-slate-800 text-base leading-relaxed">What is the HireGenAI, and how does it work?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                    The HireGenAI is an advanced platform that uses artificial intelligence to streamline and enhance your hiring process. It automates tasks like candidate sourcing, screening, and initial assessments, helping you find the best talent faster.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-slate-200 rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center">
                    <span className="font-medium text-slate-800 text-base leading-relaxed">How does it accelerate my hiring process?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                    By automating repetitive tasks, providing intelligent candidate matching, and enabling quicker shortlisting, the HireGenAI significantly reduces the time-to-hire. It allows your recruitment team to focus on engaging with top candidates.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-slate-200 rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center">
                    <span className="font-medium text-slate-800 text-base leading-relaxed">Will the HireGenAI replace my recruiter?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                    Not at all! The HireGenAI is designed to augment and empower your human recruiters, not replace them. It handles the time-consuming, data-intensive parts of recruitment, freeing up your team to focus on strategic tasks and building relationships.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border-slate-200 rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center">
                    <span className="font-medium text-slate-800 text-base leading-relaxed">What kind of roles can HireGenAI screen for?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                    Our HireGenAI is versatile and can be configured to screen for a wide range of roles across various industries, from technical and engineering positions to sales, marketing, and customer service roles. It adapts to the specific skills and qualifications required for each position.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border-slate-200 rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center">
                    <span className="font-medium text-slate-800 text-base leading-relaxed">Can HireGenAI integrate with our existing hiring processes?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                    Yes, we understand the importance of seamless integration. Our HireGenAI offers flexible integration options with popular Applicant Tracking Systems (ATS) and other HR software to fit smoothly into your current workflows.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6" className="border-slate-200 rounded-lg overflow-hidden">
                  <AccordionTrigger className="text-left px-6 py-5 hover:no-underline min-h-[72px] flex items-center">
                    <span className="font-medium text-slate-800 text-base leading-relaxed">How do I get started?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                    Getting started is easy! You can request a demo through our website or contact our sales team. We'll guide you through the setup process and help you configure the HireGenAI to meet your specific needs.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
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
              onClick={() => router.push('/demo-en')}
            >
              Try demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
            {/* Left Section - Brand Block */}
            <div className="md:col-span-3">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
              </p>
              <p className="text-slate-400 mb-6 text-sm font-medium">
                Email: <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@hire-genai.com</a>
              </p>
              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/hire-genai" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/demo-en" className="hover:text-emerald-400 transition-colors">
                    Try the Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      const element = document.getElementById('assessment');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-left w-full"
                  >
                    Assessment
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      const element = document.getElementById('faq');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors text-left w-full"
                  >
                    FAQs
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-emerald-400 transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book-meeting" className="hover:text-emerald-400 transition-colors">
                    Book a Meeting
                  </Link>
                </li>
                <li>
                  <a href="/owner-login" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Section - Badges Block */}
            <div className="md:col-span-3">
              <div className="space-y-4">
                {/* Trustpilot Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
                </div>

                {/* GDPR Compliant Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                  </div>
                  <p className="text-xs text-slate-400">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2024 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
