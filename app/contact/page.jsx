"use client"

import Link from "next/link"

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Contact <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Us</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-12">
          Get in touch with the Digital Credit Compass team.
        </p>
        <div className="space-y-6">
          <p className="text-slate-700 dark:text-slate-600 leading-relaxed">
            For inquiries, feedback, or support, please reach out to us at:
          </p>
          <a
            href="mailto:support@digitalcreditcompass.com"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-[#f49d1d] hover:bg-[#d6891a] text-white font-medium text-lg transition"
          >
            support@digitalcreditcompass.com
          </a>
        </div>
        <div className="mt-12">
          <Link
            href="/"
            className="text-slate-600 dark:text-slate-400 hover:text-[#f49d1d] dark:hover:text-[#f5b84d] transition"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
