"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Globe, MapPin, Zap, Facebook, Instagram, Youtube, Linkedin, Lock, Star, Loader2, ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Navbar from "@/components/layout/Navbar"

// Google Calendar Appointment Scheduler URL
const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Ni_T4tuyUNQLNvIoBMb-j7niIPJyEUhsBtf3QH8PukeuQZTR0Qbbg962h09DWpSWP0gHK2AA1"

export default function BookMeetingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1) // 1: Form, 2: Google Calendar
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    phoneNumber: '',
    notes: ''
  })

  const handleSaveAndNext = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/meeting-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          workEmail: formData.workEmail,
          companyName: formData.companyName,
          phoneNumber: formData.phoneNumber || null,
          notes: formData.notes || null
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save details')
      }
      
      console.log('✅ Details saved successfully:', data.booking)
      setBookingId(data.booking.id)
      
      toast({
        title: "Details Saved!",
        description: "Now select your preferred time slot from the calendar.",
      })
      
      setStep(2) // Go to Google Calendar
      
    } catch (error: any) {
      console.error('❌ Failed to save details:', error)
      toast({
        title: "Failed to Save",
        description: error.message || "Failed to save details. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-visible min-h-[600px]">
          <div className="flex flex-col lg:flex-row">
            {/* Left Column - Meeting Info */}
            <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 p-8">
              
              {/* Logo */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">H</span>
                </div>
                <span className="text-xl font-bold">
                  <span className="text-slate-800">Hire</span>
                  <span className="text-emerald-500">GenAI</span>
                </span>
              </div>

              {/* Profile */}
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-4 flex items-center justify-center text-white text-2xl font-semibold">
                  T
                </div>
                <p className="text-slate-600 text-sm mb-1">HireGenAI Team</p>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">30 Minute Meeting</h2>
                
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">30 min</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">India Standard Time</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Google Meet</span>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    1
                  </div>
                  <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    2
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Your Details</span>
                  <span>Select Time</span>
                </div>
              </div>
            </div>

            {/* Right Column - Step Content */}
            <div className="flex-1 p-8">
              {/* Step 1: Enter Details Form */}
              {step === 1 && (
                <>
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Enter Your Details</h2>
                  
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="fullName" className="text-slate-700">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="mt-1"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="workEmail" className="text-slate-700">Work Email *</Label>
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
                      <Label htmlFor="companyName" className="text-slate-700">Company Name *</Label>
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
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-slate-700">
                        Please share anything that will help prepare for our meeting.
                      </Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="mt-1 min-h-[100px]"
                        placeholder="Any specific topics you'd like to discuss..."
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={handleSaveAndNext}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                        disabled={!formData.fullName || !formData.workEmail || !formData.companyName || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Save and Next
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Google Calendar Embed */}
              {step === 2 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Select a Date & Time</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStep(1)}
                    >
                      ← Back
                    </Button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Calendar className="w-5 h-5" />
                      <p className="text-sm font-medium">Your details have been saved! Now select your preferred time slot below.</p>
                    </div>
                  </div>

                  {/* Google Calendar Embed */}
                  <div className="rounded-lg overflow-hidden border border-slate-200" style={{ minHeight: '500px' }}>
                    <iframe 
                      src={GOOGLE_CALENDAR_URL}
                      style={{ border: 0, width: '100%', height: '500px' }}
                      frameBorder="0"
                      title="Schedule a Meeting"
                      allow="camera; microphone"
                    />
                  </div>

                  <p className="text-sm text-slate-500 mt-4 text-center">
                    Select your preferred date and time from the calendar above. You'll receive a confirmation email with the meeting details.
                  </p>
                </>
              )}
            </div>
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
