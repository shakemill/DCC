"use client";

import { useState, useEffect } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import ProtectedFeature from "@/components/ProtectedFeature";

const cardStyle = { boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" };

function formatApyRange(apyMinPct, apyMaxPct) {
    const min = apyMinPct != null ? Number(apyMinPct) : null;
    const max = apyMaxPct != null ? Number(apyMaxPct) : null;
    if (min == null && max == null) return "—";
    if (min != null && max != null) {
        if (min === max) return `${min}%`;
        return `${min}%–${max}%`;
    }
    if (min != null) return `${min}%`;
    return `${max}%`;
}

export default function ProductUniversePage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch("/api/product-universe")
            .then(async (res) => {
                let data = {};
                try {
                    data = await res.json();
                } catch (_) {
                    data = { error: res.status === 500 ? "Server error" : `Error ${res.status}` };
                }
                return { ok: res.ok, data };
            })
            .then(({ ok, data }) => {
                if (ok && data?.success && Array.isArray(data.products)) {
                    setProducts(data.products);
                } else {
                    setError(data?.error || "Failed to load product universe");
                }
            })
            .catch((err) => {
                setError(err.message || "Failed to load product universe");
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <ProtectedFeature featureName="Product Universe">
            <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
                <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
                    <Breadcrumb
                        items={[
                            { label: "Features", href: null },
                            { label: "Product Universe", href: null },
                        ]}
                    />
                </div>
                <h2 className="mt-4 md:mt-8 text-4xl md:text-4xl font-bold max-w-4xl leading-tight">
                    Product{" "}
                    <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">
                        Universe
                    </span>
                </h2>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
                    Reference table of products with ticker, APY range, rate type, HV30 volatility, seniority and notes.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
                <div
                    className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 overflow-hidden"
                    style={cardStyle}
                >
                    {loading && (
                        <p className="text-slate-500 py-8 text-center">Loading…</p>
                    )}
                    {error && (
                        <p className="text-red-600 dark:text-red-600 py-8 text-center">{error}</p>
                    )}
                    {!loading && !error && products.length === 0 && (
                        <p className="text-slate-500 py-8 text-center">No products in the universe yet.</p>
                    )}
                    {!loading && !error && products.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Ticker</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Product</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">APY Range</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Rate type</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">HV30 Volatility</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Seniority</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Liquidity type</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Lock duration (years)</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((row) => (
                                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-50/50">
                                            <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-900">{row.ticker}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{row.product}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{formatApyRange(row.apyMinPct, row.apyMaxPct)}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{row.rateType ?? "—"}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">
                                                {row.hv30VolatilityPct != null ? `${Number(row.hv30VolatilityPct)}%` : "—"}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{row.seniority ?? "—"}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{row.liquidityType ?? "—"}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{row.lockDurationYears != null ? Number(row.lockDurationYears) : "—"}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-600">{row.notes ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedFeature>
    );
}
