'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ApplicationSuccessPage() {
  const searchParams = useSearchParams()
  const jobTitle = searchParams.get('jobTitle') || 'this position'
  const companySlug = searchParams.get('company') || 'tata'

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 rounded-full p-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Application Submitted Successfully! 🎉
          </h1>
          
          <p className="text-lg text-slate-600 mb-2">
            Thank you for applying for
          </p>
          
          <p className="text-xl font-semibold text-emerald-600 mb-6">
            {jobTitle}
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
            <p className="text-slate-700 leading-relaxed">
              We've received your application and our team will review it shortly. 
              You'll receive an email notification about the next steps in the hiring process.
            </p>
          </div>

          {/* What's Next Section */}
          <div className="text-left bg-slate-50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-slate-900 mb-4 text-lg">What happens next?</h2>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start">
                <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">1</span>
                <span>Our recruitment team will review your application</span>
              </li>
              <li className="flex items-start">
                <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">2</span>
                <span>If your profile matches our requirements, we'll contact you via email</span>
              </li>
              <li className="flex items-start">
                <span className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">3</span>
                <span>You'll be invited for an interview or assessment</span>
              </li>
            </ul>
          </div>


          {/* Footer Note */}
          <p className="text-sm text-slate-500 mt-8">
            Please check your email (including spam folder) for updates on your application status.
          </p>
        </div>
      </div>
    </div>
  )
}
