import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

export default function DisclosuresLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
