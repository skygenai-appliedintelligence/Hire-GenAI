"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/auth/login-modal"
import Link from "next/link"

interface NavbarProps {
  isFixed?: boolean
  showAnnouncement?: boolean
}

export default function Navbar({ isFixed = false, showAnnouncement = false }: NavbarProps) {
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)

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
                    <span className="text-emerald-500">GenAI</span>
                  </h1>
                </Link>
              </div>
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                <Link
                  href="/"
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

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
      />
    </>
  )
}
