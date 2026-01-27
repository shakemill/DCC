"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import Breadcrumb from "@/components/Breadcrumb"
import { 
    Calculator, 
    BarChart3, 
    FileText, 
    TrendingUp,
    Settings,
    User,
    Crown,
    ArrowRight,
    ShieldCheck,
    ChevronDown
} from "lucide-react"

const dashboardCards = [
    {
        title: "Income Planners",
        description: "Create and manage your income plans with risk assessment",
        href: "/features/income-planners",
        icon: Calculator,
        color: "from-[#f49d1d] to-[#e88a0f]",
        bgColor: "bg-[#f49d1d]/10",
        iconColor: "text-[#f49d1d]"
    },
    {
        title: "Yield Board",
        description: "Compare and analyze yield opportunities across platforms",
        href: "/features/yield-board",
        icon: BarChart3,
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-500/10",
        iconColor: "text-blue-500"
    },
    {
        title: "Reports",
        description: "Access and manage all your generated financial reports",
        href: "/features/reports",
        icon: FileText,
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-500/10",
        iconColor: "text-purple-500"
    },
    {
        title: "Analytics",
        description: "View your portfolio performance and insights",
        href: "#",
        icon: TrendingUp,
        color: "from-green-500 to-green-600",
        bgColor: "bg-green-500/10",
        iconColor: "text-green-500"
    },
    {
        title: "Profile",
        description: "Manage your account settings and preferences",
        href: "/profile",
        icon: User,
        color: "from-slate-500 to-slate-600",
        bgColor: "bg-slate-500/10",
        iconColor: "text-slate-500"
    },
    {
        title: "Settings",
        description: "Configure your application preferences",
        href: "#",
        icon: Settings,
        color: "from-gray-500 to-gray-600",
        bgColor: "bg-gray-500/10",
        iconColor: "text-gray-500"
    }
]

export default function DashboardPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [savedPlansCount, setSavedPlansCount] = useState(0)
    const [isLoadingPlans, setIsLoadingPlans] = useState(false)
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
    const adminDropdownRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(e) {
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target)) setAdminDropdownOpen(false)
        }
        if (adminDropdownOpen) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [adminDropdownOpen])

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login")
        }
    }, [user, loading, router])

    useEffect(() => {
        if (user) {
            loadPlansCount()
        }
    }, [user])

    const loadPlansCount = async () => {
        if (!user) return
        
        setIsLoadingPlans(true)
        try {
            const response = await fetch(`/api/income-plans?userId=${user.id}`)
            if (!response.ok) {
                throw new Error(`Failed to load plans: ${response.status}`)
            }
            const data = await response.json()
            if (data.success) {
                setSavedPlansCount(data.plans?.length || 0)
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn("Error loading plans count:", error.message)
            }
            setSavedPlansCount(0)
        } finally {
            setIsLoadingPlans(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-600 dark:text-slate-400">Loading dashboard...</div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Breadcrumb 
                        items={[
                            { label: "Dashboard", href: null }
                        ]} 
                    />
                </div>
                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-4xl font-bold mb-4">
                        Welcome back, <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">{user.name}</span>
                    </h1>
                    <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                        Manage your financial planning tools and access all features from one place.
                    </p>
                </div>

                {/* Current Plan Banner */}
                <div className="mb-8 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 relative overflow-hidden" style={{ boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.015), 0 1px 2px -1px rgba(0, 0, 0, 0.01)' }}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#f49d1d]/10 rounded-xl flex items-center justify-center">
                                <Crown size={24} className="text-[#f49d1d]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Current Plan</p>
                                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-900">Free Plan</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Limited features and storage</p>
                            </div>
                        </div>
                        <Link
                            href="/#pricing"
                            className="px-6 py-3 bg-[#f49d1d] hover:bg-[#d6891a] text-white font-semibold rounded-md transition flex items-center gap-2 whitespace-nowrap"
                        >
                            <span>Unlock Full Access Features</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardCards.map((card, index) => {
                        const Icon = card.icon
                        return (
                            <Link
                                key={index}
                                href={card.href}
                                className="group"
                            >
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 h-full flex flex-col transition-all duration-200 hover:shadow-sm hover:border-[#f49d1d]/30 hover:-translate-y-1 cursor-pointer"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)', backgroundColor: '#ffffff' }}
                                >
                                    <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className={card.iconColor} size={28} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-900 mb-2">
                                        {card.title}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-600 text-sm leading-relaxed flex-1">
                                        {card.description}
                                    </p>
                                    <div className="mt-4 flex items-center text-[#f49d1d] font-medium text-sm group-hover:gap-2 transition-all">
                                        <span>Access</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                    {/* Admin card with dropdown */}
                    <div className="relative" ref={adminDropdownRef}>
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8 h-full flex flex-col transition-all duration-200 hover:shadow-sm hover:border-slate-300"
                            style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)', backgroundColor: '#ffffff' }}
                        >
                            <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                                <ShieldCheck className="text-red-500" size={28} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-900 mb-2">Admin</h3>
                            <p className="text-slate-600 dark:text-slate-600 text-sm leading-relaxed flex-1">
                                Access admin panel and management tools.
                            </p>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
                                >
                                    <span>Admin</span>
                                    <ChevronDown size={16} className={`transition-transform ${adminDropdownOpen ? "rotate-180" : ""}`} />
                                </button>
                                {adminDropdownOpen && (
                                    <div className="absolute left-6 right-6 mt-2 bg-white dark:bg-white rounded-lg shadow-lg border border-slate-200 dark:border-slate-300 py-1 z-10">
                                        <Link
                                            href="/admin"
                                            onClick={() => setAdminDropdownOpen(false)}
                                            className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-50 transition"
                                        >
                                            Go to Admin
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Section (Optional) */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6"
                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                    >
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Plans</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-900 mb-3">
                            {isLoadingPlans ? "-" : savedPlansCount}
                        </p>
                        <div className="mb-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-[#f49d1d] to-[#e88a0f] h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((savedPlansCount / 10) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            {savedPlansCount} / 10 saved income plans
                        </p>
                    </div>
                    <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6"
                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                    >
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Reports Generated</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-900">-</p>
                        <p className="text-xs text-slate-500 mt-2">Financial reports</p>
                    </div>
                    <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6"
                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                    >
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Last Activity</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-900">-</p>
                        <p className="text-xs text-slate-500 mt-2">Recent activity</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
