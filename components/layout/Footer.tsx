"use client"

import Link from "next/link"
import { Star, Lock, Facebook, Instagram, Youtube, Linkedin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* Left Section - Logo and Social */}
          <div className="md:col-span-1">
            <h1 className="text-2xl font-bold mb-4">
              <span className="text-white">Hire</span>
              <span className="text-emerald-400">GenAI</span>
            </h1>
            <p className="text-sm text-slate-400 mb-4">
              AI-powered recruitment platform for modern hiring.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Section */}
          <div>
            <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <a href="/#product" className="hover:text-emerald-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="/#company" className="hover:text-emerald-400 transition-colors">
                  Company
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Resources</h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About Us
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
          <div className="md:col-span-1">
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
          <div className="md:col-span-1">
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
  )
}
