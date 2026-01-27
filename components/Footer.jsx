"use client"
import { useThemeContext } from "@/context/ThemeContext";
import { navLinks } from "@/data/navLinks";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
    const { theme } = useThemeContext();
    return (
        <footer className="relative px-6 md:px-16 lg:px-24 xl:px-32 mt-40 pt-8 w-full dark:text-slate-50">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" aria-hidden />
            <Image className="absolute max-w-4xl w-full h-auto -mt-30 max-md:px-4 right-0 md:right-16 lg:right-24 xl:right-32 top-0 pointer-events-none" src={theme === "dark" ? "/assets/landing-text-dark.svg" : "/assets/landing-text-light.svg"} alt="landing" width={930} height={340} priority fetchPriority="high" />
            <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-200 dark:border-slate-700 pb-6">
                <div className="md:max-w-114">
                    <a href="#">
                        <Image className="h-9 md:h-9.5 w-auto shrink-0" src={theme === "dark" ? "/assets/logo.png" : "/assets/logo.png"} alt="Logo" width={140} height={40} priority fetchPriority="high" />
                    </a>
                    <p className="mt-6">
                    Digital Credit Compass is an independent, non-custodial analytics platform providing scenario modeling and risk transparency across Bitcoin, fiat, and stablecoin instruments.
                    </p>
                </div>
                <div className="flex-1 flex items-start md:justify-end gap-20">
                    <div>
                        <h2 className="font-bold mb-5">Company</h2>
                        <ul className="space-y-2">
                            {navLinks.map((link, index) => (
                                <li key={index}>
                                    <Link href={link.href} className="hover:text-[#f49d1d] transition">{link.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-bold mb-5">Legal</h2>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/legal" className="hover:text-[#f49d1d] transition">Legal</Link>
                            </li>
                            <li>
                                <Link href="/disclosures" className="hover:text-[#f49d1d] transition">Disclosures & Methodology</Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-[#f49d1d] transition">Terms</Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-[#f49d1d] transition">Privacy</Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold mb-3">Contact Sales</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                            Get in touch with our team. We&apos;re here to help you understand how Digital Credit Compass can support your financial planning needs.
                        </p>
                        <Link href="/contact" className="inline-block mt-2 text-xs font-medium text-[#f49d1d] hover:underline">
                            Contact us →
                        </Link>
                    </div>
                </div>
            </div>
            <p className="pt-4 text-center pb-5">
                Copyright 2026 © <a href="https://prebuiltui.com?utm_source=landing" target="_blank" className="font-bold">Digital Credit Compass DCC</a> • Developed by <a href="https://yarabyte.com" target="_blank">Yarabyte</a> • All Right Reserved.
            </p>
        </footer>
    );
};