import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

export default function TermsLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
