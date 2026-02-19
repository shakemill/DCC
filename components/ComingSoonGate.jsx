"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

const ALLOWED_PATHS = [
  "/coming-soon",
  "/admin",
  "/login",
  "/get-started",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/contact",
]

function isAllowed(pathname) {
  if (!pathname) return true
  if (pathname === "/coming-soon") return true
  if (pathname.startsWith("/admin")) return true
  return ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export default function ComingSoonGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isAllowed(pathname)) {
      setChecked(true)
      return
    }
    let cancelled = false
    fetch("/api/site-settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setChecked(true)
        if (data?.comingSoon === true) {
          router.replace("/coming-soon")
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true)
      })
    return () => { cancelled = true }
  }, [pathname, router])

  if (!checked && !isAllowed(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
        <div className="animate-pulse text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    )
  }

  return children
}
