"use client"
import { useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")
    if (!email.trim()) {
      setMessage("Please enter your email address.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Please enter a valid email address.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsSuccess(true)
        setMessage(data.message || "If an account exists with this email, you will receive a password reset link.")
      } else {
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch (err) {
      console.error(err)
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 md:py-32 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#f49d1d]/10 flex items-center justify-center">
              <Mail className="text-[#f49d1d]" size={24} />
            </div>
            <h1 className="text-3xl font-extrabold">Forgot password</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-md ${
                isSuccess ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-slate-300 dark:border-slate-600 focus:border-[#f49d1d] focus:ring-[#f49d1d] focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-900 bg-white dark:bg-white"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#f49d1d] hover:bg-[#d6891a] disabled:bg-slate-400 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-md"
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
              Check your inbox (and spam folder) for the reset link. The link expires in 1 hour.
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <Link href="/login" className="text-[#f49d1d] hover:underline font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
