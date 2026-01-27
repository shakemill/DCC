"use client"
import { useAuth } from "@/context/AuthContext"
import { useEffect } from "react"
import Link from "next/link"
import { Lock, ArrowRight } from "lucide-react"

export default function ProtectedFeature({ children, featureName = "this feature" }) {
    const { user, loading } = useAuth()

    // Double check: ensure user is actually logged in
    useEffect(() => {
        if (!loading && !user && typeof window !== "undefined") {
            // Clear any stale user data
            const storedUser = localStorage.getItem("user")
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser)
                    // If user data exists but is invalid, clear it
                    if (!parsed || !parsed.id || !parsed.email) {
                        localStorage.removeItem("user")
                    }
                } catch (e) {
                    localStorage.removeItem("user")
                }
            }
        }
    }, [user, loading])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-600 dark:text-slate-400">Loading...</div>
            </div>
        )
    }

    // Strict check: user must exist and have required properties
    if (!user || !user.id || !user.email) {
        return (
            <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4 flex items-center justify-center">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-8 md:p-12 shadow-sm">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#f49d1d]/10 flex items-center justify-center">
                            <Lock className="text-[#f49d1d]" size={40} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-900">
                            Unlock {featureName}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-600 mb-8 text-lg leading-relaxed">
                            To access {featureName}, please create an account. It's free and only takes a minute!
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/get-started"
                                className="w-full sm:w-auto px-8 py-3 bg-[#f49d1d] hover:bg-[#d6891a] text-white font-semibold rounded-md transition flex items-center justify-center gap-2"
                            >
                                Create Account
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                href="/login"
                                className="w-full sm:w-auto px-8 py-3 border border-[#f49d1d] text-[#f49d1d] hover:bg-[#f49d1d]/10 font-semibold rounded-md transition"
                            >
                                Sign In
                            </Link>
                        </div>
                        <p className="mt-6 text-sm text-slate-500">
                            Already have an account?{" "}
                            <Link href="/login" className="text-[#f49d1d] hover:underline font-medium">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Only render children if user is properly authenticated
    return <>{children}</>
}
