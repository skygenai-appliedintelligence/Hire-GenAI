"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/layout/Navbar"
import Link from "next/link"
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Lock,
  Star,
} from "lucide-react"

export default function TermsAndConditionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const scrollTo = searchParams?.get('scroll')
    if (scrollTo) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        window.history.replaceState({}, '', '/terms')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Terms and Conditions Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title - Green highlighted, left aligned, full width */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-emerald-600 mb-4">Terms and Conditions</h1>
            <p className="text-lg text-slate-600">
              Last updated: November 2024
            </p>
          </div>

          <div className="space-y-12 text-slate-700 leading-relaxed">
            {/* Responsible Party */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Responsible Party</h2>
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800 mb-2">HireGenAI by SKYGENAI</p>
                <p className="text-slate-600">support@hire-genai.com</p>
              </div>
            </div>

            {/* Section 1 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Collection and Storage of Personal Data</h2>
              <p className="mb-4">
                When you access our AI-powered recruitment platform and use our services, the browser on your device automatically sends information to our servers. This information is temporarily stored in log files. The following data is collected automatically:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>IP address of the requesting device</li>
                <li>Date and time of access</li>
                <li>Name and URL of the accessed file</li>
                <li>Referring website URL</li>
                <li>Browser type, operating system, and internet service provider</li>
              </ul>
              <p className="font-semibold text-slate-800 mb-3">Purpose of Data Processing:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Ensuring seamless connection to our AI recruitment platform</li>
                <li>Providing optimal user experience across all features</li>
                <li>Evaluating system security and platform stability</li>
                <li>Improving our AI interview and CV parsing services</li>
                <li>Administrative and analytical purposes</li>
              </ul>
              <p>
                The legal basis for data processing is Art. 6 Para. 1 S. 1 lit. f GDPR. Our legitimate interest stems from the purposes listed above. We do not use collected data to personally identify you. We do not employ any additional analysis services beyond what is necessary for platform operation.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Data Transfer and Sharing</h2>
              <p className="mb-4">
                Your personal data will not be transferred to third parties except in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You have provided explicit consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR</li>
                <li>There is an overriding legitimate interest that does not conflict with your data protection rights under Art. 6 Para. 1 S. 1 lit. f GDPR</li>
                <li>Legal disclosure is required under Art. 6 Para. 1 S. 1 lit. c GDPR</li>
                <li>Transfer is necessary for fulfilling contractual obligations with you under Art. 6 Para. 1 S. 1 lit. b GDPR</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Cookies</h2>
              <p className="mb-4">
                HireGenAI uses session cookies on our platform. These are small files automatically created by your browser and stored on your device when you visit our site. Cookies do not harm your device and contain no viruses, trojans, or malware.
              </p>
              <p className="mb-4">
                Session cookies store information related to your browsing session and help recognize that you have visited specific pages on our platform. These cookies are automatically deleted when you leave our site.
              </p>
              <p className="mb-4">
                The data processed by cookies is necessary to protect our legitimate interests and those of third parties under Art. 6 Para. 1 S. 1 lit. f GDPR. Most browsers accept cookies automatically. You can configure your browser to reject cookies or notify you before creating new ones. Disabling cookies may limit your ability to use certain features of our AI recruitment platform.
              </p>
              <p className="mb-4">
                We use Google Ads for marketing purposes. When you reach our website through a Google advertisement, a cookie is placed on your device. These cookies expire after 30 days and are not used for personal identification. The information collected helps create conversion statistics for advertising performance tracking.
              </p>
              <p>
                If you do not wish to participate in conversion tracking, you can disable cookies through your browser settings or block cookies from the googleadservices.com domain. For more information, please refer to Google's privacy policy on conversion tracking.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Web Fonts</h2>
              <p>
                HireGenAI uses external web fonts to ensure a consistent and professional appearance across our platform. Font integration occurs through server requests from our hosting provider. The use of web fonts serves our legitimate interest in providing an attractive and unified user experience in accordance with Art. 6 Para. 1 S. 1 lit. f GDPR.
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Third-Party Service Integration</h2>
              <p className="mb-4">
                Our platform may integrate third-party services such as Google Maps for displaying job locations or other location-based recruitment features. These integrations are only activated with your explicit consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR.
              </p>
              <p>
                When you click to load such services, your data may be processed by the respective third-party providers. For detailed information about data processing by these services, please refer to their individual privacy policies.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Your Rights as a Data Subject</h2>
              <p className="mb-4">Under applicable data protection laws, you have the following rights:</p>
              <ul className="list-disc list-inside space-y-3 ml-4">
                <li>
                  <span className="font-semibold">Right to Information (Art. 15 GDPR):</span> Request details about your personal data we process, including processing purposes, data categories, recipients, storage periods, and the existence of automated decision-making.
                </li>
                <li>
                  <span className="font-semibold">Right to Rectification (Art. 16 GDPR):</span> Request immediate correction of inaccurate data or completion of incomplete data.
                </li>
                <li>
                  <span className="font-semibold">Right to Erasure (Art. 17 GDPR):</span> Request deletion of your personal data, unless processing is necessary for legal obligations, public interest, or legal claims.
                </li>
                <li>
                  <span className="font-semibold">Right to Restriction (Art. 18 GDPR):</span> Request restriction of processing if you dispute data accuracy, processing is unlawful, or you need the data for legal claims.
                </li>
                <li>
                  <span className="font-semibold">Right to Data Portability (Art. 20 GDPR):</span> Receive your personal data in a structured, machine-readable format or request transfer to another controller.
                </li>
                <li>
                  <span className="font-semibold">Right to Withdraw Consent (Art. 7 Para. 3 GDPR):</span> Revoke your consent at any time, which will stop future data processing based on that consent.
                </li>
                <li>
                  <span className="font-semibold">Right to Lodge a Complaint (Art. 77 GDPR):</span> File a complaint with a supervisory authority if you believe your data protection rights have been violated.
                </li>
              </ul>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Right to Object</h2>
              <p className="mb-4">
                If your personal data is processed based on legitimate interests under Art. 6 Para. 1 S. 1 lit. f GDPR, you have the right to object to such processing at any time for reasons arising from your particular situation.
              </p>
              <p>
                If your objection relates to direct marketing, you have a general right to object that we will implement without requiring specific justification. To exercise your right of withdrawal or objection, please send an email to <a href="mailto:support@hire-genai.com" className="text-emerald-600 hover:text-emerald-700 font-medium">support@hire-genai.com</a>.
              </p>
            </div>

            {/* Section 8 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Data Security</h2>
              <p className="mb-4">
                HireGenAI implements SSL (Secure Socket Layer) encryption across our entire platform, using the highest encryption level supported by your browser—typically 256-bit encryption. If your browser does not support 256-bit encryption, we use 128-bit v3 technology. You can verify encrypted transmission by the lock symbol displayed in your browser's address bar.
              </p>
              <p>
                We employ comprehensive technical and organizational security measures to protect your data against accidental or intentional manipulation, loss, destruction, or unauthorized access. Our security protocols are continuously updated to align with the latest technological developments and industry best practices.
              </p>
            </div>

            {/* Section 9 - AI Services */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">9. AI-Powered Recruitment Services</h2>
              <p className="mb-4">
                HireGenAI provides AI-powered recruitment services including CV parsing, automated candidate screening, and AI video interviews. By using these services, you acknowledge and agree to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>AI algorithms analyze candidate data to provide recruitment insights and recommendations</li>
                <li>Video interviews are recorded and processed using AI for evaluation purposes</li>
                <li>CV and resume data is parsed and analyzed to match candidates with job requirements</li>
                <li>All AI processing is conducted in compliance with GDPR and applicable data protection laws</li>
                <li>Human oversight is maintained in all final hiring decisions</li>
              </ul>
              <p>
                We are committed to transparency in our AI processes and will provide explanations of AI-driven decisions upon request.
              </p>
            </div>

            {/* Section 10 - Platform Usage */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">10. Platform Usage Terms</h2>
              <p className="mb-4">
                By accessing and using HireGenAI, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Provide accurate and truthful information when creating accounts and job postings</li>
                <li>Use the platform only for legitimate recruitment purposes</li>
                <li>Not attempt to circumvent, disable, or interfere with platform security features</li>
                <li>Respect the intellectual property rights of HireGenAI and third parties</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction</li>
                <li>Not use the platform for discriminatory hiring practices</li>
              </ul>
              <p>
                HireGenAI reserves the right to suspend or terminate accounts that violate these terms.
              </p>
            </div>

            {/* Section 11 - Billing and Payments */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">11. Billing and Payments</h2>
              <p className="mb-4">
                HireGenAI operates on a usage-based billing model. Charges apply for:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>CV parsing and analysis services</li>
                <li>AI-powered interview sessions</li>
                <li>Question generation and customization</li>
                <li>Additional premium features as specified in your plan</li>
              </ul>
              <p>
                All billing information is securely processed and stored. You can view your usage and billing details in your dashboard settings.
              </p>
            </div>

            {/* Section 12 - Limitation of Liability */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">12. Limitation of Liability</h2>
              <p className="mb-4">
                HireGenAI provides its services "as is" and makes no warranties regarding the accuracy of AI-generated insights or recommendations. While we strive for high accuracy in our AI services:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Final hiring decisions should always involve human judgment</li>
                <li>AI recommendations are meant to assist, not replace, human decision-making</li>
                <li>We are not liable for hiring decisions made based on platform recommendations</li>
                <li>Service availability may be subject to maintenance and updates</li>
              </ul>
            </div>

            {/* Section 13 - Changes to Terms */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">13. Changes to These Terms</h2>
              <p>
                HireGenAI reserves the right to modify these Terms and Conditions at any time. Changes will be posted on this page with an updated revision date. Continued use of our platform after changes constitutes acceptance of the modified terms. We encourage you to review these terms periodically.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-emerald-50 p-8 rounded-lg border border-emerald-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Questions?</h2>
              <p className="text-slate-700 mb-4">
                If you have any questions about these Terms and Conditions or our data practices, please contact us at:
              </p>
              <p className="text-lg font-semibold text-emerald-600">support@hire-genai.com</p>
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
                  <Link href="/terms" className="text-emerald-400 font-medium">
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
