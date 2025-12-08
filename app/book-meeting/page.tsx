"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Clock, Globe, Calendar, MapPin, ArrowLeft, Zap, Facebook, Instagram, Youtube, Linkedin, Lock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { LoginModal } from "@/components/auth/login-modal"

// Helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Convert to Monday-first (0 = Monday)
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  })
}

const formatShortDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric'
  })
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const TIME_SLOTS = [
  '5:00pm', '5:30pm', '6:00pm', '6:30pm', '7:00pm', '7:30pm', '8:00pm', '8:30pm', '9:00pm'
]

export default function BookMeetingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Calendar, 2: Time, 3: Details, 4: Confirmation
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    phoneNumber: '',
    location: 'google-meet-1',
    notes: ''
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleDateSelect = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    if (date >= today) {
      setSelectedDate(date)
      setStep(2) // Show time slots
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleNext = () => {
    if (selectedDate && selectedTime) {
      setStep(3) // Go to Enter Details form
    }
  }

  const handleBack = () => {
    if (step === 3) {
      setStep(2)
    } else if (step === 4) {
      setStep(3)
    }
  }

  const handleSchedule = () => {
    // Here you would typically send the booking data to your backend
    setStep(4)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
      const isPast = date < today
      const isAvailable = !isPast && date.getDay() !== 0 && date.getDay() !== 6 // Weekdays only

      days.push(
        <button
          key={day}
          onClick={() => isAvailable && handleDateSelect(day)}
          disabled={!isAvailable}
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
            ${isSelected ? 'bg-blue-600 text-white' : ''}
            ${!isSelected && isAvailable ? 'hover:bg-blue-100 text-slate-700' : ''}
            ${isPast || !isAvailable ? 'text-slate-300 cursor-not-allowed' : 'cursor-pointer'}
            ${isToday && !isSelected ? 'border-2 border-blue-600' : ''}
          `}
        >
          {day}
        </button>
      )
    }

    return days
  }

  const getEndTime = (startTime: string) => {
    const [time, period] = startTime.split(/(?=[ap]m)/i)
    const [hours, minutes] = time.split(':').map(Number)
    let endHours = hours
    let endMinutes = minutes + 30
    
    if (endMinutes >= 60) {
      endMinutes -= 60
      endHours += 1
    }
    
    let endPeriod = period
    if (endHours === 12 && period.toLowerCase() === 'pm') {
      endPeriod = 'pm'
    } else if (endHours > 12) {
      endHours -= 12
      endPeriod = 'pm'
    }
    
    return `${endHours}:${endMinutes.toString().padStart(2, '0')}${endPeriod}`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Same as Homepage */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <h1 className="text-2xl font-bold">
                    <span className="text-slate-800">Hire</span>
                    <span className="sr-text-gradient">GenAI</span>
                  </h1>
                </Link>
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-visible min-h-[600px]">
          <div className="flex flex-col lg:flex-row">
            {/* Left Column - Meeting Info (Hidden on Step 4) */}
            {step !== 4 && (
              <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 p-8">
                {step >= 3 && (
                  <button 
                    onClick={handleBack}
                    className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                
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

                  {step >= 3 && selectedDate && selectedTime && (
                    <>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {selectedTime} - {getEndTime(selectedTime)}, {formatShortDate(selectedDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">India Standard Time</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Google Meet</span>
                  </div>
                </div>

                <div className="mt-auto pt-8">
                  <a href="#" className="text-blue-600 text-sm hover:underline">Cookie settings</a>
                </div>
              </div>
            )}

            {/* Right Column - Step Content */}
            <div className={`flex-1 p-8 ${step === 4 ? 'w-full' : ''}`}>
              {/* Step 1 & 2: Calendar and Time Selection */}
              {(step === 1 || step === 2) && (
                <>
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Select a Date & Time</h2>
                  
                  <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
                    {/* Calendar */}
                    <div className="flex-1">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-center gap-4 mb-6">
                        <button 
                          onClick={handlePrevMonth}
                          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <span className="text-lg font-semibold text-slate-800 min-w-[160px] text-center">
                          {MONTHS[currentMonth]} {currentYear}
                        </span>
                        <button 
                          onClick={handleNextMonth}
                          className="p-1 hover:bg-slate-100 rounded-full transition-colors bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Day Names */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(day => (
                          <div key={day} className="h-10 flex items-center justify-center text-xs font-medium text-slate-500">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                      </div>

                      {/* Timezone */}
                      <div className="mt-6 pt-4 border-t">
                        <p className="text-sm font-medium text-slate-700 mb-2">Time zone</p>
                        <button className="flex items-center gap-2 text-slate-600 text-sm hover:text-slate-800">
                          <Globe className="w-4 h-4" />
                          <span>India Standard Time (5:45pm)</span>
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </button>
                      </div>
                    </div>

                    {/* Time Slots - Show when date is selected */}
                    {selectedDate && (
                      <div className="lg:w-64 lg:border-l lg:pl-6 flex flex-col">
                        <p className="font-semibold text-slate-800 mb-4">
                          {formatShortDate(selectedDate).split(',')[0]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
                        </p>
                        <div className="space-y-2">
                          {TIME_SLOTS.map(time => (
                            <div key={time} className="flex gap-2 items-center">
                              <button
                                onClick={() => handleTimeSelect(time)}
                                className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all min-w-[80px]
                                  ${selectedTime === time 
                                    ? 'bg-slate-800 text-white border-slate-800' 
                                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                                  }
                                `}
                              >
                                {time}
                              </button>
                              {selectedTime === time && (
                                <Button 
                                  onClick={handleNext}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 whitespace-nowrap flex-shrink-0 min-w-[60px]"
                                >
                                  Next
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Step 3: Enter Details */}
              {step === 3 && (
                <>
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Enter Details</h2>
                  
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
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-700">Location *</Label>
                      <RadioGroup 
                        value={formData.location} 
                        onValueChange={(value) => setFormData({...formData, location: value})}
                        className="mt-2 space-y-2"
                      >
                        <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                          <RadioGroupItem value="google-meet-1" id="meet-1" />
                          <div className="flex items-center gap-2">
                            {/* Google Meet Icon */}
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                              <rect x="2" y="4" width="14" height="16" rx="2" fill="#00AC47"/>
                              <path d="M16 8L22 4V20L16 16V8Z" fill="#00832D"/>
                              <rect x="5" y="9" width="8" height="6" rx="1" fill="white"/>
                            </svg>
                            <Label htmlFor="meet-1" className="cursor-pointer text-slate-700">Google Meet</Label>
                          </div>
                        </div>
                      </RadioGroup>
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
                        onClick={handleSchedule}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                        disabled={!formData.fullName || !formData.workEmail || !formData.companyName}
                      >
                        Schedule Event
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Confirmation */}
              {step === 4 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">You're Scheduled!</h2>
                  <p className="text-slate-600 mb-6">A calendar invitation has been sent to your email.</p>
                  
                  <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
                    <h3 className="font-semibold text-slate-800 mb-3">30 Minute Meeting</h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{selectedDate && formatDate(selectedDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{selectedTime} - {selectedTime && getEndTime(selectedTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>India Standard Time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="4" width="14" height="16" rx="2" fill="#00AC47"/>
                          <path d="M16 8L22 4V20L16 16V8Z" fill="#00832D"/>
                          <rect x="5" y="9" width="8" height="6" rx="1" fill="white"/>
                        </svg>
                        <span>Google Meet</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" className="gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-1.5 17.25l-4.5-4.5 1.05-1.05 3.45 3.45 7.5-7.5 1.05 1.05-8.55 8.55z"/>
                      </svg>
                      Add to Google Calendar
                    </Button>
                    <Button variant="outline" className="gap-2">
                      Add to Outlook
                    </Button>
                    <Button variant="outline" className="gap-2">
                      Add to Apple Calendar
                    </Button>
                  </div>

                  <p className="text-slate-500 text-sm mt-8">We're looking forward to meeting you!</p>
                  
                  <Link href="/">
                    <Button variant="link" className="mt-4 text-blue-600">
                      Return to Home
                    </Button>
                  </Link>
                </div>
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

      {/* Modals */}
      <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}
