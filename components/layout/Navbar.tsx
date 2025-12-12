"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/auth/login-modal"
import Link from "next/link"
import { Menu, X } from "lucide-react"

interface NavbarProps {
  isFixed?: boolean
  showAnnouncement?: boolean
}

export default function Navbar({ isFixed = false, showAnnouncement = false }: NavbarProps) {
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const headerClasses = isFixed 
    ? "fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50"
    : "bg-white border-b border-gray-100"

  const marginClass = showAnnouncement ? (isFixed ? "top-16" : "") : ""

  return (
    <>
      <header className={`${headerClasses} ${marginClass}`}>
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
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Product
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Pricing
                </Link>
                <Link
                  href="/roi"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  ROI
                </Link>
                <Link
                  href="/about"
                  className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Company
                </Link>
              </nav>
            </div>
            <div className="hidden md:flex items-center space-x-4">
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

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-emerald-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <Link
                href="/demo-en"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer"
              >
                Product
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer"
              >
                Pricing
              </Link>
              <Link
                href="/roi"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer"
              >
                ROI
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-emerald-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer"
              >
                Company
              </Link>
              <div className="pt-4 pb-3 border-t border-gray-100">
                <div className="px-3 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowLoginModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start text-gray-700 hover:text-emerald-600 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Login
                  </Button>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full sr-button-primary">Get started</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <LoginModal 
        open={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
      />
    </>
  )
}
