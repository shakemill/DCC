"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Users,
  BarChart3,
  Database,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Plus,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Wallet,
} from "lucide-react"

const PER_PAGE = 10

const TABS = [
  { id: "users", label: "Users", icon: Users, fetch: "/api/admin/users", dataKey: "users" },
  { id: "instruments", label: "Instruments", icon: BarChart3, fetch: "/api/instruments", dataKey: "instruments" },
  { id: "versions", label: "Dataset Versions", icon: Database, fetch: "/api/dataset-versions", dataKey: "versions" },
  { id: "productUniverse", label: "Product Universe", icon: Layers, fetch: "/api/product-universe", dataKey: "products" },
  { id: "cryptoLendingProviders", label: "Crypto Lending Providers", icon: Wallet, fetch: "/api/crypto-lending-providers", dataKey: "providers" },
]

const TAB_CONFIG = {
  users: {
    defaultSort: "createdAt",
    defaultDir: "desc",
    sortKeys: [
      { key: "email", label: "Email" },
      { key: "name", label: "Name" },
      { key: "createdAt", label: "Created" },
    ],
    filterKeys: ["email", "name"],
  },
  instruments: {
    defaultSort: "module",
    defaultDir: "asc",
    sortKeys: [
      { key: "module", label: "Module" },
      { key: "issuer", label: "Issuer" },
      { key: "productName", label: "Product" },
      { key: "collateral", label: "Collateral" },
      { key: "createdAt", label: "Created" },
    ],
    filterKeys: ["module", "issuer", "productName", "collateral", "jurisdiction"],
  },
  versions: {
    defaultSort: "effectiveAt",
    defaultDir: "desc",
    sortKeys: [
      { key: "version", label: "Version" },
      { key: "effectiveAt", label: "Effective at" },
      { key: "createdAt", label: "Created" },
    ],
    filterKeys: ["version", "description"],
  },
  productUniverse: {
    defaultSort: "ticker",
    defaultDir: "asc",
    sortKeys: [
      { key: "ticker", label: "Ticker" },
      { key: "product", label: "Product" },
      { key: "rateType", label: "Rate type" },
      { key: "seniority", label: "Seniority" },
      { key: "liquidityType", label: "Liquidity type" },
      { key: "lockDurationYears", label: "Lock duration" },
      { key: "paymentFrequency", label: "Payment frequency" },
      { key: "createdAt", label: "Created" },
    ],
    filterKeys: ["ticker", "product", "rateType", "seniority", "liquidityType", "paymentFrequency", "notes"],
  },
  cryptoLendingProviders: {
    defaultSort: "provider",
    defaultDir: "asc",
    sortKeys: [
      { key: "provider", label: "Provider" },
      { key: "type", label: "Type" },
      { key: "jurisdiction", label: "Jurisdiction" },
      { key: "apyMin", label: "APY min" },
      { key: "apyMax", label: "APY max" },
      { key: "hv30Pct", label: "HV30 %" },
      { key: "liquidity", label: "Liquidity" },
      { key: "createdAt", label: "Created" },
    ],
    filterKeys: ["provider", "type", "jurisdiction", "liquidity", "comment"],
  },
}

export default function AdminPage() {
  const [tab, setTab] = useState("users")
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [editItem, setEditItem] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [versions, setVersions] = useState([])
  const [filterQuery, setFilterQuery] = useState("")
  const [sortKey, setSortKey] = useState("createdAt")
  const [sortDir, setSortDir] = useState("desc")
  const [page, setPage] = useState(1)
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState([])
  const [stats, setStats] = useState({ users: 0, instruments: 0, versions: 0, productUniverse: 0, cryptoLendingProviders: 0 })
  const [statsLoading, setStatsLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  const conf = TABS.find((t) => t.id === tab)
  const tabConf = TAB_CONFIG[tab] || null

  // Lock body scroll when modal is open so only the modal content scrolls
  useEffect(() => {
    if (modal) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = prev }
    }
  }, [modal])

  const fetchData = useCallback(async () => {
    if (!conf) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(conf.fetch)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Fetch failed")
      setData(Array.isArray(json[conf.dataKey]) ? json[conf.dataKey] : [])
    } catch (e) {
      setError(e.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [conf?.id, conf?.fetch, conf?.dataKey])

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/dataset-versions")
      const json = await res.json()
      if (res.ok && json.versions) setVersions(json.versions)
      else setVersions([])
    } catch {
      setVersions([])
    }
  }, [])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      const json = await res.json()
      if (res.ok && json.stats) setStats(json.stats)
      else setStats({ users: 0, instruments: 0, versions: 0, productUniverse: 0, cryptoLendingProviders: 0 })
    } catch {
      setStats({ users: 0, instruments: 0, versions: 0, productUniverse: 0, cryptoLendingProviders: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { if (tab === "instruments") fetchVersions() }, [tab, fetchVersions])

  useEffect(() => {
    setPage(1)
    setFilterQuery("")
    setSelectedInstrumentIds([])
    if (tabConf) {
      setSortKey(tabConf.defaultSort)
      setSortDir(tabConf.defaultDir)
    }
  }, [tab])

  useEffect(() => { setPage(1) }, [filterQuery, sortKey, sortDir])

  const filteredData = (() => {
    if (!Array.isArray(data) || !tabConf) return []
    const q = String(filterQuery || "").trim().toLowerCase()
    if (!q) return [...data]
    const keys = tabConf.filterKeys || []
    return data.filter((row) => {
      for (const k of keys) {
        const v = row[k]
        if (v != null && String(v).toLowerCase().includes(q)) return true
      }
      return false
    })
  })()

  const DATE_KEYS = ["createdAt", "updatedAt", "effectiveAt", "asOf"]
  const sortedData = (() => {
    if (!filteredData.length) return []
    const k = sortKey
    const d = sortDir === "asc" ? 1 : -1
    const toVal = (v) => {
      if (v == null) return null
      if (v instanceof Date) return v.getTime()
      if (DATE_KEYS.includes(k) && typeof v === "string") {
        const n = new Date(v).getTime()
        if (!Number.isNaN(n)) return n
      }
      if (typeof v === "string") return v.toLowerCase()
      return v
    }
    return [...filteredData].sort((a, b) => {
      const va = toVal(a[k])
      const vb = toVal(b[k])
      if (va == null && vb == null) return 0
      if (va == null) return d
      if (vb == null) return -d
      if (va < vb) return -d
      if (va > vb) return d
      return 0
    })
  })()

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PER_PAGE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedData = sortedData.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const from = sortedData.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const to = Math.min(currentPage * PER_PAGE, sortedData.length)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const openCreate = () => { setModal("create"); setEditItem(null); setFormError(null) }
  const openEdit = (item) => { setModal("edit"); setEditItem(item); setFormError(null) }
  const closeModal = () => { setModal(null); setEditItem(null); setFormError(null) }

  const api = async (url, opts = {}) => {
    const res = await fetch(url, { headers: { "Content-Type": "application/json", ...opts.headers }, ...opts })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || "Request failed")
    return json
  }

  const handleCreateInstrument = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      const payload = {
        module: fd.get("module") || "M1A",
        issuer: fd.get("issuer") || "",
        productName: fd.get("productName") || "",
        collateral: fd.get("collateral") || "",
        jurisdiction: fd.get("jurisdiction") || "",
        lockup: fd.get("lockup") || "",
        seniority: fd.get("seniority") || "",
        notes: fd.get("notes") || undefined,
        apyLabel: fd.get("apyLabel") || undefined,
        duration: fd.get("duration") || undefined,
        promoFlag: !!fd.get("promoFlag"),
        datasetVersionId: fd.get("datasetVersionId") || undefined,
      }
      const apyMin = fd.get("apyMin")
      const apyMax = fd.get("apyMax")
      const rateType = fd.get("rateType") || "Variable"
      if (apyMin != null && apyMin !== "" || apyMax != null && apyMax !== "") {
        payload.snapshot = {
          apyMin: apyMin ? Number(apyMin) : undefined,
          apyMax: apyMax ? Number(apyMax) : undefined,
          rateType: ["Fixed", "Variable", "QuoteBased", "Promo", "Unknown"].includes(rateType) ? rateType : "Variable",
        }
      }
      await api("/api/instruments", { method: "POST", body: JSON.stringify(payload) })
      closeModal()
      fetchData()
      fetchStats()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditInstrument = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      const payload = {
        module: fd.get("module") || "M1A",
        issuer: fd.get("issuer") || "",
        productName: fd.get("productName") || "",
        collateral: fd.get("collateral") || "",
        jurisdiction: fd.get("jurisdiction") || "",
        lockup: fd.get("lockup") || "",
        seniority: fd.get("seniority") || "",
        notes: fd.get("notes") || undefined,
        apyLabel: fd.get("apyLabel") || undefined,
        duration: fd.get("duration") || undefined,
        promoFlag: !!fd.get("promoFlag"),
        datasetVersionId: fd.get("datasetVersionId") || undefined,
      }
      await api(`/api/instruments/${editItem.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteInstrument = async (id) => {
    if (!confirm("Delete this instrument?")) return
    try {
      await api(`/api/instruments/${id}`, { method: "DELETE" })
      setSelectedInstrumentIds((prev) => prev.filter((x) => x !== id))
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleInstrumentSelect = (id) => {
    setSelectedInstrumentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllInstrumentsOnPage = () => {
    if (tab !== "instruments") return
    const pageIds = paginatedData.map((i) => i.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedInstrumentIds.includes(id))
    setSelectedInstrumentIds((prev) => {
      if (allSelected) return prev.filter((id) => !pageIds.includes(id))
      const add = pageIds.filter((id) => !prev.includes(id))
      return [...prev, ...add]
    })
  }

  const handleDeleteInstruments = async () => {
    if (selectedInstrumentIds.length === 0) return
    if (!confirm(`Delete ${selectedInstrumentIds.length} selected instrument(s)?`)) return
    const errors = []
    for (const id of selectedInstrumentIds) {
      try {
        await api(`/api/instruments/${id}`, { method: "DELETE" })
      } catch (err) {
        errors.push(`${id}: ${err.message}`)
      }
    }
    setSelectedInstrumentIds([])
    fetchData()
    fetchStats()
    if (errors.length) alert(`Some deletions failed:\n${errors.join("\n")}`)
  }

  const handleCreateVersion = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api("/api/dataset-versions", {
        method: "POST",
        body: JSON.stringify({
          version: fd.get("version") || "",
          description: fd.get("description") || undefined,
          effectiveAt: fd.get("effectiveAt") || new Date().toISOString().slice(0, 16),
        }),
      })
      closeModal()
      fetchData()
      fetchStats()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditVersion = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api(`/api/dataset-versions/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: fd.get("version") || "",
          description: fd.get("description") || undefined,
          effectiveAt: fd.get("effectiveAt") || new Date().toISOString().slice(0, 16),
        }),
      })
      closeModal()
      fetchData()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteVersion = async (id) => {
    if (!confirm("Delete this dataset version?")) return
    try {
      await api(`/api/dataset-versions/${id}`, { method: "DELETE" })
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCreateProductUniverse = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api("/api/product-universe", {
        method: "POST",
        body: JSON.stringify({
          ticker: fd.get("ticker") || "",
          product: fd.get("product") || "",
          apyMinPct: fd.get("apyMinPct") !== "" ? fd.get("apyMinPct") : undefined,
          apyMaxPct: fd.get("apyMaxPct") !== "" ? fd.get("apyMaxPct") : undefined,
          rateType: fd.get("rateType") || "variable",
          hv30VolatilityPct: fd.get("hv30VolatilityPct") !== "" ? fd.get("hv30VolatilityPct") : undefined,
          seniority: fd.get("seniority") || "",
          liquidityType: fd.get("liquidityType") || undefined,
          lockDurationYears: fd.get("lockDurationYears") !== "" ? fd.get("lockDurationYears") : undefined,
          paymentFrequency: fd.get("paymentFrequency") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      })
      closeModal()
      fetchData()
      fetchStats()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditProductUniverse = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api(`/api/product-universe/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ticker: fd.get("ticker") || "",
          product: fd.get("product") || "",
          apyMinPct: fd.get("apyMinPct") !== "" ? fd.get("apyMinPct") : undefined,
          apyMaxPct: fd.get("apyMaxPct") !== "" ? fd.get("apyMaxPct") : undefined,
          rateType: fd.get("rateType") || "variable",
          hv30VolatilityPct: fd.get("hv30VolatilityPct") !== "" ? fd.get("hv30VolatilityPct") : undefined,
          seniority: fd.get("seniority") || "",
          liquidityType: fd.get("liquidityType") || undefined,
          lockDurationYears: fd.get("lockDurationYears") !== "" ? fd.get("lockDurationYears") : undefined,
          paymentFrequency: fd.get("paymentFrequency") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      })
      closeModal()
      fetchData()
      fetchStats()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProductUniverse = async (id) => {
    if (!confirm("Delete this product?")) return
    try {
      await api(`/api/product-universe/${id}`, { method: "DELETE" })
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCreateCryptoLendingProvider = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api("/api/crypto-lending-providers", {
        method: "POST",
        body: JSON.stringify({
          provider: fd.get("provider") || "",
          type: fd.get("type") || "CeFi",
          jurisdiction: fd.get("jurisdiction") || undefined,
          apyMin: fd.get("apyMin") !== "" ? fd.get("apyMin") : undefined,
          apyMax: fd.get("apyMax") !== "" ? fd.get("apyMax") : undefined,
          hv30Pct: fd.get("hv30Pct") !== "" ? fd.get("hv30Pct") : undefined,
          liquidity: fd.get("liquidity") || undefined,
          comment: fd.get("comment") || undefined,
        }),
      })
      closeModal()
      fetchData()
      fetchStats()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditCryptoLendingProvider = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api(`/api/crypto-lending-providers/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          provider: fd.get("provider") || "",
          type: fd.get("type") || "CeFi",
          jurisdiction: fd.get("jurisdiction") || undefined,
          apyMin: fd.get("apyMin") !== "" ? fd.get("apyMin") : undefined,
          apyMax: fd.get("apyMax") !== "" ? fd.get("apyMax") : undefined,
          hv30Pct: fd.get("hv30Pct") !== "" ? fd.get("hv30Pct") : undefined,
          liquidity: fd.get("liquidity") || undefined,
          comment: fd.get("comment") || undefined,
        }),
      })
      closeModal()
      fetchData()
      fetchStats()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCryptoLendingProvider = async (id) => {
    if (!confirm("Delete this provider?")) return
    try {
      await api(`/api/crypto-lending-providers/${id}`, { method: "DELETE" })
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSyncCryptoLendingProviders = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/crypto-lending-providers/sync", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Sync failed")
        return
      }
      setSyncMessage(`Loaded ${json.count ?? 0} providers from ChatGPT.`)
      fetchData()
      fetchStats()
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (err) {
      setSyncMessage(err?.message || "Sync failed")
    } finally {
      setSyncLoading(false)
    }
  }

  const renderModal = () => {
    if (!modal) return null
    const isEdit = modal === "edit"

    if (tab === "instruments") {
      const i = editItem
      const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
      const labelClass = "block text-sm font-medium text-slate-700 mb-1"
      return (
        <Modal title={isEdit ? "Edit instrument" : "Create instrument"} onClose={closeModal} size="wide">
          <form onSubmit={isEdit ? handleEditInstrument : handleCreateInstrument} className="space-y-6 pb-1">
            {formError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {formError}
              </div>
            )}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Core</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Module</label>
                  <select name="module" defaultValue={i?.module || "M1A"} className={inputClass}>
                    <option value="M1A">M1A</option>
                    <option value="M1B">M1B</option>
                    <option value="M1C">M1C</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Dataset version (optional)</label>
                  <select name="datasetVersionId" className={inputClass} defaultValue={i?.datasetVersionId ?? ""}>
                    <option value="">—</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.version}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Issuer</label>
                  <input name="issuer" defaultValue={i?.issuer} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Product name</label>
                  <input name="productName" defaultValue={i?.productName} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Collateral</label>
                  <input name="collateral" defaultValue={i?.collateral} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Jurisdiction</label>
                  <input name="jurisdiction" defaultValue={i?.jurisdiction} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Lockup</label>
                  <input name="lockup" defaultValue={i?.lockup} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Seniority</label>
                  <input name="seniority" defaultValue={i?.seniority} className={inputClass} required />
                </div>
              </div>
            </section>
            <section className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Labels & flags</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Notes</label>
                  <input name="notes" defaultValue={i?.notes} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>APY label</label>
                  <input name="apyLabel" defaultValue={i?.apyLabel} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Duration</label>
                  <input name="duration" defaultValue={i?.duration} className={inputClass} />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input name="promoFlag" type="checkbox" defaultChecked={!!i?.promoFlag} className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" />
                  <label className="text-sm text-slate-700">Promo flag</label>
                </div>
              </div>
            </section>
            {!isEdit && (
              <section className="space-y-3 pt-2 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Optional snapshot</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>APY min</label>
                    <input name="apyMin" type="number" step="any" placeholder="—" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>APY max</label>
                    <input name="apyMax" type="number" step="any" placeholder="—" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Rate type</label>
                    <select name="rateType" className={inputClass}>
                      <option value="Variable">Variable</option>
                      <option value="Fixed">Fixed</option>
                      <option value="QuoteBased">QuoteBased</option>
                      <option value="Promo">Promo</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>
              </section>
            )}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 mt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )
    }

    if (tab === "versions") {
      const v = editItem
      const eff = v?.effectiveAt ? new Date(v.effectiveAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
      return (
        <Modal title={isEdit ? "Edit dataset version" : "Create dataset version"} onClose={closeModal}>
          <form onSubmit={isEdit ? handleEditVersion : handleCreateVersion} className="space-y-4">
            {formError && <p className="text-amber-600 text-sm">{formError}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">Version</label>
              <input name="version" defaultValue={v?.version} className="w-full px-3 py-2 border rounded-lg" required placeholder="e.g. v1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input name="description" defaultValue={v?.description} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Effective at</label>
              <input name="effectiveAt" type="datetime-local" defaultValue={eff} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className="px-3 py-2 border rounded-lg">Cancel</button>
              <button type="submit" disabled={submitting} className="px-3 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50">{submitting ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )
    }

    if (tab === "productUniverse") {
      const p = editItem
      const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
      const labelClass = "block text-sm font-medium text-slate-700 mb-1"
      return (
        <Modal title={isEdit ? "Edit product" : "Create product"} onClose={closeModal} size="wide">
          <form onSubmit={isEdit ? handleEditProductUniverse : handleCreateProductUniverse} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ticker</label>
                <input name="ticker" defaultValue={p?.ticker} className={inputClass} required placeholder="e.g. STRC" />
              </div>
              <div>
                <label className={labelClass}>Product</label>
                <input name="product" defaultValue={p?.product} className={inputClass} required placeholder="e.g. Stretch preferred" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>APY min %</label>
                <input name="apyMinPct" type="number" step="any" defaultValue={p?.apyMinPct != null ? Number(p.apyMinPct) : ""} className={inputClass} placeholder="—" />
              </div>
              <div>
                <label className={labelClass}>APY max %</label>
                <input name="apyMaxPct" type="number" step="any" defaultValue={p?.apyMaxPct != null ? Number(p.apyMaxPct) : ""} className={inputClass} placeholder="—" />
              </div>
              <div>
                <label className={labelClass}>Rate type</label>
                <select name="rateType" className={inputClass} defaultValue={p?.rateType || "variable"}>
                  <option value="variable">variable</option>
                  <option value="fixed">fixed</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>HV30 volatility %</label>
                <input name="hv30VolatilityPct" type="number" step="any" defaultValue={p?.hv30VolatilityPct != null ? Number(p.hv30VolatilityPct) : ""} className={inputClass} placeholder="—" />
              </div>
              <div>
                <label className={labelClass}>Seniority</label>
                <input name="seniority" defaultValue={p?.seniority} className={inputClass} placeholder="e.g. Preferred" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Liquidity type</label>
              <select name="liquidityType" className={inputClass} defaultValue={p?.liquidityType ?? ""}>
                <option value="">—</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="locked">locked</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Lock duration (years)</label>
              <input name="lockDurationYears" type="number" step="any" min="0" defaultValue={p?.lockDurationYears != null ? Number(p.lockDurationYears) : ""} className={inputClass} placeholder="—" />
            </div>
            <div>
              <label className={labelClass}>Payment frequency</label>
              <input name="paymentFrequency" defaultValue={p?.paymentFrequency} className={inputClass} placeholder="e.g. Monthly, Quarterly, —" />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input name="notes" defaultValue={p?.notes} className={inputClass} placeholder="e.g. distributions vary" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">{submitting ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )
    }

    if (tab === "cryptoLendingProviders") {
      const p = editItem
      const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
      const labelClass = "block text-sm font-medium text-slate-700 mb-1"
      return (
        <Modal title={isEdit ? "Edit provider" : "Create provider"} onClose={closeModal} size="wide">
          <form onSubmit={isEdit ? handleEditCryptoLendingProvider : handleCreateCryptoLendingProvider} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Provider</label>
                <input name="provider" defaultValue={p?.provider} className={inputClass} required placeholder="e.g. Nexo" />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select name="type" className={inputClass} defaultValue={p?.type ?? "CeFi"}>
                  <option value="CeFi">CeFi</option>
                  <option value="DeFi">DeFi</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Jurisdiction</label>
              <input name="jurisdiction" defaultValue={p?.jurisdiction} className={inputClass} placeholder="e.g. EU, US, Global" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>APY min %</label>
                <input name="apyMin" type="number" step="any" defaultValue={p?.apyMin != null ? Number(p.apyMin) : ""} className={inputClass} placeholder="—" />
              </div>
              <div>
                <label className={labelClass}>APY max %</label>
                <input name="apyMax" type="number" step="any" defaultValue={p?.apyMax != null ? Number(p.apyMax) : ""} className={inputClass} placeholder="—" />
              </div>
              <div>
                <label className={labelClass}>HV30 %</label>
                <input name="hv30Pct" type="number" step="any" defaultValue={p?.hv30Pct != null ? Number(p.hv30Pct) : ""} className={inputClass} placeholder="—" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Liquidity</label>
              <input name="liquidity" defaultValue={p?.liquidity} className={inputClass} placeholder="e.g. high, medium, low" />
            </div>
            <div>
              <label className={labelClass}>Comment</label>
              <input name="comment" defaultValue={p?.comment} className={inputClass} placeholder="Short English note" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">{submitting ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-red-500" size={28} />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-900">Admin</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-500">
          View users; full CRUD for instruments and dataset versions.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-3">
          Dashboard
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TABS.map((t) => {
          const Icon = t.icon
          const count = stats[t.id === "users" ? "users" : t.id === "instruments" ? "instruments" : t.id === "versions" ? "versions" : t.id === "productUniverse" ? "productUniverse" : "cryptoLendingProviders"]
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); closeModal(); }}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition ${
                tab === t.id
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-800 dark:bg-slate-800"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-300 dark:bg-white dark:hover:bg-slate-50"
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                tab === t.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-100"
              }`}>
                <Icon size={24} className={tab === t.id ? "text-white" : "text-slate-600"} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${tab === t.id ? "text-white/90" : "text-slate-500"}`}>
                  {t.label}
                </p>
                <p className={`text-2xl font-bold truncate ${tab === t.id ? "text-white" : "text-slate-900"}`}>
                  {statsLoading ? "—" : count.toLocaleString()}
                </p>
              </div>
            </button>
          )
        })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-300 pb-4">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); closeModal(); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                tab === t.id ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Filter…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm w-48 max-w-full"
          />
          <button
            type="button"
            onClick={() => { fetchData(); fetchStats(); }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          {tab === "cryptoLendingProviders" && (
            <button
              type="button"
              onClick={handleSyncCryptoLendingProviders}
              disabled={syncLoading || loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium text-sm hover:bg-emerald-100 transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} /> Load top 20 from ChatGPT
            </button>
          )}
          {syncMessage && tab === "cryptoLendingProviders" && (
            <span className="text-sm text-slate-600">{syncMessage}</span>
          )}
          {tab !== "users" && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition"
            >
              <Plus size={16} /> Create
            </button>
          )}
          {tab === "instruments" && selectedInstrumentIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteInstruments}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-medium text-sm transition"
            >
              <Trash2 size={16} /> Delete selected ({selectedInstrumentIds.length})
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-amber-600 dark:text-amber-500 text-sm">{error}</p>}

      {loading ? (
        <p className="text-slate-500 py-8">Loading…</p>
      ) : (
        <>
          {tab === "users" && (
            <UsersTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
            />
          )}
          {tab === "instruments" && (
            <InstrumentsTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteInstrument}
              selectedIds={selectedInstrumentIds}
              onToggleSelect={toggleInstrumentSelect}
              onToggleSelectAll={toggleAllInstrumentsOnPage}
            />
          )}
          {tab === "versions" && (
            <VersionsTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteVersion}
            />
          )}
          {tab === "productUniverse" && (
            <ProductUniverseTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteProductUniverse}
            />
          )}
          {tab === "cryptoLendingProviders" && (
            <CryptoLendingProvidersTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteCryptoLendingProvider}
            />
          )}
          {!loading && tab && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <p className="text-sm text-slate-600">
                Showing {from}–{to} of {sortedData.length}
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
                <span className="text-sm text-slate-600">
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
          )}
        </>
      )}

      {renderModal()}
    </div>
  )
}

function Modal({ title, onClose, children, size = "default" }) {
  const sizeClass = size === "wide" ? "max-w-2xl" : "max-w-lg"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden overscroll-none">
      <div className={`bg-white dark:bg-white rounded-2xl border border-slate-200 dark:border-slate-300 w-full flex flex-col shadow-2xl ${sizeClass}`} style={{ maxHeight: "90vh" }}>
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-200 flex justify-between items-center bg-slate-50/80 dark:bg-slate-50/80">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/80 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="overflow-y-auto overflow-x-hidden overscroll-contain p-5"
          style={{ maxHeight: "calc(90vh - 4.5rem)" }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SortableTh({ sortKey, sortDir, onSort, tabConf, columnKey, children, className = "" }) {
  const config = tabConf?.sortKeys?.find((c) => c.key === columnKey)
  if (!config) return <th className={className}>{children}</th>
  const active = sortKey === columnKey
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 text-left"
      >
        {children}
        {active && (sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </button>
    </th>
  )
}

function UsersTable({ data, sortKey, sortDir, onSort, tabConf }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="email" className="text-left py-3 px-4">Email</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="name" className="text-left py-3 px-4">Name</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Verified</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="createdAt" className="text-left py-3 px-4">Created</SortableTh>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="py-3 px-4">{u.email ?? "—"}</td>
              <td className="py-3 px-4">{u.name ?? "—"}</td>
              <td className="py-3 px-4">{u.emailVerified ? "Yes" : "No"}</td>
              <td className="py-3 px-4 text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No users.</p>}
    </div>
  )
}

function InstrumentsTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete, selectedIds = [], onToggleSelect, onToggleSelectAll }) {
  const pageIds = data.map((i) => i.id)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
  const someSelected = pageIds.some((id) => selectedIds.includes(id))

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <th className="w-10 py-3 px-2 text-center">
              {pageIds.length > 0 && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300"
                />
              )}
            </th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="module" className="text-left py-3 px-4">Module</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="issuer" className="text-left py-3 px-4">Issuer</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="productName" className="text-left py-3 px-4">Product</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="collateral" className="text-left py-3 px-4">Collateral</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="createdAt" className="text-left py-3 px-4">Created</SortableTh>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr key={i.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="w-10 py-3 px-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(i.id)}
                  onChange={() => onToggleSelect?.(i.id)}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </td>
              <td className="py-3 px-4">{i.module ?? "—"}</td>
              <td className="py-3 px-4">{i.issuer ?? "—"}</td>
              <td className="py-3 px-4">{i.productName ?? "—"}</td>
              <td className="py-3 px-4">{i.collateral ?? "—"}</td>
              <td className="py-3 px-4 text-slate-500">{i.createdAt ? new Date(i.createdAt).toLocaleString() : "—"}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/features/yield-board/${i.id}`} className="text-[#f49d1d] hover:text-[#d6891a] font-medium text-xs">View</Link>
                  <button type="button" onClick={() => onEdit(i)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => onDelete(i.id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No instruments.</p>}
    </div>
  )
}

function VersionsTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="version" className="text-left py-3 px-4">Version</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="effectiveAt" className="text-left py-3 px-4">Effective at</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="createdAt" className="text-left py-3 px-4">Created</SortableTh>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v) => (
            <tr key={v.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="py-3 px-4 font-medium">{v.version ?? "—"}</td>
              <td className="py-3 px-4">{v.description ?? "—"}</td>
              <td className="py-3 px-4 text-slate-500">{v.effectiveAt ? new Date(v.effectiveAt).toLocaleString() : "—"}</td>
              <td className="py-3 px-4 text-slate-500">{v.createdAt ? new Date(v.createdAt).toLocaleString() : "—"}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => onEdit(v)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => onDelete(v.id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No dataset versions.</p>}
    </div>
  )
}

function formatApyRange(apyMinPct, apyMaxPct) {
  const min = apyMinPct != null ? Number(apyMinPct) : null
  const max = apyMaxPct != null ? Number(apyMaxPct) : null
  if (min == null && max == null) return "—"
  if (min != null && max != null) {
    if (min === max) return `${min}%`
    return `${min}%–${max}%`
  }
  if (min != null) return `${min}%`
  return `${max}%`
}

function ProductUniverseTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="ticker" className="text-left py-3 px-4">Ticker</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="product" className="text-left py-3 px-4">Product</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">APY Range</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="rateType" className="text-left py-3 px-4">Rate type</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">HV30 Volatility</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="seniority" className="text-left py-3 px-4">Seniority</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="liquidityType" className="text-left py-3 px-4">Liquidity type</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="lockDurationYears" className="text-left py-3 px-4">Lock duration</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="paymentFrequency" className="text-left py-3 px-4">Payment frequency</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Notes</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="createdAt" className="text-left py-3 px-4">Created</SortableTh>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="py-3 px-4 font-medium">{row.ticker ?? "—"}</td>
              <td className="py-3 px-4">{row.product ?? "—"}</td>
              <td className="py-3 px-4">{formatApyRange(row.apyMinPct, row.apyMaxPct)}</td>
              <td className="py-3 px-4">{row.rateType ?? "—"}</td>
              <td className="py-3 px-4">{row.hv30VolatilityPct != null ? `${Number(row.hv30VolatilityPct)}%` : "—"}</td>
              <td className="py-3 px-4">{row.seniority ?? "—"}</td>
              <td className="py-3 px-4">{row.liquidityType ?? "—"}</td>
              <td className="py-3 px-4">{row.lockDurationYears != null ? Number(row.lockDurationYears) : "—"}</td>
              <td className="py-3 px-4">{row.paymentFrequency ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={row.notes ?? ""}>{row.notes ?? "—"}</td>
              <td className="py-3 px-4 text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => onEdit(row)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => onDelete(row.id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No products.</p>}
    </div>
  )
}

function rawScoreBrut(apyMin, apyMax, hv30Pct) {
  const hv30 = hv30Pct != null ? Number(hv30Pct) : 0
  if (hv30 <= 0) return null
  const min = apyMin != null ? Number(apyMin) : 0
  const max = apyMax != null ? Number(apyMax) : min
  const avg = (min + max) / 2
  return avg / hv30
}

function CryptoLendingProvidersTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="provider" className="text-left py-3 px-4">Provider</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="type" className="text-left py-3 px-4">Type</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="jurisdiction" className="text-left py-3 px-4">Jurisdiction</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">APY</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="hv30Pct" className="text-left py-3 px-4">HV30 %</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="liquidity" className="text-left py-3 px-4">Liquidity</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Comment</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="createdAt" className="text-left py-3 px-4">Created</SortableTh>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="py-3 px-4 font-medium">{row.provider ?? "—"}</td>
              <td className="py-3 px-4">{row.type ?? "—"}</td>
              <td className="py-3 px-4">{row.jurisdiction ?? "—"}</td>
              <td className="py-3 px-4">{formatApyRange(row.apyMin, row.apyMax)}</td>
              <td className="py-3 px-4">{row.hv30Pct != null ? `${Number(row.hv30Pct)}%` : "—"}</td>
              <td className="py-3 px-4">{row.liquidity ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={row.comment ?? ""}>{row.comment ?? "—"}</td>
              <td className="py-3 px-4 text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => onEdit(row)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => onDelete(row.id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No providers.</p>}
    </div>
  )
}
