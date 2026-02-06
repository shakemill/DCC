import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function ProductUniverseLayout({ children }) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
