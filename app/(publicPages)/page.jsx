"use client"
import SectionTitle from "@/components/SectionTitle";
import { featuresData } from "@/data/featuresData";
import { FaqSection } from "@/sections/FaqSection";
import Pricing from "@/sections/Pricing";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";

export default function Page() {
    return (
        <>
            <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
                
                <h2 className="mt-4 md:mt-8 text-4xl md:text-4xl font-bold max-w-4xl leading-tight">
                Clarity Before Capital-Model Digital Income with{" "}
                    <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Transparent Risk</span>
                </h2>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
                Digital Credit Compass (DCC) is an independent planning and analysis platform that enables users to simulate and compare Bitcoin-backed, fiat, and stablecoin income structures using standardized risk scoring, scenario modeling, and suitability-ready reports — without custody, without execution, and without selling Bitcoin.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                    <Link href="/get-started" className="bg-[#f49d1d] hover:bg-[#d6891a] transition text-white rounded-md px-6 h-11 flex items-center justify-center">
                    Start Risk Planner (Free)
                    </Link>
                    <Link
                        href="/features/yield-board"
                        className="group flex items-center gap-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 hover:border-[#f49d1d] hover:bg-[#f49d1d]/5 dark:hover:bg-[#f49d1d]/10 text-slate-700 dark:text-slate-200 px-6 h-12 font-medium shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        <LayoutGrid size={20} className="text-[#f49d1d] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                        <span>Explore Yield Board</span>
                    </Link>
                </div>
            </div>

            <div className="mt-16 md:mt-24">
                <SectionTitle text2="How Digital Credit Compass Works" text3=" A systematic approach to evaluating yield without ignoring risk.." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-4 mt-10 px-6 md:px-16 lg:px-24 xl:px-32 auto-rows-fr">
                {featuresData.map((feature, index) => (
                    <div key={index} className="p-6 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-white/80 backdrop-blur-sm flex flex-col transition-all duration-200 hover:shadow-sm hover:border-[#f49d1d]/20 hover:-translate-y-0.5 cursor-pointer group">
                        <feature.icon className="text-[#f49d1d] size-8 mt-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-105" strokeWidth={1.3} />
                        <h3 className="text-base font-bold flex-shrink-0">{feature.title}</h3>
                        <p className="text-slate-400 line-clamp-4 text-sm leading-relaxed flex-1 min-h-0">{feature.description}</p>
                    </div>
                ))}
            </div>

            <div id="pricing">
                <Pricing />
            </div>

            <div id="faq">
                <FaqSection />
            </div>

            <div className="flex flex-col items-center text-center justify-center mt-20">
                <h3 className="text-3xl font-semibold mt-16 mb-4">Ready to Get Started?</h3>
                <p className="text-slate-600 dark:text-slate-200 max-w-xl mx-auto">
                    Start planning your Bitcoin-backed income strategy today. Create transparent, risk-assessed financial plans without custody or execution — all analysis, no commitment.
                </p>
                <div className="flex items-center gap-4 mt-8">
                    <Link href="/get-started" className="bg-[#f49d1d] hover:bg-[#d6891a] transition text-white rounded-md px-6 h-11 flex items-center justify-center">
                    Start Risk Planner (Free)
                    </Link>
                    <Link href="/contact" className="border border-[#b87718] transition text-slate-600 dark:text-white rounded-md px-6 h-11 flex items-center justify-center">
                        Contact support
                    </Link>
                </div>
            </div>

        </>
    );
}