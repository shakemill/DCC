import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function IncomePlannersLayout({ children }) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
