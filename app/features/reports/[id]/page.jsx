"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"
import { ArrowLeft, Download } from "lucide-react"

function getReportTypeColor(type) {
  const colors = {
    Suitability: "bg-amber-100 text-amber-700",
    Income: "bg-blue-100 text-blue-700",
    Risk: "bg-orange-100 text-orange-700",
  }
  return colors[type] || "bg-slate-100 text-slate-700"
}

export default function ReportViewPage() {
  const router = useRouter()
  const params = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const id = typeof params?.id === "string" ? params.id : null

  useEffect(() => {
    if (!id) {
      router.push("/features/reports")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/reports/${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (!data.success || !data.report) {
          setError(data?.error || "Not found")
          setReport(null)
          return
        }
        setReport(data.report)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, router])

  const handleDownloadPdf = () => {
    window.print()
  }

  if (!id || loading) {
    return (
      <ProtectedFeature featureName="Reports">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-600 dark:text-slate-400">Loading…</div>
        </div>
      </ProtectedFeature>
    )
  }

  if (error || !report) {
    return (
      <ProtectedFeature featureName="Reports">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-slate-600 dark:text-slate-400">{error || "Report not found."}</p>
          <Link href="/features/reports" className="flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-lg font-semibold">
            <ArrowLeft size={18} /> Back to Reports
          </Link>
        </div>
      </ProtectedFeature>
    )
  }

  const fd = report.frozenData
  const isComparison = fd?.reportVariant === "comparison"
  const title = isComparison ? "Comparison" : report.reportType

  return (
    <ProtectedFeature featureName="Reports">
      <div className="no-print flex flex-col items-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
        <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
          <Breadcrumb
            items={[
              { label: "Features", href: null },
              { label: "Reports", href: "/features/reports" },
              { label: `${title} Report`, href: null },
            ]}
          />
        </div>
      </div>

      <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Link href="/features/reports" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium">
                <ArrowLeft size={18} /> Back to Reports
              </Link>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReportTypeColor(report.reportType)}`}>
                {report.reportType}{isComparison ? " (Comparison)" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] text-white rounded-lg font-semibold transition"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>

          <div className="bg-white dark:bg-white rounded-2xl border border-slate-200 dark:border-slate-300 p-8 md:p-10 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-900 mb-6">{title} Report</h1>
            <div className="text-sm text-slate-700 dark:text-slate-700 space-y-4">
              <p><span className="font-semibold">Type:</span> {report.reportType}{isComparison ? " (Comparison)" : ""}</p>
              <p><span className="font-semibold">Created:</span> {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}</p>
              {fd?.generatedAt && <p><span className="font-semibold">Generated at:</span> {new Date(fd.generatedAt).toLocaleString()}</p>}

              {isComparison && fd?.comparisonTable && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold">Feature</th>
                        {(fd.instruments || []).map((item, idx) => (
                          <th key={idx} className="text-center py-2 px-3 font-semibold">
                            <div>{item?.instrument?.issuer}</div>
                            <div className="text-xs font-normal text-slate-500">{item?.instrument?.productName}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fd.comparisonTable.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-2 px-3 font-medium">{row.feature}</td>
                          {(row.values || []).map((v, j) => (
                            <td key={j} className="py-2 px-3 text-center">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.reportType === "Income" && fd?.metrics && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {fd.metrics.portfolioApyMin != null && <div><span className="font-semibold">Portfolio APY min:</span> {fd.metrics.portfolioApyMin.toFixed(2)}%</div>}
                    {fd.metrics.portfolioApyMax != null && <div><span className="font-semibold">Portfolio APY max:</span> {fd.metrics.portfolioApyMax.toFixed(2)}%</div>}
                    {fd.metrics.targetAnnualIncome != null && <div><span className="font-semibold">Target annual income:</span> {fd.metrics.targetAnnualIncome.toLocaleString()}</div>}
                    {fd.metrics.targetMonthlyIncome != null && <div><span className="font-semibold">Target monthly:</span> {fd.metrics.targetMonthlyIncome.toLocaleString()}</div>}
                    {fd.metrics.monthlyIncomeMin != null && <div><span className="font-semibold">Monthly income min:</span> {fd.metrics.monthlyIncomeMin.toFixed(2)}</div>}
                    {fd.metrics.monthlyIncomeMax != null && <div><span className="font-semibold">Monthly income max:</span> {fd.metrics.monthlyIncomeMax.toFixed(2)}</div>}
                    {fd.metrics.requiredCapitalMin != null && <div><span className="font-semibold">Required capital min:</span> {fd.metrics.requiredCapitalMin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                    {fd.metrics.requiredCapitalMax != null && <div><span className="font-semibold">Required capital max:</span> {fd.metrics.requiredCapitalMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                    {fd.metrics.principal != null && <div><span className="font-semibold">Principal:</span> {fd.metrics.principal.toLocaleString()}</div>}
                    {fd.metrics.totalIncomeMin != null && <div><span className="font-semibold">Total income min:</span> {fd.metrics.totalIncomeMin.toFixed(2)}</div>}
                    {fd.metrics.totalIncomeMax != null && <div><span className="font-semibold">Total income max:</span> {fd.metrics.totalIncomeMax.toFixed(2)}</div>}
                  </div>
                  {fd.metrics.rateAsOf && <p className="text-xs text-slate-500">Rate as of: {new Date(fd.metrics.rateAsOf).toLocaleString()}</p>}
                  {Array.isArray(fd.warnings) && fd.warnings.length > 0 && (
                    <>
                      <p className="font-semibold">Warnings</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {fd.warnings.map((w, i) => (
                          <li key={i} className={w.severity === "red" ? "text-red-700" : "text-amber-700"}>{w.message}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {report.reportType === "Risk" && fd?.metrics && (
                <div className="space-y-4 mt-4">
                  {fd.source === "1A" && (
                    <div className="grid grid-cols-2 gap-3">
                      {fd.metrics.btcRequired != null && <div><span className="font-semibold">BTC required:</span> {fd.metrics.btcRequired.toFixed(4)}</div>}
                      {fd.metrics.marginCallPrice != null && <div><span className="font-semibold">Margin call price:</span> ${fd.metrics.marginCallPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                      {fd.metrics.liquidationPrice != null && <div><span className="font-semibold">Liquidation price:</span> ${fd.metrics.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                      {fd.metrics.riskIndicator && <div><span className="font-semibold">Risk:</span> {fd.metrics.riskIndicator}</div>}
                      {fd.metrics.sri != null && <div><span className="font-semibold">SRI:</span> {fd.metrics.sri.toFixed(1)} ({fd.metrics.sriLevel})</div>}
                    </div>
                  )}
                  {fd.source === "1C" && fd.metrics.venueBreakdown && (
                    <div>
                      <p className="font-semibold mb-2">Venue breakdown</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(fd.metrics.venueBreakdown).map(([k, v]) => (
                          <div key={k} className="bg-slate-50 rounded-lg p-2 text-center"><span className="font-medium">{k}</span> {Number(v).toFixed(1)}%</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(fd.warnings) && fd.warnings.length > 0 && (
                    <>
                      <p className="font-semibold">Warnings</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {fd.warnings.map((w, i) => (
                          <li key={i} className={w.severity === "red" ? "text-red-700" : "text-amber-700"}>{w.message}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {report.reportType === "Suitability" && !isComparison && fd?.instruments && fd.instruments.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="font-semibold">Instruments ({fd.instruments.length})</p>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-semibold">Issuer</th>
                          <th className="text-left py-2 px-3 font-semibold">Product</th>
                          <th className="text-left py-2 px-3 font-semibold">APY</th>
                          <th className="text-left py-2 px-3 font-semibold">As of</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fd.instruments.map((item, idx) => {
                          const inst = item?.instrument
                          const snap = item?.snapshot
                          let apy = inst?.apyLabel ?? "—"
                          if (snap?.apyLabelOverride) apy = snap.apyLabelOverride
                          else if (snap?.apyMin != null && snap?.apyMax != null && snap.apyMin !== snap.apyMax) apy = `${snap.apyMin}% – ${snap.apyMax}%`
                          else if (snap?.apyMin != null) apy = `${snap.apyMin}%`
                          else if (snap?.apyMax != null) apy = `${snap.apyMax}%`
                          const asOf = snap?.asOf ? new Date(snap.asOf).toLocaleDateString() : "—"
                          return (
                            <tr key={idx} className="border-b border-slate-100 last:border-0">
                              <td className="py-2 px-3">{inst?.issuer ?? "—"}</td>
                              <td className="py-2 px-3">{inst?.productName ?? "—"}</td>
                              <td className="py-2 px-3">{apy}</td>
                              <td className="py-2 px-3 text-slate-500">{asOf}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedFeature>
  )
}
