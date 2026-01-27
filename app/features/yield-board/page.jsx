"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"
import {
  CheckSquare,
  Square,
  X,
  AlertCircle,
  Eye,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Building2,
  Package,
  Layers,
  Shield,
  Award,
  Clock,
  MapPin,
  Percent,
  Calendar,
  FileText,
  Coins,
  DollarSign,
  CircleDollarSign,
  Info,
} from "lucide-react"

const PER_PAGE = 10

const COLUMNS_CONFIG = [
  { id: "select", label: "", alwaysVisible: true, sortable: false, icon: null },
  { id: "issuer", label: "Issuer", defaultVisible: true, sortable: true, icon: Building2 },
  { id: "product", label: "Product", defaultVisible: true, sortable: true, icon: Package },
  { id: "module", label: "Module", defaultVisible: true, sortable: true, icon: Layers },
  { id: "collateral", label: "Collateral", defaultVisible: false, sortable: true, icon: Shield },
  { id: "seniority", label: "Seniority", defaultVisible: false, sortable: true, icon: Award },
  { id: "lockup", label: "Lockup", defaultVisible: false, sortable: true, icon: Clock },
  { id: "jurisdiction", label: "Jurisdiction", defaultVisible: false, sortable: true, icon: MapPin },
  { id: "apy", label: "APY", defaultVisible: false, sortable: true, icon: Percent },
  { id: "asOf", label: "Date", defaultVisible: false, sortable: true, icon: Calendar },
  { id: "notes", label: "Notes", defaultVisible: false, sortable: true, icon: FileText },
  { id: "detail", label: "Detail", alwaysVisible: true, sortable: false, icon: Eye },
]

const getDefaultVisible = () =>
  COLUMNS_CONFIG.reduce((acc, c) => {
    if (c.alwaysVisible || c.defaultVisible) acc[c.id] = true
    else acc[c.id] = false
    return acc
  }, {})

function formatApy(instrument) {
  const s = instrument?.latestSnapshot
  if (!s) return instrument?.apyLabel ?? "—"
  if (s.apyLabelOverride) return s.apyLabelOverride
  if (s.apyMin != null && s.apyMax != null && s.apyMin !== s.apyMax)
    return `${s.apyMin}% – ${s.apyMax}%`
  if (s.apyMin != null) return `${s.apyMin}%`
  if (s.apyMax != null) return `${s.apyMax}%`
  return instrument?.apyLabel ?? "—"
}

function formatModule(m) {
  if (!m) return "—"
  if (m === "M1A") return "1A"
  if (m === "M1B") return "1B"
  if (m === "M1C") return "1C"
  return m
}

function getSortValue(item, key) {
  switch (key) {
    case "issuer":
      return (item.issuer ?? "").toLowerCase()
    case "product":
      return (item.productName ?? "").toLowerCase()
    case "module":
      return formatModule(item.module).toLowerCase()
    case "collateral":
    case "seniority":
    case "lockup":
    case "jurisdiction":
    case "notes":
      return (item[key] ?? "").toLowerCase()
    case "apy": {
      const s = item?.latestSnapshot
      const v = s?.apyMin != null ? Number(s.apyMin) : s?.apyMax != null ? Number(s.apyMax) : null
      return v ?? -Infinity
    }
    case "asOf": {
      const d = item?.latestSnapshot?.asOf
      return d ? new Date(d).getTime() : -Infinity
    }
    default:
      return ""
  }
}

export default function YieldBoardPage() {
  const router = useRouter()
  const [module, setModule] = useState("")
  const [asset, setAsset] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [supportedAsset, setSupportedAsset] = useState("")
  const [selectedIds, setSelectedIds] = useState([])
  const [instruments, setInstruments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [visibleCols, setVisibleCols] = useState(() => getDefaultVisible())
  const [colSelectorOpen, setColSelectorOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState("issuer")
  const [sortDir, setSortDir] = useState("asc")

  const fetchInstruments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (module) params.set("module", module)
      if (asset) params.set("asset", asset)
      if (jurisdiction.trim()) params.set("jurisdiction", jurisdiction.trim())
      if (supportedAsset) params.set("supportedAsset", supportedAsset)
      const res = await fetch(`/api/instruments?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load")
      setInstruments(data.instruments || [])
    } catch (e) {
      setError(e.message)
      setInstruments([])
    } finally {
      setLoading(false)
    }
  }, [module, asset, jurisdiction, supportedAsset])

  useEffect(() => {
    fetchInstruments()
  }, [fetchInstruments])

  useEffect(() => {
    setPage(1)
  }, [module, asset, minAmount, jurisdiction, supportedAsset])

  const filteredData = instruments.filter((item) => {
    const minLoan = item.minLoanSize != null ? Number(item.minLoanSize) : null
    const userMin = minAmount ? parseFloat(minAmount) : null
    if (userMin != null && !isNaN(userMin) && minLoan != null && minLoan > userMin)
      return false
    return true
  })

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredData.map((i) => i.id))
    }
  }

  const clearSelection = () => setSelectedIds([])

  const handleSort = (colId) => {
    const c = COLUMNS_CONFIG.find((x) => x.id === colId)
    if (!c?.sortable) return
    setPage(1)
    if (sortKey === colId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(colId)
      setSortDir("asc")
    }
  }

  const sortedData = [...filteredData].sort((a, b) => {
    const va = getSortValue(a, sortKey)
    const vb = getSortValue(b, sortKey)
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), undefined, { numeric: true })
    return sortDir === "asc" ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PER_PAGE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedData = sortedData.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const from = sortedData.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const to = Math.min(currentPage * PER_PAGE, sortedData.length)

  const toggleColumn = (id) => {
    const c = COLUMNS_CONFIG.find((x) => x.id === id)
    if (c?.alwaysVisible) return
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCompare = () => {
    if (selectedIds.length > 0) {
      router.push(`/features/yield-board/compare?platforms=${selectedIds.join(",")}`)
    }
  }

  const cardStyle = {
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)",
  }

  return (
    <ProtectedFeature featureName="Yield Board">
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
          DCC database instruments: 1A (BTC), 1B (fiat), 1C (stablecoin). Risk, structure and liquidity first; yield conditional, non‑promotional.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16 space-y-6">
        <div
          className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
          style={cardStyle}
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">
            Filters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="module" className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                Module
              </label>
              <select
                id="module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
              >
                <option value="">All</option>
                <option value="1A">1A — BTC</option>
                <option value="1B">1B — Fiat</option>
                <option value="1C">1C — Stablecoin</option>
              </select>
            </div>
            <div>
              <label htmlFor="asset" className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                Asset
              </label>
              <select
                id="asset"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
              >
                <option value="">All</option>
                <option value="BTC">BTC</option>
                <option value="USD">USD</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
            <div>
              <label htmlFor="minAmount" className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                Min. amount (optional)
              </label>
              <input
                type="number"
                id="minAmount"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
              />
            </div>
            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                Jurisdiction
              </label>
              <input
                type="text"
                id="jurisdiction"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. UAE, US"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
              />
            </div>
            <div>
              <label htmlFor="supportedAsset" className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                Supported asset (1C)
              </label>
              <select
                id="supportedAsset"
                value={supportedAsset}
                onChange={(e) => setSupportedAsset(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
              >
                <option value="">—</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
          style={cardStyle}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-900">
              Instruments
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setColSelectorOpen((o) => !o)}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Columns3 size={16} /> Columns
                </button>
                {colSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden="true"
                      onClick={() => setColSelectorOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 py-2 shadow-lg">
                      <p className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Show columns
                      </p>
                      {COLUMNS_CONFIG.filter((c) => !c.alwaysVisible).map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={!!visibleCols[c.id]}
                            onChange={() => toggleColumn(c.id)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-900 dark:text-slate-200">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={handleCompare}
                    className="px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    Compare ({selectedIds.length})
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-[#f49d1d] transition flex items-center gap-1"
                  >
                    <X size={16} /> Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading…</div>
          ) : error ? (
            <div className="py-12 flex items-center justify-center gap-2 text-amber-700">
              <AlertCircle size={20} /> {error}
            </div>
          ) : filteredData.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-500 flex items-center gap-2">
                <Info size={14} className="flex-shrink-0 text-slate-500" />
                Select 2 or 3 providers to compare.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {COLUMNS_CONFIG.map(
                        (c) =>
                          visibleCols[c.id] && (
                            <th
                              key={c.id}
                              className={`text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700 ${
                                c.id === "select" ? "w-10" : c.id === "detail" ? "w-24" : ""
                              } ${c.sortable ? "cursor-pointer select-none hover:text-[#f49d1d]" : ""}`}
                            >
                              {c.id === "select" ? (
                                <button
                                  onClick={selectAll}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded border border-slate-300 hover:border-[#f49d1d] text-slate-400 hover:text-[#f49d1d] transition"
                                  title={selectedIds.length === filteredData.length ? "Deselect all" : "Select all"}
                                >
                                  {selectedIds.length === filteredData.length ? (
                                    <CheckSquare size={14} className="text-[#f49d1d]" />
                                  ) : (
                                    <Square size={14} />
                                  )}
                                </button>
                              ) : c.sortable ? (
                                <button
                                  type="button"
                                  onClick={() => handleSort(c.id)}
                                  className="inline-flex items-center gap-1.5 w-full text-left"
                                >
                                  {c.icon && <c.icon size={14} className="text-slate-500 dark:text-slate-500 flex-shrink-0" />}
                                  {c.label}
                                  {sortKey === c.id ? (
                                    sortDir === "asc" ? (
                                      <ChevronUp size={14} className="text-[#f49d1d] flex-shrink-0 ml-auto" />
                                    ) : (
                                      <ChevronDown size={14} className="text-[#f49d1d] flex-shrink-0 ml-auto" />
                                    )
                                  ) : (
                                    <ArrowUpDown size={12} className="text-slate-400 flex-shrink-0 ml-auto" />
                                  )}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5">
                                  {c.icon && <c.icon size={14} className="text-slate-500 dark:text-slate-500 flex-shrink-0" />}
                                  {c.label}
                                </span>
                              )}
                            </th>
                          )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => {
                      const isSelected = selectedIds.includes(item.id)
                      const asOf = item.latestSnapshot?.asOf
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-100 transition even:bg-slate-50/80 even:dark:bg-slate-100/30 hover:bg-slate-100/80 dark:hover:bg-slate-100/50 ${
                            isSelected ? "!bg-[#f49d1d]/10" : ""
                          }`}
                        >
                          {COLUMNS_CONFIG.map(
                            (c) =>
                              visibleCols[c.id] && (
                                <td key={c.id} className="py-3 px-4">
                                  {c.id === "select" && (
                                    <button
                                      onClick={() => toggleSelection(item.id)}
                                      className="inline-flex items-center justify-center w-6 h-6 rounded border border-slate-300 hover:border-[#f49d1d] transition"
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={14} className="text-[#f49d1d]" />
                                      ) : (
                                        <Square size={14} className="text-slate-400" />
                                      )}
                                    </button>
                                  )}
                                  {c.id === "issuer" && (
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-900">
                                      <Building2 size={14} className="text-slate-500 flex-shrink-0" />
                                      {item.issuer}
                                    </span>
                                  )}
                                  {c.id === "product" && (
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-700">
                                      <Package size={14} className="text-slate-500 flex-shrink-0" />
                                      {item.productName}
                                    </span>
                                  )}
                                  {c.id === "module" && (
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-700">
                                      {item.module === "M1A" ? <Coins size={14} className="text-amber-500 flex-shrink-0" /> : item.module === "M1B" ? <DollarSign size={14} className="text-blue-500 flex-shrink-0" /> : <CircleDollarSign size={14} className="text-green-500 flex-shrink-0" />}
                                      {formatModule(item.module)}
                                    </span>
                                  )}
                                  {c.id === "collateral" && (
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-700">
                                      <Shield size={14} className="text-slate-500 flex-shrink-0" />
                                      {item.collateral}
                                    </span>
                                  )}
                                  {c.id === "seniority" && (
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-700">
                                      <Award size={14} className="text-slate-500 flex-shrink-0" />
                                      {item.seniority}
                                    </span>
                                  )}
                                  {c.id === "lockup" && (
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-700">
                                      <Clock size={14} className="text-slate-500 flex-shrink-0" />
                                      {item.lockup}
                                    </span>
                                  )}
                                  {c.id === "jurisdiction" && (
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-700">
                                      <MapPin size={14} className="text-slate-500 flex-shrink-0" />
                                      {item.jurisdiction}
                                    </span>
                                  )}
                                  {c.id === "apy" && (
                                    <span className="inline-flex items-center gap-2 text-sm font-normal text-[#f49d1d]">
                                      <Percent size={14} className="flex-shrink-0" />
                                      {formatApy(item)}
                                      {item.module === "M1A" ? " (cost)" : ""}
                                    </span>
                                  )}
                                  {c.id === "asOf" && (
                                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                                      <Calendar size={12} className="text-slate-500 flex-shrink-0" />
                                      {asOf ? new Date(asOf).toLocaleDateString("en-US") : "—"}
                                    </span>
                                  )}
                                  {c.id === "notes" && (
                                    <span
                                      className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-600 max-w-[180px] truncate"
                                      title={item.notes || ""}
                                    >
                                      <FileText size={14} className="text-slate-500 flex-shrink-0" />
                                      <span className="truncate">{item.notes || "—"}</span>
                                    </span>
                                  )}
                                  {c.id === "detail" && (
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/features/yield-board/${item.id}`)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white border border-slate-300 dark:border-slate-500 text-slate-900 dark:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-100 text-sm font-normal transition"
                                    >
                                      <Eye size={14} /> View
                                    </button>
                                  )}
                                </td>
                              )
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {from}–{to} of {sortedData.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-600 dark:text-slate-400">
              No instruments. Adjust filters or run the DCC seed.
            </div>
          )}
        </div>
      </div>
    </ProtectedFeature>
  )
}
