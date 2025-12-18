"use client"

import { useRouter } from "next/navigation"
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

export default function PrivacyPolicyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

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

      {/* Privacy Policy Content */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-emerald-600 mb-4">Privacy Policy</h1>
            <p className="text-lg text-slate-600">
              Last updated: November 2024
            </p>
          </div>

          <div className="space-y-12 text-slate-700 leading-relaxed">
            {/* Responsible Party */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Responsible Party under Data Protection Laws</h2>
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800 mb-2">HireGenAI</p>
                <p className="text-slate-600">support@hire-genai.com</p>
              </div>
            </div>

            {/* Section 1 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Collection and Storage of Personal Data</h2>
              <p className="mb-4">
                When you access our websites and use our AI-powered recruitment services, the browser on your device automatically sends information to our website server. This information is temporarily stored in a log file. The following information is recorded without your intervention and stored until automatic deletion:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>IP address of the requesting computer</li>
                <li>Date and time of access</li>
                <li>Name and URL of the accessed file</li>
                <li>Website from which access was made (referrer URL)</li>
                <li>Browser used and, if applicable, operating system of your computer and name of your access provider</li>
              </ul>
              <p className="font-semibold text-slate-800 mb-3">Data Processing Purposes:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Ensuring smooth connection establishment with the website</li>
                <li>Ensuring comfortable use of our website and AI recruitment platform</li>
                <li>Evaluating system security and stability</li>
                <li>Conducting recruitment analytics and service optimization</li>
                <li>Other administrative purposes</li>
              </ul>
              <p>
                The legal basis for data processing is Art. 6 Para. 1 S. 1 lit. f GDPR. Our legitimate interest follows from the data collection purposes listed above. Under no circumstances do we use the collected data to draw conclusions about your personal identity.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Data Transfer</h2>
              <p className="mb-4">
                Your personal data will not be transferred to third parties for purposes other than those listed below. We only pass on your personal data to third parties if:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You have given your express consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR</li>
                <li>Disclosure is necessary for the assertion, exercise or defense of legal claims and there is no reason to assume that you have an overriding interest worthy of protection in the non-disclosure of your data in accordance with Art. 6 Para. 1 S. 1 lit. f GDPR</li>
                <li>There is a legal obligation to disclose in accordance with Art. 6 Para. 1 S. 1 lit. c GDPR</li>
                <li>This is legally permissible and necessary for the processing of contractual relationships with you in accordance with Art. 6 Para. 1 S. 1 lit. b GDPR</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Cookies</h2>
              <p className="mb-4">
                We use session cookies on our site. These are small files that your browser automatically creates and stores on your device when you visit our site. Cookies do not damage your device and do not contain viruses, Trojans, or other malware.
              </p>
              <p className="mb-4">
                The cookie stores information related to the specific end device used. However, this does not mean we receive direct knowledge of your identity. Session cookies recognize that you have visited individual pages on our website and are automatically deleted when you leave our site.
              </p>
              <p className="mb-4">
                The data processed by cookies is necessary to protect our legitimate interests and those of third parties in accordance with Art. 6 Para. 1 S. 1 lit. f GDPR. Most browsers accept cookies automatically. However, you can configure your browser so that no cookies are stored or you receive a notification before new cookies are created. Completely disabling cookies may prevent you from using all functions of our website.
              </p>
              <p>
                We use Google Ads for marketing purposes. When you reach our website through a Google ad, Google Ads sets a cookie on your computer. These cookies expire after 30 days and are not used for personal identification. The information collected helps create conversion statistics for advertising customers who have opted for conversion tracking.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Fonts</h2>
              <p>
                We use external fonts from font providers to ensure uniform and appealing presentation of our online offerings. Font integration occurs through server requests from our hosting service provider. The use of web fonts serves our legitimate interest in providing an attractive and professional user experience in accordance with Art. 6 Para. 1 S. 1 lit. f GDPR.
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Integration of Third-Party Services</h2>
              <p>
                We may integrate third-party services such as Google Maps for displaying job locations or other location-based features. These integrations only occur with your express consent in accordance with Art. 6 Para. 1 S. 1 lit. a GDPR. For detailed information about data processing by these services, please refer to their respective privacy policies.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Rights of Data Subjects</h2>
              <p className="mb-4">You have the right:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Pursuant to Art. 15 GDPR, to request information about your personal data processed by us</li>
                <li>Pursuant to Art. 16 GDPR, to request immediate correction of incorrect data or completion of incomplete data</li>
                <li>Pursuant to Art. 17 GDPR, to request deletion of your personal data under certain conditions</li>
                <li>Pursuant to Art. 18 GDPR, to request restriction of processing under certain conditions</li>
                <li>Pursuant to Art. 20 GDPR, to receive your data in a structured, commonly used, and machine-readable format or to request transmission to another controller</li>
                <li>Pursuant to Art. 7 Para. 3 GDPR, to revoke your consent at any time</li>
                <li>To lodge a complaint with a supervisory authority pursuant to Art. 77 GDPR</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Right to Object</h2>
              <p>
                If your personal data is processed based on legitimate interests pursuant to Art. 6 Para. 1 S. 1 lit. f GDPR, you have the right to object to this processing at any time for reasons arising from your particular situation. If you wish to exercise your right of revocation or objection, please send an email to support@hire-genai.com.
              </p>
            </div>

            {/* Section 8 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Data Security</h2>
              <p className="mb-4">
                We use SSL (Secure Socket Layer) encryption on our website with the highest encryption level supported by your browser (usually 256-bit). You can recognize encrypted transmission by the lock symbol in your browser address bar.
              </p>
              <p>
                We implement appropriate technical and organizational security measures to protect your data against accidental or intentional manipulation, loss, destruction, or unauthorized access. Our security measures are continuously improved in line with technological developments.
              </p>
            </div>

            {/* Section 9 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">9. Third-Party Integrations and User Data</h2>
              <p className="mb-4">
                When you connect third-party accounts (such as Google) to our services for features like sign-in, calendar integration, or document processing, we access the following data only with your explicit consent:
              </p>
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-4">
                <p className="font-semibold text-slate-800 mb-2">Profile Information:</p>
                <p className="text-slate-600 mb-4">Name, email address, profile picture</p>
                <p className="font-semibold text-slate-800 mb-2">Authentication Data:</p>
                <p className="text-slate-600 mb-4">Account ID, access tokens</p>
                <p className="font-semibold text-slate-800 mb-2">Service-Specific Data:</p>
                <p className="text-slate-600">Depending on the integration (calendar events, documents, etc.)</p>
              </div>
              <p className="font-semibold text-slate-800 mb-3">Data Usage:</p>
              <p className="mb-4">We only process data necessary for providing the requested functionality and use it exclusively for:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Secure authentication and account management</li>
                <li>Provision of integrated features</li>
                <li>Service optimization and user experience improvement</li>
              </ul>
              <p className="font-semibold text-slate-800 mb-2">Data Retention:</p>
              <p className="mb-4">
                Third-party integration data is retained only as long as necessary to provide the service. Access tokens are stored encrypted and deleted when you disconnect the integration or delete your account.
              </p>
              <p className="font-semibold text-slate-800 mb-2">Data Deletion:</p>
              <p className="mb-4">
                You can disconnect third-party integrations anytime through your account settings or by contacting support@hire-genai.com. We delete associated data within 30 days.
              </p>
              <p className="font-semibold text-slate-800 mb-2">Data Sharing:</p>
              <p>
                We do not sell user data. We only share it with service providers necessary for functionality, always subject to appropriate safeguards.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-emerald-50 p-8 rounded-lg border border-emerald-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Questions?</h2>
              <p className="text-slate-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
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
                  <Link href="/" className="hover:text-emerald-400 transition-colors">
                    Assessment
                  </Link>
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
