"use client"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function Breadcrumb({ items }) {
  const { user } = useAuth()
  const homeHref = user ? "/dashboard" : "/"
  const homeLabel = user ? "Dashboard" : "Home"

  return (
    <nav className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-6">
      <Link 
        href={homeHref} 
        className="hover:text-[#f49d1d] transition flex items-center gap-1"
      >
        <Home size={14} />
        <span>{homeLabel}</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight size={14} className="text-slate-400" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-[#f49d1d] transition"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 dark:text-slate-900 font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
