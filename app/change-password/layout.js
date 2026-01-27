import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function ChangePasswordLayout({ children }) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
