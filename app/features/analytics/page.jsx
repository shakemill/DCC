"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { TrendingUp, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Clock, FileText, ExternalLink, BarChart3, Calculator, LayoutDashboard } from "lucide-react"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"

const PER_PAGE = 20

const menuItems = [
  { label: "Page Visits", key: "visits" },
  { label: "Overview", key: "overview" },
]

function formatReferrer(referrer) {
  if (!referrer || referrer === "") return "—"
  if (typeof window === "undefined") return referrer.length > 50 ? referrer.slice(0, 50) + "…" : referrer
  try {
    const url = new URL(referrer)
    if (url.origin === window.location.origin) return url.pathname || "/"
    return "External"
  } catch {
    return referrer.length > 50 ? referrer.slice(0, 50) + "…" : referrer
  }
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("visits")
  const [visits, setVisits] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const from = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const to = Math.min(currentPage * PER_PAGE, total)

  const fetchVisits = () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    fetch(
      `/api/analytics/visits?userId=${encodeURIComponent(user.id)}&limit=${PER_PAGE}&offset=${(currentPage - 1) * PER_PAGE}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data?.error || "Failed to load")
        setVisits(Array.isArray(data.visits) ? data.visits : [])
        setTotal(typeof data.total === "number" ? data.total : 0)
      })
      .catch((e) => {
        setError(e?.message || "Failed to load visits")
        setVisits([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchVisits()
  }, [user?.id, currentPage])

  return (
    <ProtectedFeature featureName="Analytics">
      <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
        <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
          <Breadcrumb items={[{ label: "Features", href: null }, { label: "Analytics", href: null }]} />
        </div>
        <h2 className="mt-4 md:mt-8 text-4xl font-bold max-w-4xl leading-tight">Analytics</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
          View your portfolio performance and insights. Track your last page visits and navigation flow.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-8 mb-8 relative z-10">
        <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === item.key
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {item.key === "visits" ? (
                <Clock size={20} className={activeTab === item.key ? "text-white" : "text-green-500"} />
              ) : (
                <BarChart3 size={20} className={activeTab === item.key ? "text-white" : "text-green-500"} />
              )}
              <span className="text-xs md:text-sm">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center mt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition"
          >
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link
            href="/features/income-planners"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition"
          >
            <Calculator size={16} /> Income Planners
          </Link>
          <Link
            href="/features/yield-board"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition"
          >
            <BarChart3 size={16} /> Yield Board
          </Link>
          <Link
            href="/features/reports"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition"
          >
            <FileText size={16} /> Reports
          </Link>
        </div>
      </div>

      <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-20">
        <div className="max-w-7xl mx-auto">
          {activeTab === "visits" && (
          <div
            className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 overflow-hidden"
            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 md:p-8 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp size={22} className="text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Page Visits</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-500">Your recent navigation history</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchVisits}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {loading && visits.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw size={32} className="animate-spin text-green-500" />
                <p>Loading visits…</p>
              </div>
            ) : error ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-amber-600">
                <AlertCircle size={32} className="text-amber-500" />
                <p className="font-medium">{error}</p>
                <button
                  type="button"
                  onClick={fetchVisits}
                  className="mt-2 px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm transition"
                >
                  Retry
                </button>
              </div>
            ) : visits.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                <TrendingUp size={40} className="text-slate-300 dark:text-slate-600" />
                <p className="font-medium">No visits recorded yet</p>
                <p className="text-sm">Navigate around the app to see your visit history here.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-100/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-4 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Clock size={16} className="text-slate-500" />
                            When
                          </span>
                        </th>
                        <th className="text-left py-4 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <FileText size={16} className="text-slate-500" />
                            Page visited
                          </span>
                        </th>
                        <th className="text-left py-4 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <ExternalLink size={16} className="text-slate-500" />
                            From page
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-50/30"
                        >
                          <td className="py-4 px-4 md:px-6 text-slate-600 dark:text-slate-600">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-4 px-4 md:px-6">
                            <span className="font-medium text-slate-900 dark:text-slate-900">{row.path ?? "—"}</span>
                          </td>
                          <td className="py-4 px-4 md:px-6 text-slate-600 dark:text-slate-600">
                            {formatReferrer(row.referrer)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {from}–{to} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          )}

          {activeTab === "overview" && (
            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-8 md:p-12 text-center" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
              <BarChart3 size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-900 mb-2">Overview</h3>
              <p className="text-slate-600 dark:text-slate-600">Summary and insights coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedFeature>
  )
}
