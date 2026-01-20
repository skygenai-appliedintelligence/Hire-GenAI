'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/Navbar'
import { 
  Calculator, 
  ChartLine, 
  Brain, 
  Expand, 
  GraduationCap, 
  Zap, 
  DollarSign, 
  Clock, 
  BarChart3,
  Infinity,
  SlidersHorizontal,
  UserCheck,
  Bot,
  PieChart,
  PiggyBank,
  Crown,
  Shield,
  Rocket,
  Info,
  RotateCcw,
  TrendingUp,
  Linkedin,
  Twitter,
  Github,
  Mail,
  Phone,
  MapPin,
  Globe,
  Facebook,
  Instagram,
  Youtube,
  Star,
  Lock
} from 'lucide-react'

// Currency configuration based on country
const CURRENCY_CONFIG: Record<string, { code: string; symbol: string; rate: number; locale: string }> = {
  US: { code: 'USD', symbol: '$', rate: 1, locale: 'en-US' },
  IN: { code: 'INR', symbol: '₹', rate: 83.5, locale: 'en-IN' },
  SG: { code: 'SGD', symbol: 'S$', rate: 1.35, locale: 'en-SG' },
  GB: { code: 'GBP', symbol: '£', rate: 0.79, locale: 'en-GB' },
  EU: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE' },
  AE: { code: 'AED', symbol: 'د.إ', rate: 3.67, locale: 'ar-AE' },
  AU: { code: 'AUD', symbol: 'A$', rate: 1.55, locale: 'en-AU' },
  CA: { code: 'CAD', symbol: 'C$', rate: 1.36, locale: 'en-CA' },
  JP: { code: 'JPY', symbol: '¥', rate: 149, locale: 'ja-JP' },
  CN: { code: 'CNY', symbol: '¥', rate: 7.24, locale: 'zh-CN' },
  PK: { code: 'PKR', symbol: '₨', rate: 278, locale: 'en-PK' },
  BD: { code: 'BDT', symbol: '৳', rate: 110, locale: 'bn-BD' },
  MY: { code: 'MYR', symbol: 'RM', rate: 4.72, locale: 'ms-MY' },
  PH: { code: 'PHP', symbol: '₱', rate: 56, locale: 'en-PH' },
  ID: { code: 'IDR', symbol: 'Rp', rate: 15800, locale: 'id-ID' },
  TH: { code: 'THB', symbol: '฿', rate: 35.5, locale: 'th-TH' },
  VN: { code: 'VND', symbol: '₫', rate: 24500, locale: 'vi-VN' },
  KR: { code: 'KRW', symbol: '₩', rate: 1320, locale: 'ko-KR' },
  SA: { code: 'SAR', symbol: 'ر.س', rate: 3.75, locale: 'ar-SA' },
  ZA: { code: 'ZAR', symbol: 'R', rate: 18.5, locale: 'en-ZA' },
  BR: { code: 'BRL', symbol: 'R$', rate: 4.95, locale: 'pt-BR' },
  MX: { code: 'MXN', symbol: '$', rate: 17.2, locale: 'es-MX' },
  NZ: { code: 'NZD', symbol: 'NZ$', rate: 1.67, locale: 'en-NZ' },
  CH: { code: 'CHF', symbol: 'CHF', rate: 0.88, locale: 'de-CH' },
  HK: { code: 'HKD', symbol: 'HK$', rate: 7.82, locale: 'zh-HK' },
  // European countries
  DE: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE' },
  FR: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'fr-FR' },
  IT: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'it-IT' },
  ES: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'es-ES' },
  NL: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'nl-NL' },
  BE: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'nl-BE' },
  AT: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-AT' },
  IE: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'en-IE' },
  PT: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'pt-PT' },
  FI: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'fi-FI' },
  SE: { code: 'SEK', symbol: 'kr', rate: 10.5, locale: 'sv-SE' },
  NO: { code: 'NOK', symbol: 'kr', rate: 10.8, locale: 'nb-NO' },
  DK: { code: 'DKK', symbol: 'kr', rate: 6.9, locale: 'da-DK' },
  PL: { code: 'PLN', symbol: 'zł', rate: 4.0, locale: 'pl-PL' },
}

export default function ROIPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  // Currency state
  const [userCountry, setUserCountry] = useState<string>('US')
  const [currencyConfig, setCurrencyConfig] = useState(CURRENCY_CONFIG['US'])
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)

  useEffect(() => {
    const scrollTo = searchParams?.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/roi')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Input states
  const [jobPostings, setJobPostings] = useState(5)
  const [cvsPerJob, setCvsPerJob] = useState(100)
  const [months, setMonths] = useState(12)

  // Human recruiter inputs
  const [humanCvTime, setHumanCvTime] = useState(5)
  const [humanHourlyRate, setHumanHourlyRate] = useState(45)
  const [humanShortlistRate, setHumanShortlistRate] = useState(15)
  const [humanInterviewTime, setHumanInterviewTime] = useState(45)
  const [humanQualifiedRate, setHumanQualifiedRate] = useState(30)

  // AI recruiter inputs
  const [aiCvCost] = useState(0.5)
  const [aiInterviewCost] = useState(0.5)
  const [aiShortlistRate, setAiShortlistRate] = useState(20)
  const [aiInterviewTime] = useState(30)
  const [aiQualifiedRate, setAiQualifiedRate] = useState(40)

  // Calculate all values
  const calculations = useMemo(() => {
    const totalCvsPerMonth = jobPostings * cvsPerJob
    const totalCvsOverall = totalCvsPerMonth * months

    // Human calculations (with 30% overhead for benefits)
    const humanEffectiveHourlyRate = humanHourlyRate * 1.3
    const humanCvCostPerMonth = totalCvsPerMonth * (humanCvTime / 60) * humanEffectiveHourlyRate
    const humanInterviewsPerMonth = totalCvsPerMonth * (humanShortlistRate / 100)
    const humanInterviewCostPerMonth = humanInterviewsPerMonth * (humanInterviewTime / 60) * humanEffectiveHourlyRate

    // Add turnover and training costs (15% of total)
    const humanTotalPerMonth = (humanCvCostPerMonth + humanInterviewCostPerMonth) * 1.15
    const humanTotalOverall = humanTotalPerMonth * months
    const humanQualifiedPerMonth = humanInterviewsPerMonth * (humanQualifiedRate / 100)
    const humanQualifiedOverall = humanQualifiedPerMonth * months

    // AI calculations
    const aiCvCostPerMonth = totalCvsPerMonth * aiCvCost
    const aiInterviewsPerMonth = totalCvsPerMonth * (aiShortlistRate / 100)
    const aiInterviewCostPerMonth = aiInterviewsPerMonth * aiInterviewTime * aiInterviewCost
    const aiTotalPerMonth = aiCvCostPerMonth + aiInterviewCostPerMonth
    const aiTotalOverall = aiTotalPerMonth * months
    const aiQualifiedPerMonth = aiInterviewsPerMonth * (aiQualifiedRate / 100)
    const aiQualifiedOverall = aiQualifiedPerMonth * months

    // Savings
    const savings = humanTotalOverall - aiTotalOverall
    const savingsPercentage = humanTotalOverall > 0 ? Math.round((savings / humanTotalOverall) * 100) : 0
    const monthlySavingsValue = savings / months

    // Scalability factor
    const totalVolume = jobPostings * cvsPerJob
    let scalabilityFactor = '1x'
    if (totalVolume <= 100) scalabilityFactor = '1x'
    else if (totalVolume <= 500) scalabilityFactor = '3x'
    else if (totalVolume <= 1000) scalabilityFactor = '5x'
    else if (totalVolume <= 2000) scalabilityFactor = '10x'
    else scalabilityFactor = '20x+'

    // ROI percentage
    const baseROI = 85
    const volumeBonus = Math.min(15, Math.floor(totalVolume / 100))
    const totalROI = baseROI + volumeBonus

    return {
      totalCvsOverall,
      totalInterviews: Math.round(humanInterviewsPerMonth * months),
      totalQualified: Math.round(humanQualifiedOverall),
      humanCvCostTotal: humanCvCostPerMonth * months,
      humanInterviewCostTotal: humanInterviewCostPerMonth * months,
      humanTotalOverall,
      humanPerCandidate: humanQualifiedOverall > 0 ? humanTotalOverall / humanQualifiedOverall : 0,
      aiCvCostTotal: aiCvCostPerMonth * months,
      aiInterviewCostTotal: aiInterviewCostPerMonth * months,
      aiTotalOverall,
      aiPerCandidate: aiQualifiedOverall > 0 ? aiTotalOverall / aiQualifiedOverall : 0,
      savings,
      savingsPercentage,
      monthlySavingsValue,
      scalabilityFactor,
      totalROI
    }
  }, [jobPostings, cvsPerJob, months, humanCvTime, humanHourlyRate, humanShortlistRate, humanInterviewTime, humanQualifiedRate, aiCvCost, aiInterviewCost, aiShortlistRate, aiInterviewTime, aiQualifiedRate])

  // Detect user's country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Use free IP geolocation API
        const response = await fetch('https://ipapi.co/json/')
        if (response.ok) {
          const data = await response.json()
          const countryCode = data.country_code || 'US'
          setUserCountry(countryCode)
          
          // Set currency config based on country
          if (CURRENCY_CONFIG[countryCode]) {
            setCurrencyConfig(CURRENCY_CONFIG[countryCode])
          } else {
            // Default to USD for unknown countries
            setCurrencyConfig(CURRENCY_CONFIG['US'])
          }
        }
      } catch (error) {
        console.log('Could not detect location, using USD')
        setCurrencyConfig(CURRENCY_CONFIG['US'])
      } finally {
        setIsLoadingLocation(false)
      }
    }
    
    detectCountry()
  }, [])

  // Handle manual currency change
  const handleCurrencyChange = (countryCode: string) => {
    setUserCountry(countryCode)
    setCurrencyConfig(CURRENCY_CONFIG[countryCode] || CURRENCY_CONFIG['US'])
  }

  const resetToDefaults = () => {
    setJobPostings(5)
    setCvsPerJob(100)
    setMonths(12)
    setHumanCvTime(5)
    setHumanHourlyRate(45)
    setHumanShortlistRate(15)
    setHumanInterviewTime(45)
    setHumanQualifiedRate(30)
    setAiShortlistRate(20)
    setAiQualifiedRate(40)
  }

  // Format currency based on user's location
  const formatCurrency = (valueInUSD: number) => {
    const convertedValue = valueInUSD * currencyConfig.rate
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(convertedValue)
  }
  
  // Format small amounts (for per-CV costs etc.)
  const formatSmallCurrency = (valueInUSD: number) => {
    const convertedValue = valueInUSD * currencyConfig.rate
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedValue)
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl sm:rounded-3xl p-6 sm:p-12 mb-8 sm:mb-12 text-white overflow-hidden border border-emerald-500/20">
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-emerald-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full font-bold flex items-center gap-1 sm:gap-2 shadow-lg text-sm sm:text-base">
            <ChartLine className="w-5 h-5" />
            ROI: Up to {calculations.totalROI}%
          </div>
          
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 flex flex-wrap items-center gap-2 sm:gap-3 pr-16 sm:pr-20">
            <Bot className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-emerald-400 flex-shrink-0" />
            <span className="break-words">AI Recruiter <span className="text-emerald-400">ROI Calculator</span></span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl opacity-90 max-w-3xl mb-4 sm:mb-8 text-slate-200">
            Your Permanent Hiring Expert That Scales With Your Needs & Retains Institutional Knowledge
          </p>

          {/* AI Permanent Banner */}
          <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-8 border-2 border-emerald-500/30 max-w-4xl mb-4 sm:mb-8">
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-4 flex flex-wrap items-center gap-2 text-emerald-300">
              <Infinity className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="break-words">AI Recruiter: Your Permanent Scalable Resource</span>
            </h3>
            <p className="opacity-90 mb-4 sm:mb-6 text-slate-200 text-sm sm:text-base">
              Unlike human recruiters who leave, our AI becomes a permanent asset that grows smarter over time, retaining all organizational knowledge and scaling instantly with your hiring demands.
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center border border-emerald-500/20">
                <Brain className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-emerald-300" />
                <div className="font-medium text-slate-200 text-sm sm:text-base">Knowledge Retention</div>
              </div>
              <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center border border-emerald-500/20">
                <Expand className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-emerald-300" />
                <div className="font-medium text-slate-200 text-sm sm:text-base">Instant Scalability</div>
              </div>
              <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center border border-emerald-500/20">
                <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-emerald-300" />
                <div className="font-medium text-slate-200 text-sm sm:text-base">Continuous Learning</div>
              </div>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Globe className="w-5 h-5 text-emerald-300" />
            <span className="text-slate-300 text-sm">Currency:</span>
            <select
              value={userCountry}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 max-w-[120px] sm:max-w-none"
            >
              <option value="US" className="bg-slate-800">🇺🇸 USD ($)</option>
              <option value="IN" className="bg-slate-800">🇮🇳 INR (₹)</option>
              <option value="SG" className="bg-slate-800">🇸🇬 SGD (S$)</option>
              <option value="GB" className="bg-slate-800">🇬🇧 GBP (£)</option>
              <option value="DE" className="bg-slate-800">🇪🇺 EUR (€)</option>
              <option value="AE" className="bg-slate-800">🇦🇪 AED (د.إ)</option>
              <option value="AU" className="bg-slate-800">🇦🇺 AUD (A$)</option>
              <option value="CA" className="bg-slate-800">🇨🇦 CAD (C$)</option>
              <option value="JP" className="bg-slate-800">🇯🇵 JPY (¥)</option>
              <option value="CN" className="bg-slate-800">🇨🇳 CNY (¥)</option>
              <option value="PK" className="bg-slate-800">🇵🇰 PKR (₨)</option>
              <option value="MY" className="bg-slate-800">🇲🇾 MYR (RM)</option>
              <option value="SA" className="bg-slate-800">🇸🇦 SAR (ر.س)</option>
              <option value="BR" className="bg-slate-800">🇧🇷 BRL (R$)</option>
              <option value="MX" className="bg-slate-800">🇲🇽 MXN ($)</option>
              <option value="CH" className="bg-slate-800">🇨🇭 CHF</option>
              <option value="HK" className="bg-slate-800">🇭🇰 HKD (HK$)</option>
              <option value="KR" className="bg-slate-800">🇰🇷 KRW (₩)</option>
              <option value="SE" className="bg-slate-800">🇸🇪 SEK (kr)</option>
              <option value="ZA" className="bg-slate-800">🇿🇦 ZAR (R)</option>
            </select>
            {isLoadingLocation && (
              <span className="text-emerald-300 text-xs animate-pulse">Detecting location...</span>
            )}
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-emerald-500/20 text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200">Process CVs 10x faster</span>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-emerald-500/20 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200 break-words">{formatSmallCurrency(0.50)}/CV + {formatSmallCurrency(0.50)}/min</span>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-emerald-500/20 text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200">24/7 availability</span>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-emerald-500/20 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-slate-200">Knowledge stays forever</span>
            </div>
          </div>
        </div>

        {/* Calculator Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-600 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-emerald-100 flex items-center gap-3">
              <SlidersHorizontal className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              Job & Recruitment Parameters
            </h2>

            {/* Scalability Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-dashed border-emerald-300">
              <h4 className="font-bold text-emerald-600 mb-2 flex items-center gap-2">
                <ChartLine className="w-5 h-5" />
                Scalability Simulation
              </h4>
              <p className="text-sm text-gray-600">
                See how AI instantly scales with your hiring volume fluctuations while maintaining consistent quality and cost efficiency.
              </p>
            </div>

            {/* Job Postings Slider */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Number of Job Postings per Month
              </label>
              <div className="flex items-center gap-2 sm:gap-4">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={jobPostings}
                  onChange={(e) => setJobPostings(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="min-w-[40px] sm:min-w-[50px] font-bold text-emerald-600 text-base sm:text-lg">{jobPostings}</span>
              </div>
            </div>

            {/* CVs per Job Slider */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Average CVs Received per Job Posting
              </label>
              <div className="flex items-center gap-2 sm:gap-4">
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={cvsPerJob}
                  onChange={(e) => setCvsPerJob(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="min-w-[40px] sm:min-w-[50px] font-bold text-emerald-600 text-base sm:text-lg">{cvsPerJob}</span>
              </div>
            </div>

            {/* Human Recruiter Section */}
            <h3 className="text-base sm:text-lg font-bold text-emerald-600 mt-6 sm:mt-8 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-emerald-50 flex items-center gap-2 sm:gap-3">
              <UserCheck className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              Human Recruiter Limitations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-sm">
                  Minutes to Review 1 CV
                </label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={humanCvTime}
                    onChange={(e) => setHumanCvTime(parseInt(e.target.value) || 1)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="bg-gray-100 px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600">min</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-sm">
                  Hourly Rate + Benefits
                </label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="15"
                    max="100"
                    value={humanHourlyRate}
                    onChange={(e) => setHumanHourlyRate(parseInt(e.target.value) || 15)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="bg-gray-100 px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600">{currencyConfig.symbol}/hr</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">≈ {formatSmallCurrency(humanHourlyRate)}/hr</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-xs sm:text-sm">
                  % CVs Shortlisted for Interview
                </label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={humanShortlistRate}
                    onChange={(e) => setHumanShortlistRate(parseInt(e.target.value) || 1)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm"
                  />
                  <span className="bg-gray-100 px-2 sm:px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-xs sm:text-sm">
                  Interview Time per Candidate
                </label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={humanInterviewTime}
                    onChange={(e) => setHumanInterviewTime(parseInt(e.target.value) || 10)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm"
                  />
                  <span className="bg-gray-100 px-2 sm:px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-sm">min</span>
                </div>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm">
                % Candidates Qualified After Interview
              </label>
              <div className="flex max-w-[200px]">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={humanQualifiedRate}
                  onChange={(e) => setHumanQualifiedRate(parseInt(e.target.value) || 1)}
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none"
                />
                <span className="bg-gray-100 px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600">%</span>
              </div>
            </div>

            {/* AI Recruiter Section */}
            <h3 className="text-base sm:text-lg font-bold text-emerald-600 mt-6 sm:mt-8 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-emerald-50 flex items-center gap-2 sm:gap-3">
              <Bot className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              AI Recruiter Advantages
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-sm">
                  Cost per CV Evaluation
                </label>
                <div className="flex w-full">
                  <input
                    type="text"
                    value={formatSmallCurrency(aiCvCost)}
                    disabled
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg bg-emerald-50 text-emerald-700 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-sm">
                  Cost per Interview Minute
                </label>
                <div className="flex w-full">
                  <input
                    type="text"
                    value={`${formatSmallCurrency(aiInterviewCost)}/min`}
                    disabled
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg bg-emerald-50 text-emerald-700 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-xs sm:text-sm">
                  % CVs Shortlisted for Interview
                </label>
                <div className="flex w-full">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={aiShortlistRate}
                    onChange={(e) => setAiShortlistRate(parseInt(e.target.value) || 1)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none text-sm"
                  />
                  <span className="bg-gray-100 px-2 sm:px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2 text-xs sm:text-sm">
                  AI Interview Time per Candidate
                </label>
                <div className="flex w-full">
                  <input
                    type="number"
                    value={aiInterviewTime}
                    disabled
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg bg-gray-50 text-gray-500 text-sm"
                  />
                  <span className="bg-gray-100 px-2 sm:px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600 text-sm">min</span>
                </div>
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm">
                % Candidates Qualified After Interview
              </label>
              <div className="flex max-w-[200px]">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={aiQualifiedRate}
                  onChange={(e) => setAiQualifiedRate(parseInt(e.target.value) || 1)}
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-emerald-500 focus:outline-none"
                />
                <span className="bg-gray-100 px-3 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg text-gray-600">%</span>
              </div>
            </div>

            {/* Time Period Slider */}
            <div className="mb-4 sm:mb-6">
              <label className="block font-semibold text-gray-700 mb-2 text-sm sm:text-base">
                Time Period for Calculation
              </label>
              <div className="flex items-center gap-2 sm:gap-4">
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="min-w-[60px] sm:min-w-[80px] font-bold text-emerald-600 text-base sm:text-lg">{months} months</span>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all text-sm sm:text-base"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default Values
            </button>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-emerald-600 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-emerald-100 flex items-center gap-3">
              <PieChart className="w-5 sm:w-6 h-5 sm:h-6 bg-emerald-50 p-1 rounded-lg" />
              Cost Analysis & Results
            </h2>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-emerald-100">
                <div className="text-sm text-gray-600 mb-1">Total CVs Processed</div>
                <div className="text-2xl font-bold text-emerald-600">{calculations.totalCvsOverall.toLocaleString()}</div>
                <div className="text-xs text-gray-500">in {months} months</div>
              </div>
              <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-emerald-100">
                <div className="text-sm text-gray-600 mb-1">Interviews Conducted</div>
                <div className="text-2xl font-bold text-emerald-600">{calculations.totalInterviews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">in {months} months</div>
              </div>
              <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-emerald-100">
                <div className="text-sm text-gray-600 mb-1">Qualified Candidates</div>
                <div className="text-2xl font-bold text-emerald-600">{calculations.totalQualified.toLocaleString()}</div>
                <div className="text-xs text-gray-500">in {months} months</div>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Human Cost */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border-2 border-red-200">
                <div className="text-base sm:text-lg font-bold text-gray-700 mb-1 sm:mb-2">Human Recruiter</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-500 mb-1 sm:mb-2">{formatCurrency(calculations.humanTotalOverall)}</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">~{formatCurrency(calculations.humanPerCandidate)} per qualified candidate</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-red-200">
                    <span className="text-xs sm:text-sm">CV Screening Cost</span>
                    <span className="text-xs sm:text-sm">{formatCurrency(calculations.humanCvCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-red-200">
                    <span className="text-xs sm:text-sm">Interview Cost</span>
                    <span className="text-xs sm:text-sm">{formatCurrency(calculations.humanInterviewCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-red-500 border-t-2 border-red-300 mt-2">
                    <span className="text-xs sm:text-sm">Total Cost</span>
                    <span className="text-xs sm:text-sm">{formatCurrency(calculations.humanTotalOverall)}</span>
                  </div>
                </div>
              </div>

              {/* AI Cost */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold">
                  Permanent Resource
                </div>
                <div className="text-base sm:text-lg font-bold text-gray-700 mb-1 sm:mb-2">AI Recruiter</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-500 mb-1 sm:mb-2">{formatCurrency(calculations.aiTotalOverall)}</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">~${calculations.aiPerCandidate.toFixed(1)} per qualified candidate</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-green-200">
                    <span className="text-xs sm:text-sm">CV Screening Cost</span>
                    <span className="text-xs sm:text-sm">{formatCurrency(calculations.aiCvCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-green-200">
                    <span className="text-xs sm:text-sm">Interview Cost</span>
                    <span className="text-xs sm:text-sm">{formatCurrency(calculations.aiInterviewCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-green-500 border-t-2 border-green-300 mt-2">
                    <span className="text-xs sm:text-sm">Total Cost</span>
                    <span className="text-xs sm:text-sm">{formatCurrency(calculations.aiTotalOverall)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Container */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl p-5 sm:p-8 text-white text-center shadow-lg">
              <div className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center justify-center gap-2">
                <PiggyBank className="w-5 h-5 sm:w-7 sm:h-7" />
                Your Potential Savings with AI
              </div>

              <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">
                {formatCurrency(calculations.savings)}
              </div>
              <div className="text-base sm:text-xl mb-4 sm:mb-6 opacity-90">
                ({calculations.savingsPercentage}% cost reduction)
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6 max-w-lg mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
                  <div className="text-xs sm:text-sm mb-1 opacity-75">Monthly Savings</div>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(calculations.monthlySavingsValue)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
                  <div className="text-xs sm:text-sm mb-1 opacity-75">Scalability Factor</div>
                  <div className="text-xl sm:text-2xl font-bold">{calculations.scalabilityFactor}</div>
                </div>
              </div>

            </div>

            {/* AI Permanent Resource Advantages */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-emerald-600 text-center mb-6">AI Permanent Resource Advantages</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-emerald-100 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Knowledge Retention</div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600">100%</div>
                  <div className="text-xs text-gray-500">Zero knowledge loss</div>
                </div>
                <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-emerald-100 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Scalability Factor</div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600">{calculations.scalabilityFactor}</div>
                  <div className="text-xs text-gray-500">Instant capacity increase</div>
                </div>
                <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-emerald-100 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Uptime</div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600">99.9%</div>
                  <div className="text-xs text-gray-500">Always available</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Advantages Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg mb-6 sm:mb-8 border border-gray-100">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600 mb-4 sm:mb-8 flex items-center gap-2 sm:gap-3">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 flex-shrink-0" />
            <span>Why AI is Your Permanent Hiring Asset</span>
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-4 sm:p-6 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 mb-2 sm:mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Institutional Knowledge Retention
              </h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
                <li><strong>Never loses expertise:</strong> Unlike human recruiters who leave, AI retains all hiring knowledge permanently</li>
                <li><strong>Continuous learning:</strong> Gets smarter with every hire, understanding your company culture better over time</li>
                <li><strong>Consistent standards:</strong> Maintains uniform evaluation criteria across all hiring cycles</li>
                <li><strong>Historical insight:</strong> Remembers what worked (and what didn't) in past hiring campaigns</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-4 sm:p-6 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 mb-2 sm:mb-4 flex items-center gap-2">
                <Expand className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Instant Scalability
              </h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
                <li><strong>Handles volume spikes:</strong> Process 10 or 10,000 CVs with equal efficiency</li>
                <li><strong>No hiring delays:</strong> No need to recruit and train additional human recruiters</li>
                <li><strong>24/7 availability:</strong> Works nights, weekends, holidays without overtime pay</li>
                <li><strong>Geographic flexibility:</strong> Screen candidates across time zones simultaneously</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-4 sm:p-6 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 mb-2 sm:mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Continuous Cost Efficiency
              </h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
                <li><strong>Usage-based pricing:</strong> Pay only for what you use with no fixed overhead</li>
                <li><strong>No turnover costs:</strong> Eliminates recruitment, training, and severance costs</li>
                <li><strong>Predictable expenses:</strong> Simple per-CV and per-interview minute pricing</li>
                <li><strong>No benefits overhead:</strong> No healthcare, vacation, sick days, or retirement contributions</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-4 sm:p-6 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
              <h4 className="text-sm sm:text-base md:text-lg font-bold text-emerald-600 mb-2 sm:mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Risk Mitigation & Compliance
              </h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-700 text-xs sm:text-sm">
                <li><strong>Reduced bias:</strong> Consistent, objective evaluations minimize discrimination risks</li>
                <li><strong>Audit trail:</strong> Complete documentation of all hiring decisions</li>
                <li><strong>Compliance adherence:</strong> Always follows configured hiring policies and regulations</li>
                <li><strong>Data security:</strong> Enterprise-grade security with controlled access to sensitive information</li>
              </ul>
            </div>
          </div>

          {/* Scalability Demonstration */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 sm:p-6 mt-4 sm:mt-8 border-2 border-dashed border-emerald-300">
            <h4 className="font-bold text-emerald-600 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              Scalability Demonstration
            </h4>
            <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
              Try adjusting the "Number of Job Postings" slider above to see how AI instantly scales with increased demand while maintaining cost efficiency.
            </p>
            
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                <strong className="text-emerald-600 text-xs sm:text-sm">AI Response to 10x Volume Increase:</strong>
                <ul className="mt-1 sm:mt-2 text-xs text-gray-600">
                  <li>• Instant capacity adjustment</li>
                  <li>• No quality degradation</li>
                  <li>• Linear cost scaling only</li>
                </ul>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                <strong className="text-red-500 text-xs sm:text-sm">Human Response to 10x Volume Increase:</strong>
                <ul className="mt-1 sm:mt-2 text-xs text-gray-600">
                  <li>• 3-6 month hiring/training delay</li>
                  <li>• Quality consistency issues</li>
                  <li>• Exponential cost increases</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-lg mb-6 sm:mb-8 border border-gray-100">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <Info className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 flex-shrink-0" />
            <span>How This Calculator Works</span>
          </h3>
          
          <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">
            This calculator compares the costs of using human recruiters versus an AI-powered recruitment system that becomes your permanent hiring asset.
          </p>
          
          <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">
            <strong className="text-emerald-600">Key Value Proposition:</strong> The AI recruiter isn't just a tool - it's a permanent member of your team that never leaves, continuously improves, and instantly scales with your needs.
          </p>
          
          <p className="text-gray-700 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">
            <strong className="text-emerald-600">Human Recruiter Hidden Costs:</strong> The model accounts for full costs including salary, benefits, training time, and turnover costs.
          </p>
          
          <p className="text-gray-700 mb-4 sm:mb-6 leading-relaxed text-xs sm:text-sm">
            <strong className="text-emerald-600">AI Permanent Advantages:</strong> Beyond direct cost savings, the AI provides continuous knowledge accumulation, instant scalability, and 24/7 availability.
          </p>
          
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 sm:p-5 rounded-r-lg">
            <p className="text-gray-700 italic text-xs sm:text-sm">
              <strong className="text-emerald-600">Strategic Insight:</strong> AI handles the scalable, repetitive tasks of initial screening and interviewing, while human recruiters provide interpersonal skills for final decisions.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl p-6 sm:p-12 text-center text-white mb-8 sm:mb-12 shadow-lg">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to Transform Your Hiring?</h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-emerald-100">Start saving up to {calculations.savingsPercentage}% on your recruitment costs today</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg rounded-full shadow-lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/book-meeting">
              <Button size="lg" className="bg-white/20 text-white hover:bg-white/30 font-bold px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg rounded-full border-2 border-white backdrop-blur-sm">
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 sm:py-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-6 sm:gap-12 mb-8 sm:mb-12">
            {/* Left Section - Brand Block */}
            <div className="col-span-2 md:col-span-3">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-2 sm:mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-4 sm:mb-6 text-xs sm:text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster.
              </p>
              <p className="text-slate-400 mb-4 sm:mb-6 text-xs sm:text-sm font-medium break-all">
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
                  <a 
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/?scroll=assessment');
                    }}
                  >
                    Assessment
                  </a>
                </li>
                <li>
                  <a 
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/?scroll=faq');
                    }}
                  >
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
