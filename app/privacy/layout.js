import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

export default function PrivacyLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
