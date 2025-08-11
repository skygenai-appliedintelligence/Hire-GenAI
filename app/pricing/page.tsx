"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { LoginModal } from "@/components/auth/login-modal"
import { SignupModal } from "@/components/auth/signup-modal"
import Link from "next/link"
import { Check, X, ArrowRight, Star } from "lucide-react"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small teams getting started with AI recruitment",
      monthlyPrice: 49,
      annualPrice: 39,
      features: [
        "Up to 5 active jobs",
        "100 candidate profiles/month",
        "Basic AI screening",
        "Email support",
        "Standard integrations",
        "Basic analytics",
        "Mobile app access",
      ],
      limitations: ["No voice AI interviews", "No advanced analytics", "No custom workflows", "No priority support"],
      popular: false,
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      description: "Ideal for growing companies with advanced recruitment needs",
      monthlyPrice: 149,
      annualPrice: 119,
      features: [
        "Up to 25 active jobs",
        "500 candidate profiles/month",
        "Advanced AI screening",
        "Voice AI interviews (50/month)",
        "Priority email & chat support",
        "All integrations",
        "Advanced analytics & reporting",
        "Custom workflows",
        "Team collaboration tools",
        "API access",
      ],
      limitations: ["Limited voice AI interviews", "No dedicated account manager"],
      popular: true,
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      description: "For large organizations requiring unlimited scale and customization",
      monthlyPrice: 399,
      annualPrice: 319,
      features: [
        "Unlimited active jobs",
        "Unlimited candidate profiles",
        "Advanced AI screening & matching",
        "Unlimited voice AI interviews",
        "24/7 priority support",
        "All integrations + custom",
        "Advanced analytics & BI tools",
        "Custom workflows & automation",
        "White-label options",
        "Dedicated account manager",
        "Custom AI model training",
        "SSO & advanced security",
        "Onboarding & training",
      ],
      limitations: [],
      popular: false,
      cta: "Contact Sales",
    },
  ]

  const addOns = [
    {
      name: "Additional Voice AI Interviews",
      description: "Extra voice AI interview credits beyond your plan limit",
      price: "$2 per interview",
    },
    {
      name: "Custom Integration",
      description: "Connect with your existing HR tools and systems",
      price: "$500 setup + $50/month",
    },
    {
      name: "Advanced Training",
      description: "Personalized onboarding and team training sessions",
      price: "$1,500 one-time",
    },
    {
      name: "Dedicated Success Manager",
      description: "Personal account manager for strategic guidance",
      price: "$500/month",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0">
                <h1 className="text-2xl font-bold">
                  <span className="text-slate-800">Hire</span>
                  <span className="sr-text-gradient">GenAI</span>
                </h1>
              </Link>
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <Link
                  href="/#product"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Product
                </Link>
                <Link
                  href="/#solutions"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Solutions
                </Link>
                <Link
                  href="/pricing"
                  className="text-emerald-600 px-3 py-2 text-sm font-medium border-b-2 border-emerald-600"
                >
                  Pricing
                </Link>
                <Link
                  href="/#resources"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Resources
                </Link>
                <Link
                  href="/#company"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Company
                </Link>
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
              <Button onClick={() => setShowSignupModal(true)} className="sr-button-primary">
                Get started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="sr-hero-bg py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6">
            Simple, transparent <span className="sr-text-gradient">pricing</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Choose the perfect plan for your hiring needs. All plans include our core AI features with no hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-sm font-medium ${!isAnnual ? "text-slate-800" : "text-slate-500"}`}>Monthly</span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-emerald-500" />
            <span className={`text-sm font-medium ${isAnnual ? "text-slate-800" : "text-slate-500"}`}>Annual</span>
            <Badge className="bg-emerald-100 text-emerald-800 ml-2">Save 20%</Badge>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  <CardTitle className="text-2xl font-bold text-slate-800">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-600 mt-2">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <div className="flex items-center justify-center">
                      <span className="text-5xl font-bold text-slate-800">
                        ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-slate-600 ml-2">/month</span>
                    </div>
                    {isAnnual && (
                      <div className="text-sm text-slate-500 mt-1">Billed annually (${plan.annualPrice * 12}/year)</div>
                    )}
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
                    onClick={() => (plan.cta === "Contact Sales" ? null : setShowSignupModal(true))}
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

      {/* Add-ons Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Add-ons & Extensions</h2>
            <p className="text-slate-600">Enhance your plan with additional features and services</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addOns.map((addon, index) => (
              <Card key={index} className="sr-card">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-slate-800">{addon.name}</h3>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                      {addon.price}
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-sm">{addon.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Feature Comparison</h2>
            <p className="text-slate-600">See what's included in each plan</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-slate-800">Features</th>
                  <th className="text-center py-4 px-6 font-semibold text-slate-800">Starter</th>
                  <th className="text-center py-4 px-6 font-semibold text-slate-800">Professional</th>
                  <th className="text-center py-4 px-6 font-semibold text-slate-800">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Active Jobs</td>
                  <td className="py-4 px-6 text-center text-slate-600">5</td>
                  <td className="py-4 px-6 text-center text-slate-600">25</td>
                  <td className="py-4 px-6 text-center text-slate-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Candidate Profiles/Month</td>
                  <td className="py-4 px-6 text-center text-slate-600">100</td>
                  <td className="py-4 px-6 text-center text-slate-600">500</td>
                  <td className="py-4 px-6 text-center text-slate-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">AI Screening</td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Voice AI Interviews</td>
                  <td className="py-4 px-6 text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center text-slate-600">50/month</td>
                  <td className="py-4 px-6 text-center text-slate-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Advanced Analytics</td>
                  <td className="py-4 px-6 text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Custom Workflows</td>
                  <td className="py-4 px-6 text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">API Access</td>
                  <td className="py-4 px-6 text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Dedicated Support</td>
                  <td className="py-4 px-6 text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto" />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
              onClick={() => setShowSignupModal(true)}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <Link href="/">
                <h3 className="text-2xl font-bold mb-4">
                  <span className="text-white">Hire</span>
                  <span className="text-emerald-400">GenAI</span>
                </h3>
              </Link>
              <p className="text-slate-400 mb-6 max-w-md">
                The future of recruitment is here. Automate your hiring process with AI and transform how you discover,
                evaluate, and hire top talent.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Product</h4>
              <ul className="space-y-3 text-slate-400">
                <li>
                  <Link href="/#product" className="hover:text-emerald-400 transition-colors">
                    Features
                  </Link>
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
      <SignupModal open={showSignupModal} onClose={() => setShowSignupModal(false)} />
    </div>
  )
}
