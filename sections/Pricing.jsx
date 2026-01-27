"use client"
import SectionTitle from "@/components/SectionTitle";
import { useThemeContext } from "@/context/ThemeContext";
import { pricingData } from "@/data/pricingData";
import { SparklesIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Pricing() {
    const { theme } = useThemeContext();
    const [billingPeriod, setBillingPeriod] = useState("annual"); // "monthly" or "annual"

    const getDisplayPrice = (plan) => {
        if (plan.price === 0) return { value: "0", suffix: "" };
        if (billingPeriod === "annual" && plan.priceAnnual != null) {
            return { value: String(plan.priceAnnual), suffix: "/yr USD" };
        }
        return { value: String(plan.price), suffix: "/mo USD" };
    };

    const getBilledAnnuallyText = (plan) => {
        if (plan.price === 0 || !plan.priceAnnual) return null;
        const perMonth = plan.priceAnnual / 12;
        return `$${perMonth % 1 === 0 ? perMonth : perMonth.toFixed(2)}/month billed annually (USD)`;
    };

    return (
        <div className="relative">
            <Image className="absolute -mt-20 md:-mt-100 md:left-20 pointer-events-none" src={theme === "dark" ? "/assets/color-splash.svg" : "/assets/color-splash-light.svg"} alt="color-splash" width={1000} height={1000} priority fetchPriority="high" />
            <SectionTitle text1="PRICING" text2="Our Pricing Plans" text3="Flexible pricing options designed to meet your needs — whether you're just getting started or scaling up." />

            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                <button
                    onClick={() => setBillingPeriod("monthly")}
                    className={`px-4 py-2 rounded-md font-medium transition ${
                        billingPeriod === "monthly"
                            ? "bg-[#f49d1d] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setBillingPeriod("annual")}
                    className={`px-4 py-2 rounded-md font-medium transition relative ${
                        billingPeriod === "annual"
                            ? "bg-[#f49d1d] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                    Annual
                    <span className="absolute -top-[10px] -right-2 bg-black text-white text-xs px-1.5 py-0.5 rounded-full">
                        −23%
                    </span>
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
                {pricingData.map((plan, index) => {
                    const display = getDisplayPrice(plan);
                    const billedText = getBilledAnnuallyText(plan);
                    return (
                    <div key={index} className={`p-6 rounded-2xl max-w-75 w-full shadow-[0px_4px_26px] shadow-black/6 ${plan.mostPopular ? "relative pt-12 bg-gradient-to-b from-[#f49d1d] to-[#e88a0f]" : "bg-white/50 dark:bg-white/50 border border-slate-200 dark:border-slate-800"}`}>
                        {plan.mostPopular && (
                            <div className="flex items-center text-xs gap-1 py-1.5 px-2 text-[#f49d1d] absolute top-4 right-4 rounded bg-white font-medium">
                                <SparklesIcon size={14} />
                                <p>Most Popular</p>
                            </div>
                        )}
                        <p className={plan.mostPopular && "text-white"}>{plan.title}</p>
                        <div className="mt-1">
                            <h4 className={`text-3xl font-semibold ${plan.mostPopular && "text-white"}`}>
                                ${display.value}
                                <span className={`font-normal text-sm ${plan.mostPopular ? "text-white" : "text-slate-300"}`}>
                                    {display.suffix}
                                </span>
                            </h4>
                            {billingPeriod === "annual" && billedText && (
                                <p className={`text-xs mt-1 ${plan.mostPopular ? "text-white/80" : "text-slate-500"}`}>
                                    {billedText}
                                </p>
                            )}
                        </div>
                        <hr className={`my-8 ${plan.mostPopular ? "border-gray-300" : "border-slate-300 dark:border-slate-700"}`} />
                        <div className={`space-y-2 ${plan.mostPopular ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                            {plan.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                    <feature.icon size={18} className={`${plan.mostPopular ? "text-white" : "text-[#f49d1d]"}`} />
                                    <span>{feature.name}</span>
                                </div>
                            ))}
                        </div>
                        <Link 
                            href="/get-started"
                            className={`transition w-full py-3 rounded-lg font-medium mt-8 flex items-center justify-center ${plan.mostPopular ? "bg-white hover:bg-slate-100 text-slate-800" : "bg-[#f49d1d] hover:bg-[#d6891a] text-white"}`}
                        >
                            <span>{plan.buttonText}</span>
                        </Link>
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
