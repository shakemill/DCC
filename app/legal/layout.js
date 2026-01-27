import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

export default function LegalLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
