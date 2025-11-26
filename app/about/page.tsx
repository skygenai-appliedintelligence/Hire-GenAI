"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Star,
  Lock,
  Users,
  Zap,
  Brain,
  MessageSquare,
  Target,
} from "lucide-react"
import { LoginModal } from "@/components/auth/login-modal"

export default function AboutPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <h1 className="text-2xl font-bold cursor-pointer">
                    <span className="text-slate-800">Hire</span>
                    <span className="sr-text-gradient">GenAI</span>
                  </h1>
                </Link>
              </div>
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <a
                  href="/#product"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Product
                </a>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <a
                  href="/#company"
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

      {/* About Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title - Green highlighted, left aligned, full width */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-emerald-600 mb-4">About Us</h1>
            <p className="text-lg text-slate-600">
              Revolutionizing recruitment through Voice AI innovation
            </p>
          </div>

          <div className="space-y-16 text-slate-700 leading-relaxed">
            {/* Mission Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-8 rounded-2xl border border-emerald-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Our Mission</h2>
              </div>
              <p className="text-xl text-slate-700 leading-relaxed mb-4">
                We empower the generation of tomorrow for a brighter future and hope for every individual.
              </p>
              <p className="text-lg text-slate-600">
                HireGenAI is a visionary project aimed at revolutionizing the recruitment industry through Voice AI, with a strong emphasis on enhancing the candidate experience. This is just the beginning—we envision a future where Voice AI transforms how humans interact across domains like customer service, education, and healthcare.
              </p>
            </div>

            {/* Company Description */}
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-8">What We Build</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-lg text-slate-600 mb-6">
                    We're building an AI recruiter that automates candidate screening over phone calls using the Voice API. Once a candidate applies, our AI conducts a real-time voice-based screening interview using Voice API.
                  </p>
                  <p className="text-lg text-slate-600 mb-6">
                    It integrates with LinkedIn, Microsoft Teams, Outlook, and SharePoint to fetch candidate insights, schedule follow-ups, and log interview notes. The goal is to reduce recruiter workload and increase screening accuracy, especially for high-volume roles.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">Voice AI</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">LinkedIn Integration</span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">Microsoft Teams</span>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">Outlook Integration</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                  <div className="flex items-center mb-4">
                    <Zap className="w-8 h-8 text-emerald-600 mr-3" />
                    <h3 className="text-xl font-bold text-slate-800">Key Features</h3>
                  </div>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Real-time voice-based candidate screening
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Automated scheduling and follow-ups
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Integration with major business platforms
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Reduced recruiter workload by 80%
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      Enhanced screening accuracy
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Founders Section */}
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-12 text-center">Meet Our Founders</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Sandeep Yadav */}
                <div className="bg-white p-8 rounded-2xl border-2 border-emerald-200 shadow-lg hover:shadow-emerald-500/20 transition-shadow duration-300">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Sandeep Yadav</h3>
                    <p className="text-emerald-600 font-semibold">Founder / CEO / CTO</p>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    I am an AI, Robotics, and Cognitive Automation Solution Architect at a leading consulting firm in Singapore, with over 15 years of experience driving innovation and transformation through technologies such as RPA and conversational AI.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    I've led large-scale automation and process reengineering initiatives across diverse industries, including insurance, banking, automotive, and aviation, delivering solutions such as intelligent virtual assistants and enterprise-wide automation strategies.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    I'm currently working on HireGenAI, a visionary project aimed at revolutionizing the recruitment industry through Voice AI, with a strong emphasis on enhancing the candidate experience. This is just the beginning—we envision a future where Voice AI transforms how humans interact across domains like customer service, education, and healthcare.
                  </p>
                </div>

                {/* Jyoti Yadav */}
                <div className="bg-white p-8 rounded-2xl border-2 border-emerald-200 shadow-lg hover:shadow-emerald-500/20 transition-shadow duration-300">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Jyoti Yadav</h3>
                    <p className="text-emerald-600 font-semibold">Business Partner</p>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    A seasoned Talent Acquisition Lead at a French IT multinational firm, based in Singapore, with expertise in social media recruiting, employer branding, and sourcing strategies across APAC.
                  </p>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    She specializes in hiring technical talent across Banking, IT, Healthcare, and Retail sectors, partnering closely with business managers to drive impactful hiring outcomes.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Backed by an MBA from the University of Birmingham, Jyoti is passionate about process improvement, talent management, and inclusive hiring.
                  </p>
                </div>
              </div>
            </div>

            {/* Future Vision */}
            <div className="bg-gradient-to-r from-slate-50 to-emerald-50 p-8 rounded-2xl border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <Brain className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Our Vision for the Future</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                HireGenAI represents just the beginning of a transformative journey. We envision a future where Voice AI becomes the cornerstone of human-AI interaction across multiple domains:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Customer Service</h4>
                  <p className="text-slate-600 text-sm">Natural, empathetic conversations that understand context and emotion</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Education</h4>
                  <p className="text-slate-600 text-sm">Personalized learning experiences with adaptive voice-based tutoring</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Healthcare</h4>
                  <p className="text-slate-600 text-sm">Compassionate virtual assistants for patient support and mental health</p>
                </div>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="bg-emerald-600 text-white p-8 rounded-2xl text-center">
              <h2 className="text-3xl font-bold mb-4">Join Our Journey</h2>
              <p className="text-xl mb-6 text-emerald-100">
                We're building the future of recruitment. Be part of the revolution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button className="bg-white text-emerald-600 hover:bg-gray-100 font-semibold px-8 py-3">
                    Get in Touch
                  </Button>
                </Link>
                <Link href="/demo-en">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-emerald-600 font-semibold px-8 py-3">
                    Try Demo
                  </Button>
                </Link>
              </div>
            </div>
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
                  <a href="/#assessment" className="hover:text-emerald-400 transition-colors">
                    Assessment
                  </a>
                </li>
                <li>
                  <a href="/#faq" className="hover:text-emerald-400 transition-colors">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/about" className="text-emerald-400 font-medium">
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
                  <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </Link>
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
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Imprint
                  </a>
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
