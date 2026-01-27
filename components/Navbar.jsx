"use client";
import { navLinks } from "@/data/navLinks";
import { MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useThemeContext } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import UserDropdown from "./UserDropdown";
import FeaturesDropdown from "./FeaturesDropdown";

export default function Navbar() {
    const [openMobileMenu, setOpenMobileMenu] = useState(false);
    const [currentHash, setCurrentHash] = useState("");
    const { theme } = useThemeContext();
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        if (openMobileMenu) {
            document.body.classList.add("max-md:overflow-hidden");
        } else {
            document.body.classList.remove("max-md:overflow-hidden");
        }
    }, [openMobileMenu]);

    useEffect(() => {
        // Get initial hash
        if (typeof window !== "undefined") {
            setCurrentHash(window.location.hash);
        }

        // Listen for hash changes
        const handleHashChange = () => {
            setCurrentHash(window.location.hash);
        };

        // Also check hash on scroll (for smooth scrolling)
        const handleScroll = () => {
            if (pathname === "/") {
                const sections = ["pricing", "faq"];
                let foundSection = false;
                for (const section of sections) {
                    const element = document.getElementById(section);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        const offset = 150; // Offset for navbar
                        if (rect.top <= offset && rect.bottom >= offset) {
                            setCurrentHash(`#${section}`);
                            foundSection = true;
                            break;
                        }
                    }
                }
                // If no section is visible and we're near the top, clear hash
                if (!foundSection && window.scrollY < 200) {
                    setCurrentHash("");
                }
            }
        };

        window.addEventListener("hashchange", handleHashChange);
        window.addEventListener("scroll", handleScroll, { passive: true });
        
        // Check on mount and after a short delay to catch initial scroll position
        setTimeout(handleScroll, 100);
        
        return () => {
            window.removeEventListener("hashchange", handleHashChange);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [pathname]);

    return (
        <nav className={`flex items-center justify-between fixed z-50 top-0 w-full px-6 md:px-16 lg:px-24 xl:px-32 py-[26px] ${openMobileMenu ? '' : 'backdrop-blur'}`}>
            <Link href={user ? "/dashboard" : "/"}>
                <Image className="h-9 md:h-9.5 w-auto shrink-0" src={theme === "dark" ? "/assets/logo-light.svg" : "/assets/logo.png"} alt="Logo" width={200} height={76} priority fetchPriority="high" />
            </Link>
            <div className="hidden items-center md:gap-8 lg:gap-9 md:flex lg:pl-20">
                {navLinks.map((link) => {
                    // Replace "Home" with "Dashboard" if user is logged in
                    const displayName = (link.name === "Home" && user) ? "Dashboard" : link.name;
                    const displayHref = (link.href === "/" && user) ? "/dashboard" : link.href;
                    
                    // Features menu is visible for all users
                    if (link.name === "Features" && link.submenu) {
                        return <FeaturesDropdown key={link.name} />;
                    }
                    // Handle anchor links - redirect to home page with anchor
                    const href = displayHref.startsWith("#") ? `/${displayHref}` : displayHref;
                    let isActive = false;
                    if (displayHref === "/" || displayHref === "/dashboard") {
                        // Home/Dashboard is active if on the corresponding page and no hash
                        if (user) {
                            isActive = pathname === "/dashboard" && (!currentHash || currentHash === "");
                        } else {
                            isActive = pathname === "/" && (!currentHash || currentHash === "");
                        }
                    } else if (displayHref.startsWith("#")) {
                        // For anchor links, only active if on home page AND hash matches
                        isActive = pathname === "/" && (currentHash === displayHref || currentHash === displayHref.toLowerCase());
                    } else {
                        isActive = pathname.startsWith(displayHref);
                    }
                    return (
                        <Link 
                            key={link.name} 
                            href={href} 
                            className={`hover:text-slate-600 dark:hover:text-slate-300 ${isActive ? 'font-bold' : ''}`}
                            onClick={() => {
                                // Clear hash when clicking Home/Dashboard
                                if ((displayHref === "/" || displayHref === "/dashboard") && typeof window !== "undefined") {
                                    setCurrentHash("");
                                    if (user) {
                                        window.history.replaceState(null, "", "/dashboard");
                                    } else {
                                        window.history.replaceState(null, "", "/");
                                    }
                                }
                                // Update hash immediately when clicking anchor links
                                if (displayHref.startsWith("#") && typeof window !== "undefined") {
                                    setTimeout(() => {
                                        setCurrentHash(window.location.hash);
                                    }, 100);
                                }
                            }}
                        >
                            {displayName}
                        </Link>
                    );
                })}
            </div>
            {/* Mobile menu */}
            <div className={`fixed inset-0 flex flex-col items-center justify-center gap-6 text-lg font-medium bg-white/60 dark:bg-white/60 backdrop-blur-md md:hidden transition duration-300 ${openMobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
                {navLinks.map((link) => {
                    // Features menu is visible for all users
                    if (link.name === "Features" && link.submenu) {
                        return (
                            <div key={link.name} className="flex flex-col items-center gap-2">
                                <span className="font-semibold">{link.name}</span>
                                {link.submenu.map((subItem) => {
                                    const isActive = pathname.startsWith(subItem.href);
                                    return (
                                        <Link
                                            key={subItem.name}
                                            href={subItem.href}
                                            className={`text-sm ${isActive ? 'font-bold text-[#f49d1d]' : ''}`}
                                            onClick={() => setOpenMobileMenu(false)}
                                        >
                                            {subItem.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    }
                    // Replace "Home" with "Dashboard" if user is logged in
                    const displayName = (link.name === "Home" && user) ? "Dashboard" : link.name;
                    const displayHref = (link.href === "/" && user) ? "/dashboard" : link.href;
                    
                    // Handle anchor links - redirect to home page with anchor
                    const href = displayHref.startsWith("#") ? `/${displayHref}` : displayHref;
                    let isActive = false;
                    if (displayHref === "/" || displayHref === "/dashboard") {
                        // Home/Dashboard is active if on the corresponding page and no hash
                        if (user) {
                            isActive = pathname === "/dashboard" && (!currentHash || currentHash === "");
                        } else {
                            isActive = pathname === "/" && (!currentHash || currentHash === "");
                        }
                    } else if (displayHref.startsWith("#")) {
                        // For anchor links, only active if on home page AND hash matches
                        isActive = pathname === "/" && (currentHash === displayHref || currentHash === displayHref.toLowerCase());
                    } else {
                        isActive = pathname.startsWith(displayHref);
                    }
                    return (
                        <Link 
                            key={link.name} 
                            href={href}
                            className={isActive ? 'font-bold' : ''}
                            onClick={() => {
                                setOpenMobileMenu(false);
                                // Clear hash when clicking Home/Dashboard
                                if ((displayHref === "/" || displayHref === "/dashboard") && typeof window !== "undefined") {
                                    setCurrentHash("");
                                    if (user) {
                                        window.history.replaceState(null, "", "/dashboard");
                                    } else {
                                        window.history.replaceState(null, "", "/");
                                    }
                                }
                                // Update hash immediately when clicking anchor links
                                if (displayHref.startsWith("#") && typeof window !== "undefined") {
                                    setTimeout(() => {
                                        setCurrentHash(window.location.hash);
                                    }, 100);
                                }
                            }}
                        >
                            {displayName}
                        </Link>
                    );
                })}
                {user ? (
                    <>
                        <Link href="/profile" onClick={() => setOpenMobileMenu(false)}>
                            Profile
                        </Link>
                        <button
                            onClick={() => {
                                if (typeof window !== "undefined") {
                                    localStorage.removeItem("user")
                                }
                                setOpenMobileMenu(false)
                                window.location.href = "/"
                            }}
                            className="text-red-600"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" onClick={() => setOpenMobileMenu(false)}>
                            Sign in
                        </Link>
                        <Link href="/get-started" onClick={() => setOpenMobileMenu(false)} className="px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] transition text-white rounded-md">
                            Get started
                        </Link>
                    </>
                )}
                <button className="aspect-square size-10 p-1 items-center justify-center bg-[#f49d1d] hover:bg-[#d6891a] transition text-white rounded-md flex" onClick={() => setOpenMobileMenu(false)}>
                    <XIcon />
                </button>
            </div>
            <div className="flex items-center gap-4">
                {user ? (
                    <UserDropdown />
                ) : (
                    <>
                        <Link href="/login" className="hidden md:block hover:bg-slate-100 dark:hover:bg-[#b87718] transition px-4 py-2 border border-[#f49d1d] rounded-md">
                            Sign in
                        </Link>
                        <Link href="/get-started" className="hidden md:block px-4 py-2 bg-[#f49d1d] hover:bg-[#d6891a] transition text-white rounded-md">
                            Get started
                        </Link>
                    </>
                )}
                <button onClick={() => setOpenMobileMenu(!openMobileMenu)} className="md:hidden">
                    <MenuIcon size={26} className="active:scale-90 transition" />
                </button>
            </div>
        </nav>
    );
}