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
                AI-Powered Software for <span className="sr-text-gradient">Superhuman Hiring</span>
                <sup className="text-2xl text-emerald-500">™</sup>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                See how you can achieve <em className="font-semibold text-slate-800">faster, smarter hiring</em>;
                whether it's corporate, high-volume, or anything in between.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="sr-button-dark">Explore the Benefits</Button>
                <Button className="sr-button-secondary" onClick={() => setShowLoginModal(true)}>
                  <Play className="w-4 h-4 mr-2" />
                  Try Demo
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 items-center opacity-60">
              <div className="flex justify-center">
                <div className="text-2xl font-bold text-slate-400">TechCorp</div>
              </div>
              <div className="flex justify-center">
                <div className="text-2xl font-bold text-slate-400">InnovateCo</div>
              </div>
              <div className="flex justify-center">
                <div className="text-2xl font-bold text-slate-400">GlobalTech</div>
              </div>
              <div className="flex justify-center">
                <div className="text-2xl font-bold text-slate-400">FutureSoft</div>
              </div>
              <div className="flex justify-center">
                <div className="text-2xl font-bold text-slate-400">NextGen</div>
              </div>
              <div className="flex justify-center">
                <div className="text-2xl font-bold text-slate-400">SmartHire</div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="sr-card p-8 text-center">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Search className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Smart Sourcing</h3>
                <p className="text-slate-600 leading-relaxed">
                  AI-powered candidate discovery across LinkedIn, Indeed, Monster, and Naukri with intelligent matching
                  algorithms.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card p-8 text-center">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">AI Screening</h3>
                <p className="text-slate-600 leading-relaxed">
                  Automated resume analysis and candidate qualification using advanced natural language processing.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card p-8 text-center">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Phone className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Voice AI Interviews</h3>
                <p className="text-slate-600 leading-relaxed">
                  Conduct consistent, bias-free preliminary interviews using advanced voice AI technology.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card p-8 text-center">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Target className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Multi-Platform Posting</h3>
                <p className="text-slate-600 leading-relaxed">
                  Automatically distribute job postings across multiple platforms with optimized descriptions.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card p-8 text-center">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <BarChart3 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Advanced Analytics</h3>
                <p className="text-slate-600 leading-relaxed">
                  Real-time insights into your hiring pipeline with predictive analytics and performance metrics.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card p-8 text-center">
              <CardContent className="p-0">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Clock className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Automated Workflow</h3>
                <p className="text-slate-600 leading-relaxed">
                  End-to-end automation from application to offer with customizable approval workflows.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold sr-text-gradient mb-2">95%</div>
              <div className="text-slate-600 font-medium">Time Reduction</div>
              <div className="text-sm text-slate-500 mt-1">in screening process</div>
            </div>
            <div>
              <div className="text-5xl font-bold sr-text-gradient mb-2">10K+</div>
              <div className="text-slate-600 font-medium">Jobs Posted</div>
              <div className="text-sm text-slate-500 mt-1">across all platforms</div>
            </div>
            <div>
              <div className="text-5xl font-bold sr-text-gradient mb-2">50K+</div>
              <div className="text-slate-600 font-medium">Candidates Screened</div>
              <div className="text-sm text-slate-500 mt-1">with AI precision</div>
            </div>
            <div>
              <div className="text-5xl font-bold sr-text-gradient mb-2">500+</div>
              <div className="text-slate-600 font-medium">Companies</div>
              <div className="text-sm text-slate-500 mt-1">trust our platform</div>
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
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Blog
                  </a>
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
