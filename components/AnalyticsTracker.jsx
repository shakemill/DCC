"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id || !pathname) return
    const referrer = typeof document !== "undefined" ? document.referrer || "" : ""
    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, path: pathname, referrer }),
    }).catch(() => {})
  }, [pathname, user?.id])

  return null
}
