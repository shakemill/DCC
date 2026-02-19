import Link from "next/link"

export const metadata = {
  title: "Coming Very Soon | Digital Credit Compass",
  description: "We're building something great. Stay tuned.",
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
      <div className="max-w-xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
          Coming Very Soon
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          We&apos;re building something great. Stay tuned.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
          Digital Credit Compass is an independent planning and analysis platform for Bitcoin-backed, fiat, and stablecoin income structures. We&apos;ll be launching soon.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#f49d1d] hover:bg-[#d6891a] text-white font-medium transition"
        >
          Contact us
        </Link>
      </div>
    </div>
  )
}
