import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeContextProvider } from "@/context/ThemeContext";
import { AuthContextProvider } from "@/context/AuthContext";
import LenisScroll from "@/components/Lenis";
import CookieBanner from "@/components/CookieBanner";
import InactivityModal from "@/components/InactivityModal";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import ComingSoonGate from "@/components/ComingSoonGate";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

export const metadata = {
    title: "Digital Credit Compass - Bitcoin Income Planning & Analysis",
    description: "Digital Credit Compass (DCC) is an independent planning and analysis platform that enables users to simulate and compare Bitcoin-backed, fiat, and stablecoin income structures using standardized risk scoring, scenario modeling, and suitability-ready reports — without custody, without execution, and without selling Bitcoin.",
    icons: {
        icon: "/favicon.ico",
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <ThemeContextProvider>
                    <AuthContextProvider>
                        <ComingSoonGate>
                        <AnalyticsTracker />
                        <LenisScroll />
                        {children}
                        <CookieBanner />
                        <InactivityModal />
                        </ComingSoonGate>
                    </AuthContextProvider>
                </ThemeContextProvider>
            </body>
        </html>
    );
}