"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/layout/navbar"
import Link from "next/link"
import { Check, X, ArrowRight, Star, Facebook, Instagram, Youtube, Linkedin, Lock } from "lucide-react"

export default function PricingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

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

  const plans = [
    {
      name: "Free Trial",
      description: "Try HireGenAI with core features. No credit card required",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "1 Job Description",
        "1 CV Parsing",
        "1 AI Interview",
        "Usage rates: CV Parsing $0.50 per CV",
        "Usage rates: AI Interview $0.50 per minute",
        "Usage rates: Question Generation $0.10 per 10 questions",
      ],
      limitations: [
        "Limited access only",
        "Watermarked reports",
      ],
      popular: false,
      cta: "Start Free Trial",
    },
    {
      name: "$100 Pro",
      description: "Full platform access for growing teams",
      monthlyPrice: 100,
      annualPrice: 100,
      features: [
        "Multiple job postings",
        "500 candidate profiles/month",
        "Advanced AI screening & ranking",
        "Voice/Video AI interviews",
        "Detailed analytics & reports",
        "Usage rates: CV Parsing $0.50 per CV",
        "Usage rates: AI Interview $0.50 per minute",
        "Usage rates: Question Generation $0.10 per 10 questions",
      ],
      limitations: [],
      popular: true,
      cta: "Choose Pro",
    },
  ]

  // add-ons removed

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="sr-hero-bg py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6">
            Simple, transparent <span className="sr-text-gradient">pricing</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Choose the perfect plan for your hiring needs. All plans include our core AI features with no hidden fees.
          </p>

          {/* Billing Toggle removed */}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`sr-card relative ${plan.popular ? "ring-2 ring-emerald-500 scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  {plan.name !== "$100 Pro" && (
                    <CardTitle className="text-2xl font-bold text-slate-800">{plan.name}</CardTitle>
                  )}
                  <CardDescription className="text-slate-600 mt-2">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <div className="flex items-center justify-center">
                      <span className="text-5xl font-bold text-slate-800">${plan.monthlyPrice}</span>
                      <span className="text-slate-600 ml-2">/month</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, limitationIndex) => (
                      <div key={limitationIndex} className="flex items-start space-x-3">
                        <X className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-500 text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    className={`w-full ${plan.popular ? "sr-button-primary" : "sr-button-secondary"}`}
                    onClick={() => (plan.cta === "Contact Sales" ? null : setShowLoginModal(true))}
                  >
                    {plan.cta}
                    {plan.cta !== "Contact Sales" && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons Section removed */}

      {/* Features Comparison removed */}

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600">Everything you need to know about our pricing</p>
          </div>

          <div className="space-y-6">
            <Card className="sr-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-2">Can I change my plan anytime?</h3>
                <p className="text-slate-600">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll
                  prorate the billing accordingly.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-2">Is there a free trial?</h3>
                <p className="text-slate-600">
                  Yes, we offer a 14-day free trial for all plans. No credit card required to start your trial.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-2">What happens if I exceed my plan limits?</h3>
                <p className="text-slate-600">
                  We'll notify you when you're approaching your limits. You can either upgrade your plan or purchase
                  additional credits as needed.
                </p>
              </CardContent>
            </Card>

            <Card className="sr-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-800 mb-2">Do you offer custom enterprise solutions?</h3>
                <p className="text-slate-600">
                  Yes, we work with large enterprises to create custom solutions that fit their specific needs. Contact
                  our sales team to discuss your requirements.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sr-gradient text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl mb-8 text-emerald-100">
            Join thousands of companies transforming their hiring process with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-emerald-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg rounded-full"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-emerald-600 font-semibold px-8 py-4 text-lg rounded-full bg-transparent"
            >
              Contact Sales
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

      </div>
  )
}
