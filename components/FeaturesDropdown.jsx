"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { navLinks } from "@/data/navLinks"

export default function FeaturesDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const pathname = usePathname()
  
  const featuresLink = navLinks.find(link => link.name === "Features")
  const submenu = featuresLink?.submenu || []

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Check if any submenu item is active
  const isActive = submenu.some(item => pathname.startsWith(item.href))

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 ${isActive ? 'font-bold' : ''}`}
      >
        <span>Features</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-white rounded-md shadow-sm border border-slate-200 dark:border-slate-700 py-1 z-50">
          {submenu.map((item) => {
            const itemIsActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 text-sm transition ${
                  itemIsActive
                    ? "bg-[#f49d1d]/10 text-[#f49d1d] font-semibold"
                    : "text-slate-700 dark:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-50"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
