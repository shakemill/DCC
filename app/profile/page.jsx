"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import Breadcrumb from "@/components/Breadcrumb"
import { User } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    setFormData({
      name: user.name || "",
      email: user.email || "",
    })
  }, [user, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Full Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          email: formData.email,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage("Profile updated successfully!")
        // Update user in context
        if (typeof window !== "undefined") {
          const updatedUser = { ...user, ...data.user }
          localStorage.setItem("user", JSON.stringify(updatedUser))
          window.location.reload() // Reload to update context
        }
      } else {
        setMessage(data.error || "Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Profile update error:", error)
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

      return (
        <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <Breadcrumb 
                items={[
                  { label: "Profile", href: null }
                ]} 
              />
            </div>
            <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#f49d1d]/10 flex items-center justify-center">
              <User className="text-[#f49d1d]" size={24} />
            </div>
            <h1 className="text-3xl font-extrabold">Edit Profile</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Update your profile information
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-md ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-md border ${
                  errors.name
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 dark:border-slate-600 focus:border-[#f49d1d] focus:ring-[#f49d1d]"
                } focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-900 bg-white dark:bg-white`}
                placeholder="Enter your full name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-md border ${
                  errors.email
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-slate-300 dark:border-slate-600 focus:border-[#f49d1d] focus:ring-[#f49d1d]"
                } focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-900 bg-white dark:bg-white`}
                placeholder="Enter your email address"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#f49d1d] hover:bg-[#d6891a] disabled:bg-slate-400 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-md"
            >
              {isLoading ? "Updating..." : "Update Profile"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              <Link href="/" className="text-[#f49d1d] hover:underline font-medium">
                Back to home
              </Link>
            </p>
          </div>
            </div>
          </div>
        </div>
      )
}
