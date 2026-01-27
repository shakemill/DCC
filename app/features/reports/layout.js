import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"

export default function Layout({ children }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } }` }} />
      <div className="no-print">
        <Navbar />
      </div>
      {children}
      <div className="no-print">
        <Footer />
      </div>
    </>
  )
}
