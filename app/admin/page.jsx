"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
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
  Wallet,
  CircleDollarSign,
  Coins,
  Award,
} from "lucide-react"

const PER_PAGE = 10

const TABS = [
  { id: "users", label: "Users", icon: Users, fetch: "/api/admin/users", dataKey: "users" },
  { id: "bitcoinBackedLenders", label: "Bitcoin Backed Lender", icon: Wallet, fetch: "/api/bitcoin-backed-lenders", dataKey: "lenders" },
  { id: "usdIncome", label: "Fiat Income", icon: CircleDollarSign, fetch: "/api/usd-income", dataKey: "products" },
  { id: "stablecoin", label: "Stablecoin", icon: Coins, fetch: "/api/stablecoin-products", dataKey: "products" },
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
  bitcoinBackedLenders: {
    defaultSort: "issuerProvider",
    defaultDir: "asc",
    sortKeys: [
      { key: "issuerProvider", label: "Issuer / Provider" },
      { key: "productInstrument", label: "Product / Instrument" },
      { key: "apyCost", label: "APY / Cost" },
      { key: "jurisdiction", label: "Jurisdiction" },
      { key: "category", label: "Category" },
    ],
    filterKeys: ["issuerProvider", "productInstrument", "jurisdiction", "category"],
  },
  usdIncome: {
    defaultSort: "issuer",
    defaultDir: "asc",
    sortKeys: [
      { key: "issuer", label: "Issuer / Sponsor" },
      { key: "product", label: "Product" },
      { key: "ticker", label: "Ticker / ID" },
      { key: "type", label: "Type" },
      { key: "qualityScore", label: "Score" },
    ],
    filterKeys: ["issuer", "product", "ticker", "type"],
  },
  stablecoin: {
    defaultSort: "issuer",
    defaultDir: "asc",
    sortKeys: [
      { key: "issuer", label: "Issuer / Provider" },
      { key: "product", label: "Product / Instrument" },
      { key: "apy", label: "APY" },
      { key: "qualityScore", label: "Score" },
      { key: "category", label: "Category" },
      { key: "jurisdiction", label: "Jurisdiction" },
    ],
    filterKeys: ["issuer", "product", "category", "jurisdiction"],
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
  const [filterQuery, setFilterQuery] = useState("")
  const [sortKey, setSortKey] = useState("createdAt")
  const [sortDir, setSortDir] = useState("desc")
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState({ users: 0, bitcoinBackedLenders: 0, usdIncomeProducts: 0, stablecoinProducts: 0 })
  const [statsLoading, setStatsLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const [pendingBitcoinSyncRows, setPendingBitcoinSyncRows] = useState(null)
  const [applyBitcoinSyncLoading, setApplyBitcoinSyncLoading] = useState(false)
  const [editingBitcoinSyncRowIndex, setEditingBitcoinSyncRowIndex] = useState(null)
  const [pendingUsdIncomeSyncRows, setPendingUsdIncomeSyncRows] = useState(null)
  const [applyUsdIncomeSyncLoading, setApplyUsdIncomeSyncLoading] = useState(false)
  const [editingUsdIncomeSyncRowIndex, setEditingUsdIncomeSyncRowIndex] = useState(null)
  const [pendingStablecoinSyncRows, setPendingStablecoinSyncRows] = useState(null)
  const [applyStablecoinSyncLoading, setApplyStablecoinSyncLoading] = useState(false)
  const [editingStablecoinSyncRowIndex, setEditingStablecoinSyncRowIndex] = useState(null)
  const [stablecoinScoreLoading, setStablecoinScoreLoading] = useState(false)
  const [stablecoinScoreMessage, setStablecoinScoreMessage] = useState(null)
  const [usdIncomeScoreLoading, setUsdIncomeScoreLoading] = useState(false)
  const [usdIncomeScoreMessage, setUsdIncomeScoreMessage] = useState(null)

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
    if (!conf.fetch) {
      setData([])
      setLoading(false)
      return
    }
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

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      const json = await res.json()
      if (res.ok && json.stats) setStats(json.stats)
      else setStats({ users: 0, bitcoinBackedLenders: 0, usdIncomeProducts: 0, stablecoinProducts: 0 })
    } catch {
      setStats({ users: 0, bitcoinBackedLenders: 0, usdIncomeProducts: 0, stablecoinProducts: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    setPage(1)
    setFilterQuery("")
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

  const handleCreateBitcoinBackedLender = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api("/api/bitcoin-backed-lenders", {
        method: "POST",
        body: JSON.stringify({
          issuerProvider: fd.get("issuerProvider") || "",
          productInstrument: fd.get("productInstrument") || "",
          apyCost: fd.get("apyCost") || undefined,
          duration: fd.get("duration") || undefined,
          collateral: fd.get("collateral") || undefined,
          jurisdiction: fd.get("jurisdiction") || undefined,
          lockup: fd.get("lockup") || undefined,
          seniority: fd.get("seniority") || undefined,
          notes: fd.get("notes") || undefined,
          sources: fd.get("sources") || undefined,
          category: fd.get("category") || undefined,
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

  const handleEditBitcoinBackedLender = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api(`/api/bitcoin-backed-lenders/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          issuerProvider: fd.get("issuerProvider") || "",
          productInstrument: fd.get("productInstrument") || "",
          apyCost: fd.get("apyCost") || undefined,
          duration: fd.get("duration") || undefined,
          collateral: fd.get("collateral") || undefined,
          jurisdiction: fd.get("jurisdiction") || undefined,
          lockup: fd.get("lockup") || undefined,
          seniority: fd.get("seniority") || undefined,
          notes: fd.get("notes") || undefined,
          sources: fd.get("sources") || undefined,
          category: fd.get("category") || undefined,
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

  const handleDeleteBitcoinBackedLender = async (id) => {
    if (!confirm("Delete this bitcoin backed lender entry?")) return
    try {
      await api(`/api/bitcoin-backed-lenders/${id}`, { method: "DELETE" })
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSyncBitcoinBackedLenders = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    setPendingBitcoinSyncRows(null)
    try {
      const res = await fetch("/api/bitcoin-backed-lenders/sync", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Sync failed")
        return
      }
      if (Array.isArray(json.rows) && json.rows.length > 0) {
        setPendingBitcoinSyncRows(json.rows)
      } else {
        setSyncMessage("No rows returned from ChatGPT.")
      }
    } catch (err) {
      setSyncMessage(err?.message || "Sync failed")
    } finally {
      setSyncLoading(false)
    }
  }

  const handleCancelBitcoinSyncPreview = () => {
    setPendingBitcoinSyncRows(null)
    setEditingBitcoinSyncRowIndex(null)
  }

  const handleDeleteBitcoinSyncRow = (idx) => {
    setPendingBitcoinSyncRows((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, i) => i !== idx)
      return next.length === 0 ? null : next
    })
    if (editingBitcoinSyncRowIndex === idx) setEditingBitcoinSyncRowIndex(null)
    else if (editingBitcoinSyncRowIndex != null && editingBitcoinSyncRowIndex > idx) {
      setEditingBitcoinSyncRowIndex(editingBitcoinSyncRowIndex - 1)
    }
  }

  const handleEditBitcoinSyncRow = (idx) => {
    setEditingBitcoinSyncRowIndex(idx)
  }

  const handleSaveBitcoinSyncRowEdit = (e) => {
    e.preventDefault()
    if (editingBitcoinSyncRowIndex == null || !pendingBitcoinSyncRows) return
    const fd = new FormData(e.target)
    const updated = {
      issuerProvider: fd.get("issuerProvider")?.toString()?.trim() || "",
      productInstrument: fd.get("productInstrument")?.toString()?.trim() || "",
      apyCost: fd.get("apyCost")?.toString()?.trim() || null,
      duration: fd.get("duration")?.toString()?.trim() || null,
      collateral: fd.get("collateral")?.toString()?.trim() || null,
      jurisdiction: fd.get("jurisdiction")?.toString()?.trim() || null,
      lockup: fd.get("lockup")?.toString()?.trim() || null,
      seniority: fd.get("seniority")?.toString()?.trim() || null,
      notes: fd.get("notes")?.toString()?.trim() || null,
      sources: fd.get("sources")?.toString()?.trim() || null,
      category: fd.get("category")?.toString()?.trim() || null,
    }
    if (!updated.issuerProvider || !updated.productInstrument) return
    setPendingBitcoinSyncRows((prev) =>
      prev.map((r, i) => (i === editingBitcoinSyncRowIndex ? updated : r))
    )
    setEditingBitcoinSyncRowIndex(null)
  }

  const handleApplyBitcoinSync = async () => {
    if (!Array.isArray(pendingBitcoinSyncRows) || pendingBitcoinSyncRows.length === 0) return
    setApplyBitcoinSyncLoading(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/bitcoin-backed-lenders/sync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pendingBitcoinSyncRows }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Apply failed")
        return
      }
      setPendingBitcoinSyncRows(null)
      fetchData()
      fetchStats()
      setSyncMessage(`${json.count ?? 0} entrées enregistrées.`)
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (err) {
      setSyncMessage(err?.message || "Apply failed")
    } finally {
      setApplyBitcoinSyncLoading(false)
    }
  }

  const handleCreateUsdIncome = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      const hv30Val = fd.get("hv30Pct")
        await api("/api/usd-income", {
        method: "POST",
        body: JSON.stringify({
          issuer: fd.get("issuer") || "",
          product: fd.get("product") || "",
          ticker: fd.get("ticker") || "",
          type: fd.get("type") || "",
          apyDistribution: fd.get("apyDistribution") || undefined,
          duration: fd.get("duration") || undefined,
          seniority: fd.get("seniority") || undefined,
          hv30Pct: hv30Val != null && String(hv30Val).trim() !== "" ? Number(String(hv30Val).trim().replace(/%/g, "")) || undefined : undefined,
          simpleDescription: fd.get("simpleDescription") || undefined,
          availability: fd.get("availability") || undefined,
          btcLinkage: fd.get("btcLinkage") || undefined,
          keyRisks: fd.get("keyRisks") || undefined,
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

  const handleEditUsdIncome = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      const hv30Val = fd.get("hv30Pct")
      await api(`/api/usd-income/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          issuer: fd.get("issuer") || "",
          product: fd.get("product") || "",
          ticker: fd.get("ticker") || "",
          type: fd.get("type") || "",
          apyDistribution: fd.get("apyDistribution") || undefined,
          duration: fd.get("duration") || undefined,
          seniority: fd.get("seniority") || undefined,
          hv30Pct: hv30Val != null && String(hv30Val).trim() !== "" ? Number(String(hv30Val).trim().replace(/%/g, "")) || null : null,
          simpleDescription: fd.get("simpleDescription") || undefined,
          availability: fd.get("availability") || undefined,
          btcLinkage: fd.get("btcLinkage") || undefined,
          keyRisks: fd.get("keyRisks") || undefined,
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

  const handleDeleteUsdIncome = async (id) => {
    if (!confirm("Delete this Fiat income product?")) return
    try {
      await api(`/api/usd-income/${id}`, { method: "DELETE" })
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSyncUsdIncome = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    setPendingUsdIncomeSyncRows(null)
    try {
      const res = await fetch("/api/usd-income/sync", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Sync failed")
        return
      }
      if (Array.isArray(json.rows) && json.rows.length > 0) {
        setPendingUsdIncomeSyncRows(json.rows)
      } else {
        setSyncMessage("No rows returned from ChatGPT.")
      }
    } catch (err) {
      setSyncMessage(err?.message || "Sync failed")
    } finally {
      setSyncLoading(false)
    }
  }

  const handleCancelUsdIncomeSyncPreview = () => {
    setPendingUsdIncomeSyncRows(null)
    setEditingUsdIncomeSyncRowIndex(null)
  }

  const handleDeleteUsdIncomeSyncRow = (idx) => {
    setPendingUsdIncomeSyncRows((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, i) => i !== idx)
      return next.length === 0 ? null : next
    })
    if (editingUsdIncomeSyncRowIndex === idx) setEditingUsdIncomeSyncRowIndex(null)
    else if (editingUsdIncomeSyncRowIndex != null && editingUsdIncomeSyncRowIndex > idx) {
      setEditingUsdIncomeSyncRowIndex(editingUsdIncomeSyncRowIndex - 1)
    }
  }

  const handleEditUsdIncomeSyncRow = (idx) => {
    setEditingUsdIncomeSyncRowIndex(idx)
  }

  const handleSaveUsdIncomeSyncRowEdit = (e) => {
    e.preventDefault()
    if (editingUsdIncomeSyncRowIndex == null || !pendingUsdIncomeSyncRows) return
    const fd = new FormData(e.target)
    const hv30Raw = fd.get("hv30Pct")?.toString()?.trim()
    const updated = {
      issuer: fd.get("issuer")?.toString()?.trim() || "",
      product: fd.get("product")?.toString()?.trim() || "",
      ticker: fd.get("ticker")?.toString()?.trim() || "",
      type: fd.get("type")?.toString()?.trim() || "",
      apyDistribution: fd.get("apyDistribution")?.toString()?.trim() || null,
      duration: fd.get("duration")?.toString()?.trim() || null,
      seniority: fd.get("seniority")?.toString()?.trim() || null,
      hv30Pct: hv30Raw === "" || hv30Raw == null ? null : (Number(hv30Raw.replace(/%/g, "")) || null),
      simpleDescription: fd.get("simpleDescription")?.toString()?.trim() || null,
      availability: fd.get("availability")?.toString()?.trim() || null,
      btcLinkage: fd.get("btcLinkage")?.toString()?.trim() || null,
      keyRisks: fd.get("keyRisks")?.toString()?.trim() || null,
    }
    if (!updated.issuer || !updated.product || !updated.ticker || !updated.type) return
    setPendingUsdIncomeSyncRows((prev) =>
      prev.map((r, i) => (i === editingUsdIncomeSyncRowIndex ? updated : r))
    )
    setEditingUsdIncomeSyncRowIndex(null)
  }

  const handleApplyUsdIncomeSync = async () => {
    if (!Array.isArray(pendingUsdIncomeSyncRows) || pendingUsdIncomeSyncRows.length === 0) return
    setApplyUsdIncomeSyncLoading(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/usd-income/sync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pendingUsdIncomeSyncRows }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Apply failed")
        return
      }
      setPendingUsdIncomeSyncRows(null)
      setEditingUsdIncomeSyncRowIndex(null)
      fetchData()
      fetchStats()
      setSyncMessage(`${json.count ?? 0} entrées enregistrées.`)
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (err) {
      setSyncMessage(err?.message || "Apply failed")
    } finally {
      setApplyUsdIncomeSyncLoading(false)
    }
  }

  const handleCreateStablecoinProduct = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api("/api/stablecoin-products", {
        method: "POST",
        body: JSON.stringify({
          issuer: fd.get("issuer") || "",
          product: fd.get("product") || "",
          apy: fd.get("apy") || undefined,
          duration: fd.get("duration") || undefined,
          collateral: fd.get("collateral") || undefined,
          jurisdiction: fd.get("jurisdiction") || undefined,
          lockup: fd.get("lockup") || undefined,
          seniority: fd.get("seniority") || undefined,
          notes: fd.get("notes") || undefined,
          sources: fd.get("sources") || undefined,
          category: fd.get("category") || "cefi_savings",
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

  const handleEditStablecoinProduct = async (e) => {
    e.preventDefault()
    if (!editItem?.id) return
    setFormError(null)
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api(`/api/stablecoin-products/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          issuer: fd.get("issuer") || "",
          product: fd.get("product") || "",
          apy: fd.get("apy") || undefined,
          duration: fd.get("duration") || undefined,
          collateral: fd.get("collateral") || undefined,
          jurisdiction: fd.get("jurisdiction") || undefined,
          lockup: fd.get("lockup") || undefined,
          seniority: fd.get("seniority") || undefined,
          notes: fd.get("notes") || undefined,
          sources: fd.get("sources") || undefined,
          category: fd.get("category") || "cefi_savings",
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

  const handleDeleteStablecoinProduct = async (id) => {
    if (!confirm("Delete this stablecoin product?")) return
    try {
      await api(`/api/stablecoin-products/${id}`, { method: "DELETE" })
      fetchData()
      fetchStats()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSyncStablecoinCeFi = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    setPendingStablecoinSyncRows(null)
    try {
      const res = await fetch("/api/stablecoin-products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "cefi_savings" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Sync failed")
        return
      }
      if (Array.isArray(json.rows) && json.rows.length > 0) {
        setPendingStablecoinSyncRows(json.rows)
      } else {
        setSyncMessage("No rows returned from ChatGPT.")
      }
    } catch (err) {
      setSyncMessage(err?.message || "Sync failed")
    } finally {
      setSyncLoading(false)
    }
  }

  const handleSyncStablecoinLending = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    setPendingStablecoinSyncRows(null)
    try {
      const res = await fetch("/api/stablecoin-products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "collateralised_lending" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Sync failed")
        return
      }
      if (Array.isArray(json.rows) && json.rows.length > 0) {
        setPendingStablecoinSyncRows(json.rows)
      } else {
        setSyncMessage("No rows returned from ChatGPT.")
      }
    } catch (err) {
      setSyncMessage(err?.message || "Sync failed")
    } finally {
      setSyncLoading(false)
    }
  }

  const handleCancelStablecoinSyncPreview = () => {
    setPendingStablecoinSyncRows(null)
    setEditingStablecoinSyncRowIndex(null)
  }

  const handleDeleteStablecoinSyncRow = (idx) => {
    setPendingStablecoinSyncRows((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, i) => i !== idx)
      return next.length === 0 ? null : next
    })
    if (editingStablecoinSyncRowIndex === idx) setEditingStablecoinSyncRowIndex(null)
    else if (editingStablecoinSyncRowIndex != null && editingStablecoinSyncRowIndex > idx) {
      setEditingStablecoinSyncRowIndex(editingStablecoinSyncRowIndex - 1)
    }
  }

  const handleEditStablecoinSyncRow = (idx) => {
    setEditingStablecoinSyncRowIndex(idx)
  }

  const handleSaveStablecoinSyncRowEdit = (e) => {
    e.preventDefault()
    if (editingStablecoinSyncRowIndex == null || !pendingStablecoinSyncRows) return
    const fd = new FormData(e.target)
    const updated = {
      issuer: fd.get("issuer")?.toString()?.trim() || "",
      product: fd.get("product")?.toString()?.trim() || "",
      apy: fd.get("apy")?.toString()?.trim() || null,
      duration: fd.get("duration")?.toString()?.trim() || null,
      collateral: fd.get("collateral")?.toString()?.trim() || null,
      jurisdiction: fd.get("jurisdiction")?.toString()?.trim() || null,
      lockup: fd.get("lockup")?.toString()?.trim() || null,
      seniority: fd.get("seniority")?.toString()?.trim() || null,
      notes: fd.get("notes")?.toString()?.trim() || null,
      sources: fd.get("sources")?.toString()?.trim() || null,
      category: fd.get("category")?.toString()?.trim() || "cefi_savings",
    }
    if (!updated.issuer || !updated.product) return
    setPendingStablecoinSyncRows((prev) =>
      prev.map((r, i) => (i === editingStablecoinSyncRowIndex ? updated : r))
    )
    setEditingStablecoinSyncRowIndex(null)
  }

  const handleApplyStablecoinSync = async () => {
    if (!Array.isArray(pendingStablecoinSyncRows) || pendingStablecoinSyncRows.length === 0) return
    setApplyStablecoinSyncLoading(true)
    setSyncMessage(null)
    try {
      const res = await fetch("/api/stablecoin-products/sync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pendingStablecoinSyncRows }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSyncMessage(json?.error || "Apply failed")
        return
      }
      setPendingStablecoinSyncRows(null)
      setEditingStablecoinSyncRowIndex(null)
      fetchData()
      fetchStats()
      setSyncMessage(`${json.count ?? 0} entrées enregistrées.`)
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (err) {
      setSyncMessage(err?.message || "Apply failed")
    } finally {
      setApplyStablecoinSyncLoading(false)
    }
  }

  const handleScoreStablecoin = async () => {
    setStablecoinScoreLoading(true)
    setStablecoinScoreMessage(null)
    try {
      const res = await fetch("/api/stablecoin-products/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStablecoinScoreMessage(json?.error || "Score computation failed")
        return
      }
      fetchData()
      setStablecoinScoreMessage(json?.message || "Scores calculés")
      setTimeout(() => setStablecoinScoreMessage(null), 5000)
    } catch (err) {
      setStablecoinScoreMessage(err?.message || "Score computation failed")
    } finally {
      setStablecoinScoreLoading(false)
    }
  }

  const handleScoreUsdIncome = async () => {
    setUsdIncomeScoreLoading(true)
    setUsdIncomeScoreMessage(null)
    try {
      const res = await fetch("/api/usd-income/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsdIncomeScoreMessage(json?.error || "Score computation failed")
        return
      }
      fetchData()
      setUsdIncomeScoreMessage(json?.message || "Scores calculés")
      setTimeout(() => setUsdIncomeScoreMessage(null), 5000)
    } catch (err) {
      setUsdIncomeScoreMessage(err?.message || "Score computation failed")
    } finally {
      setUsdIncomeScoreLoading(false)
    }
  }

  const renderModal = () => {
    if (!modal) return null
    const isEdit = modal === "edit"

    if (tab === "bitcoinBackedLenders") {
      const b = editItem
      const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
      const labelClass = "block text-sm font-medium text-slate-700 mb-1"
      return (
        <Modal title={isEdit ? "Edit bitcoin backed lender" : "Create bitcoin backed lender"} onClose={closeModal} size="wide">
          <form onSubmit={isEdit ? handleEditBitcoinBackedLender : handleCreateBitcoinBackedLender} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Issuer / Provider</label>
                <input name="issuerProvider" defaultValue={b?.issuerProvider} className={inputClass} required placeholder="e.g. Nexo" />
              </div>
              <div>
                <label className={labelClass}>Product / Instrument</label>
                <input name="productInstrument" defaultValue={b?.productInstrument} className={inputClass} required placeholder="e.g. BTC Loan" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>APY / Cost</label>
                <input name="apyCost" defaultValue={b?.apyCost} className={inputClass} placeholder="e.g. 8% or Quote-based" />
              </div>
              <div>
                <label className={labelClass}>Duration</label>
                <input name="duration" defaultValue={b?.duration} className={inputClass} placeholder="e.g. Termed, Revolving" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Collateral</label>
                <input name="collateral" defaultValue={b?.collateral} className={inputClass} placeholder="e.g. BTC, WBTC" />
              </div>
              <div>
                <label className={labelClass}>Jurisdiction</label>
                <input name="jurisdiction" defaultValue={b?.jurisdiction} className={inputClass} placeholder="e.g. EU, US" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Lockup</label>
                <input name="lockup" defaultValue={b?.lockup} className={inputClass} placeholder="e.g. Termed, None" />
              </div>
              <div>
                <label className={labelClass}>Seniority</label>
                <input name="seniority" defaultValue={b?.seniority} className={inputClass} placeholder="e.g. Secured" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" className={inputClass} defaultValue={b?.category ?? ""}>
                <option value="">—</option>
                <option value="CeFi & Hybrid">CeFi & Hybrid</option>
                <option value="On-Chain / DeFi">On-Chain / DeFi</option>
                <option value="Regulated Banks">Regulated Banks</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input name="notes" defaultValue={b?.notes} className={inputClass} placeholder="LTV, liquidation, custody, etc." />
            </div>
            <div>
              <label className={labelClass}>Sources</label>
              <input name="sources" defaultValue={b?.sources} className={inputClass} placeholder="URL or reference" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">{submitting ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )
    }

    if (tab === "usdIncome") {
      const y = editItem
      const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
      const labelClass = "block text-sm font-medium text-slate-700 mb-1"
      return (
        <Modal title={isEdit ? "Edit Fiat income product" : "Create Fiat income product"} onClose={closeModal} size="wide">
          <form onSubmit={isEdit ? handleEditUsdIncome : handleCreateUsdIncome} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Issuer / Sponsor</label>
                <input name="issuer" defaultValue={y?.issuer} className={inputClass} required placeholder="e.g. Strategy Inc." />
              </div>
              <div>
                <label className={labelClass}>Product</label>
                <input name="product" defaultValue={y?.product} className={inputClass} required placeholder="e.g. Stretch Preferred" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ticker / ID</label>
                <input name="ticker" defaultValue={y?.ticker} className={inputClass} required placeholder="e.g. STRC" />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <input name="type" defaultValue={y?.type} className={inputClass} required placeholder="e.g. Perpetual preferred" />
              </div>
            </div>
            <div>
              <label className={labelClass}>APY / Distribution</label>
              <input name="apyDistribution" defaultValue={y?.apyDistribution} className={inputClass} placeholder="e.g. Variable (monthly reset)" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Duration</label>
                <input name="duration" defaultValue={y?.duration} className={inputClass} placeholder="e.g. Perpetual" />
              </div>
              <div>
                <label className={labelClass}>Seniority</label>
                <input name="seniority" defaultValue={y?.seniority} className={inputClass} placeholder="e.g. Preferred" />
              </div>
            </div>
            <div>
              <label className={labelClass}>HV30 (volatilité %)</label>
              <input name="hv30Pct" type="text" defaultValue={y?.hv30Pct != null ? String(y.hv30Pct) : ""} className={inputClass} placeholder="e.g. 7 ou 28 (vide si inconnu)" />
            </div>
            <div>
              <label className={labelClass}>Simple Description</label>
              <input name="simpleDescription" defaultValue={y?.simpleDescription} className={inputClass} placeholder="Short description" />
            </div>
            <div>
              <label className={labelClass}>Availability</label>
              <input name="availability" defaultValue={y?.availability} className={inputClass} placeholder="e.g. US brokerages (Nasdaq)" />
            </div>
            <div>
              <label className={labelClass}>BTC Linkage</label>
              <input name="btcLinkage" defaultValue={y?.btcLinkage} className={inputClass} placeholder="e.g. BTC treasury exposure" />
            </div>
            <div>
              <label className={labelClass}>Key Risks</label>
              <textarea name="keyRisks" defaultValue={y?.keyRisks} className={inputClass} rows={2} placeholder="Key risks" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
              <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">{submitting ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )
    }

    if (tab === "stablecoin") {
      const s = editItem
      const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
      const labelClass = "block text-sm font-medium text-slate-700 mb-1"
      return (
        <Modal title={isEdit ? "Edit stablecoin product" : "Create stablecoin product"} onClose={closeModal} size="wide">
          <form onSubmit={isEdit ? handleEditStablecoinProduct : handleCreateStablecoinProduct} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">{formError}</div>
            )}
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" className={inputClass} required defaultValue={s?.category ?? "cefi_savings"}>
                <option value="cefi_savings">CeFi Savings</option>
                <option value="collateralised_lending">Collateralised Lending</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Issuer / Provider</label>
                <input name="issuer" defaultValue={s?.issuer} className={inputClass} required placeholder="e.g. Coinbase" />
              </div>
              <div>
                <label className={labelClass}>Product / Instrument Name</label>
                <input name="product" defaultValue={s?.product} className={inputClass} required placeholder="e.g. USDC Flexible" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>APY</label>
                <input name="apy" defaultValue={s?.apy} className={inputClass} placeholder="e.g. Variable (see app)" />
              </div>
              <div>
                <label className={labelClass}>Duration</label>
                <input name="duration" defaultValue={s?.duration} className={inputClass} placeholder="e.g. On-demand" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Collateral</label>
                <input name="collateral" defaultValue={s?.collateral} className={inputClass} placeholder="e.g. Unsecured (platform program)" />
              </div>
              <div>
                <label className={labelClass}>Jurisdiction</label>
                <input name="jurisdiction" defaultValue={s?.jurisdiction} className={inputClass} placeholder="e.g. On-chain (Ethereum)" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Lockup</label>
                <input name="lockup" defaultValue={s?.lockup} className={inputClass} placeholder="e.g. None (flexible)" />
              </div>
              <div>
                <label className={labelClass}>Seniority</label>
                <input name="seniority" defaultValue={s?.seniority} className={inputClass} placeholder="e.g. Unsecured" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" defaultValue={s?.notes} className={inputClass} rows={2} placeholder="Risk-first notes" />
            </div>
            <div>
              <label className={labelClass}>Sources</label>
              <input name="sources" defaultValue={s?.sources} className={inputClass} placeholder="Official app + docs URL" />
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
          View users; full CRUD for data tables.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-3">
          Dashboard
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TABS.map((t) => {
          const Icon = t.icon
          const count = stats[t.id === "users" ? "users" : t.id === "bitcoinBackedLenders" ? "bitcoinBackedLenders" : t.id === "usdIncome" ? "usdIncomeProducts" : t.id === "stablecoin" ? "stablecoinProducts" : "usdIncomeProducts"]
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
                tab === t.id ? (t.id === "stablecoin" ? "bg-[#f49d1d]/30" : "bg-white/20") : t.id === "stablecoin" ? "bg-[#f49d1d]/10" : "bg-slate-100 dark:bg-slate-100"
              }`}>
                <Icon size={24} className={tab === t.id ? "text-white" : t.id === "stablecoin" ? "text-[#f49d1d]" : "text-slate-600"} />
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
          const isStablecoin = t.id === "stablecoin"
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); closeModal(); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                tab === t.id
                  ? isStablecoin
                    ? "bg-[#f49d1d] text-white hover:bg-[#d6891a] dark:bg-[#f49d1d] dark:hover:bg-[#d6891a]"
                    : "bg-slate-900 text-white dark:bg-slate-800 dark:text-white"
                  : isStablecoin
                    ? "bg-[#f49d1d]/10 text-[#f49d1d] hover:bg-[#f49d1d]/20 dark:bg-[#f49d1d]/10 dark:text-[#f49d1d] dark:hover:bg-[#f49d1d]/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
          {tab === "bitcoinBackedLenders" && (
            <button
              type="button"
              onClick={handleSyncBitcoinBackedLenders}
              disabled={syncLoading || loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium text-sm hover:bg-emerald-100 transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} /> Generate from ChatGPT
            </button>
          )}
          {tab === "usdIncome" && (
            <>
              <button
                type="button"
                onClick={handleScoreUsdIncome}
                disabled={usdIncomeScoreLoading || loading || data.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-medium text-sm hover:bg-amber-100 transition disabled:opacity-50"
              >
                <Award size={16} className={usdIncomeScoreLoading ? "animate-spin" : ""} /> Score
              </button>
              <button
                type="button"
                onClick={handleSyncUsdIncome}
                disabled={syncLoading || loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium text-sm hover:bg-emerald-100 transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} /> Generate from ChatGPT
              </button>
            </>
          )}
          {tab === "stablecoin" && (
            <>
              <button
                type="button"
                onClick={handleScoreStablecoin}
                disabled={stablecoinScoreLoading || loading || data.length === 0}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-medium text-sm hover:bg-amber-100 transition disabled:opacity-50"
              >
                <Award size={16} className={stablecoinScoreLoading ? "animate-spin" : ""} /> Score
              </button>
              <button
                type="button"
                onClick={handleSyncStablecoinCeFi}
                disabled={syncLoading || loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium text-sm hover:bg-emerald-100 transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} /> Generate from ChatGPT – CeFi Savings
              </button>
              <button
                type="button"
                onClick={handleSyncStablecoinLending}
                disabled={syncLoading || loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium text-sm hover:bg-emerald-100 transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} /> Generate from ChatGPT – Collateralised Lending
              </button>
            </>
          )}
          {(syncMessage || (tab === "stablecoin" && stablecoinScoreMessage) || (tab === "usdIncome" && usdIncomeScoreMessage)) && (tab === "bitcoinBackedLenders" || tab === "usdIncome" || tab === "stablecoin") && (
            <span className="text-sm text-slate-600">
              {(tab === "usdIncome" && usdIncomeScoreMessage) ? usdIncomeScoreMessage : (tab === "stablecoin" && stablecoinScoreMessage) ? stablecoinScoreMessage : syncMessage}
            </span>
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
        </div>
      </div>

      {error && <p className="text-amber-600 dark:text-amber-500 text-sm">{error}</p>}

      {loading ? (
        <p className="text-slate-500 py-8">Loading…</p>
      ) : (pendingBitcoinSyncRows?.length > 0) || (pendingUsdIncomeSyncRows?.length > 0) || (pendingStablecoinSyncRows?.length > 0) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">
              {pendingBitcoinSyncRows?.length > 0 && "Données ChatGPT – Bitcoin Backed Lender"}
              {pendingUsdIncomeSyncRows?.length > 0 && !(pendingBitcoinSyncRows?.length > 0) && "Données ChatGPT – Fiat Income"}
              {pendingStablecoinSyncRows?.length > 0 && !(pendingBitcoinSyncRows?.length > 0) && !(pendingUsdIncomeSyncRows?.length > 0) && "Données ChatGPT – Stablecoin"}
            </h2>
            <button
              type="button"
              onClick={() => {
                if (pendingBitcoinSyncRows?.length > 0) handleCancelBitcoinSyncPreview()
                else if (pendingUsdIncomeSyncRows?.length > 0) handleCancelUsdIncomeSyncPreview()
                else if (pendingStablecoinSyncRows?.length > 0) handleCancelStablecoinSyncPreview()
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
            >
              <ChevronLeft size={16} /> Retour
            </button>
          </div>
          {pendingBitcoinSyncRows?.length > 0 && (
            <>
              <p className="text-sm text-slate-600">
                {pendingBitcoinSyncRows.length} entrées générées. Vérifiez puis enregistrez pour remplacer les données existantes en base.
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white overflow-y-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Issuer / Provider</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Product / Instrument</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">APY / Cost</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Duration</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Collateral</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Jurisdiction</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Lockup</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Seniority</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Notes</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Sources</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Category</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBitcoinSyncRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium">{row.issuerProvider ?? "—"}</td>
                        <td className="py-2 px-3">{row.productInstrument ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.apyCost ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[120px]">{row.duration ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[100px]">{row.collateral ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.jurisdiction ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[100px]">{row.lockup ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[100px]">{row.seniority ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={row.notes ?? ""}>{row.notes ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[140px] truncate" title={row.sources ?? ""}>{row.sources ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.category ?? "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => handleEditBitcoinSyncRow(idx)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 transition">
                              <Pencil size={12} /> Modifier
                            </button>
                            <button type="button" onClick={() => handleDeleteBitcoinSyncRow(idx)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition">
                              <Trash2 size={12} /> Suppr.
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button type="button" onClick={handleCancelBitcoinSyncPreview} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Annuler</button>
                <button type="button" onClick={handleApplyBitcoinSync} disabled={applyBitcoinSyncLoading} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">
                  {applyBitcoinSyncLoading ? "Enregistrement…" : "Enregistrer en base"}
                </button>
              </div>
            </>
          )}
          {pendingUsdIncomeSyncRows?.length > 0 && !(pendingBitcoinSyncRows?.length > 0) && (
            <>
              <p className="text-sm text-slate-600">
                {pendingUsdIncomeSyncRows.length} entrées générées. Vérifiez puis enregistrez pour remplacer les données existantes en base.
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white overflow-y-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Issuer / Sponsor</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Product</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Ticker / ID</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Type</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">APY / Distribution</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Duration</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Seniority</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">HV30</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Simple Description</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Availability</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">BTC Linkage</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Key Risks</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsdIncomeSyncRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium">{row.issuer ?? "—"}</td>
                        <td className="py-2 px-3">{row.product ?? "—"}</td>
                        <td className="py-2 px-3 font-mono">{row.ticker ?? "—"}</td>
                        <td className="py-2 px-3">{row.type ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[180px]">{row.apyDistribution ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.duration ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.seniority ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.hv30Pct != null ? `${Number(row.hv30Pct)}%` : "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[220px] truncate" title={row.simpleDescription ?? ""}>{row.simpleDescription ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[140px]">{row.availability ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.btcLinkage ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[220px] truncate" title={row.keyRisks ?? ""}>{row.keyRisks ?? "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => handleEditUsdIncomeSyncRow(idx)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 transition">
                              <Pencil size={12} /> Modifier
                            </button>
                            <button type="button" onClick={() => handleDeleteUsdIncomeSyncRow(idx)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition">
                              <Trash2 size={12} /> Suppr.
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button type="button" onClick={handleCancelUsdIncomeSyncPreview} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Annuler</button>
                <button type="button" onClick={handleApplyUsdIncomeSync} disabled={applyUsdIncomeSyncLoading} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">
                  {applyUsdIncomeSyncLoading ? "Enregistrement…" : "Enregistrer en base"}
                </button>
              </div>
            </>
          )}
          {pendingStablecoinSyncRows?.length > 0 && !(pendingBitcoinSyncRows?.length > 0) && !(pendingUsdIncomeSyncRows?.length > 0) && (
            <>
              <p className="text-slate-600 text-sm">
                {pendingStablecoinSyncRows.length} entrée(s) générée(s). Vérifiez puis enregistrez pour remplacer les données de cette catégorie en base.
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 overflow-y-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Issuer / Provider</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Product</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">APY</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Duration</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Collateral</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Jurisdiction</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Lockup</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Seniority</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Notes</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Sources</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Category</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingStablecoinSyncRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium">{row.issuer ?? "—"}</td>
                        <td className="py-2 px-3">{row.product ?? "—"}</td>
                        <td className="py-2 px-3">{row.apy ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[120px]">{row.duration ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[140px]">{row.collateral ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.jurisdiction ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[100px]">{row.lockup ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[100px]">{row.seniority ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={row.notes ?? ""}>{row.notes ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[140px] truncate" title={row.sources ?? ""}>{row.sources ?? "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{row.category === "cefi_savings" ? "CeFi Savings" : row.category === "collateralised_lending" ? "Collateralised Lending" : row.category ?? "—"}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => handleEditStablecoinSyncRow(idx)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 transition">
                              <Pencil size={12} /> Modifier
                            </button>
                            <button type="button" onClick={() => handleDeleteStablecoinSyncRow(idx)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition">
                              <Trash2 size={12} /> Suppr.
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button type="button" onClick={handleCancelStablecoinSyncPreview} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">Annuler</button>
                <button type="button" onClick={handleApplyStablecoinSync} disabled={applyStablecoinSyncLoading} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition">
                  {applyStablecoinSyncLoading ? "Enregistrement…" : "Enregistrer en base"}
                </button>
              </div>
            </>
          )}
        </div>
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
          {tab === "bitcoinBackedLenders" && (
            <BitcoinBackedLendersTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteBitcoinBackedLender}
            />
          )}
          {tab === "usdIncome" && (
            <UsdIncomeTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteUsdIncome}
            />
          )}
          {tab === "stablecoin" && (
            <StablecoinProductTable
              data={paginatedData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              tabConf={tabConf}
              onEdit={openEdit}
              onDelete={handleDeleteStablecoinProduct}
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

      {editingBitcoinSyncRowIndex != null && pendingBitcoinSyncRows && pendingBitcoinSyncRows[editingBitcoinSyncRowIndex] && (
        <Modal title="Modifier la ligne" onClose={() => setEditingBitcoinSyncRowIndex(null)} size="wide">
          {(() => {
            const row = pendingBitcoinSyncRows[editingBitcoinSyncRowIndex]
            const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
            const labelClass = "block text-sm font-medium text-slate-700 mb-1"
            return (
              <form onSubmit={handleSaveBitcoinSyncRowEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Issuer / Provider</label>
                    <input name="issuerProvider" defaultValue={row.issuerProvider ?? ""} className={inputClass} required placeholder="e.g. Nexo" />
                  </div>
                  <div>
                    <label className={labelClass}>Product / Instrument</label>
                    <input name="productInstrument" defaultValue={row.productInstrument ?? ""} className={inputClass} required placeholder="e.g. BTC Loan" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>APY / Cost</label>
                    <input name="apyCost" defaultValue={row.apyCost ?? ""} className={inputClass} placeholder="e.g. 8% or Quote-based" />
                  </div>
                  <div>
                    <label className={labelClass}>Duration</label>
                    <input name="duration" defaultValue={row.duration ?? ""} className={inputClass} placeholder="e.g. Termed, Revolving" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Collateral</label>
                    <input name="collateral" defaultValue={row.collateral ?? ""} className={inputClass} placeholder="e.g. BTC, WBTC" />
                  </div>
                  <div>
                    <label className={labelClass}>Jurisdiction</label>
                    <input name="jurisdiction" defaultValue={row.jurisdiction ?? ""} className={inputClass} placeholder="e.g. EU, US" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Lockup</label>
                    <input name="lockup" defaultValue={row.lockup ?? ""} className={inputClass} placeholder="e.g. Termed, None" />
                  </div>
                  <div>
                    <label className={labelClass}>Seniority</label>
                    <input name="seniority" defaultValue={row.seniority ?? ""} className={inputClass} placeholder="e.g. Secured" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select name="category" className={inputClass} defaultValue={row.category ?? ""}>
                    <option value="">—</option>
                    <option value="CeFi & Hybrid">CeFi & Hybrid</option>
                    <option value="On-Chain / DeFi">On-Chain / DeFi</option>
                    <option value="Regulated Banks">Regulated Banks</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <input name="notes" defaultValue={row.notes ?? ""} className={inputClass} placeholder="LTV, liquidation, custody, etc." />
                </div>
                <div>
                  <label className={labelClass}>Sources</label>
                  <input name="sources" defaultValue={row.sources ?? ""} className={inputClass} placeholder="URL or reference" />
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => setEditingBitcoinSyncRowIndex(null)} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition">
                    Enregistrer
                  </button>
                </div>
              </form>
            )
          })()}
        </Modal>
      )}

      {editingUsdIncomeSyncRowIndex != null && pendingUsdIncomeSyncRows && pendingUsdIncomeSyncRows[editingUsdIncomeSyncRowIndex] && (
        <Modal title="Modifier la ligne" onClose={() => setEditingUsdIncomeSyncRowIndex(null)} size="wide">
          {(() => {
            const row = pendingUsdIncomeSyncRows[editingUsdIncomeSyncRowIndex]
            const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
            const labelClass = "block text-sm font-medium text-slate-700 mb-1"
            return (
              <form onSubmit={handleSaveUsdIncomeSyncRowEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Issuer / Sponsor</label>
                    <input name="issuer" defaultValue={row.issuer ?? ""} className={inputClass} required placeholder="e.g. Strategy Inc." />
                  </div>
                  <div>
                    <label className={labelClass}>Product</label>
                    <input name="product" defaultValue={row.product ?? ""} className={inputClass} required placeholder="e.g. Stretch Preferred" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Ticker / ID</label>
                    <input name="ticker" defaultValue={row.ticker ?? ""} className={inputClass} required placeholder="e.g. STRC" />
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <input name="type" defaultValue={row.type ?? ""} className={inputClass} required placeholder="e.g. Perpetual preferred" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>APY / Distribution</label>
                  <input name="apyDistribution" defaultValue={row.apyDistribution ?? ""} className={inputClass} placeholder="e.g. Variable (monthly reset)" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Duration</label>
                    <input name="duration" defaultValue={row.duration ?? ""} className={inputClass} placeholder="e.g. Perpetual" />
                  </div>
                  <div>
                    <label className={labelClass}>Seniority</label>
                    <input name="seniority" defaultValue={row.seniority ?? ""} className={inputClass} placeholder="e.g. Preferred" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>HV30 (volatilité %)</label>
                  <input name="hv30Pct" type="text" defaultValue={row.hv30Pct != null ? String(row.hv30Pct) : ""} className={inputClass} placeholder="e.g. 7 ou 28 (vide si inconnu)" />
                </div>
                <div>
                  <label className={labelClass}>Simple Description</label>
                  <input name="simpleDescription" defaultValue={row.simpleDescription ?? ""} className={inputClass} placeholder="Short description" />
                </div>
                <div>
                  <label className={labelClass}>Availability</label>
                  <input name="availability" defaultValue={row.availability ?? ""} className={inputClass} placeholder="e.g. US brokerages (Nasdaq)" />
                </div>
                <div>
                  <label className={labelClass}>BTC Linkage</label>
                  <input name="btcLinkage" defaultValue={row.btcLinkage ?? ""} className={inputClass} placeholder="e.g. BTC treasury exposure" />
                </div>
                <div>
                  <label className={labelClass}>Key Risks</label>
                  <textarea name="keyRisks" defaultValue={row.keyRisks ?? ""} className={inputClass} rows={2} placeholder="Key risks" />
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => setEditingUsdIncomeSyncRowIndex(null)} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition">
                    Enregistrer
                  </button>
                </div>
              </form>
            )
          })()}
        </Modal>
      )}

      {editingStablecoinSyncRowIndex != null && pendingStablecoinSyncRows && pendingStablecoinSyncRows[editingStablecoinSyncRowIndex] && (
        <Modal title="Modifier la ligne" onClose={() => setEditingStablecoinSyncRowIndex(null)} size="wide">
          {(() => {
            const row = pendingStablecoinSyncRows[editingStablecoinSyncRowIndex]
            const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-900"
            const labelClass = "block text-sm font-medium text-slate-700 mb-1"
            return (
              <form onSubmit={handleSaveStablecoinSyncRowEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Issuer / Provider</label>
                    <input name="issuer" defaultValue={row.issuer ?? ""} className={inputClass} required placeholder="e.g. Provider" />
                  </div>
                  <div>
                    <label className={labelClass}>Product / Instrument Name</label>
                    <input name="product" defaultValue={row.product ?? ""} className={inputClass} required placeholder="e.g. Product name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>APY</label>
                    <input name="apy" defaultValue={row.apy ?? ""} className={inputClass} placeholder="e.g. 5%" />
                  </div>
                  <div>
                    <label className={labelClass}>Duration</label>
                    <input name="duration" defaultValue={row.duration ?? ""} className={inputClass} placeholder="e.g. 30 days" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Collateral</label>
                    <input name="collateral" defaultValue={row.collateral ?? ""} className={inputClass} placeholder="e.g. USDC" />
                  </div>
                  <div>
                    <label className={labelClass}>Jurisdiction</label>
                    <input name="jurisdiction" defaultValue={row.jurisdiction ?? ""} className={inputClass} placeholder="e.g. US" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Lockup</label>
                    <input name="lockup" defaultValue={row.lockup ?? ""} className={inputClass} placeholder="e.g. None" />
                  </div>
                  <div>
                    <label className={labelClass}>Seniority</label>
                    <input name="seniority" defaultValue={row.seniority ?? ""} className={inputClass} placeholder="e.g. Senior" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <input name="notes" defaultValue={row.notes ?? ""} className={inputClass} placeholder="Notes" />
                </div>
                <div>
                  <label className={labelClass}>Sources</label>
                  <input name="sources" defaultValue={row.sources ?? ""} className={inputClass} placeholder="e.g. Provider website" />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select name="category" defaultValue={row.category ?? "cefi_savings"} className={inputClass}>
                    <option value="cefi_savings">CeFi Savings</option>
                    <option value="collateralised_lending">Collateralised Lending</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => setEditingStablecoinSyncRowIndex(null)} className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition">
                    Enregistrer
                  </button>
                </div>
              </form>
            )
          })()}
        </Modal>
      )}
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

function BitcoinBackedLendersTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="issuerProvider" className="text-left py-3 px-4">Issuer / Provider</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="productInstrument" className="text-left py-3 px-4">Product / Instrument</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="apyCost" className="text-left py-3 px-4">APY / Cost</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Duration</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Collateral</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="jurisdiction" className="text-left py-3 px-4">Jurisdiction</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Lockup</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Seniority</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Notes</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Sources</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="category" className="text-left py-3 px-4">Category</SortableTh>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="py-3 px-4 font-medium">{row.issuerProvider ?? "—"}</td>
              <td className="py-3 px-4">{row.productInstrument ?? "—"}</td>
              <td className="py-3 px-4">{row.apyCost ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[120px]">{row.duration ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[100px]">{row.collateral ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600">{row.jurisdiction ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[100px]">{row.lockup ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[100px]">{row.seniority ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate" title={row.notes ?? ""}>{row.notes ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate" title={row.sources ?? ""}>{row.sources ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600">{row.category ?? "—"}</td>
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
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No bitcoin backed lenders. Use &quot;Generate from ChatGPT&quot; or Create to add entries.</p>}
    </div>
  )
}

function UsdIncomeTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete }) {
  const formatBreakdownTooltip = (raw) => {
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
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-300 bg-slate-50/80 dark:bg-slate-50/80 p-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-900 mb-1">
          Eligible Digital Credit Yield Products
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-600">
          Only yield-generating digital credit instruments are included. Non-yield, zero-coupon, or non-investable company borrowings are excluded.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
              <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="issuer" className="text-left py-3 px-4 font-semibold text-slate-700">Issuer / Sponsor</SortableTh>
              <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="product" className="text-left py-3 px-4 font-semibold text-slate-700">Product</SortableTh>
              <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="ticker" className="text-left py-3 px-4 font-semibold text-slate-700">Ticker / ID</SortableTh>
              <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="type" className="text-left py-3 px-4 font-semibold text-slate-700">Type</SortableTh>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">APY / Distribution</th>
              <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="qualityScore" className="text-left py-3 px-4 font-semibold text-slate-700">Score</SortableTh>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Duration</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Seniority</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">HV30</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Simple Description</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Availability</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">BTC Linkage</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Key Risks</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-900">{row.issuer ?? "—"}</td>
                <td className="py-3 px-4 text-slate-800">{row.product ?? "—"}</td>
                <td className="py-3 px-4 font-mono text-slate-700">{row.ticker ?? "—"}</td>
                <td className="py-3 px-4 text-slate-700">{row.type ?? "—"}</td>
                <td className="py-3 px-4 text-slate-700 max-w-[180px]">{row.apyDistribution ?? "—"}</td>
                <td className="py-3 px-4 text-slate-700" title={formatBreakdownTooltip(row.qualityScoreBreakdown) ?? undefined}>
                  {row.qualityScore != null ? `${row.qualityScore}/100` : "—"}
                </td>
                <td className="py-3 px-4 text-slate-700">{row.duration ?? "—"}</td>
                <td className="py-3 px-4 text-slate-700">{row.seniority ?? "—"}</td>
                <td className="py-3 px-4 text-slate-700">{row.hv30Pct != null ? `${Number(row.hv30Pct)}%` : "—"}</td>
                <td className="py-3 px-4 text-slate-600 max-w-[220px]">{row.simpleDescription ?? "—"}</td>
                <td className="py-3 px-4 text-slate-600 max-w-[140px]">{row.availability ?? "—"}</td>
                <td className="py-3 px-4 text-slate-600">{row.btcLinkage ?? "—"}</td>
                <td className="py-3 px-4 text-slate-600 max-w-[220px]">{row.keyRisks ?? "—"}</td>
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
      </div>
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No Fiat income products. Use &quot;Generate from ChatGPT&quot; or Create to add entries.</p>}
    </div>
  )
}

function StablecoinProductTable({ data, sortKey, sortDir, onSort, tabConf, onEdit, onDelete }) {
  const categoryLabel = (c) => (c === "cefi_savings" ? "CeFi Savings" : c === "collateralised_lending" ? "Collateralised Lending" : c ?? "—")
  const formatBreakdownTooltip = (raw) => {
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
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-50 border-b border-slate-200">
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="issuer" className="text-left py-3 px-4">Issuer / Provider</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="product" className="text-left py-3 px-4">Product / Instrument Name</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="apy" className="text-left py-3 px-4">APY</SortableTh>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="qualityScore" className="text-left py-3 px-4">Score</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Duration</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Collateral</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="jurisdiction" className="text-left py-3 px-4">Jurisdiction</SortableTh>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Lockup</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Seniority</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Notes</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700">Sources</th>
            <SortableTh sortKey={sortKey} sortDir={sortDir} onSort={onSort} tabConf={tabConf} columnKey="category" className="text-left py-3 px-4">Category</SortableTh>
            <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50">
              <td className="py-3 px-4 font-medium">{row.issuer ?? "—"}</td>
              <td className="py-3 px-4">{row.product ?? "—"}</td>
              <td className="py-3 px-4">{row.apy ?? "—"}</td>
              <td className="py-3 px-4" title={formatBreakdownTooltip(row.qualityScoreBreakdown) ?? undefined}>
                {row.qualityScore != null ? (
                  <span className="font-medium tabular-nums">{row.qualityScore}/100</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 px-4 text-slate-600 max-w-[120px]">{row.duration ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[140px]">{row.collateral ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600">{row.jurisdiction ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[100px]">{row.lockup ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[100px]">{row.seniority ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate" title={row.notes ?? ""}>{row.notes ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate" title={row.sources ?? ""}>{row.sources ?? "—"}</td>
              <td className="py-3 px-4 text-slate-600">{categoryLabel(row.category)}</td>
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
      {data.length === 0 && <p className="py-8 text-center text-slate-500">No stablecoin products. Use &quot;Generate from ChatGPT&quot; (CeFi Savings or Collateralised Lending) or Create to add entries.</p>}
    </div>
  )
}
