import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import Link from "next/link"

export default function AdminLayout({ children }) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              ← Back to Dashboard
            </Link>
          </div>
          {children}
        </div>
      </div>
      <Footer />
    </>
  )
}
