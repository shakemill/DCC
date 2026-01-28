"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState("verifying") // verifying, success, error
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setMessage("Verification token is missing")
      return
    }

    // Verify email
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok && data.success) {
          setStatus("success")
          setMessage("Your email has been verified successfully!")
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed. Please try again.")
        }
      })
      .catch((error) => {
        console.error("Verification error:", error)
        setStatus("error")
        setMessage("An error occurred. Please try again.")
      })
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 md:py-32 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30 text-center">
          {status === "verifying" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f49d1d] mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold mb-2">Verifying your email...</h1>
              <p className="text-slate-600 dark:text-slate-400">Please wait while we verify your email address.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-green-600">Email Verified!</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <p className="text-sm text-slate-500">Redirecting to login page...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-red-600">Verification Failed</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/get-started"
                  className="block w-full bg-[#f49d1d] hover:bg-[#d6891a] transition text-white font-semibold py-3 rounded-md"
                >
                  Register Again
                </Link>
                <Link
                  href="/login"
                  className="block w-full border border-[#f49d1d] text-[#f49d1d] hover:bg-[#f49d1d] hover:text-white transition font-semibold py-3 rounded-md"
                >
                  Go to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-24 md:py-32 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f49d1d] mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold mb-2">Loading...</h1>
              <p className="text-slate-600 dark:text-slate-400">Please wait.</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
