"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"
import { ArrowLeft, Shield, Clock, FileText, ExternalLink } from "lucide-react"

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

export default function YieldBoardDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [instrument, setInstrument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const id = typeof params?.id === "string" ? params.id : null

  useEffect(() => {
    if (!id) {
      router.push("/features/yield-board")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/instruments/${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (!data.success || !data.instrument) {
          setError(data?.error || "Not found")
          setInstrument(null)
          return
        }
        setInstrument(data.instrument)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, router])

  if (!id || loading) {
    return (
      <ProtectedFeature featureName="Yield Board">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-400">Loading…</div>
        </div>
      </ProtectedFeature>
    )
  }

  if (error || !instrument) {
    return (
      <ProtectedFeature featureName="Yield Board">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-slate-600 dark:text-slate-400">{error || "Instrument not found."}</p>
          <Link href="/features/yield-board" className="flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md font-semibold">
            <ArrowLeft size={18} /> Back to Yield Board
          </Link>
        </div>
      </ProtectedFeature>
    )
  }

  const asOf = instrument.latestSnapshot?.asOf
  const sources = Array.isArray(instrument.sources) ? instrument.sources : instrument.sources ? [instrument.sources] : []

  return (
    <ProtectedFeature featureName="Yield Board">
      <>
        <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
          <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
            <Breadcrumb
              items={[
                { label: "Features", href: null },
                { label: "Yield Board", href: "/features/yield-board" },
                { label: instrument.issuer || "Details", href: null },
              ]}
            />
          </div>
          <h2 className="mt-4 md:mt-8 text-4xl font-bold max-w-4xl leading-tight">
            {instrument.issuer} <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Details</span>
          </h2>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 px-4">
            {instrument.productName}. Risk, structure, and liquidity first; yield is conditional and non‑promotional.
          </p>
        </div>

        <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/features/yield-board"
                className="flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-md font-semibold w-fit"
              >
                <ArrowLeft size={18} /> Back to Yield Board
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-8 md:p-10" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-900 mb-2">{instrument.productName}</h3>
                  <p className="text-slate-600 dark:text-slate-600 mb-6">{instrument.issuer}</p>

                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-900 mb-4">Structure & liquidity (risk-first)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Collateral</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.collateral ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Seniority</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.seniority ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Lockup</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.lockup ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Jurisdiction</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.jurisdiction ?? "—"}</p>
                    </div>
                    {(instrument.paymentFrequency || instrument.module === "M1B") && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Payment frequency</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.paymentFrequency ?? "—"}</p>
                      </div>
                    )}
                    {(instrument.ticker || instrument.cusip || instrument.isin) && (
                      <>
                        {instrument.ticker && (
                          <div>
                            <p className="text-sm text-slate-500 mb-1">Ticker</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.ticker}</p>
                          </div>
                        )}
                        {instrument.cusip && (
                          <div>
                            <p className="text-sm text-slate-500 mb-1">CUSIP</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-900 font-mono text-sm">{instrument.cusip}</p>
                          </div>
                        )}
                        {instrument.isin && (
                          <div>
                            <p className="text-sm text-slate-500 mb-1">ISIN</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-900 font-mono text-sm">{instrument.isin}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {(instrument.distributionMechanics || instrument.settlementNotes) && (
                    <div className="grid grid-cols-1 gap-4 mb-6 pt-4 border-t border-slate-200 dark:border-slate-300">
                      {instrument.distributionMechanics && (
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Distribution mechanics</p>
                          <p className="text-sm text-slate-700 dark:text-slate-700">{instrument.distributionMechanics}</p>
                        </div>
                      )}
                      {instrument.settlementNotes && (
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Settlement notes</p>
                          <p className="text-sm text-slate-700 dark:text-slate-700">{instrument.settlementNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-900 mb-4">Yield / cost</h4>
                  <div className="flex flex-wrap items-baseline gap-4 mb-4">
                    <p className="text-2xl font-extrabold text-[#f49d1d]">{formatApy(instrument)}</p>
                    {instrument.module === "M1A" && <span className="text-sm text-slate-500">(borrow cost)</span>}
                  </div>
                  {asOf && (
                    <p className="text-sm text-slate-500 mb-4">
                      Rates as of {new Date(asOf).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      {instrument.latestSnapshot?.rateType && (
                        <span className="ml-2 text-slate-600 dark:text-slate-600">· {instrument.latestSnapshot.rateType}</span>
                      )}
                    </p>
                  )}

                  {instrument.notes && (
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-300">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-slate-900 mb-2 flex items-center gap-2">
                        <FileText size={18} /> Notes
                      </h4>
                      <p className="text-slate-600 dark:text-slate-600">{instrument.notes}</p>
                    </div>
                  )}
                  {instrument.unverifiableReason && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">Unknown / not disclosed: {instrument.unverifiableReason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-900 mb-4">Details</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield size={20} className="text-[#f49d1d] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-slate-500">Duration</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.duration ?? "—"}</p>
                      </div>
                    </div>
                    {instrument.minLoanSize != null && (
                      <div className="flex items-start gap-3">
                        <span className="text-[#f49d1d] font-semibold">Min</span>
                        <div>
                          <p className="text-sm text-slate-500">Min loan size</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-900">${Number(instrument.minLoanSize).toLocaleString("en-US")}</p>
                        </div>
                      </div>
                    )}
                    {instrument.supportedAsset && (
                      <div>
                        <p className="text-sm text-slate-500">Supported asset</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.supportedAsset}</p>
                      </div>
                    )}
                    {instrument.venueType && (
                      <div>
                        <p className="text-sm text-slate-500">Venue</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-900">{instrument.venueType}</p>
                      </div>
                    )}
                  </div>
                </div>

                {sources.length > 0 && (
                  <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}>
                    <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-900 mb-4">Sources</h4>
                    <ul className="space-y-2">
                      {sources.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#f49d1d] hover:underline flex items-center gap-1 break-all">
                            <ExternalLink size={14} /> {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    </ProtectedFeature>
  )
}
