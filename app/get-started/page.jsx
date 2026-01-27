"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserPlus, Eye, EyeOff } from "lucide-react"

export default function GetStartedPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    // Clear error when user starts typing
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

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the privacy policy & terms"
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      let data
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response:", text.substring(0, 200))
        console.error("Response status:", response.status)
        console.error("Response URL:", response.url)
        setMessage("Server error. Please check the console for details or try again later.")
        return
      }

      try {
        data = await response.json()
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError)
        const text = await response.text()
        console.error("Response text:", text.substring(0, 500))
        setMessage("Server returned invalid response. Please try again.")
        return
      }

      if (response.ok && data.success) {
        setMessage("Registration successful! Please check your email to verify your account.")
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          agreeToTerms: false,
        })
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } else {
        setMessage(data.error || "Registration failed. Please try again.")
      }
    } catch (error) {
      console.error("Registration error:", error)
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 md:py-32 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-white rounded-xl shadow-sm p-8 border border-slate-200/30 dark:border-slate-700/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#f49d1d]/10 flex items-center justify-center">
              <UserPlus className="text-[#f49d1d]" size={24} />
            </div>
            <h1 className="text-3xl font-extrabold">Get Started</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Create your account to get started
          </p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-md ${
                message.includes("successful")
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
                Email Address (Login)
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-10 rounded-md border ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 dark:border-slate-600 focus:border-[#f49d1d] focus:ring-[#f49d1d]"
                  } focus:outline-none focus:ring-2 text-slate-900 dark:text-slate-900 bg-white dark:bg-white`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Agree to Terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    formData.agreeToTerms 
                      ? 'bg-[#f49d1d] border-[#f49d1d]' 
                      : 'bg-white border-slate-300 group-hover:border-[#f49d1d]'
                  } ${errors.agreeToTerms ? 'border-red-500' : ''}`}>
                    {formData.agreeToTerms && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                  I agree to{" "}
                  <Link href="/privacy" className="text-[#f49d1d] hover:underline font-medium">
                    privacy policy
                  </Link>{" "}
                  &{" "}
                  <Link href="/terms" className="text-[#f49d1d] hover:underline font-medium">
                    terms
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && <p className="mt-1 text-sm text-red-600">{errors.agreeToTerms}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#f49d1d] hover:bg-[#d6891a] disabled:bg-slate-400 disabled:cursor-not-allowed transition text-white font-semibold py-3 rounded-md"
            >
              {isLoading ? "Creating Account..." : "Register"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-[#f49d1d] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
