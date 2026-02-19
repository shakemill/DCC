"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Coins, DollarSign, CircleDollarSign, Building2, Package, Percent, Award, Clock, MapPin, Lock, Shield, RefreshCw, AlertCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CheckSquare, Square, X, Filter } from "lucide-react"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"

const PER_PAGE = 10

function parseApyCost(val) {
  if (val == null || val === "") return null
  const m = String(val).match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

function formatBreakdownTooltip(raw) {
  if (!raw || typeof raw !== "string") return null
  try {
    const b = JSON.parse(raw)
    const parts = []
    if (b.transparency != null) parts.push(`Transparency: ${b.transparency}`)
    if (b.riskControl != null) parts.push(`Risk Control: ${b.riskControl}`)
    if (b.jurisdiction != null) parts.push(`Jurisdiction: ${b.jurisdiction}`)
    if (b.structure != null) parts.push(`Structure: ${b.structure}`)
    if (b.trackRecord != null) parts.push(`Track Record: ${b.trackRecord}`)
    return parts.length > 0 ? parts.join(" · ") : null
  } catch {
    return null
  }
}

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

export default function YieldBoardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("btc")
  const [lenders, setLenders] = useState([])
  const [lendersLoading, setLendersLoading] = useState(false)
  const [lendersError, setLendersError] = useState(null)
  const [fiatProducts, setFiatProducts] = useState([])
  const [fiatLoading, setFiatLoading] = useState(false)
  const [fiatError, setFiatError] = useState(null)
  const [stablecoinProducts, setStablecoinProducts] = useState([])
  const [stablecoinLoading, setStablecoinLoading] = useState(false)
  const [stablecoinError, setStablecoinError] = useState(null)
  const [stablecoinCategoryFilter, setStablecoinCategoryFilter] = useState("") // "" | "cefi_savings" | "collateralised_lending"
  const [sortKey, setSortKey] = useState("qualityScore")
  const [sortDir, setSortDir] = useState("desc")
  const [selectedIds, setSelectedIds] = useState([])
  const [page, setPage] = useState(1)
  const [expandedScoreRowId, setExpandedScoreRowId] = useState(null)

  const sortedLenders = [...lenders].sort((a, b) => {
    let va, vb
    if (sortKey === "issuerProvider") {
      va = (a.issuerProvider ?? "").toLowerCase()
      vb = (b.issuerProvider ?? "").toLowerCase()
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    if (sortKey === "apyCost") {
      va = parseApyCost(a.apyCost)
      vb = parseApyCost(b.apyCost)
      const na = va ?? -Infinity
      const nb = vb ?? -Infinity
      return sortDir === "desc" ? nb - na : na - nb
    }
    if (sortKey === "qualityScore") {
      va = a.qualityScore ?? -Infinity
      vb = b.qualityScore ?? -Infinity
      return sortDir === "desc" ? vb - va : va - vb
    }
    return 0
  })

  const sortedFiatProducts = [...fiatProducts].sort((a, b) => {
    let va, vb
    if (sortKey === "issuer") {
      va = (a.issuer ?? "").toLowerCase()
      vb = (b.issuer ?? "").toLowerCase()
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    if (sortKey === "apyDistribution") {
      va = parseApyCost(a.apyDistribution)
      vb = parseApyCost(b.apyDistribution)
      const na = va ?? -Infinity
      const nb = vb ?? -Infinity
      return sortDir === "desc" ? nb - na : na - nb
    }
    if (sortKey === "qualityScore") {
      va = a.qualityScore ?? -Infinity
      vb = b.qualityScore ?? -Infinity
      return sortDir === "desc" ? vb - va : va - vb
    }
    return 0
  })

  const filteredStablecoinProducts = stablecoinCategoryFilter
    ? stablecoinProducts.filter((p) => (p.category ?? "") === stablecoinCategoryFilter)
    : stablecoinProducts

  const sortedStablecoinProducts = [...filteredStablecoinProducts].sort((a, b) => {
    let va, vb
    if (sortKey === "issuer") {
      va = (a.issuer ?? "").toLowerCase()
      vb = (b.issuer ?? "").toLowerCase()
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    if (sortKey === "apy") {
      va = parseApyCost(a.apy)
      vb = parseApyCost(b.apy)
      const na = va ?? -Infinity
      const nb = vb ?? -Infinity
      return sortDir === "desc" ? nb - na : na - nb
    }
    if (sortKey === "qualityScore") {
      va = a.qualityScore ?? -Infinity
      vb = b.qualityScore ?? -Infinity
      return sortDir === "desc" ? vb - va : va - vb
    }
    return 0
  })

  const activeItems = activeTab === "btc" ? sortedLenders : activeTab === "fiat" ? sortedFiatProducts : sortedStablecoinProducts
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PER_PAGE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedItems = activeItems.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const from = activeItems.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const to = Math.min(currentPage * PER_PAGE, activeItems.length)

  useEffect(() => {
    setPage(1)
  }, [sortKey, sortDir])

  useEffect(() => {
    setPage(1)
  }, [stablecoinCategoryFilter])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
    setSortKey("qualityScore")
    setSortDir("desc")
    setStablecoinCategoryFilter("")
  }, [activeTab])

  const toggleSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectAllOnPage = () => {
    const pageIds = paginatedItems.map((r) => r.id)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])])
    }
  }

  const clearSelection = () => setSelectedIds([])

  const handleCompare = () => {
    if (selectedIds.length >= 2 && selectedIds.length <= 5) {
      if (activeTab === "btc") router.push(`/features/yield-board/compare?lenders=${selectedIds.join(",")}`)
      else if (activeTab === "fiat") router.push(`/features/yield-board/compare?fiat=${selectedIds.join(",")}`)
      else if (activeTab === "stablecoin") router.push(`/features/yield-board/compare?stablecoin=${selectedIds.join(",")}`)
    }
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "issuerProvider" ? "asc" : "desc")
    }
  }

  const fetchLenders = () => {
    setLendersLoading(true)
    setLendersError(null)
    fetch("/api/bitcoin-backed-lenders")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data?.error || "Failed to load")
        setLenders(Array.isArray(data.lenders) ? data.lenders : [])
      })
      .catch((e) => {
        setLendersError(e?.message || "Failed to load lenders")
        setLenders([])
      })
      .finally(() => setLendersLoading(false))
  }

  const fetchFiatProducts = () => {
    setFiatLoading(true)
    setFiatError(null)
    fetch("/api/usd-income")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data?.error || "Failed to load")
        setFiatProducts(Array.isArray(data.products) ? data.products : [])
      })
      .catch((e) => {
        setFiatError(e?.message || "Failed to load fiat products")
        setFiatProducts([])
      })
      .finally(() => setFiatLoading(false))
  }

  const fetchStablecoinProducts = () => {
    setStablecoinLoading(true)
    setStablecoinError(null)
    fetch("/api/stablecoin-products")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data?.error || "Failed to load")
        setStablecoinProducts(Array.isArray(data.products) ? data.products : [])
      })
      .catch((e) => {
        setStablecoinError(e?.message || "Failed to load stablecoin products")
        setStablecoinProducts([])
      })
      .finally(() => setStablecoinLoading(false))
  }

  useEffect(() => {
    if (activeTab === "btc") fetchLenders()
    else if (activeTab === "fiat") fetchFiatProducts()
    else if (activeTab === "stablecoin") fetchStablecoinProducts()
  }, [activeTab])

  return (
    <ProtectedFeature featureName="Yield Board">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
        <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
          <Breadcrumb
            items={[
              { label: "Features", href: null },
              { label: "Yield Board", href: null },
            ]}
          />
        </div>
        <h2 className="mt-4 md:mt-8 text-4xl md:text-4xl font-bold max-w-4xl leading-tight">
          Yield{" "}
          <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">
            Board
          </span>
        </h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
          Browse income instruments across Bitcoin, Fiat and stablecoins, with clear analysis of yield, structural risk, and liquidity.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-8 mb-8 relative z-10">
        <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
          <button
            onClick={() => setActiveTab("btc")}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "btc"
                ? "bg-gradient-to-r from-[#f49d1d] to-[#e88a0f] text-white shadow-lg shadow-[#f49d1d]/30"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Coins size={20} className={activeTab === "btc" ? "text-white" : "text-[#f49d1d]"} />
            <span className="text-xs md:text-sm">Bitcoin</span>
          </button>

          <button
            onClick={() => setActiveTab("fiat")}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "fiat"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <DollarSign size={20} className={activeTab === "fiat" ? "text-white" : "text-blue-500"} />
            <span className="text-xs md:text-sm">Fiat Income</span>
          </button>

          <button
            onClick={() => setActiveTab("stablecoin")}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "stablecoin"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <CircleDollarSign size={20} className={activeTab === "stablecoin" ? "text-white" : "text-green-500"} />
            <span className="text-xs md:text-sm">Stablecoin</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
        {activeTab === "btc" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 shadow-sm" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#f49d1d]/10">
                    <Coins size={22} className="text-[#f49d1d]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Bitcoin Backed Lenders</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-500">BTC-backed borrowing providers and instruments</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleCompare}
                        disabled={selectedIds.length < 2 || selectedIds.length > 5}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f49d1d] hover:bg-[#d6891a] text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Compare ({selectedIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm font-medium transition"
                      >
                        <X size={16} /> Clear
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={fetchLenders}
                    disabled={lendersLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={lendersLoading ? "animate-spin" : ""} />
                    {lendersLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
              {lenders.length > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-500 mb-4">
                  Select 2–5 providers to compare.
                </p>
              )}
              {lendersLoading && lenders.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <RefreshCw size={32} className="animate-spin text-[#f49d1d]" />
                  <p>Loading lenders…</p>
                </div>
              ) : lendersError ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-amber-600">
                  <AlertCircle size={32} className="text-amber-500" />
                  <p className="font-medium">{lendersError}</p>
                  <button
                    type="button"
                    onClick={fetchLenders}
                    className="mt-2 px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm transition"
                  >
                    Retry
                  </button>
                </div>
              ) : lenders.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Coins size={40} className="text-slate-300 dark:text-slate-600" />
                  <p className="font-medium">No bitcoin backed lenders</p>
                  <p className="text-sm">Add lenders via Admin to see them here.</p>
                </div>
              ) : (
                <>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-3xl">
                  {BTC_SCORE_EXPLANATION}
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-100/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-4 px-4 w-12">
                          <button
                            type="button"
                            onClick={selectAllOnPage}
                            className="inline-flex items-center justify-center w-8 h-8 rounded border border-slate-300 dark:border-slate-600 hover:border-[#f49d1d] text-slate-400 hover:text-[#f49d1d] transition"
                            title={paginatedItems.every((r) => selectedIds.includes(r.id)) ? "Deselect all" : "Select all on page"}
                          >
                            {paginatedItems.every((r) => selectedIds.includes(r.id)) && paginatedItems.length > 0 ? (
                              <CheckSquare size={18} className="text-[#f49d1d]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <button
                            type="button"
                            onClick={() => handleSort(activeTab === "btc" ? "issuerProvider" : "issuer")}
                            className="inline-flex items-center gap-2 hover:text-[#f49d1d] transition cursor-pointer select-none"
                          >
                            <Building2 size={16} className="text-slate-500" />
                            Issuer / Provider
                            {(sortKey === "issuerProvider" || sortKey === "issuer") ? (sortDir === "asc" ? <ChevronUp size={14} className="text-[#f49d1d]" /> : <ChevronDown size={14} className="text-[#f49d1d]" />) : null}
                          </button>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Package size={16} className="text-slate-500" />
                            Product / Instrument
                          </span>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <button
                            type="button"
                            onClick={() => handleSort(activeTab === "btc" ? "apyCost" : activeTab === "fiat" ? "apyDistribution" : "apy")}
                            className="inline-flex items-center gap-2 hover:text-[#f49d1d] transition cursor-pointer select-none"
                          >
                            <Percent size={16} className="text-[#f49d1d]" />
                            APY / Cost
                            {(sortKey === "apyCost" || sortKey === "apyDistribution" || sortKey === "apy") ? (sortDir === "asc" ? <ChevronUp size={14} className="text-[#f49d1d]" /> : <ChevronDown size={14} className="text-[#f49d1d]" />) : null}
                          </button>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <button
                            type="button"
                            onClick={() => handleSort("qualityScore")}
                            className="inline-flex items-center gap-2 hover:text-[#f49d1d] transition cursor-pointer select-none"
                          >
                            <Award size={16} className="text-slate-500" />
                            Score
                            {sortKey === "qualityScore" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-[#f49d1d]" /> : <ChevronDown size={14} className="text-[#f49d1d]" />) : null}
                          </button>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Clock size={16} className="text-slate-500" />
                            Duration
                          </span>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={16} className="text-slate-500" />
                            Jurisdiction
                          </span>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Lock size={16} className="text-slate-500" />
                            Lockup
                          </span>
                        </th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Shield size={16} className="text-slate-500" />
                            Seniority
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((row, idx) => {
                        const isSelected = selectedIds.includes(row.id)
                        return (
                        <React.Fragment key={row.id}>
                        <tr
                          className={`border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors ${
                            idx % 2 === 0 ? "bg-white dark:bg-white" : "bg-slate-50/50 dark:bg-slate-50/30"
                          } hover:bg-[#f49d1d]/5 dark:hover:bg-[#f49d1d]/10 ${isSelected ? "bg-[#f49d1d]/10 dark:bg-[#f49d1d]/10" : ""}`}
                        >
                          <td className="py-4 px-4">
                            <button
                              type="button"
                              onClick={() => toggleSelection(row.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded border border-slate-300 dark:border-slate-600 hover:border-[#f49d1d] transition"
                            >
                              {isSelected ? (
                                <CheckSquare size={18} className="text-[#f49d1d]" />
                              ) : (
                                <Square size={18} className="text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-900">
                              <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                              {row.issuerProvider ?? row.issuer ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-700">
                              <Package size={14} className="text-slate-400 flex-shrink-0" />
                              {row.productInstrument ?? row.product ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-2 font-medium text-[#f49d1d] tabular-nums">
                              <Percent size={14} className="flex-shrink-0" />
                              {row.apyCost ?? row.apyDistribution ?? row.apy ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-4" title={formatBreakdownExpandable(row.qualityScoreBreakdown)?.join("\n") ?? formatBreakdownTooltip(row.qualityScoreBreakdown) ?? undefined}>
                            <button
                              type="button"
                              onClick={() => setExpandedScoreRowId((id) => (id === row.id ? null : row.id))}
                              className="inline-flex items-center gap-2 text-left hover:opacity-80 transition"
                            >
                              <Award size={14} className="text-slate-400 flex-shrink-0" />
                              {row.qualityScore != null ? (
                                <span className="font-medium tabular-nums text-slate-700 dark:text-slate-700">{row.qualityScore}/100</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                              {formatBreakdownExpandable(row.qualityScoreBreakdown) && (
                                expandedScoreRowId === row.id ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-600 max-w-[120px]">
                            <span className="inline-flex items-center gap-2">
                              <Clock size={14} className="text-slate-400 flex-shrink-0" />
                              {row.duration ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-600">
                            <span className="inline-flex items-center gap-2">
                              <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                              {row.jurisdiction ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-600 max-w-[100px]">
                            <span className="inline-flex items-center gap-2">
                              <Lock size={14} className="text-slate-400 flex-shrink-0" />
                              {row.lockup ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-600 max-w-[100px]">
                            <span className="inline-flex items-center gap-2">
                              <Shield size={14} className="text-slate-400 flex-shrink-0" />
                              {row.seniority ?? "—"}
                            </span>
                          </td>
                        </tr>
                        {expandedScoreRowId === row.id && formatBreakdownExpandable(row.qualityScoreBreakdown) && (
                          <tr className="bg-slate-50/70 dark:bg-slate-100/30 border-b border-slate-100 dark:border-slate-700/50">
                            <td colSpan={9} className="py-3 px-4 text-sm text-slate-600 dark:text-slate-500">
                              <div className="flex flex-wrap gap-x-6 gap-y-1">
                                {formatBreakdownExpandable(row.qualityScoreBreakdown).map((line, i) => (
                                  <span key={i}>{line}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {from}–{to} of {activeItems.length}
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
          </div>
        )}
        {activeTab === "fiat" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 shadow-sm" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
                    <DollarSign size={22} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Fiat Income Products</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-500">USD income products and distributions</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleCompare}
                        disabled={selectedIds.length < 2 || selectedIds.length > 5}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Compare ({selectedIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-200 text-sm font-medium transition"
                      >
                        <X size={16} /> Clear
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={fetchFiatProducts}
                    disabled={fiatLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={fiatLoading ? "animate-spin" : ""} />
                    {fiatLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
              {fiatProducts.length > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-500 mb-4">
                  Select 2–5 products to compare.
                </p>
              )}
              {fiatLoading && fiatProducts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <RefreshCw size={32} className="animate-spin text-blue-500" />
                  <p>Loading fiat products…</p>
                </div>
              ) : fiatError ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-amber-600">
                  <AlertCircle size={32} className="text-amber-500" />
                  <p className="font-medium">{fiatError}</p>
                  <button type="button" onClick={fetchFiatProducts} className="mt-2 px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm transition">
                    Retry
                  </button>
                </div>
              ) : fiatProducts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <DollarSign size={40} className="text-slate-300 dark:text-slate-600" />
                  <p className="font-medium">No fiat income products</p>
                  <p className="text-sm">Add products via Admin to see them here.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-100/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-4 px-4 w-12">
                            <button type="button" onClick={selectAllOnPage} className="inline-flex items-center justify-center w-8 h-8 rounded border border-slate-300 dark:border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-500 transition" title={paginatedItems.every((r) => selectedIds.includes(r.id)) ? "Deselect all" : "Select all on page"}>
                              {paginatedItems.every((r) => selectedIds.includes(r.id)) && paginatedItems.length > 0 ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <button type="button" onClick={() => handleSort("issuer")} className="inline-flex items-center gap-2 hover:text-blue-500 transition cursor-pointer select-none">
                              <Building2 size={16} className="text-slate-500" />
                              Issuer
                              {sortKey === "issuer" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />) : null}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2">
                              <Package size={16} className="text-slate-500" />
                              Product / Ticker
                            </span>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <button type="button" onClick={() => handleSort("apyDistribution")} className="inline-flex items-center gap-2 hover:text-blue-500 transition cursor-pointer select-none">
                              <Percent size={16} className="text-blue-500" />
                              APY / Distribution
                              {sortKey === "apyDistribution" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />) : null}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <button type="button" onClick={() => handleSort("qualityScore")} className="inline-flex items-center gap-2 hover:text-blue-500 transition cursor-pointer select-none">
                              <Award size={16} className="text-slate-500" />
                              Score
                              {sortKey === "qualityScore" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />) : null}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2"><Clock size={16} className="text-slate-500" /> Duration</span>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2"><Shield size={16} className="text-slate-500" /> Seniority</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((row, idx) => {
                          const isSelected = selectedIds.includes(row.id)
                          return (
                            <tr key={row.id} className={`border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-white" : "bg-slate-50/50 dark:bg-slate-50/30"} hover:bg-blue-500/5 ${isSelected ? "bg-blue-500/10" : ""}`}>
                              <td className="py-4 px-4">
                                <button type="button" onClick={() => toggleSelection(row.id)} className="inline-flex items-center justify-center w-8 h-8 rounded border border-slate-300 dark:border-slate-600 hover:border-blue-500 transition">
                                  {isSelected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-slate-400" />}
                                </button>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-900">
                                  <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                                  {row.issuer ?? "—"}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-700">
                                  <Package size={14} className="text-slate-400 flex-shrink-0" />
                                  {row.product} {row.ticker ? `(${row.ticker})` : ""}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 font-medium text-blue-500 tabular-nums">
                                  <Percent size={14} className="flex-shrink-0" />
                                  {row.apyDistribution ?? "—"}
                                </span>
                              </td>
                              <td className="py-4 px-4" title={formatBreakdownTooltip(row.qualityScoreBreakdown) ?? undefined}>
                                <span className="inline-flex items-center gap-2">
                                  <Award size={14} className="text-slate-400 flex-shrink-0" />
                                  {row.qualityScore != null ? <span className="font-medium tabular-nums text-slate-700 dark:text-slate-700">{row.qualityScore}/100</span> : <span className="text-slate-400">—</span>}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-slate-600 dark:text-slate-600">{row.duration ?? "—"}</td>
                              <td className="py-4 px-4 text-slate-600 dark:text-slate-600">{row.seniority ?? "—"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Showing {from}–{to} of {activeItems.length}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-400 px-2">Page {currentPage} of {totalPages}</span>
                      <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {activeTab === "stablecoin" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 shadow-sm" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10">
                    <CircleDollarSign size={22} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Stablecoin Products</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-500">CeFi savings and collateralised lending</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleCompare}
                        disabled={selectedIds.length < 2 || selectedIds.length > 5}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Compare ({selectedIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-200 text-sm font-medium transition"
                      >
                        <X size={16} /> Clear
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={fetchStablecoinProducts}
                    disabled={stablecoinLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={stablecoinLoading ? "animate-spin" : ""} />
                    {stablecoinLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
              {stablecoinProducts.length > 0 && (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-500 mb-3">
                    Select 2–5 products to compare.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Filter size={16} className="text-slate-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-500">Category:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setStablecoinCategoryFilter("")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          stablecoinCategoryFilter === ""
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setStablecoinCategoryFilter("cefi_savings")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          stablecoinCategoryFilter === "cefi_savings"
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        CeFi Savings
                      </button>
                      <button
                        type="button"
                        onClick={() => setStablecoinCategoryFilter("collateralised_lending")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          stablecoinCategoryFilter === "collateralised_lending"
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        Collateralised Lending
                      </button>
                    </div>
                  </div>
                </>
              )}
              {stablecoinLoading && stablecoinProducts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <RefreshCw size={32} className="animate-spin text-green-500" />
                  <p>Loading stablecoin products…</p>
                </div>
              ) : stablecoinError ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-amber-600">
                  <AlertCircle size={32} className="text-amber-500" />
                  <p className="font-medium">{stablecoinError}</p>
                  <button type="button" onClick={fetchStablecoinProducts} className="mt-2 px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm transition">
                    Retry
                  </button>
                </div>
              ) : stablecoinProducts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <CircleDollarSign size={40} className="text-slate-300 dark:text-slate-600" />
                  <p className="font-medium">No stablecoin products</p>
                  <p className="text-sm">Add products via Admin to see them here.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-100/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-4 px-4 w-12">
                            <button type="button" onClick={selectAllOnPage} className="inline-flex items-center justify-center w-8 h-8 rounded border border-slate-300 dark:border-slate-600 hover:border-green-500 text-slate-400 hover:text-green-500 transition" title={paginatedItems.every((r) => selectedIds.includes(r.id)) ? "Deselect all" : "Select all on page"}>
                              {paginatedItems.every((r) => selectedIds.includes(r.id)) && paginatedItems.length > 0 ? <CheckSquare size={18} className="text-green-500" /> : <Square size={18} />}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <button type="button" onClick={() => handleSort("issuer")} className="inline-flex items-center gap-2 hover:text-green-500 transition cursor-pointer select-none">
                              <Building2 size={16} className="text-slate-500" />
                              Issuer
                              {sortKey === "issuer" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-green-500" /> : <ChevronDown size={14} className="text-green-500" />) : null}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2">
                              <Package size={16} className="text-slate-500" />
                              Product / Base
                            </span>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <button type="button" onClick={() => handleSort("apy")} className="inline-flex items-center gap-2 hover:text-green-500 transition cursor-pointer select-none">
                              <Percent size={16} className="text-green-500" />
                              APY
                              {sortKey === "apy" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-green-500" /> : <ChevronDown size={14} className="text-green-500" />) : null}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <button type="button" onClick={() => handleSort("qualityScore")} className="inline-flex items-center gap-2 hover:text-green-500 transition cursor-pointer select-none">
                              <Award size={16} className="text-slate-500" />
                              Score
                              {sortKey === "qualityScore" ? (sortDir === "asc" ? <ChevronUp size={14} className="text-green-500" /> : <ChevronDown size={14} className="text-green-500" />) : null}
                            </button>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2"><Clock size={16} className="text-slate-500" /> Duration</span>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-slate-500" /> Jurisdiction</span>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2"><Lock size={16} className="text-slate-500" /> Lockup</span>
                          </th>
                          <th className="text-left py-4 px-4 font-semibold text-slate-700 dark:text-slate-700">
                            <span className="inline-flex items-center gap-2"><Shield size={16} className="text-slate-500" /> Seniority</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((row, idx) => {
                          const isSelected = selectedIds.includes(row.id)
                          return (
                            <tr key={row.id} className={`border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-white" : "bg-slate-50/50 dark:bg-slate-50/30"} hover:bg-green-500/5 ${isSelected ? "bg-green-500/10" : ""}`}>
                              <td className="py-4 px-4">
                                <button type="button" onClick={() => toggleSelection(row.id)} className="inline-flex items-center justify-center w-8 h-8 rounded border border-slate-300 dark:border-slate-600 hover:border-green-500 transition">
                                  {isSelected ? <CheckSquare size={18} className="text-green-500" /> : <Square size={18} className="text-slate-400" />}
                                </button>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-900">
                                  <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                                  {row.issuer ?? "—"}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-700">
                                  <Package size={14} className="text-slate-400 flex-shrink-0" />
                                  {row.product} {row.baseStablecoin ? `(${row.baseStablecoin})` : ""}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center gap-2 font-medium text-green-500 tabular-nums">
                                  <Percent size={14} className="flex-shrink-0" />
                                  {row.apy ?? "—"}
                                </span>
                              </td>
                              <td className="py-4 px-4" title={formatBreakdownTooltip(row.qualityScoreBreakdown) ?? undefined}>
                                <span className="inline-flex items-center gap-2">
                                  <Award size={14} className="text-slate-400 flex-shrink-0" />
                                  {row.qualityScore != null ? <span className="font-medium tabular-nums text-slate-700 dark:text-slate-700">{row.qualityScore}/100</span> : <span className="text-slate-400">—</span>}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-slate-600 dark:text-slate-600">{row.duration ?? "—"}</td>
                              <td className="py-4 px-4 text-slate-600 dark:text-slate-600">{row.jurisdiction ?? "—"}</td>
                              <td className="py-4 px-4 text-slate-600 dark:text-slate-600">{row.lockup ?? "—"}</td>
                              <td className="py-4 px-4 text-slate-600 dark:text-slate-600">{row.seniority ?? "—"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Showing {from}–{to} of {activeItems.length}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-400 px-2">Page {currentPage} of {totalPages}</span>
                      <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedFeature>
  )
}
