"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"
import {
  ArrowLeft,
  Building2,
  Package,
  Percent,
  Shield,
  Award,
  Clock,
  MapPin,
  CalendarClock,
  FileText,
} from "lucide-react"

function formatApy(instrument) {
  const s = instrument?.latestSnapshot
  if (!s) return instrument?.apyLabel ?? "—"
  if (s.apyLabelOverride) return s.apyLabelOverride
  if (s.apyMin != null && s.apyMax != null && s.apyMin !== s.apyMax) return `${s.apyMin}% – ${s.apyMax}%`
  if (s.apyMin != null) return `${s.apyMin}%`
  if (s.apyMax != null) return `${s.apyMax}%`
  return instrument?.apyLabel ?? "—"
}

export default function YieldBoardComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [instruments, setInstruments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const idsParam = searchParams.get("platforms")
    if (!idsParam) {
      router.push("/features/yield-board")
      return
    }
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0) {
      router.push("/features/yield-board")
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/instruments?ids=${ids.map((id) => encodeURIComponent(id)).join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (!data.success) {
          setError(data?.error || "Failed to fetch")
          setInstruments([])
          return
        }
        const list = data.instruments || []
        const order = ids
        const sorted = order.map((id) => list.find((i) => i.id === id)).filter(Boolean)
        setInstruments(sorted)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [searchParams, router])

  if (loading) {
    return (
      <ProtectedFeature featureName="Yield Board">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-400">Loading comparison…</div>
        </div>
      </ProtectedFeature>
    )
  }

  if (error || instruments.length === 0) {
    return (
      <ProtectedFeature featureName="Yield Board">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-slate-600 dark:text-slate-400">{error || "No instruments to compare."}</p>
          <Link href="/features/yield-board" className="flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md font-semibold">
            <ArrowLeft size={18} /> Back to Yield Board
          </Link>
        </div>
      </ProtectedFeature>
    )
  }

  const comparisonFields = [
    { key: "issuer", label: "Issuer", type: "text", icon: Building2 },
    { key: "productName", label: "Product", type: "text", icon: Package },
    { key: "apy", label: "APY / Cost", type: "apy", icon: Percent },
    { key: "collateral", label: "Collateral", type: "text", icon: Shield },
    { key: "seniority", label: "Seniority", type: "text", icon: Award },
    { key: "lockup", label: "Lockup", type: "text", icon: Clock },
    { key: "jurisdiction", label: "Jurisdiction", type: "text", icon: MapPin },
    { key: "duration", label: "Duration", type: "text", icon: CalendarClock },
    { key: "notes", label: "Notes", type: "text", icon: FileText },
  ]

  return (
    <ProtectedFeature featureName="Yield Board">
      <>
        <div className="bg-white dark:bg-white border-b border-slate-200 dark:border-slate-300 sticky top-[73px] z-30 pt-6">
          <div className="px-6 md:px-16 lg:px-24 xl:px-32 pb-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col items-center text-center mb-4">
                <Breadcrumb
                  items={[
                    { label: "Features", href: null },
                    { label: "Yield Board", href: "/features/yield-board" },
                    { label: "Compare", href: null },
                  ]}
                />
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-900 mt-2">
                  Instrument Comparison
                </h1>
                <Link
                  href="/features/yield-board"
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md font-semibold"
                >
                  <ArrowLeft size={18} /> Back to Yield Board
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-8 md:py-12 pt-32 md:pt-40">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 overflow-hidden" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200 dark:border-slate-300">
                      <th className="px-6 py-4 text-left text-sm font-extrabold text-slate-900 dark:text-slate-900 sticky left-0 bg-slate-50 dark:bg-slate-50 z-10 min-w-[180px]">
                        Feature
                      </th>
                      {instruments.map((inst) => (
                        <th key={inst.id} className="px-6 py-4 text-center text-sm font-extrabold text-slate-900 dark:text-slate-900 min-w-[200px]">
                          <div className="flex flex-col items-center gap-1">
                            <span>{inst.issuer}</span>
                            <span className="text-xs font-normal text-slate-600 dark:text-slate-500">{inst.productName}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFields.map((field, index) => {
                      const Icon = field.icon
                      return (
                        <tr
                          key={field.key}
                          className={`border-b border-slate-200 dark:border-slate-300 ${index % 2 === 0 ? "bg-white dark:bg-white" : "bg-slate-50/50 dark:bg-slate-50/50"}`}
                        >
                          <td className="px-6 py-4 sticky left-0 bg-inherit z-10">
                            <div className="flex items-center gap-2">
                              {Icon && <Icon size={18} className="text-[#f49d1d]" />}
                              <span className="font-semibold text-slate-900 dark:text-slate-900">{field.label}</span>
                            </div>
                          </td>
                          {instruments.map((inst) => {
                            let displayValue
                            if (field.key === "apy") {
                              displayValue = (
                                <span className="text-xl font-extrabold text-[#f49d1d]">
                                  {formatApy(inst)}
                                  {inst.module === "M1A" ? (
                                    <span className="block text-xs font-normal text-slate-500">(borrow cost)</span>
                                  ) : null}
                                </span>
                              )
                            } else {
                              const raw = inst[field.key]
                              const val = raw ?? "—"
                              displayValue = (
                                <span className="text-slate-900 dark:text-slate-900">
                                  {typeof val === "string" ? val : String(val)}
                                </span>
                              )
                            }
                            return (
                              <td key={inst.id} className="px-6 py-4 text-center align-top">
                                {displayValue}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {instruments.map((inst) => (
                <Link
                  key={inst.id}
                  href={`/features/yield-board/${inst.id}`}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-white border border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-100 transition"
                >
                  View {inst.issuer} details
                </Link>
              ))}
            </div>
          </div>
        </div>
      </>
    </ProtectedFeature>
  )
}
