"use client"

import ProtectedFeature from "@/components/ProtectedFeature"
import Breadcrumb from "@/components/Breadcrumb"

export default function ReportsPage() {
  return (
    <ProtectedFeature featureName="Reports">
      <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
        <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
          <Breadcrumb items={[{ label: "Features", href: null }, { label: "Reports", href: null }]} />
        </div>
        <h2 className="mt-4 md:mt-8 text-4xl font-bold max-w-4xl leading-tight">Reports</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
          Access and download your reports. Generate Suitability, Income, Risk, and Comparison reports; data is frozen at creation and stored in the database.
        </p>
      </div>
    </ProtectedFeature>
  )
}
