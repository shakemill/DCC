"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { FileText, Calendar, DollarSign, Shield, GitCompare, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"

const cardStyle = {
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)",
}

const PER_PAGE = 10

function getReportTypeColor(type) {
  const colors = {
    Suitability: "bg-amber-100 text-amber-700",
    Income: "bg-blue-100 text-blue-700",
    Risk: "bg-orange-100 text-orange-700",
    Performance: "bg-slate-100 text-slate-700",
  }
  return colors[type] || "bg-slate-100 text-slate-700"
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({ reportType: "all", dateRange: "all" })
  const [page, setPage] = useState(1)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [instruments, setInstruments] = useState([])
  const [incomePlans, setIncomePlans] = useState([])
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)

  const [incomeSource, setIncomeSource] = useState("fiat")
  const [incomePlanParams, setIncomePlanParams] = useState({
    targetMonthlyIncome: "",
    targetAnnualIncome: "",
    horizon: 12,
    region: "UAE",
    liquidityPreference: "Market-traded",
    excludeDiscretionary: false,
    availableCapital: "",
    principal: "",
    stablecoinAsset: "USDC",
  })
  const [incomeAllocation, setIncomeAllocation] = useState([])

  const [riskSource, setRiskSource] = useState("1A")
  const [riskPlanParams, setRiskPlanParams] = useState({
    totalNeed12m: "",
    apr: "9",
    btcPrice: "40000",
    ltv: 50,
    marginCallLtv: 75,
    liquidationLtv: 85,
    region: "UAE",
    stablecoinAsset: "USDC",
  })
  const [riskAllocation, setRiskAllocation] = useState([])

  const [compareIds, setCompareIds] = useState([])

  const fetchReports = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?userId=${encodeURIComponent(user.id)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to fetch reports")
      setReports(data.reports || [])
    } catch (e) {
      setError(e.message)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useEffect(() => {
    setPage(1)
  }, [formData.reportType, formData.dateRange])

  const modalOpen = !!modalType
  useEffect(() => {
    if (modalOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = prev }
    }
  }, [modalOpen])

  const filteredReports = reports.filter((r) => {
    if (formData.reportType !== "all" && r.reportType !== formData.reportType) return false
    if (formData.dateRange !== "all" && r.createdAt) {
      const created = new Date(r.createdAt).getTime()
      const now = Date.now()
      const d = formData.dateRange
      if (d === "7d" && now - created > 7 * 24 * 60 * 60 * 1000) return false
      if (d === "30d" && now - created > 30 * 24 * 60 * 60 * 1000) return false
      if (d === "90d" && now - created > 90 * 24 * 60 * 60 * 1000) return false
      if (d === "1y" && now - created > 365 * 24 * 60 * 60 * 1000) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PER_PAGE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedReports = filteredReports.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const from = filteredReports.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const to = Math.min(currentPage * PER_PAGE, filteredReports.length)

  const fetchForModal = useCallback(
    async (type, opts = {}) => {
      setGenerateError(null)
      try {
        let list = []
        if (type === "suitability" || type === "comparison") {
          const allRes = await fetch("/api/instruments")
          const allData = await allRes.json()
          list = allData.success && Array.isArray(allData.instruments) ? allData.instruments : []
        } else if (type === "income") {
          const src = opts.incomeSource ?? incomeSource
          const mod = src === "stablecoin" ? "1C" : "1B"
          const mRes = await fetch(`/api/instruments?module=${mod}`)
          const mData = await mRes.json()
          list = mData.success && Array.isArray(mData.instruments) ? mData.instruments : []
        } else if (type === "risk") {
          const mRes = await fetch("/api/instruments?module=1C")
          const mData = await mRes.json()
          list = mData.success && Array.isArray(mData.instruments) ? mData.instruments : []
        }
        setInstruments(list)
        if (user?.id) {
          const plansRes = await fetch(`/api/income-plans?userId=${encodeURIComponent(user.id)}`)
          if (plansRes.ok) {
            const plansData = await plansRes.json()
            setIncomePlans(plansData.plans || [])
          } else setIncomePlans([])
        } else setIncomePlans([])
      } catch (e) {
        setGenerateError(e.message)
      }
    },
    [user?.id, incomeSource]
  )

  const openModal = async (type) => {
    setModalType(type)
    setGenerateError(null)
    setSelectedInstrumentIds([])
    setSelectedPlanId("")
    setIncomeAllocation([])
    setRiskAllocation([])
    setCompareIds([])
    if (type === "suitability" || type === "comparison") await fetchForModal(type)
    else if (type === "income") {
      setIncomeSource("fiat")
      await fetchForModal(type, { incomeSource: "fiat" })
    } else if (type === "risk") {
      setRiskSource("1A")
      await fetchForModal(type)
    }
  }

  const closeModal = () => {
    setModalType(null)
    setGenerateError(null)
  }

  const toggleInstrument = (id) => {
    setSelectedInstrumentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const setIncomeWeight = (id, weight) => {
    const w = parseFloat(weight) || 0
    setIncomeAllocation((prev) => {
      const next = prev.some((a) => a.id === id) ? prev.map((a) => (a.id === id ? { ...a, weight: w } : a)) : [...prev, { id, weight: w }]
      return next.filter((a) => instruments.some((i) => i.id === a.id))
    })
  }

  const toggleIncomeInstrument = (id) => {
    const inAlloc = incomeAllocation.some((a) => a.id === id)
    if (inAlloc) setIncomeAllocation((prev) => prev.filter((a) => a.id !== id))
    else setIncomeAllocation((prev) => [...prev, { id, weight: 0 }])
  }

  const setRiskWeight = (id, weight) => {
    const w = parseFloat(weight) || 0
    setRiskAllocation((prev) => {
      const next = prev.some((a) => a.id === id) ? prev.map((a) => (a.id === id ? { ...a, weight: w } : a)) : [...prev, { id, weight: w }]
      return next.filter((a) => instruments.some((i) => i.id === a.id))
    })
  }

  const toggleRiskInstrument = (id) => {
    const inAlloc = riskAllocation.some((a) => a.id === id)
    if (inAlloc) setRiskAllocation((prev) => prev.filter((a) => a.id !== id))
    else setRiskAllocation((prev) => [...prev, { id, weight: 0 }])
  }

  const handleGenerateSuitability = async () => {
    if (!user?.id) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/reports/suitability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          incomePlanId: selectedPlanId || undefined,
          instruments: selectedInstrumentIds.map((id) => ({ id })),
          planParams: {},
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create report")
      closeModal()
      fetchReports()
    } catch (e) {
      setGenerateError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateIncome = async () => {
    if (!user?.id) return
    const total = incomeAllocation.reduce((s, a) => s + (a.weight || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      setGenerateError("Weights must sum to 100%")
      return
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      const planParams = {
        targetMonthlyIncome: incomePlanParams.targetMonthlyIncome,
        targetAnnualIncome: incomePlanParams.targetAnnualIncome,
        horizon: Number(incomePlanParams.horizon) || 12,
        region: incomePlanParams.region || "UAE",
        liquidityPreference: incomePlanParams.liquidityPreference || "Market-traded",
        excludeDiscretionary: incomePlanParams.excludeDiscretionary,
        availableCapital: incomePlanParams.availableCapital,
        principal: incomePlanParams.principal,
        stablecoinAsset: incomePlanParams.stablecoinAsset || "USDC",
      }
      const res = await fetch("/api/reports/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          source: incomeSource,
          incomePlanId: selectedPlanId || undefined,
          planParams,
          instruments: incomeAllocation.map((a) => ({ id: a.id, weight: a.weight })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create report")
      closeModal()
      fetchReports()
    } catch (e) {
      setGenerateError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateRisk = async () => {
    if (!user?.id) return
    if (riskSource === "1C") {
      const total = riskAllocation.reduce((s, a) => s + (a.weight || 0), 0)
      if (Math.abs(total - 100) > 0.01) {
        setGenerateError("Weights must sum to 100%")
        return
      }
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      const planParams =
        riskSource === "1A"
          ? {
              totalNeed12m: riskPlanParams.totalNeed12m,
              apr: riskPlanParams.apr,
              btcPrice: riskPlanParams.btcPrice,
              ltv: riskPlanParams.ltv,
              marginCallLtv: riskPlanParams.marginCallLtv,
              liquidationLtv: riskPlanParams.liquidationLtv,
            }
          : {
              region: riskPlanParams.region || "UAE",
              stablecoinAsset: riskPlanParams.stablecoinAsset || "USDC",
            }
      const res = await fetch("/api/reports/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          source: riskSource,
          incomePlanId: selectedPlanId || undefined,
          planParams,
          instruments: riskSource === "1C" ? riskAllocation.map((a) => ({ id: a.id, weight: a.weight })) : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create report")
      closeModal()
      fetchReports()
    } catch (e) {
      setGenerateError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateComparison = async () => {
    if (!user?.id) return
    if (compareIds.length < 2 || compareIds.length > 3) {
      setGenerateError("Select 2 or 3 instruments to compare")
      return
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/reports/comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, instruments: compareIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create report")
      closeModal()
      fetchReports()
    } catch (e) {
      setGenerateError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const incomeInstrumentsByModule = incomeSource === "fiat" ? instruments.filter((i) => i.module === "M1B") : instruments.filter((i) => i.module === "M1C")

  return (
    <ProtectedFeature featureName="Reports">
      <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
        <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
          <Breadcrumb items={[{ label: "Features", href: null }, { label: "Reports", href: null }]} />
        </div>
        <h2 className="mt-4 md:mt-8 text-4xl font-bold max-w-4xl leading-tight">Reports</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
          Access and download your reports. Generate Suitability, Income, Risk, and Comparison reports; data is frozen at creation and stored in the database.
        </p>
      </div>

      <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-20">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Form at top */}
          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-8 md:p-10" style={cardStyle}>
            <h3 className="text-2xl font-extrabold mb-6 text-slate-900 dark:text-slate-900">Filters & Generate</h3>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="reportType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Report Type</label>
                  <select id="reportType" name="reportType" value={formData.reportType} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-white text-slate-900 dark:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent transition">
                    <option value="all">All Reports</option>
                    <option value="Suitability">Suitability</option>
                    <option value="Income">Income</option>
                    <option value="Risk">Risk</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dateRange" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
                  <select id="dateRange" name="dateRange" value={formData.dateRange} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-white text-slate-900 dark:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent transition">
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openModal("suitability")} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 transition text-white rounded-lg font-semibold flex items-center gap-2 text-sm">
                  <FileText size={16} /> Suitability
                </button>
                <button type="button" onClick={() => openModal("income")} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 transition text-white rounded-lg font-semibold flex items-center gap-2 text-sm">
                  <DollarSign size={16} /> Income
                </button>
                <button type="button" onClick={() => openModal("risk")} className="px-3 py-2 bg-orange-500 hover:bg-orange-600 transition text-white rounded-lg font-semibold flex items-center gap-2 text-sm">
                  <Shield size={16} /> Risk
                </button>
                <button type="button" onClick={() => openModal("comparison")} className="px-3 py-2 bg-slate-600 hover:bg-slate-700 transition text-white rounded-lg font-semibold flex items-center gap-2 text-sm">
                  <GitCompare size={16} /> Compare
                </button>
              </div>
            </form>
          </div>

          {/* Reports table below */}
          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 overflow-hidden" style={cardStyle}>
            <h3 className="text-2xl font-extrabold p-8 pb-4 text-slate-900 dark:text-slate-900">Your Reports</h3>
            {loading ? (
              <p className="text-slate-500 py-8 px-8">Loading…</p>
            ) : error ? (
              <p className="text-amber-600 py-8 px-8">{error}</p>
            ) : filteredReports.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200 dark:border-slate-300">
                        <th className="text-left py-3 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700">Type</th>
                        <th className="text-left py-3 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700">Created</th>
                        <th className="text-left py-3 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700 hidden sm:table-cell">Status</th>
                        <th className="text-right py-3 px-4 md:px-6 font-semibold text-slate-700 dark:text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-100 dark:border-slate-200 last:border-0 even:bg-slate-50/50 dark:even:bg-slate-50/30">
                        <td className="py-3 px-4 md:px-6">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getReportTypeColor(report.reportType)}`}>
                            {report.reportType}
                          </span>
                        </td>
                        <td className="py-3 px-4 md:px-6 text-slate-600 dark:text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} className="shrink-0" />
                            {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 md:px-6 hidden sm:table-cell">
                          <span className="text-sm text-green-600 font-medium">Stored</span>
                        </td>
                        <td className="py-3 px-4 md:px-6 text-right">
                          <Link href={`/features/reports/${report.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 font-medium text-sm transition">
                            <ExternalLink size={14} /> View report
                          </Link>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-300">
                  <p className="text-sm text-slate-600 dark:text-slate-600">
                    Showing {from}–{to} of {filteredReports.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 px-8">
                <FileText size={48} className="text-slate-400 mb-4" />
                <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-900 mb-2">No Reports Found</h4>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {reports.length === 0 ? "Generate a report to get started." : "No reports match your filters."}
                </p>
                {reports.length > 0 && (
                  <button onClick={() => setFormData({ reportType: "all", dateRange: "all" })} className="text-sm text-[#f49d1d] hover:text-[#d6891a] font-medium">
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalType === "suitability" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200 dark:border-slate-300 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-300">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-900">Generate Suitability Report</h3>
              <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">Select instruments to include. Data is frozen at report creation.</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {generateError && <p className="text-amber-600 text-sm mb-4">{generateError}</p>}
              {incomePlans.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Link to Income Plan (optional)</label>
                  <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                    <option value="">None</option>
                    {incomePlans.map((p) => (
                      <option key={p.id} value={p.id}>Plan – {p.currency} {Number(p.loanAmount).toLocaleString()} @ {p.ltv}% LTV</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Instruments (optional)</label>
                <div className="border border-slate-200 dark:border-slate-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-2">
                  {instruments.length === 0 ? <p className="text-slate-500 text-sm py-2">No instruments available.</p> : instruments.map((i) => (
                    <label key={i.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-50 rounded p-2">
                      <input type="checkbox" checked={selectedInstrumentIds.includes(i.id)} onChange={() => toggleInstrument(i.id)} className="w-4 h-4" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-900">{i.issuer}</span>
                      <span className="text-slate-500 text-sm">{i.productName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-300 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="button" onClick={handleGenerateSuitability} disabled={generating} className="px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-lg font-semibold transition disabled:opacity-50">
                {generating ? "Creating…" : "Create Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "income" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200 dark:border-slate-300 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-300">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-900">Generate Income Report</h3>
              <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">Fiat (1B) or Stablecoin (1C). Select instruments and weights (sum 100%).</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain space-y-4">
              {generateError && <p className="text-amber-600 text-sm">{generateError}</p>}
              {incomePlans.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Link to Income Plan (optional)</label>
                  <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                    <option value="">None</option>
                    {incomePlans.map((p) => (
                      <option key={p.id} value={p.id}>Plan – {p.currency} {Number(p.loanAmount).toLocaleString()} @ {p.ltv}% LTV</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Source</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setIncomeSource("fiat"); fetchForModal("income", { incomeSource: "fiat" }); }} className={`flex-1 px-3 py-2 rounded-lg font-medium ${incomeSource === "fiat" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"}`}>Fiat (1B)</button>
                  <button type="button" onClick={() => { setIncomeSource("stablecoin"); fetchForModal("income", { incomeSource: "stablecoin" }); }} className={`flex-1 px-3 py-2 rounded-lg font-medium ${incomeSource === "stablecoin" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"}`}>Stablecoin (1C)</button>
                </div>
              </div>
              {incomeSource === "fiat" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Target annual income</label>
                      <input type="number" value={incomePlanParams.targetAnnualIncome} onChange={(e) => setIncomePlanParams((p) => ({ ...p, targetAnnualIncome: e.target.value }))} placeholder="120000" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Horizon (months)</label>
                      <input type="number" value={incomePlanParams.horizon} onChange={(e) => setIncomePlanParams((p) => ({ ...p, horizon: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
                      <select value={incomePlanParams.region} onChange={(e) => setIncomePlanParams((p) => ({ ...p, region: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="UAE">UAE</option>
                        <option value="US">US</option>
                        <option value="EU">EU</option>
                        <option value="UK">UK</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Available capital (optional)</label>
                      <input type="number" value={incomePlanParams.availableCapital} onChange={(e) => setIncomePlanParams((p) => ({ ...p, availableCapital: e.target.value }))} placeholder="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </>
              )}
              {incomeSource === "stablecoin" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Principal</label>
                      <input type="number" value={incomePlanParams.principal} onChange={(e) => setIncomePlanParams((p) => ({ ...p, principal: e.target.value }))} placeholder="100000" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Stablecoin</label>
                      <select value={incomePlanParams.stablecoinAsset} onChange={(e) => setIncomePlanParams((p) => ({ ...p, stablecoinAsset: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
                      <select value={incomePlanParams.region} onChange={(e) => setIncomePlanParams((p) => ({ ...p, region: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="UAE">UAE</option>
                        <option value="US">US</option>
                        <option value="EU">EU</option>
                        <option value="UK">UK</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Instruments & weights (sum 100%)</label>
                <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-2">
                  {incomeInstrumentsByModule.length === 0 ? <p className="text-slate-500 text-sm py-2">No instruments.</p> : incomeInstrumentsByModule.map((i) => {
                    const alloc = incomeAllocation.find((a) => a.id === i.id)
                    const sel = !!alloc
                    return (
                      <div key={i.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                        <input type="checkbox" checked={sel} onChange={() => toggleIncomeInstrument(i.id)} className="w-4 h-4" />
                        <span className="text-sm font-medium flex-1">{i.issuer} – {i.productName}</span>
                        {sel && (
                          <input type="number" min="0" max="100" step="1" value={alloc?.weight ?? 0} onChange={(e) => setIncomeWeight(i.id, e.target.value)} className="w-16 px-2 py-1 border rounded text-sm" />
                        )}
                        {sel && <span className="text-xs text-slate-500">%</span>}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">Total: {incomeAllocation.reduce((s, a) => s + (a.weight || 0), 0).toFixed(1)}%</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-300 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="button" onClick={handleGenerateIncome} disabled={generating} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition disabled:opacity-50">
                {generating ? "Creating…" : "Create Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "risk" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200 dark:border-slate-300 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-300">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-900">Generate Risk Report</h3>
              <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">1A (BTC LTV, margin, liquidation) or 1C (stablecoin venue, risk tags).</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain space-y-4">
              {generateError && <p className="text-amber-600 text-sm">{generateError}</p>}
              {incomePlans.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Link to Income Plan (optional)</label>
                  <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                    <option value="">None</option>
                    {incomePlans.map((p) => (
                      <option key={p.id} value={p.id}>Plan – {p.currency} {Number(p.loanAmount).toLocaleString()} @ {p.ltv}% LTV</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Source</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRiskSource("1A")} className={`flex-1 px-3 py-2 rounded-lg font-medium ${riskSource === "1A" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"}`}>1A BTC</button>
                  <button type="button" onClick={() => { setRiskSource("1C"); fetchForModal("risk"); }} className={`flex-1 px-3 py-2 rounded-lg font-medium ${riskSource === "1C" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"}`}>1C Stablecoin</button>
                </div>
              </div>
              {riskSource === "1A" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Total need 12m (USD)</label>
                    <input type="number" value={riskPlanParams.totalNeed12m} onChange={(e) => setRiskPlanParams((p) => ({ ...p, totalNeed12m: e.target.value }))} placeholder="13080" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">APR %</label>
                    <input type="number" value={riskPlanParams.apr} onChange={(e) => setRiskPlanParams((p) => ({ ...p, apr: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">BTC price</label>
                    <input type="number" value={riskPlanParams.btcPrice} onChange={(e) => setRiskPlanParams((p) => ({ ...p, btcPrice: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">LTV %</label>
                    <input type="number" value={riskPlanParams.ltv} onChange={(e) => setRiskPlanParams((p) => ({ ...p, ltv: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Margin call LTV %</label>
                    <input type="number" value={riskPlanParams.marginCallLtv} onChange={(e) => setRiskPlanParams((p) => ({ ...p, marginCallLtv: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Liquidation LTV %</label>
                    <input type="number" value={riskPlanParams.liquidationLtv} onChange={(e) => setRiskPlanParams((p) => ({ ...p, liquidationLtv: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}
              {riskSource === "1C" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
                      <select value={riskPlanParams.region} onChange={(e) => setRiskPlanParams((p) => ({ ...p, region: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="UAE">UAE</option>
                        <option value="US">US</option>
                        <option value="EU">EU</option>
                        <option value="UK">UK</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Stablecoin</label>
                      <select value={riskPlanParams.stablecoinAsset} onChange={(e) => setRiskPlanParams((p) => ({ ...p, stablecoinAsset: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Instruments & weights (sum 100%)</label>
                    <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-2">
                      {instruments.filter((i) => i.module === "M1C").length === 0 ? <p className="text-slate-500 text-sm py-2">No 1C instruments.</p> : instruments.filter((i) => i.module === "M1C").map((i) => {
                        const alloc = riskAllocation.find((a) => a.id === i.id)
                        const sel = !!alloc
                        return (
                          <div key={i.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                            <input type="checkbox" checked={sel} onChange={() => toggleRiskInstrument(i.id)} className="w-4 h-4" />
                            <span className="text-sm font-medium flex-1">{i.issuer} – {i.productName}</span>
                            {sel && (
                              <input type="number" min="0" max="100" step="1" value={alloc?.weight ?? 0} onChange={(e) => setRiskWeight(i.id, e.target.value)} className="w-16 px-2 py-1 border rounded text-sm" />
                            )}
                            {sel && <span className="text-xs text-slate-500">%</span>}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Total: {riskAllocation.reduce((s, a) => s + (a.weight || 0), 0).toFixed(1)}%</p>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-300 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="button" onClick={handleGenerateRisk} disabled={generating} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition disabled:opacity-50">
                {generating ? "Creating…" : "Create Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "comparison" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200 dark:border-slate-300 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-300">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-900">Generate Comparison Report</h3>
              <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">Select 2 or 3 providers to compare. Data is frozen at creation.</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {generateError && <p className="text-amber-600 text-sm mb-4">{generateError}</p>}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Instruments (2 or 3)</label>
                <div className="border border-slate-200 dark:border-slate-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-2">
                  {instruments.length === 0 ? <p className="text-slate-500 text-sm py-2">No instruments.</p> : instruments.map((i) => (
                    <label key={i.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-2">
                      <input type="checkbox" checked={compareIds.includes(i.id)} onChange={() => toggleCompare(i.id)} disabled={!compareIds.includes(i.id) && compareIds.length >= 3} className="w-4 h-4" />
                      <span className="text-sm font-medium text-slate-900">{i.issuer}</span>
                      <span className="text-slate-500 text-sm">{i.productName}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Selected: {compareIds.length}</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-300 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="button" onClick={handleGenerateComparison} disabled={generating || compareIds.length < 2} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition disabled:opacity-50">
                {generating ? "Creating…" : "Create Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedFeature>
  )
}
