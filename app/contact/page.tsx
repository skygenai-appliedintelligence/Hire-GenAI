"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowRight, Mail, MessageSquare, Zap, Facebook, Instagram, Youtube, Linkedin, Lock, Star } from "lucide-react"
import Navbar from "@/components/layout/navbar"

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    phoneNumber: '',
    subject: '',
    message: ''
  })
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          workEmail: formData.workEmail,
          companyName: formData.companyName,
          phoneNumber: formData.phoneNumber,
          subject: formData.subject,
          message: formData.message,
          agreedToTerms: agreed
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit form')
      }

      const result = await response.json()
      console.log('Form submitted successfully:', result)
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <Navbar />
      
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
                    <Label htmlFor="fullName" className="text-slate-700">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="mt-1"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="workEmail" className="text-slate-700">Work Email</Label>
                    <Input
                      id="workEmail"
                      type="email"
                      value={formData.workEmail}
                      onChange={(e) => setFormData({...formData, workEmail: e.target.value})}
                      className="mt-1"
                      placeholder="you@company.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyName" className="text-slate-700">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="mt-1"
                      placeholder="Your company name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-slate-700">Phone Number (Optional)</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      className="mt-1"
                      placeholder="+1 (555) 123-4567"
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
                <a href="https://facebook.com/hiregenai" className="text-slate-400 hover:text-emerald-400 transition-colors" target="_blank" rel="noopener noreferrer">
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
              </div>            </div>

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
                  <a href="#assessment" className="hover:text-emerald-400 transition-colors">
                    Assessment
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-emerald-400 transition-colors">
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
