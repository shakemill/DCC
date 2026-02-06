"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Lock } from "lucide-react"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  useEffect(() => {
    if (!token || token.trim() === "") {
      setInvalidToken(true)
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")
    if (!newPassword) {
      setMessage("Please enter a new password.")
      return
    }
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIsSuccess(true)
        setMessage(data.message || "Password has been reset.")
        setTimeout(() => router.push("/login"), 3000)
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

  if (invalidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-24 md:py-32 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid reset link</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This reset link is missing or invalid. Please request a new one from the forgot password page.
            </p>
            <Link href="/forgot-password" className="text-[#f49d1d] hover:underline font-medium">
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 md:py-32 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#f49d1d]/10 flex items-center justify-center">
              <Lock className="text-[#f49d1d]" size={24} />
            </div>
            <h1 className="text-3xl font-extrabold">Reset password</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Enter your new password below.
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

          {!isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  New password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-slate-300 dark:border-slate-600 focus:border-[#f49d1d] focus:ring-[#f49d1d] focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-900 bg-white dark:bg-white"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirm new password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-md border border-slate-300 dark:border-slate-600 focus:border-[#f49d1d] focus:ring-[#f49d1d] focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-900 bg-white dark:bg-white"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#f49d1d] hover:bg-[#d6891a] disabled:bg-slate-400 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-md"
              >
                {isLoading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          {isSuccess && (
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Redirecting to sign in...
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f49d1d]"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
