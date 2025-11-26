"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowRight, Mail, MessageSquare, Zap } from "lucide-react"

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    
    // Here you would typically send the form data to your backend
    console.log('Contact form submitted:', formData)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header - Same as Homepage */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <h1 className="text-2xl font-bold">
                    <span className="text-slate-800">Hire</span>
                    <span className="text-emerald-500">GenAI</span>
                  </h1>
                </Link>
              </div>
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <a
                  href="#product"
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

      {/* Announcement Banner - Same as Homepage */}
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

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Info */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6">
              Get in <span className="text-emerald-500">Touch</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              Have questions about HireGenAI? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Email Us</h3>
                  <p className="text-slate-600">support@hire-genai.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Live Chat</h3>
                  <p className="text-slate-600">Available Mon-Fri, 9am-6pm IST</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!submitted ? (
              <>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Leave a Message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-slate-700">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="mt-1"
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-700">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="mt-1"
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-slate-700">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="mt-1"
                      placeholder="How can we help?"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-slate-700">Your Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="mt-1 min-h-[120px]"
                      placeholder="Tell us more about your needs..."
                      required
                    />
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="terms" 
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <Link href="#" className="text-emerald-600 hover:underline">Terms & Conditions</Link>
                      {' '}and{' '}
                      <Link href="#" className="text-emerald-600 hover:underline">Privacy Policy</Link>
                    </Label>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
                    disabled={!agreed}
                  >
                    Send Message
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>

                {/* Promo Note */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-slate-600 text-sm mb-3">
                    <span className="font-semibold text-emerald-600">14-day trial</span> with no upfront payment — pay only when satisfied.
                  </p>
                  <Link href="/signup">
                    <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50">
                      Sign Up Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Message Sent!</h2>
                <p className="text-slate-600 mb-6">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <Link href="/">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Return to Home
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>&copy; 2024 HireGenAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
