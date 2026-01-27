"use client"
import { useState, useEffect } from "react"
import { X, Cookie } from "lucide-react"
import Link from "next/link"

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem("cookieConsent")
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        setShowBanner(true)
      }, 1000)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted")
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-6xl mx-auto bg-white dark:bg-white rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="flex-shrink-0">
            <Cookie className="text-[#f49d1d] size-8 md:size-10" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-900 mb-2">
              We use cookies
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-600 leading-relaxed">
              We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
              By clicking "Accept All", you consent to our use of cookies. You can learn more about how we use cookies 
              in our{" "}
              <Link href="/privacy" className="text-[#f49d1d] hover:underline font-medium">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-100 rounded-md transition whitespace-nowrap"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 text-sm font-semibold bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md transition whitespace-nowrap"
          >
            Accept All
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-600 rounded-md transition md:hidden"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
