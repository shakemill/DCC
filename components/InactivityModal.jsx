"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { Clock } from "lucide-react"

export default function InactivityModal() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timeoutRef = useRef(null)
  const countdownRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  // Get inactivity timeout from environment variable (default: 10 seconds)
  const INACTIVITY_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT || "10000")
  const COUNTDOWN_DURATION = 10 // 10 seconds countdown before logout

  const handleLogout = () => {
    // Clear timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    
    // Remove user from localStorage and redirect
    if (typeof window !== "undefined") {
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
  }

  useEffect(() => {
    if (!user) {
      // Clear any existing timeouts if user logs out
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      setShowModal(false)
      return
    }

    const resetTimer = () => {
      lastActivityRef.current = Date.now()
      
      // Clear existing timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      
      // Hide modal if it was showing
      setShowModal(false)
      setCountdown(0)

      // Set new timeout for inactivity
      timeoutRef.current = setTimeout(() => {
        setShowModal(true)
        setCountdown(COUNTDOWN_DURATION)

        // Start countdown
        countdownRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              // Time's up - logout user
              clearInterval(countdownRef.current)
              handleLogout()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, INACTIVITY_TIMEOUT)
    }

    const handleActivity = () => {
      resetTimer()
    }

    // Event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Initialize timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [user])

  const handleStayActive = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    setShowModal(false)
    setCountdown(0)
    lastActivityRef.current = Date.now()
    
    // Reset timer
    timeoutRef.current = setTimeout(() => {
      setShowModal(true)
      setCountdown(COUNTDOWN_DURATION)
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            handleLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_TIMEOUT)
  }

  if (!user || !showModal) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-white rounded-2xl shadow-sm p-8 max-w-md w-full border border-slate-200 dark:border-slate-300 relative">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-100 flex items-center justify-center mb-4">
            <Clock className="text-[#f49d1d]" size={32} />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-900 mb-2">
            Session Inactive
          </h3>
          <p className="text-slate-600 dark:text-slate-600 mb-6">
            You've been inactive for a while. Your session will expire in:
          </p>
          <div className="mb-6">
            <div className="text-5xl font-extrabold text-[#f49d1d] mb-2">
              {countdown}
            </div>
            <p className="text-sm text-slate-500">seconds</p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={handleStayActive}
              className="flex-1 px-6 py-3 bg-[#f49d1d] hover:bg-[#d6891a] text-white font-semibold rounded-md transition"
            >
              Stay Active
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-100 font-semibold rounded-md transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
