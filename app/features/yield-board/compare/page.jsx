"use client"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
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
  Lock,
  Download,
} from "lucide-react"

function formatBreakdownExpandable(raw) {
  if (!raw || typeof raw !== "string") return null
  try {
    const b = JSON.parse(raw)
    const lines = []
    if (b.transparency != null) lines.push(`Transparency: ${b.transparency} / 30`)
    if (b.riskControl != null) lines.push(`Risk Controls: ${b.riskControl} / 25`)
    if (b.jurisdiction != null) lines.push(`Jurisdiction: ${b.jurisdiction} / 20`)
    if (b.structure != null) lines.push(`Structure: ${b.structure} / 15`)
    if (b.trackRecord != null) lines.push(`Track Record: ${b.trackRecord} / 10`)
    return lines.length > 0 ? lines : null
  } catch {
    return null
  }
}

const BTC_SCORE_EXPLANATION = "Provider Quality Score reflects the structural characteristics of this lending platform, including transparency of rules, borrower risk controls, legal jurisdiction, structural design, and operating history. This score does not reflect market risk or personal leverage decisions."

function formatApy(instrument) {
  const s = instrument?.latestSnapshot
  if (!s) return instrument?.apyLabel ?? "—"
  if (s.apyLabelOverride) return s.apyLabelOverride
  const min = s.apyMin != null ? Number(s.apyMin) : null
  const max = s.apyMax != null ? Number(s.apyMax) : null
  if (min == null && max == null) return instrument?.apyLabel ?? "—"
  if (min === 0 && max === 0) return "—"
  if (min != null && max != null && min !== max) return `${min}% – ${max}%`
  if (min != null) return `${min}%`
  if (max != null) return `${max}%`
  return instrument?.apyLabel ?? "—"
}

function getCellText(item, field, hasInstruments, hasFiat, hasStablecoin) {
  if (field.key === "apy" && hasInstruments) {
    let text = formatApy(item)
    if (item.module === "M1A") text += " (borrow cost)"
    return text
  }
  if (field.key === "apyDistribution" && hasFiat) {
    return item.apyDistribution ?? item.apy ?? "—"
  }
  if (field.type === "score") {
    const score = item.qualityScore
    return score != null ? `${score}/100` : "—"
  }
  const raw = item[field.key]
  return raw != null ? String(raw) : "—"
}

function YieldBoardCompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [instruments, setInstruments] = useState([])
  const [lenders, setLenders] = useState([])
  const [fiatProducts, setFiatProducts] = useState([])
  const [stablecoinProducts, setStablecoinProducts] = useState([])
  const [compareMode, setCompareMode] = useState(null) // "instruments" | "lenders" | "fiat" | "stablecoin"
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const lendersParam = searchParams.get("lenders")
    const platformsParam = searchParams.get("platforms")

    if (lendersParam) {
      const ids = lendersParam.split(",").map((s) => s.trim()).filter(Boolean)
      if (ids.length < 2 || ids.length > 5) {
        router.push("/features/yield-board")
        return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      setCompareMode("lenders")
      fetch("/api/bitcoin-backed-lenders")
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          if (!data.success) {
            setError(data?.error || "Failed to fetch")
            setLenders([])
            return
          }
          const list = data.lenders || []
          const sorted = ids.map((id) => list.find((l) => l.id === id)).filter(Boolean)
          setLenders(sorted)
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => { cancelled = true }
    }

    if (platformsParam) {
      const ids = platformsParam.split(",").map((s) => s.trim()).filter(Boolean)
      if (ids.length === 0) {
        router.push("/features/yield-board")
        return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      setCompareMode("instruments")
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
    }

    const fiatParam = searchParams.get("fiat")
    if (fiatParam) {
      const ids = fiatParam.split(",").map((s) => s.trim()).filter(Boolean)
      if (ids.length < 2 || ids.length > 5) {
        router.push("/features/yield-board")
        return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      setCompareMode("fiat")
      fetch("/api/usd-income")
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          if (!data.success) {
            setError(data?.error || "Failed to fetch")
            setFiatProducts([])
            return
          }
          const list = data.products || []
          const sorted = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean)
          setFiatProducts(sorted)
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => { cancelled = true }
    }

    const stablecoinParam = searchParams.get("stablecoin")
    if (stablecoinParam) {
      const ids = stablecoinParam.split(",").map((s) => s.trim()).filter(Boolean)
      if (ids.length < 2 || ids.length > 5) {
        router.push("/features/yield-board")
        return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      setCompareMode("stablecoin")
      fetch("/api/stablecoin-products")
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return
          if (!data.success) {
            setError(data?.error || "Failed to fetch")
            setStablecoinProducts([])
            return
          }
          const list = data.products || []
          const sorted = ids.map((id) => list.find((p) => p.id === id)).filter(Boolean)
          setStablecoinProducts(sorted)
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => { cancelled = true }
    }

    router.push("/features/yield-board")
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

  const hasLenders = compareMode === "lenders" && lenders.length > 0
  const hasInstruments = compareMode === "instruments" && instruments.length > 0
  const hasFiat = compareMode === "fiat" && fiatProducts.length > 0
  const hasStablecoin = compareMode === "stablecoin" && stablecoinProducts.length > 0

  if (error || (!hasLenders && !hasInstruments && !hasFiat && !hasStablecoin)) {
    return (
      <ProtectedFeature featureName="Yield Board">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-slate-600 dark:text-slate-400">{error || "No items to compare."}</p>
          <Link href="/features/yield-board" className="flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md font-semibold">
            <ArrowLeft size={18} /> Back to Yield Board
          </Link>
        </div>
      </ProtectedFeature>
    )
  }

  const lenderFields = [
    { key: "issuerProvider", label: "Issuer / Provider", type: "text", icon: Building2 },
    { key: "productInstrument", label: "Product / Instrument", type: "text", icon: Package },
    { key: "apyCost", label: "APY / Cost", type: "text", icon: Percent },
    { key: "qualityScore", label: "Score", type: "score", icon: Award },
    { key: "duration", label: "Duration", type: "text", icon: CalendarClock },
    { key: "jurisdiction", label: "Jurisdiction", type: "text", icon: MapPin },
    { key: "lockup", label: "Lockup", type: "text", icon: Lock },
    { key: "seniority", label: "Seniority", type: "text", icon: Shield },
  ]

  const fiatFields = [
    { key: "issuer", label: "Issuer", type: "text", icon: Building2 },
    { key: "product", label: "Product", type: "text", icon: Package },
    { key: "ticker", label: "Ticker", type: "text", icon: Package },
    { key: "type", label: "Type", type: "text", icon: Package },
    { key: "apyDistribution", label: "APY / Distribution", type: "text", icon: Percent },
    { key: "qualityScore", label: "Score", type: "score", icon: Award },
    { key: "duration", label: "Duration", type: "text", icon: CalendarClock },
    { key: "seniority", label: "Seniority", type: "text", icon: Shield },
  ]

  const stablecoinFields = [
    { key: "issuer", label: "Issuer", type: "text", icon: Building2 },
    { key: "product", label: "Product", type: "text", icon: Package },
    { key: "baseStablecoin", label: "Base", type: "text", icon: Package },
    { key: "apy", label: "APY", type: "text", icon: Percent },
    { key: "qualityScore", label: "Score", type: "score", icon: Award },
    { key: "duration", label: "Duration", type: "text", icon: CalendarClock },
    { key: "jurisdiction", label: "Jurisdiction", type: "text", icon: MapPin },
    { key: "lockup", label: "Lockup", type: "text", icon: Lock },
    { key: "seniority", label: "Seniority", type: "text", icon: Shield },
  ]

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

  const fields = hasLenders ? lenderFields : hasFiat ? fiatFields : hasStablecoin ? stablecoinFields : comparisonFields
  const items = hasLenders ? lenders : hasFiat ? fiatProducts : hasStablecoin ? stablecoinProducts : instruments

  function downloadPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm" })
    const title = hasLenders ? "Bitcoin Lender Comparison" : hasFiat ? "Fiat Income Comparison" : hasStablecoin ? "Stablecoin Comparison" : "Instrument Comparison"
    doc.setFontSize(16)
    doc.text(title, 14, 12)
    doc.setFontSize(10)

    const headers = ["Feature", ...items.map((item) => `${item.issuer ?? item.issuerProvider ?? ""}\n${item.productName ?? item.productInstrument ?? item.product ?? ""}`.trim())]
    const rows = fields.map((field) => [
      field.label,
      ...items.map((item) => getCellText(item, field, hasInstruments, hasFiat, hasStablecoin)),
    ])

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 18,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
      margin: { left: 14 },
    })

    doc.save(`yield-board-comparison-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

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
                  {hasLenders ? "Bitcoin Lender Comparison" : hasFiat ? "Fiat Income Comparison" : hasStablecoin ? "Stablecoin Comparison" : "Instrument Comparison"}
                </h1>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/features/yield-board"
                    className="flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md font-semibold"
                  >
                    <ArrowLeft size={18} /> Back to Yield Board
                  </Link>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md font-semibold transition"
                  >
                    <Download size={18} /> Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-8 md:py-12 pt-32 md:pt-40">
          <div className="max-w-7xl mx-auto">
            {hasLenders ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-3xl">
                {BTC_SCORE_EXPLANATION}
              </p>
            ) : null}
            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 overflow-hidden" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200 dark:border-slate-300">
                      <th className="px-6 py-4 text-left text-sm font-extrabold text-slate-900 dark:text-slate-900 sticky left-0 bg-slate-50 dark:bg-slate-50 z-10 min-w-[180px]">
                        Feature
                      </th>
                      {items.map((item) => (
                        <th key={item.id} className="px-6 py-4 text-center text-sm font-extrabold text-slate-900 dark:text-slate-900 min-w-[200px]">
                          <div className="flex flex-col items-center gap-1">
                            <span>{item.issuer ?? item.issuerProvider}</span>
                            <span className="text-xs font-normal text-slate-600 dark:text-slate-500">{item.productName ?? item.productInstrument ?? item.product}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
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
                          {items.map((item) => {
                            let displayValue
                            if (field.key === "apy" && hasInstruments) {
                              displayValue = (
                                <span className="text-xl font-extrabold text-[#f49d1d]">
                                  {formatApy(item)}
                                  {item.module === "M1A" ? (
                                    <span className="block text-xs font-normal text-slate-500">(borrow cost)</span>
                                  ) : null}
                                </span>
                              )
                            } else if (field.type === "score") {
                              const score = item.qualityScore
                              const breakdown = hasLenders ? formatBreakdownExpandable(item.qualityScoreBreakdown) : null
                              displayValue = (
                                <span
                                  className="text-slate-900 dark:text-slate-900 font-medium"
                                  title={breakdown?.join("\n")}
                                >
                                  {score != null ? `${score}/100` : "—"}
                                </span>
                              )
                            } else {
                              const raw = item[field.key]
                              const val = raw ?? "—"
                              displayValue = (
                                <span className="text-slate-900 dark:text-slate-900">
                                  {typeof val === "string" ? val : String(val)}
                                </span>
                              )
                            }
                            return (
                              <td key={item.id} className="px-6 py-4 text-center align-top">
                                {displayValue}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {hasLenders && items.some((item) => formatBreakdownExpandable(item.qualityScoreBreakdown)) ? (
                      <tr className="bg-slate-50/70 dark:bg-slate-100/30 border-b border-slate-200 dark:border-slate-300">
                        <td className="px-6 py-3 sticky left-0 bg-inherit z-10">
                          <div className="flex items-center gap-2">
                            <Award size={18} className="text-[#f49d1d]" />
                            <span className="font-semibold text-slate-700 dark:text-slate-700 text-sm">Score breakdown</span>
                          </div>
                        </td>
                        {items.map((item) => {
                          const lines = formatBreakdownExpandable(item.qualityScoreBreakdown)
                          return (
                            <td key={item.id} className="px-6 py-3 text-center align-top">
                              {lines ? (
                                <div className="text-xs text-slate-600 dark:text-slate-500 text-left inline-block">
                                  {lines.map((line, i) => (
                                    <span key={i}>{line}{i < lines.length - 1 ? <br /> : null}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {!hasLenders && !hasFiat && !hasStablecoin && (
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
            )}
          </div>
        </div>
      </>
    </ProtectedFeature>
  )
}

export default function YieldBoardComparePage() {
  return (
    <Suspense
      fallback={
        <ProtectedFeature featureName="Yield Board">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-slate-600 dark:text-slate-400">Loading comparison…</div>
          </div>
        </ProtectedFeature>
      }
    >
      <YieldBoardCompareContent />
    </Suspense>
  )
}
