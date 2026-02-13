"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Save, Clock, Eye, Trash2, ChevronDown, ChevronUp, AlertTriangle, X, Coins, DollarSign, CircleDollarSign, Info, RefreshCw, LayoutList, Calendar, CalendarDays, Award, TrendingUp, Wallet, Percent, Trophy, Activity, Droplets, Building2 } from "lucide-react";
import { parseApy } from "@/lib/parseApy";
import { getStablecoinTopProvidersCache, setStablecoinTopProvidersCache } from "@/lib/stablecoinCache";
import { getFiatTopProvidersCache, setFiatTopProvidersCache } from "@/lib/fiatCache";
import ProtectedFeature from "@/components/ProtectedFeature";
import Breadcrumb from "@/components/Breadcrumb";

function formatScoreBreakdownTooltip(jsonStr) {
    try {
        const b = jsonStr ? JSON.parse(jsonStr) : null;
        if (!b || typeof b !== "object") return undefined;
        const labels = ["Transparency", "Risk Control", "Jurisdiction", "Structure", "Track Record"];
        const keys = ["transparency", "riskControl", "jurisdiction", "structure", "trackRecord"];
        return labels.map((l, i) => `${l}: ${b[keys[i]] ?? "—"}`).join("\n");
    } catch {
        return undefined;
    }
}

export default function IncomePlannersPage() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        capital: "",
        incomeObjective: "",
        currency: "USD",
        riskTolerance: 30,
    });
    const [savedPlans, setSavedPlans] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [showAllPlans, setShowAllPlans] = useState(false);
    const [deletingPlanId, setDeletingPlanId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ show: false, planId: null });
    const [activeTab, setActiveTab] = useState("btc");
    
    // BTC Income Planner state
    const [btcPlanner, setBtcPlanner] = useState({
        totalNeed12m: "",
        btcPrice: "40000",
        ltv: 50,
        marginCallLtv: 75,
        liquidationLtv: 85,
    });
    const [hoveredLtv, setHoveredLtv] = useState(null);
    const [btcPlannerSaves, setBtcPlannerSaves] = useState([]);
    const [btcSaveMessage, setBtcSaveMessage] = useState("");
    const [btcDeleteConfirmId, setBtcDeleteConfirmId] = useState(null);
    const [btcPriceLoading, setBtcPriceLoading] = useState(false);

    // Fiat Income Planner state (same design as Stablecoin: Capital, Duration, Scenario type)
    const [fiatPlanner, setFiatPlanner] = useState({
        capital: 100000,
        durationMonths: 12,
        scenarioType: "Modelled",
    });
    const [fiatTopProviders, setFiatTopProviders] = useState([]);
    const [fiatTopProvidersLoading, setFiatTopProvidersLoading] = useState(false);
    const [fiatTopProvidersError, setFiatTopProvidersError] = useState(null);
    const [fiatProvidersCached, setFiatProvidersCached] = useState(false);
    const [fiatUserInstruments, setFiatUserInstruments] = useState([]);
    const [fiatUserInstrumentsLoading, setFiatUserInstrumentsLoading] = useState(false);
    const [fiatPlannerSaves, setFiatPlannerSaves] = useState([]);
    const [fiatSaveMessage, setFiatSaveMessage] = useState("");
    const [fiatDeleteConfirmId, setFiatDeleteConfirmId] = useState(null);

    // Stablecoin Income Planner state (DCC – Stable Income Planner)
    const [stablecoinPlanner, setStablecoinPlanner] = useState({
        capital: 100000,
        baseStablecoin: "USDC",
        durationMonths: 12,
        scenarioType: "Modelled",
    });
    const [stablecoinTopProviders, setStablecoinTopProviders] = useState({
        collateralisedLending: [],
        cefiSavings: [],
    });
    const [stablecoinTopProvidersLoading, setStablecoinTopProvidersLoading] = useState(false);
    const [stablecoinTopProvidersError, setStablecoinTopProvidersError] = useState(null);
    const [stablecoinProvidersCached, setStablecoinProvidersCached] = useState(false);
    const [stablecoinUserInstruments, setStablecoinUserInstruments] = useState([]);
    const [stablecoinUserInstrumentsLoading, setStablecoinUserInstrumentsLoading] = useState(false);

    // Bitcoin price (you can fetch this from an API later)
    const bitcoinPrice = 40000; // Default price, can be updated with API

    // Calculate LTV based on risk tolerance percentage
    const getLTV = (riskTolerance) => {
        return riskTolerance; // LTV = risk tolerance percentage directly
    };

    // Calculate required collateral
    const calculateCollateral = () => {
        if (!formData.capital || parseFloat(formData.capital) <= 0) return null;
        
        const loanAmount = parseFloat(formData.capital);
        const ltv = getLTV(formData.riskTolerance) / 100;
        
        // Required collateral with 2% buffer for safety
        const requiredCollateralUSD = (loanAmount / ltv) * 1.02;
        const requiredCollateralBTC = requiredCollateralUSD / bitcoinPrice;
        
        return {
            loanAmount,
            ltv: getLTV(formData.riskTolerance),
            requiredCollateralUSD,
            requiredCollateralBTC,
            bitcoinPrice
        };
    };

    const results = calculateCollateral();

    // Load saved plans on mount
    useEffect(() => {
        loadSavedPlans();
    }, [user]);

    // Fetch BTC price from CoinGecko when BTC tab is active
    useEffect(() => {
        if (activeTab === "btc") {
            fetchBtcPrice();
        }
    }, [activeTab]);

    // Load stablecoin top providers from cookie cache when switching to stablecoin tab or changing base stablecoin
    useEffect(() => {
        if (activeTab === "stablecoin") {
            const base = stablecoinPlanner.baseStablecoin || "USDC";
            const cached = getStablecoinTopProvidersCache(base);
            setStablecoinProvidersCached(!!cached);
            setStablecoinTopProviders(
                cached
                    ? { collateralisedLending: cached.collateralisedLending, cefiSavings: cached.cefiSavings }
                    : { collateralisedLending: [], cefiSavings: [] }
            );
        }
    }, [activeTab, stablecoinPlanner.baseStablecoin]);

    // User defined scenario: fetch all stablecoin products
    useEffect(() => {
        if (activeTab !== "stablecoin" || stablecoinPlanner.scenarioType !== "User defined") return;
        let cancelled = false;
        setStablecoinUserInstrumentsLoading(true);
        fetch("/api/stablecoin-products")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data.success || !Array.isArray(data.products)) return;
                const mapped = (data.products || []).map((p) => ({
                    id: p.id,
                    issuer: p.issuer || "—",
                    product: p.product || "—",
                    apy: p.apy,
                    category: p.category || "—",
                    qualityScore: p.qualityScore,
                    qualityScoreBreakdown: p.qualityScoreBreakdown,
                    selected: false,
                    weight: 0,
                }));
                setStablecoinUserInstruments((prev) => {
                    const byId = new Map(prev.map((item) => [item.id, item]));
                    return mapped.map((m) => {
                        const old = byId.get(m.id);
                        return old ? { ...m, selected: old.selected, weight: old.weight } : m;
                    });
                });
            })
            .catch(() => { if (!cancelled) setStablecoinUserInstruments([]); })
            .finally(() => { if (!cancelled) setStablecoinUserInstrumentsLoading(false); });
        return () => { cancelled = true; };
    }, [activeTab, stablecoinPlanner.scenarioType]);

    // Fiat Income Planner: load top providers from cache when switching to fiat tab (Modelled)
    useEffect(() => {
        if (activeTab === "fiat" && fiatPlanner.scenarioType === "Modelled") {
            const cached = getFiatTopProvidersCache();
            setFiatProvidersCached(Array.isArray(cached) && cached.length > 0);
            setFiatTopProviders(cached || []);
        }
    }, [activeTab, fiatPlanner.scenarioType]);

    // Fiat Income Planner: fetch all products when User defined
    useEffect(() => {
        if (activeTab !== "fiat" || fiatPlanner.scenarioType !== "User defined") return;
        let cancelled = false;
        setFiatUserInstrumentsLoading(true);
        fetch("/api/usd-income")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data.success || !Array.isArray(data.products)) return;
                const mapped = (data.products || []).map((p) => ({
                    id: p.id,
                    issuer: p.issuer || "—",
                    product: p.product || "—",
                    ticker: p.ticker || "—",
                    type: p.type || "—",
                    apyDistribution: p.apyDistribution,
                    qualityScore: p.qualityScore,
                    qualityScoreBreakdown: p.qualityScoreBreakdown,
                    selected: false,
                    weight: 0,
                }));
                setFiatUserInstruments((prev) => {
                    const byId = new Map(prev.map((item) => [item.id, item]));
                    return mapped.map((m) => {
                        const old = byId.get(m.id);
                        return old ? { ...m, selected: old.selected, weight: old.weight } : m;
                    });
                });
            })
            .catch(() => { if (!cancelled) setFiatUserInstruments([]); })
            .finally(() => { if (!cancelled) setFiatUserInstrumentsLoading(false); });
        return () => { cancelled = true; };
    }, [activeTab, fiatPlanner.scenarioType]);

    const FIAT_PLANNER_STORAGE_KEY = "dcc_fiat_planner_saves";
    const BTC_PLANNER_STORAGE_KEY = "dcc_btc_planner_saves";
    useEffect(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem(FIAT_PLANNER_STORAGE_KEY) : null;
            if (raw) {
                const parsed = JSON.parse(raw);
                setFiatPlannerSaves(Array.isArray(parsed) ? parsed : []);
            }
        } catch (_) {
            setFiatPlannerSaves([]);
        }
    }, []);
    useEffect(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem(BTC_PLANNER_STORAGE_KEY) : null;
            if (raw) {
                const parsed = JSON.parse(raw);
                setBtcPlannerSaves(Array.isArray(parsed) ? parsed : []);
            }
        } catch (_) {
            setBtcPlannerSaves([]);
        }
    }, []);
    const fetchBtcPrice = async () => {
        setBtcPriceLoading(true);
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            if (!response.ok) {
                throw new Error('Failed to fetch BTC price');
            }
            const data = await response.json();
            if (data.bitcoin && data.bitcoin.usd) {
                setBtcPlanner(prev => ({
                    ...prev,
                    btcPrice: Math.round(data.bitcoin.usd).toString()
                }));
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn("Error fetching BTC price from CoinGecko:", error.message);
            }
            // Keep default value if fetch fails
        } finally {
            setBtcPriceLoading(false);
        }
    };

    const loadSavedPlans = async () => {
        if (!user) return;
        
        setIsLoadingPlans(true);
        try {
            const response = await fetch(`/api/income-plans?userId=${user.id}`);
            if (!response.ok) {
                throw new Error(`Failed to load plans: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                setSavedPlans(data.plans || []);
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn("Error loading plans:", error.message);
            }
            setSavedPlans([]);
        } finally {
            setIsLoadingPlans(false);
        }
    };

    const handleSavePlan = async () => {
        if (!results) {
            setSaveMessage("Please fill in the form to save a plan.");
            setTimeout(() => setSaveMessage(""), 3000);
            return;
        }

        if (!user) {
            setSaveMessage("Please log in to save your plan.");
            setTimeout(() => setSaveMessage(""), 3000);
            return;
        }

        setIsSaving(true);
        setSaveMessage("");

        try {
            // Ensure all numeric values are properly formatted
            const planData = {
                userId: user.id,
                loanAmount: parseFloat(results.loanAmount.toFixed(2)),
                incomeObjective: formData.incomeObjective ? parseFloat(parseFloat(formData.incomeObjective).toFixed(2)) : null,
                currency: formData.currency,
                riskTolerance: parseInt(formData.riskTolerance),
                ltv: parseFloat(results.ltv.toFixed(2)),
                collateralUSD: parseFloat(results.requiredCollateralUSD.toFixed(2)),
                collateralBTC: parseFloat(results.requiredCollateralBTC.toFixed(8)),
                bitcoinPrice: parseFloat(results.bitcoinPrice.toFixed(2)),
            };

            if (process.env.NODE_ENV === 'development') {
                console.log("Saving plan with data:", planData);
            }

            const response = await fetch("/api/income-plans", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(planData),
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            let data = {};
            
            try {
                if (contentType && contentType.includes("application/json")) {
                    const jsonData = await response.json();
                    data = jsonData || {};
                } else {
                    const text = await response.text();
                    if (process.env.NODE_ENV === 'development') {
                        console.warn("Non-JSON response:", text.substring(0, 200));
                    }
                    throw new Error("Server returned non-JSON response. Please try again.");
                }
            } catch (parseError) {
                if (parseError.message.includes("non-JSON")) {
                    throw parseError;
                }
                // If JSON parsing fails, try to get error from response
                if (process.env.NODE_ENV === 'development') {
                    console.warn("Failed to parse response:", parseError);
                }
                throw new Error("Failed to parse server response. Please try again.");
            }

            if (response.ok && data.success) {
                setSaveMessage("Plan saved successfully!");
                loadSavedPlans(); // Reload plans
                setTimeout(() => setSaveMessage(""), 3000);
            } else {
                const errorMessage = data.error || data.message || "Failed to save plan.";
                if (process.env.NODE_ENV === 'development' && Object.keys(data).length > 0) {
                    console.warn("Save plan error:", data);
                }
                setSaveMessage(errorMessage);
                setTimeout(() => setSaveMessage(""), 3000);
            }
        } catch (error) {
            const errorMessage = error.message || "An error occurred while saving the plan.";
            if (process.env.NODE_ENV === 'development') {
                console.warn("Error saving plan:", errorMessage);
            }
            setSaveMessage(errorMessage);
            setTimeout(() => setSaveMessage(""), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadPlan = (plan) => {
        setFormData({
            capital: plan.loanAmount.toString(),
            incomeObjective: plan.incomeObjective ? plan.incomeObjective.toString() : "",
            currency: plan.currency,
            riskTolerance: plan.riskTolerance,
        });
        setSaveMessage("Plan loaded successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
    };

    const handleDeletePlan = async (planId) => {
        setConfirmDelete({ show: true, planId });
    };

    const confirmDeletePlan = async () => {
        const planIdToDelete = confirmDelete.planId;
        if (!planIdToDelete) {
            if (process.env.NODE_ENV === 'development') {
                console.warn("No plan ID to delete");
            }
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log("Deleting plan with ID:", planIdToDelete);
        }

        setDeletingPlanId(planIdToDelete);
        setConfirmDelete({ show: false, planId: null });
        
        try {
            const deleteUrl = `/api/income-plans/${planIdToDelete}`;
            if (process.env.NODE_ENV === 'development') {
                console.log("DELETE request to:", deleteUrl);
            }
            
            const response = await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (process.env.NODE_ENV === 'development') {
                console.log("Delete response status:", response.status);
            }

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            let data = {};
            
            try {
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    if (process.env.NODE_ENV === 'development') {
                        console.warn("Non-JSON response:", text.substring(0, 200));
                    }
                    throw new Error("Server returned non-JSON response");
                }
            } catch (parseError) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn("Failed to parse response:", parseError);
                }
                throw new Error("Failed to parse server response");
            }

            if (response.ok && data.success) {
                setSaveMessage("Plan deleted successfully!");
                loadSavedPlans(); // Reload plans
                setTimeout(() => setSaveMessage(""), 3000);
            } else {
                const errorMessage = data.error || data.message || "Failed to delete plan.";
                if (process.env.NODE_ENV === 'development') {
                    console.warn("Delete plan error:", data);
                }
                setSaveMessage(errorMessage);
                setTimeout(() => setSaveMessage(""), 3000);
            }
        } catch (error) {
            const errorMessage = error.message || "An error occurred while deleting the plan.";
            if (process.env.NODE_ENV === 'development') {
                console.warn("Error deleting plan:", errorMessage);
            }
            setSaveMessage(errorMessage);
            setTimeout(() => setSaveMessage(""), 3000);
        } finally {
            setDeletingPlanId(null);
        }
    };

    const cancelDelete = () => {
        setConfirmDelete({ show: false, planId: null });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const getCurrencySymbol = (currency) => {
        const symbols = {
            BTC: "₿",
            USD: "$",
            USDT: "$",
            USDC: "$"
        };
        return symbols[currency] || "";
    };

    const getRiskLevel = (value) => {
        if (value <= 50) return { label: "Low Risk", color: "green", bgColor: "#22c55e", textColor: "text-green-700", badgeBg: "bg-green-100" };
        if (value <= 65) return { label: "Med Risk", color: "orange", bgColor: "#f97316", textColor: "text-orange-700", badgeBg: "bg-orange-100" };
        return { label: "High Risk", color: "red", bgColor: "#ef4444", textColor: "text-red-700", badgeBg: "bg-red-100" };
    };

    // BTC Income Planner calculations
    const calculateBtcPlanner = () => {
        const totalNeed12m = parseFloat(btcPlanner.totalNeed12m) || 0;
        const btcPrice = parseFloat(btcPlanner.btcPrice) || 40000;
        const ltv = btcPlanner.ltv / 100;
        const marginCallLtv = btcPlanner.marginCallLtv / 100;
        const liquidationLtv = btcPlanner.liquidationLtv / 100;

        if (totalNeed12m <= 0 || btcPrice <= 0) return null;

        // Monthly targets
        const targetedMonthlyIncome = totalNeed12m / 12;

        // BTC required at current LTV
        const btcRequired = totalNeed12m / (btcPrice * ltv);

        // Threshold prices
        const marginCallPrice = totalNeed12m / (btcRequired * marginCallLtv);
        const liquidationPrice = totalNeed12m / (btcRequired * liquidationLtv);

        // Risk indicator
        const riskIndicator = ltv <= 0.5 ? "green" : ltv <= 0.75 ? "amber" : "red";

        // Scenario Risk Index (SRI)
        const sri = Math.min(100 * Math.pow(ltv / liquidationLtv, 2), 100);
        const sriLevel = sri <= 40 ? "lower" : sri <= 70 ? "moderate" : "high";

        // LTV comparison table
        const ltvComparison = [10, 25, 50, 75, 85].map(ltvPercent => {
            const ltvVal = ltvPercent / 100;
            const btcReq = totalNeed12m / (btcPrice * ltvVal);
            const marginPrice = totalNeed12m / (btcReq * marginCallLtv);
            const liqPrice = totalNeed12m / (btcReq * liquidationLtv);
            const risk = ltvPercent <= 50 ? "green" : ltvPercent <= 75 ? "amber" : "red";
            return {
                ltv: ltvPercent,
                btcRequired: btcReq,
                marginCallPrice: marginPrice,
                liquidationPrice: liqPrice,
                risk
            };
        });

        return {
            targetedMonthlyIncome,
            btcRequired,
            marginCallPrice,
            liquidationPrice,
            riskIndicator,
            sri,
            sriLevel,
            ltvComparison
        };
    };

    const btcResults = calculateBtcPlanner();

    const handleBtcPlannerChange = (field, value) => {
        setBtcPlanner(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const fetchFiatTopProviders = async () => {
        const cached = getFiatTopProvidersCache();
        if (cached && cached.length > 0) {
            setFiatTopProviders(cached);
            setFiatTopProvidersError(null);
            setFiatProvidersCached(true);
            return;
        }
        setFiatTopProvidersLoading(true);
        setFiatTopProvidersError(null);
        try {
            const res = await fetch("/api/usd-income/select-top", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to select providers");
            const top = data.topProducts || [];
            setFiatTopProviders(top);
            setFiatTopProvidersCache(top);
            setFiatProvidersCached(true);
        } catch (e) {
            setFiatTopProvidersError(e?.message || "Failed to load providers");
            setFiatTopProviders([]);
            setFiatProvidersCached(false);
        } finally {
            setFiatTopProvidersLoading(false);
        }
    };

    const handleFiatPlannerChange = (field, value) => {
        setFiatPlanner((prev) => ({ ...prev, [field]: value }));
    };

    const handleFiatInstrumentToggle = (id) => {
        setFiatUserInstruments((prev) =>
            prev.map((instr) =>
                instr.id === id ? { ...instr, selected: !instr.selected, weight: !instr.selected ? 0 : instr.weight } : instr
            )
        );
    };

    const handleFiatWeightChange = (id, weight) => {
        setFiatUserInstruments((prev) =>
            prev.map((instr) => (instr.id === id ? { ...instr, weight: parseFloat(weight) || 0 } : instr))
        );
    };

    const fiatIncomeCalc = useMemo(() => {
        const capital = parseFloat(fiatPlanner.capital) || 0;
        const scenarioType = fiatPlanner.scenarioType || "Modelled";

        if (scenarioType === "User defined") {
            const selected = fiatUserInstruments.filter((i) => i.selected);
            const totalWeight = selected.reduce((sum, i) => sum + (i.weight || 0), 0);
            if (capital <= 0 || selected.length === 0 || Math.abs(totalWeight - 100) > 0.01) {
                return {
                    portfolioAPY: null,
                    expectedAnnualIncome: 0,
                    expectedMonthlyIncome: 0,
                    canCompute: false,
                    isUserDefined: true,
                    totalWeight,
                };
            }
            const portfolioAPY = selected.reduce((sum, i) => {
                const apyNum = parseApy(i.apyDistribution);
                return apyNum != null ? sum + (i.weight / 100) * apyNum : sum;
            }, 0);
            const expectedAnnualIncome = capital * (portfolioAPY / 100);
            const expectedMonthlyIncome = expectedAnnualIncome / 12;
            return {
                portfolioAPY,
                expectedAnnualIncome,
                expectedMonthlyIncome,
                canCompute: true,
                isUserDefined: true,
                totalWeight,
            };
        }

        const top = fiatTopProviders || [];
        const apyVals = top.map((p) => parseApy(p.apyDistribution)).filter((n) => n != null);
        const portfolioAPY = apyVals.length > 0 ? apyVals.reduce((a, b) => a + b, 0) / apyVals.length : null;
        const expectedAnnualIncome = portfolioAPY != null ? capital * (portfolioAPY / 100) : 0;
        const expectedMonthlyIncome = expectedAnnualIncome / 12;
        return {
            portfolioAPY,
            expectedAnnualIncome,
            expectedMonthlyIncome,
            canCompute: capital > 0 && portfolioAPY != null,
            isUserDefined: false,
            totalWeight: 100,
        };
    }, [fiatTopProviders, fiatPlanner.capital, fiatPlanner.scenarioType, fiatUserInstruments]);

    const persistFiatPlannerSaves = (list) => {
        setFiatPlannerSaves(list);
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(FIAT_PLANNER_STORAGE_KEY, JSON.stringify(list));
            }
        } catch (_) {}
    };

    const saveFiatPlannerOutput = () => {
        if (!fiatIncomeCalc?.canCompute) {
            setFiatSaveMessage("Fill in the fields and select instruments (100% weight) to get results.");
            setTimeout(() => setFiatSaveMessage(""), 3000);
            return;
        }
        const createdAt = new Date().toISOString();
        const save = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fiat-${Date.now()}`,
            createdAt,
            inputs: {
                capital: fiatPlanner.capital,
                durationMonths: fiatPlanner.durationMonths,
                scenarioType: fiatPlanner.scenarioType,
            },
            instruments: fiatUserInstruments.map((i) => ({ id: i.id, selected: i.selected, weight: i.weight ?? 0 })),
            outputs: {
                portfolioAPY: fiatIncomeCalc.portfolioAPY,
                expectedAnnualIncome: fiatIncomeCalc.expectedAnnualIncome,
                expectedMonthlyIncome: fiatIncomeCalc.expectedMonthlyIncome,
            },
        };
        setFiatPlannerSaves((prev) => {
            const next = [save, ...prev].slice(0, 20);
            try {
                if (typeof window !== "undefined") {
                    localStorage.setItem(FIAT_PLANNER_STORAGE_KEY, JSON.stringify(next));
                }
            } catch (_) {}
            return next;
        });
        setFiatSaveMessage("Scenario saved.");
        setTimeout(() => setFiatSaveMessage(""), 3000);
    };

    const recallFiatPlannerSave = (save) => {
        if (!save?.inputs) return;
        setFiatPlanner((prev) => ({ ...prev, ...save.inputs }));
        if (save.instruments?.length) {
            const byId = new Map(save.instruments.map((s) => [s.id, s]));
            setFiatUserInstruments((prev) =>
                prev.map((m) => {
                    const s = byId.get(m.id);
                    return s ? { ...m, selected: s.selected, weight: s.weight ?? 0 } : m;
                })
            );
        }
        setFiatSaveMessage("Scenario recalled.");
        setTimeout(() => setFiatSaveMessage(""), 3000);
    };

    const deleteFiatPlannerSave = (id) => {
        setFiatPlannerSaves((prev) => {
            const next = prev.filter((s) => s.id !== id);
            try {
                if (typeof window !== "undefined") {
                    localStorage.setItem(FIAT_PLANNER_STORAGE_KEY, JSON.stringify(next));
                }
            } catch (_) {}
            return next;
        });
        setFiatDeleteConfirmId(null);
    };

    const persistBtcPlannerSaves = (list) => {
        setBtcPlannerSaves(list);
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(BTC_PLANNER_STORAGE_KEY, JSON.stringify(list));
            }
        } catch (_) {}
    };
    const saveBtcPlannerScenario = () => {
        const createdAt = new Date().toISOString();
        const save = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `btc-${Date.now()}`,
            createdAt,
            inputs: { ...btcPlanner },
            outputs: btcResults ? { targetedMonthlyIncome: btcResults.targetedMonthlyIncome, btcRequired: btcResults.btcRequired, marginCallPrice: btcResults.marginCallPrice, liquidationPrice: btcResults.liquidationPrice } : null,
        };
        const next = [save, ...btcPlannerSaves].slice(0, 20);
        persistBtcPlannerSaves(next);
        setBtcSaveMessage("Scenario saved.");
        setTimeout(() => setBtcSaveMessage(""), 3000);
    };
    const recallBtcPlannerSave = (save) => {
        if (!save?.inputs) return;
        setBtcPlanner((prev) => ({ ...prev, ...save.inputs }));
        setBtcSaveMessage("Scenario recalled.");
        setTimeout(() => setBtcSaveMessage(""), 3000);
    };
    const deleteBtcPlannerSave = (id) => {
        persistBtcPlannerSaves(btcPlannerSaves.filter((s) => s.id !== id));
        setBtcDeleteConfirmId(null);
    };

    // Stable Income Planner: fetch top providers (cache 1 day in cookie to avoid ChatGPT API calls)
    const fetchStablecoinTopProviders = async () => {
        const base = stablecoinPlanner.baseStablecoin || "USDC";
        const cached = getStablecoinTopProvidersCache(base);
        if (cached) {
            setStablecoinTopProviders(cached);
            setStablecoinTopProvidersError(null);
            setStablecoinProvidersCached(true);
            return;
        }
        setStablecoinTopProvidersLoading(true);
        setStablecoinTopProvidersError(null);
        try {
            const res = await fetch("/api/stablecoin-products/select-top", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ baseStablecoin: base }),
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to select providers");
            }
            const lending = data.collateralisedLending || [];
            const cefi = data.cefiSavings || [];
            setStablecoinTopProviders({ collateralisedLending: lending, cefiSavings: cefi });
            setStablecoinTopProvidersCache(base, lending, cefi);
            setStablecoinProvidersCached(true);
        } catch (e) {
            setStablecoinTopProvidersError(e?.message || "Failed to load providers");
            setStablecoinTopProviders({ collateralisedLending: [], cefiSavings: [] });
            setStablecoinProvidersCached(false);
        } finally {
            setStablecoinTopProvidersLoading(false);
        }
    };

    const handleStablecoinPlannerChange = (field, value) => {
        setStablecoinPlanner((prev) => ({ ...prev, [field]: value }));
    };

    const handleStablecoinInstrumentToggle = (id) => {
        setStablecoinUserInstruments((prev) =>
            prev.map((instr) =>
                instr.id === id
                    ? { ...instr, selected: !instr.selected, weight: !instr.selected ? 0 : instr.weight }
                    : instr
            )
        );
    };

    const handleStablecoinWeightChange = (id, weight) => {
        setStablecoinUserInstruments((prev) =>
            prev.map((instr) =>
                instr.id === id ? { ...instr, weight: parseFloat(weight) || 0 } : instr
            )
        );
    };

    // Modelled: APYA/APYB from top providers, 70/30 fixed. User defined: sum(weight x APY) per selected instrument.
    const stablecoinIncomeCalc = useMemo(() => {
        const capital = parseFloat(stablecoinPlanner.capital) || 0;
        const scenarioType = stablecoinPlanner.scenarioType || "Modelled";

        if (scenarioType === "User defined") {
            const selected = stablecoinUserInstruments.filter((i) => i.selected);
            const totalWeight = selected.reduce((sum, i) => sum + (i.weight || 0), 0);
            if (capital <= 0 || selected.length === 0 || Math.abs(totalWeight - 100) > 0.01) {
                const defiPct = selected
                    .filter((i) => i.category === "collateralised_lending")
                    .reduce((s, i) => s + (i.weight || 0), 0);
                const cefiPct = selected
                    .filter((i) => i.category === "cefi_savings")
                    .reduce((s, i) => s + (i.weight || 0), 0);
                return {
                    APYA: null,
                    APYB: null,
                    portfolioAPY: null,
                    expectedAnnualIncome: 0,
                    expectedMonthlyIncome: 0,
                    canCompute: false,
                    isUserDefined: true,
                    totalWeight,
                    defiPct,
                    cefiPct,
                };
            }
            const defiSelected = selected.filter((i) => i.category === "collateralised_lending");
            const cefiSelected = selected.filter((i) => i.category === "cefi_savings");
            const defiContrib = defiSelected.reduce((sum, i) => {
                const apyNum = parseApy(i.apy);
                return sum + (apyNum != null ? (i.weight / 100) * (apyNum / 100) : 0);
            }, 0);
            const cefiContrib = cefiSelected.reduce((sum, i) => {
                const apyNum = parseApy(i.apy);
                return sum + (apyNum != null ? (i.weight / 100) * (apyNum / 100) : 0);
            }, 0);
            const defiAnnualIncome = capital * defiContrib;
            const cefiAnnualIncome = capital * cefiContrib;
            const expectedAnnualIncome = defiAnnualIncome + cefiAnnualIncome;
            const expectedMonthlyIncome = expectedAnnualIncome / 12;
            const portfolioAPY = selected.reduce((sum, i) => {
                const apyNum = parseApy(i.apy);
                return apyNum != null ? sum + (i.weight / 100) * apyNum : sum;
            }, 0);
            const defiPct = defiSelected.reduce((s, i) => s + (i.weight || 0), 0);
            const cefiPct = cefiSelected.reduce((s, i) => s + (i.weight || 0), 0);
            const defiApyVals = defiSelected.map((i) => parseApy(i.apy)).filter((n) => n != null);
            const cefiApyVals = cefiSelected.map((i) => parseApy(i.apy)).filter((n) => n != null);
            const APYA_avg = defiApyVals.length > 0 ? defiApyVals.reduce((a, b) => a + b, 0) / defiApyVals.length : null;
            const APYB_avg = cefiApyVals.length > 0 ? cefiApyVals.reduce((a, b) => a + b, 0) / cefiApyVals.length : null;
            return {
                APYA: APYA_avg,
                APYB: APYB_avg,
                portfolioAPY,
                expectedAnnualIncome,
                expectedMonthlyIncome,
                defiAnnualIncome,
                defiMonthlyIncome: defiAnnualIncome / 12,
                cefiAnnualIncome,
                cefiMonthlyIncome: cefiAnnualIncome / 12,
                canCompute: true,
                isUserDefined: true,
                totalWeight,
                defiPct,
                cefiPct,
            };
        }

        const lending = stablecoinTopProviders.collateralisedLending || [];
        const cefi = stablecoinTopProviders.cefiSavings || [];
        const apyAvals = lending.map((p) => parseApy(p.apy)).filter((n) => n != null);
        const apyBvals = cefi.map((p) => parseApy(p.apy)).filter((n) => n != null);
        const APYA = apyAvals.length > 0 ? apyAvals.reduce((a, b) => a + b, 0) / apyAvals.length : null;
        const APYB = apyBvals.length > 0 ? apyBvals.reduce((a, b) => a + b, 0) / apyBvals.length : null;
        const incomeA = APYA != null ? capital * 0.7 * (APYA / 100) : 0;
        const incomeB = APYB != null ? capital * 0.3 * (APYB / 100) : 0;
        const expectedAnnualIncome = incomeA + incomeB;
        const expectedMonthlyIncome = expectedAnnualIncome / 12;
        return {
            APYA,
            APYB,
            portfolioAPY: null,
            expectedAnnualIncome,
            expectedMonthlyIncome,
            defiAnnualIncome: incomeA,
            defiMonthlyIncome: incomeA / 12,
            cefiAnnualIncome: incomeB,
            cefiMonthlyIncome: incomeB / 12,
            canCompute: capital > 0 && (APYA != null || APYB != null),
            isUserDefined: false,
            totalWeight: 100,
            defiPct: 70,
            cefiPct: 30,
        };
    }, [
        stablecoinTopProviders,
        stablecoinPlanner.capital,
        stablecoinPlanner.scenarioType,
        stablecoinUserInstruments,
    ]);

    return (
        <ProtectedFeature featureName="Income Planners">
            <>
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32 pb-16 md:pb-20 bg-[url('/assets/light-hero-gradient.svg')] dark:bg-[url('/assets/dark-hero-gradient.svg')] bg-no-repeat bg-cover relative">
                    <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-full px-6 md:px-16 lg:px-24 xl:px-32">
                        <Breadcrumb 
                            items={[
                                { label: "Features", href: null },
                                { label: "Income Planners", href: null }
                            ]} 
                        />
                    </div>
                <h2 className="mt-4 md:mt-8 text-4xl md:text-4xl font-bold max-w-4xl leading-tight">
                    Income <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Planners</span>
                </h2>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl mt-6 leading-relaxed px-4">
                    Create your personalized income plan by defining your objectives and risk tolerance. Simulate and compare different income structures based on Bitcoin, fiat, and stablecoins.
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-8 mb-8 relative z-10">
                <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
                    {/* BTC Income Planner Tab */}
                    <button
                        onClick={() => setActiveTab("btc")}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
                            activeTab === "btc"
                                ? "bg-gradient-to-r from-[#f49d1d] to-[#e88a0f] text-white shadow-lg shadow-[#f49d1d]/30"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        }`}
                    >
                        <Coins size={20} className={activeTab === "btc" ? "text-white" : "text-[#f49d1d]"} />
                        <span className="text-xs md:text-sm">BTC Income Planner</span>
                    </button>

                    {/* Fiat Income Planner Tab */}
                    <button
                        onClick={() => setActiveTab("fiat")}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
                            activeTab === "fiat"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        }`}
                    >
                        <DollarSign size={20} className={activeTab === "fiat" ? "text-white" : "text-blue-500"} />
                        <span className="text-xs md:text-sm">Fiat Income Planner</span>
                    </button>

                    {/* Stablecoin Income Planner Tab */}
                    <button
                        onClick={() => setActiveTab("stablecoin")}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
                            activeTab === "stablecoin"
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        }`}
                    >
                        <CircleDollarSign size={20} className={activeTab === "stablecoin" ? "text-white" : "text-green-500"} />
                        <span className="text-xs md:text-sm">Stablecoin Income Planner</span>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
                {activeTab === "btc" && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                        >
                            <div className="mb-4">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-900 mb-2 flex items-center gap-2">
                                    <Coins className="text-[#f49d1d]" size={24} />
                                    BTC Income Planner
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-600">
                                    Size Bitcoin collateral for a 12-month loan and visualize risk as leverage (LTV) changes. Educational and non-custodial.
                                </p>
                            </div>
                        </div>

                        {/* Inputs Section */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Inputs</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Loan Need Over 12 Months (USD)
                                    </label>
                                    <input
                                        type="number"
                                        value={btcPlanner.totalNeed12m}
                                        onChange={(e) => handleBtcPlannerChange("totalNeed12m", e.target.value)}
                                        placeholder="13080"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-700">
                                            BTC Spot Price (USD)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={fetchBtcPrice}
                                            disabled={btcPriceLoading}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#f49d1d] focus:ring-offset-1"
                                            title="Reload price from CoinGecko"
                                        >
                                            <RefreshCw size={14} className={btcPriceLoading ? "animate-spin" : ""} />
                                            {btcPriceLoading ? "..." : "Reload"}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        value={btcPlanner.btcPrice}
                                        onChange={(e) => handleBtcPlannerChange("btcPrice", e.target.value)}
                                        placeholder="40000"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Source: CoinGecko API</p>
                                </div>
                            </div>
                        </div>

                        {/* LTV Slider Section */}
                        {btcResults && (
                            <>
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-700">
                                                Loan-to-Value (LTV): {btcPlanner.ltv}%
                                            </label>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                btcResults.riskIndicator === "green" ? "bg-green-100 text-green-700" :
                                                btcResults.riskIndicator === "amber" ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                            }`}>
                                                {btcResults.riskIndicator === "green" ? "Lower Risk" :
                                                 btcResults.riskIndicator === "amber" ? "Moderate Risk" : "High Risk"}
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="90"
                                            value={btcPlanner.ltv}
                                            onChange={(e) => handleBtcPlannerChange("ltv", parseInt(e.target.value))}
                                            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#f49d1d]"
                                            style={{ height: '8px' }}
                                            onMouseMove={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const percent = ((e.clientX - rect.left) / rect.width) * 100;
                                                const ltvValue = Math.round(10 + (percent / 100) * 80);
                                                setHoveredLtv(ltvValue);
                                            }}
                                            onMouseLeave={() => setHoveredLtv(null)}
                                        />
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>10%</span>
                                            <span>50%</span>
                                            <span>90%</span>
                                        </div>
                                    </div>

                                    {/* Key Results */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Targeted Monthly Income</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                ${btcResults.targetedMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">BTC Required</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                {btcResults.btcRequired.toFixed(4)} ₿
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Risk Thresholds */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Risk Thresholds</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-amber-50 dark:bg-amber-50 rounded-lg p-4 border border-amber-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="text-amber-600" size={18} />
                                                <p className="text-sm font-medium text-amber-900">Margin Call Price</p>
                                            </div>
                                            <p className="text-2xl font-bold text-amber-900">
                                                ${btcResults.marginCallPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs text-amber-700 mt-1">LTV reaches {btcPlanner.marginCallLtv}%</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-50 rounded-lg p-4 border border-red-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="text-red-600" size={18} />
                                                <p className="text-sm font-medium text-red-900">Liquidation Price</p>
                                            </div>
                                            <p className="text-2xl font-bold text-red-900">
                                                ${btcResults.liquidationPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs text-red-700 mt-1">LTV reaches {btcPlanner.liquidationLtv}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* LTV Comparison Table */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">LTV Comparison</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">LTV</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">BTC Required</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Margin Call</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Liquidation</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Risk</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {btcResults.ltvComparison.map((row, idx) => (
                                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-900">{row.ltv}%</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{row.btcRequired.toFixed(4)} ₿</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">${row.marginCallPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">${row.liquidationPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                row.risk === "green" ? "bg-green-100 text-green-700" :
                                                                row.risk === "amber" ? "bg-amber-100 text-amber-700" :
                                                                "bg-red-100 text-red-700"
                                                            }`}>
                                                                {row.risk === "green" ? "Lower" : row.risk === "amber" ? "Moderate" : "High"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Scenario Risk Index */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Scenario Risk Index (SRI)</h4>
                                        <div className="group relative">
                                            <Info className="text-slate-400" size={16} />
                                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                Measures leverage sensitivity. Higher values indicate increased sensitivity to price movements.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600 dark:text-slate-600">
                                                {btcResults.sriLevel === "lower" ? "Lower Sensitivity" :
                                                 btcResults.sriLevel === "moderate" ? "Moderate Sensitivity" : "High Sensitivity"}
                                            </span>
                                            <span className="text-lg font-bold text-slate-900 dark:text-slate-900">
                                                {Math.round(btcResults.sri)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-300 ${
                                                    btcResults.sri <= 40 ? "bg-green-500" :
                                                    btcResults.sri <= 70 ? "bg-amber-500" : "bg-red-500"
                                                }`}
                                                style={{ width: `${btcResults.sri}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>0</span>
                                            <span>40</span>
                                            <span>70</span>
                                            <span>100</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Compliance Note */}
                                <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <div className="flex gap-3">
                                        <Info className="text-slate-500 flex-shrink-0 mt-0.5" size={18} />
                                        <div className="text-xs text-slate-600 dark:text-slate-600 leading-relaxed">
                                            <p className="font-medium mb-1">Compliance Note</p>
                                            <p>All calculations are scenario illustrations based on user-defined assumptions and are provided for informational purposes only. Digital Credit Compass does not provide investment advice, does not recommend specific leverage levels, and does not execute transactions.</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Save and recall scenario (BTC) */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-900 mb-3">Save and recall a scenario</h4>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={saveBtcPlannerScenario}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#f49d1d] text-white hover:bg-[#d6891a] focus:ring-2 focus:ring-[#f49d1d] focus:ring-offset-2"
                                >
                                    <Save size={16} />
                                    Save
                                </button>
                                {btcSaveMessage && (
                                    <span className="text-sm text-slate-600 dark:text-slate-600">{btcSaveMessage}</span>
                                )}
                            </div>
                            {btcPlannerSaves.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">Saved scenarios</p>
                                    <ul className="space-y-2">
                                        {btcPlannerSaves.map((save) => {
                                            const d = save.createdAt ? new Date(save.createdAt) : null;
                                            const dateStr = d ? d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
                                            const timeStr = d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
                                            const out = save.outputs;
                                            const summaryStr = out
                                                ? `LTV ${save.inputs?.ltv ?? "—"}% · ${out.btcRequired != null ? out.btcRequired.toFixed(4) + " ₿" : "—"} · Margin: $${out.marginCallPrice != null ? out.marginCallPrice.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}`
                                                : (save.inputs?.totalNeed12m ? `Need 12m: $${Number(save.inputs.totalNeed12m).toLocaleString("en-US")}` : "—");
                                            return (
                                                <li key={save.id} className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-50/50">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-slate-500 dark:text-slate-500">
                                                            {dateStr} at {timeStr}
                                                        </span>
                                                        <span className="text-sm text-slate-700 dark:text-slate-700">{summaryStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {btcDeleteConfirmId === save.id ? (
                                                            <>
                                                                <span className="text-xs text-slate-600 dark:text-slate-600 mr-1">Delete?</span>
                                                                <button type="button" onClick={() => setBtcDeleteConfirmId(null)} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</button>
                                                                <button type="button" onClick={() => deleteBtcPlannerSave(save.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-red-500 text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500">Delete</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button type="button" onClick={() => recallBtcPlannerSave(save)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#f49d1d] text-[#f49d1d] hover:bg-[#f49d1d] hover:text-white focus:ring-2 focus:ring-[#f49d1d] focus:ring-offset-2">Recall</button>
                                                                <button type="button" onClick={() => setBtcDeleteConfirmId(save.id)} className="inline-flex items-center p-1.5 text-slate-400 hover:text-red-600 rounded focus:ring-2 focus:ring-red-500" title="Delete"><Trash2 size={16} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "fiat" && (
                    <div className="space-y-6">
                        {/* Section 1 - Header */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <div className="mb-4">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-900 mb-2 flex items-center gap-2">
                                    <DollarSign className="text-[#f49d1d]" size={24} />
                                    DCC – Fiat Income Planner
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-600">
                                    Design and evaluate digital credit yield strategies using market-traded instruments such as bonds, preferred shares, and income-focused ETFs. Data sourced from Admin Fiat Income. Same methodology as Stable Income Planner.
                                </p>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Inputs</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">Capital Amount (USD)</label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.capital}
                                        onChange={(e) => handleFiatPlannerChange("capital", e.target.value)}
                                        min="0"
                                        step="1000"
                                        placeholder="100000"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">Duration (months)</label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.durationMonths}
                                        onChange={(e) => handleFiatPlannerChange("durationMonths", parseInt(e.target.value) || 12)}
                                        min="1"
                                        max="120"
                                        placeholder="12"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">Scenario Type</label>
                                    <select
                                        value={fiatPlanner.scenarioType}
                                        onChange={(e) => handleFiatPlannerChange("scenarioType", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    >
                                        <option value="Modelled">Modelled Scenario</option>
                                        <option value="User defined">User defined</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modelled Scenario */}
                        {fiatPlanner.scenarioType === "Modelled" && (
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Modelled Scenario – Top Providers</h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={fetchFiatTopProviders}
                                    disabled={fiatTopProvidersLoading || fiatProvidersCached}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-[#f49d1d] text-white hover:bg-[#d6891a] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#f49d1d] focus:ring-offset-2"
                                >
                                    <RefreshCw size={18} className={fiatTopProvidersLoading ? "animate-spin" : ""} />
                                    {fiatTopProvidersLoading ? "Selecting..." : "Select top providers"}
                                </button>
                                {fiatProvidersCached && !fiatTopProvidersLoading && (
                                    <span className="text-xs text-slate-500 dark:text-slate-500">Cached for 24h – refresh tomorrow</span>
                                )}
                            </div>
                            {fiatTopProvidersError && <p className="mt-2 text-sm text-red-600">{fiatTopProvidersError}</p>}
                            {fiatTopProviders?.length === 0 && !fiatTopProvidersLoading && (
                                <p className="mt-4 text-sm text-slate-500">No products in database. Admin can populate via Generate from ChatGPT in Admin &gt; Fiat Income.</p>
                            )}
                            <div className="mt-6">
                                <div className="rounded-xl border border-[#f49d1d]/40 dark:border-[#f49d1d]/40 bg-gradient-to-br from-[#f49d1d]/5 to-white dark:from-[#f49d1d]/10 dark:to-slate-50/50 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-[#f49d1d]/10 dark:bg-[#f49d1d]/20 border-b border-[#f49d1d]/30">
                                        <Activity className="text-[#f49d1d]" size={18} />
                                        <h5 className="text-base font-semibold text-slate-800 dark:text-slate-800">Top Digital Credit Instruments</h5>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-200/30">
                                        {(fiatTopProviders || []).length > 0 ? (
                                            <>
                                            <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-500 border-b border-slate-100">
                                                <span className="w-6 shrink-0" />
                                                <div className="min-w-0 flex-1" />
                                                <span className="shrink-0 tabular-nums w-24 text-right">APY</span>
                                                <span className="shrink-0 tabular-nums w-10 text-right">Score</span>
                                            </div>
                                            {(fiatTopProviders || []).map((p, idx) => (
                                                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f49d1d]/5 transition-colors">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f49d1d]/20 text-[#f49d1d] text-xs font-bold shrink-0">{idx + 1}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-900 truncate">{p.issuer || "—"}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{p.product || "—"} {p.ticker ? `(${p.ticker})` : ""}</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-[#f49d1d] shrink-0 tabular-nums w-24 text-right">{p.apyDistribution || "—"}</span>
                                                    {p.qualityScore != null ? (
                                                        <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums w-10 text-right" title={formatScoreBreakdownTooltip(p.qualityScoreBreakdown)}>{p.qualityScore}/100</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 shrink-0 w-10 text-right">—</span>
                                                    )}
                                                </div>
                                            ))}
                                            </>
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <Activity className="mx-auto text-slate-300 dark:text-slate-500 mb-2" size={32} />
                                                <p className="text-sm text-slate-500 dark:text-slate-500">No providers yet</p>
                                                <p className="text-xs text-slate-400 mt-1">Click &quot;Select top providers&quot; to load</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {/* User defined */}
                        {fiatPlanner.scenarioType === "User defined" && (
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">User Defined – Select Instruments</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-600 mb-4">Select instruments and set allocation weights. Total must equal 100%.</p>
                            {fiatUserInstrumentsLoading ? (
                                <p className="text-sm text-slate-500 py-6">Loading products...</p>
                            ) : fiatUserInstruments.length === 0 ? (
                                <p className="text-sm text-slate-500 py-6">No products in database. Admin can populate via Generate from ChatGPT in Admin &gt; Fiat Income.</p>
                            ) : (
                                <>
                                <div className="rounded-xl border border-[#f49d1d]/40 dark:border-[#f49d1d]/40 bg-[#f49d1d]/5 dark:bg-[#f49d1d]/10 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
                                        <span className="w-4 shrink-0" />
                                        <div className="min-w-0 flex-1" />
                                        <span className="shrink-0 w-24 text-right">APY</span>
                                        <span className="shrink-0 w-12 text-right">Score</span>
                                        <span className="w-16 text-right">%</span>
                                    </div>
                                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                                        {fiatUserInstruments.map((i) => (
                                            <div key={i.id} className="flex items-center gap-2 px-4 py-2 hover:bg-[#f49d1d]/5">
                                                <input type="checkbox" checked={!!i.selected} onChange={() => handleFiatInstrumentToggle(i.id)} className="rounded border-slate-300 text-[#f49d1d] focus:ring-[#f49d1d]" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{i.issuer}</p>
                                                    <p className="text-xs text-slate-500 truncate">{i.product} {i.ticker ? `(${i.ticker})` : ""}</p>
                                                </div>
                                                <span className="text-xs text-slate-600 tabular-nums shrink-0 w-24 text-right">{i.apyDistribution || "—"}</span>
                                                {i.qualityScore != null ? (
                                                    <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums w-12 text-right" title={formatScoreBreakdownTooltip(i.qualityScoreBreakdown)}>{i.qualityScore}/100</span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 shrink-0 w-12 text-right">—</span>
                                                )}
                                                <input type="number" min="0" max="100" step="0.5" value={i.selected ? (i.weight || "") : ""} onChange={(e) => handleFiatWeightChange(i.id, e.target.value)} disabled={!i.selected} placeholder="%" className="w-16 px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-[#f49d1d] disabled:opacity-50 disabled:bg-slate-50" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <p className={`mt-3 text-sm font-medium ${Math.abs((fiatIncomeCalc?.totalWeight ?? 0) - 100) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                                    Total: {Math.round((fiatIncomeCalc?.totalWeight ?? 0) * 10) / 10}%{Math.abs((fiatIncomeCalc?.totalWeight ?? 0) - 100) >= 0.01 ? " (must equal 100%)" : ""}
                                </p>
                                </>
                            )}
                        </div>
                        )}

                        {/* Income Projection */}
                        <div className="rounded-xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden bg-white dark:bg-white"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <div className="flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-[#f49d1d]/10 to-amber-50/50 dark:from-[#f49d1d]/15 dark:to-amber-950/20 border-b border-slate-100">
                                <TrendingUp className="text-[#f49d1d]" size={20} />
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Income Projection</h4>
                            </div>
                            <div className="p-5 md:p-6">
                                {fiatIncomeCalc?.canCompute ? (
                                    <>
                                        <div className="mb-6">
                                            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-200">
                                                <div className="h-full bg-[#f49d1d]" style={{ width: "100%" }} title="Portfolio" />
                                            </div>
                                            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">100% Portfolio</div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                            <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20 px-4 py-3">
                                                <Percent className="text-[#f49d1d] shrink-0" size={20} />
                                                <div>
                                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-500">Portfolio APY</p>
                                                    <p className="text-lg font-bold text-slate-900 dark:text-slate-900 tabular-nums">{fiatIncomeCalc.portfolioAPY != null ? `${fiatIncomeCalc.portfolioAPY.toFixed(2)}%` : "—"}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-[#f49d1d]/10 dark:bg-[#f49d1d]/15 border border-[#f49d1d]/30 p-4">
                                            <p className="text-xs font-semibold text-[#b8720b] dark:text-[#f5b84d] mb-1">Total</p>
                                            <div className="flex flex-wrap gap-6">
                                                <div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-500">Expected yearly income</p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">${(fiatIncomeCalc.expectedAnnualIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-500">Expected monthly income</p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">${(fiatIncomeCalc.expectedMonthlyIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-500 py-4">Enter capital and select providers to see income projection.</p>
                                )}
                            </div>
                        </div>

                        {/* Saved scenarios */}
                        {fiatPlannerSaves.length > 0 && (
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Saved Scenarios</h4>
                            {fiatSaveMessage && <p className="text-sm text-emerald-600 mb-2">{fiatSaveMessage}</p>}
                            <div className="flex gap-2 mb-4">
                                <button type="button" onClick={saveFiatPlannerOutput} disabled={!fiatIncomeCalc?.canCompute} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f49d1d] text-white font-medium hover:bg-[#d6891a] disabled:opacity-50">
                                    <Save size={16} /> Save current scenario
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {fiatPlannerSaves.map((save) => {
                                    const out = save.outputs;
                                    const summaryStr = out ? `APY ${out.portfolioAPY?.toFixed(1) ?? "—"}% · $${(out.expectedAnnualIncome ?? 0).toLocaleString()}/yr` : "—";
                                    return (
                                        <li key={save.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800">
                                            <div>
                                                <span className="text-xs text-slate-500 dark:text-slate-500">{new Date(save.createdAt).toLocaleDateString()}</span>
                                                <span className="text-sm text-slate-700 dark:text-slate-700 ml-2">{summaryStr}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {fiatDeleteConfirmId === save.id ? (
                                                    <>
                                                        <button type="button" onClick={() => setFiatDeleteConfirmId(null)} className="inline-flex gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</button>
                                                        <button type="button" onClick={() => deleteFiatPlannerSave(save.id)} className="inline-flex gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-red-500 text-red-600 hover:bg-red-50">Delete</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button type="button" onClick={() => recallFiatPlannerSave(save)} className="inline-flex gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#f49d1d] text-[#f49d1d] hover:bg-[#f49d1d] hover:text-white">Recall</button>
                                                        <button type="button" onClick={() => setFiatDeleteConfirmId(save.id)} className="inline-flex p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        )}
                    </div>
                )}

                {activeTab === "stablecoin" && (
                    <div className="space-y-6">
                        {/* Section 1 - Purpose / Header (same as BTC) */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <div className="mb-4">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-900 mb-2 flex items-center gap-2">
                                    <CircleDollarSign className="text-[#f49d1d]" size={24} />
                                    DCC – Stable Income Planner
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-600">
                                    Design, compare, and evaluate stablecoin-based income strategies using a risk-first, structure-first methodology. Focuses on two crypto-native income structures: CeFi stablecoin savings and on-chain overcollateralized lending (DeFi). Surfaces the trade-off between yield, risk, and duration.
                                </p>
                            </div>
                        </div>

                        {/* Inputs Section (same structure as BTC) */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Inputs</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Capital Amount (USD)
                                    </label>
                                    <input
                                        type="number"
                                        value={stablecoinPlanner.capital}
                                        onChange={(e) => handleStablecoinPlannerChange("capital", e.target.value)}
                                        min="0"
                                        step="1000"
                                        placeholder="100000"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Base Stablecoin
                                    </label>
                                    <div className="flex gap-6 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="baseStablecoin"
                                                checked={stablecoinPlanner.baseStablecoin === "USDC"}
                                                onChange={() => handleStablecoinPlannerChange("baseStablecoin", "USDC")}
                                                className="text-[#f49d1d] focus:ring-[#f49d1d]"
                                            />
                                            <span className="text-slate-700 dark:text-slate-700">USDC</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="baseStablecoin"
                                                checked={stablecoinPlanner.baseStablecoin === "USDT"}
                                                onChange={() => handleStablecoinPlannerChange("baseStablecoin", "USDT")}
                                                className="text-[#f49d1d] focus:ring-[#f49d1d]"
                                            />
                                            <span className="text-slate-700 dark:text-slate-700">USDT</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Duration (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={stablecoinPlanner.durationMonths}
                                        onChange={(e) => handleStablecoinPlannerChange("durationMonths", parseInt(e.target.value) || 12)}
                                        min="1"
                                        max="120"
                                        placeholder="12"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Scenario Type
                                    </label>
                                    <select
                                        value={stablecoinPlanner.scenarioType}
                                        onChange={(e) => handleStablecoinPlannerChange("scenarioType", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    >
                                        <option value="Modelled">Modelled Scenario</option>
                                        <option value="User defined">User defined</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3 - Modelled Scenario or User defined */}
                        {stablecoinPlanner.scenarioType === "Modelled" && (
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Modelled Scenario – Top Providers</h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={fetchStablecoinTopProviders}
                                    disabled={stablecoinTopProvidersLoading || stablecoinProvidersCached}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-[#f49d1d] text-white hover:bg-[#d6891a] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#f49d1d] focus:ring-offset-2"
                                >
                                    <RefreshCw size={18} className={stablecoinTopProvidersLoading ? "animate-spin" : ""} />
                                    {stablecoinTopProvidersLoading ? "Selecting..." : "Select top providers"}
                                </button>
                                {stablecoinProvidersCached && !stablecoinTopProvidersLoading && (
                                    <span className="text-xs text-slate-500 dark:text-slate-500">Cached for 24h – refresh tomorrow</span>
                                )}
                            </div>
                            {stablecoinTopProvidersError && (
                                <p className="mt-2 text-sm text-red-600">{stablecoinTopProvidersError}</p>
                            )}
                            {stablecoinTopProviders.collateralisedLending?.length === 0 && stablecoinTopProviders.cefiSavings?.length === 0 && !stablecoinTopProvidersLoading && (
                                <p className="mt-4 text-sm text-slate-500">No products in database. Admin can populate via Generate from ChatGPT in Admin &gt; Stablecoin.</p>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                {/* Collateralised Lending (DeFi) */}
                                <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-50/50 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50/80 dark:bg-emerald-900/20 border-b border-emerald-200/50">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15">
                                            <Activity className="text-emerald-600 dark:text-emerald-400" size={18} />
                                        </div>
                                        <h5 className="text-base font-semibold text-slate-800 dark:text-slate-800">Collateralised Lending</h5>
                                        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300">DeFi</span>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-200/30">
                                        {(stablecoinTopProviders.collateralisedLending || []).length > 0 ? (
                                            <>
                                            <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-500 border-b border-slate-100">
                                                <span className="w-6 shrink-0" />
                                                <div className="min-w-0 flex-1" />
                                                <span className="shrink-0 tabular-nums w-12 text-right">APY</span>
                                                <span className="shrink-0 tabular-nums w-10 text-right">Score</span>
                                            </div>
                                            {(stablecoinTopProviders.collateralisedLending || []).map((p, idx) => (
                                                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-900 truncate">{p.issuer || "—"}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{p.product || "—"}</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums w-12 text-right">{p.apy || "—"}</span>
                                                    {p.qualityScore != null ? (
                                                        <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums w-10 text-right" title={formatScoreBreakdownTooltip(p.qualityScoreBreakdown)}>{p.qualityScore}/100</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 shrink-0 w-10 text-right">—</span>
                                                    )}
                                                </div>
                                            ))}
                                            </>
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <Activity className="mx-auto text-slate-300 dark:text-slate-500 mb-2" size={32} />
                                                <p className="text-sm text-slate-500 dark:text-slate-500">No providers yet</p>
                                                <p className="text-xs text-slate-400 mt-1">Click &quot;Select top providers&quot; to load</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CeFi Savings */}
                                <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-50/50 overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/80 dark:bg-blue-900/20 border-b border-blue-200/50">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/15">
                                            <Building2 className="text-blue-600 dark:text-blue-400" size={18} />
                                        </div>
                                        <h5 className="text-base font-semibold text-slate-800 dark:text-slate-800">CeFi Savings</h5>
                                        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300">CeFi</span>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-200/30">
                                        {(stablecoinTopProviders.cefiSavings || []).length > 0 ? (
                                            <>
                                            <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-500 border-b border-slate-100">
                                                <span className="w-6 shrink-0" />
                                                <div className="min-w-0 flex-1" />
                                                <span className="shrink-0 tabular-nums w-12 text-right">APY</span>
                                                <span className="shrink-0 tabular-nums w-10 text-right">Score</span>
                                            </div>
                                            {(stablecoinTopProviders.cefiSavings || []).map((p, idx) => (
                                                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-900 truncate">{p.issuer || "—"}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{p.product || "—"}</p>
                                                    </div>
                                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0 tabular-nums w-12 text-right">{p.apy || "—"}</span>
                                                    {p.qualityScore != null ? (
                                                        <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums w-10 text-right" title={formatScoreBreakdownTooltip(p.qualityScoreBreakdown)}>{p.qualityScore}/100</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 shrink-0 w-10 text-right">—</span>
                                                    )}
                                                </div>
                                            ))}
                                            </>
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <Building2 className="mx-auto text-slate-300 dark:text-slate-500 mb-2" size={32} />
                                                <p className="text-sm text-slate-500 dark:text-slate-500">No providers yet</p>
                                                <p className="text-xs text-slate-400 mt-1">Click &quot;Select top providers&quot; to load</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {/* User defined scenario: freely select instruments and allocations */}
                        {stablecoinPlanner.scenarioType === "User defined" && (
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">User Defined – Select Instruments</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-600 mb-4">Select instruments and set allocation weights. Total must equal 100%.</p>
                            {stablecoinUserInstrumentsLoading ? (
                                <p className="text-sm text-slate-500 py-6">Loading products...</p>
                            ) : stablecoinUserInstruments.length === 0 ? (
                                <p className="text-sm text-slate-500 py-6">No products in database. Admin can populate via Generate from ChatGPT in Admin &gt; Stablecoin.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10 overflow-hidden">
                                            <div className="px-4 py-2 bg-emerald-50/80 dark:bg-emerald-900/20 border-b border-emerald-200/50">
                                                <h5 className="text-sm font-semibold text-slate-800">Collateralised Lending (DeFi)</h5>
                                            </div>
                                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                                {stablecoinUserInstruments.filter((i) => i.category === "collateralised_lending").length > 0 && (
                                                <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
                                                    <span className="w-4 shrink-0" />
                                                    <div className="min-w-0 flex-1" />
                                                    <span className="shrink-0 w-12 text-right">APY</span>
                                                    <span className="shrink-0 w-12 text-right">Score</span>
                                                    <span className="w-16 text-right">%</span>
                                                </div>
                                                )}
                                                {stablecoinUserInstruments.filter((i) => i.category === "collateralised_lending").map((i) => (
                                                    <div key={i.id} className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-50/30">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!i.selected}
                                                            onChange={() => handleStablecoinInstrumentToggle(i.id)}
                                                            className="rounded border-slate-300 text-[#f49d1d] focus:ring-[#f49d1d]"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-900 truncate">{i.issuer}</p>
                                                            <p className="text-xs text-slate-500 truncate">{i.product}</p>
                                                        </div>
                                                        <span className="text-xs text-slate-600 tabular-nums shrink-0 w-12 text-right">{i.apy || "—"}</span>
                                                        {i.qualityScore != null ? (
                                                            <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums w-12 text-right" title={formatScoreBreakdownTooltip(i.qualityScoreBreakdown)}>{i.qualityScore}/100</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 shrink-0 w-12 text-right">—</span>
                                                        )}
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.5"
                                                            value={i.selected ? (i.weight || "") : ""}
                                                            onChange={(e) => handleStablecoinWeightChange(i.id, e.target.value)}
                                                            disabled={!i.selected}
                                                            placeholder="%"
                                                            className="w-16 px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-[#f49d1d] disabled:opacity-50 disabled:bg-slate-50"
                                                        />
                                                    </div>
                                                ))}
                                                {stablecoinUserInstruments.filter((i) => i.category === "collateralised_lending").length === 0 && (
                                                    <div className="px-4 py-6 text-center text-sm text-slate-500">No DeFi products</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/10 overflow-hidden">
                                            <div className="px-4 py-2 bg-blue-50/80 dark:bg-blue-900/20 border-b border-blue-200/50">
                                                <h5 className="text-sm font-semibold text-slate-800">CeFi Savings</h5>
                                            </div>
                                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                                {stablecoinUserInstruments.filter((i) => i.category === "cefi_savings").length > 0 && (
                                                <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
                                                    <span className="w-4 shrink-0" />
                                                    <div className="min-w-0 flex-1" />
                                                    <span className="shrink-0 w-12 text-right">APY</span>
                                                    <span className="shrink-0 w-12 text-right">Score</span>
                                                    <span className="w-16 text-right">%</span>
                                                </div>
                                                )}
                                                {stablecoinUserInstruments.filter((i) => i.category === "cefi_savings").map((i) => (
                                                    <div key={i.id} className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50/30">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!i.selected}
                                                            onChange={() => handleStablecoinInstrumentToggle(i.id)}
                                                            className="rounded border-slate-300 text-[#f49d1d] focus:ring-[#f49d1d]"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-900 truncate">{i.issuer}</p>
                                                            <p className="text-xs text-slate-500 truncate">{i.product}</p>
                                                        </div>
                                                        <span className="text-xs text-slate-600 tabular-nums shrink-0 w-12 text-right">{i.apy || "—"}</span>
                                                        {i.qualityScore != null ? (
                                                            <span className="text-xs font-medium text-slate-600 shrink-0 tabular-nums w-12 text-right" title={formatScoreBreakdownTooltip(i.qualityScoreBreakdown)}>{i.qualityScore}/100</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 shrink-0 w-12 text-right">—</span>
                                                        )}
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.5"
                                                            value={i.selected ? (i.weight || "") : ""}
                                                            onChange={(e) => handleStablecoinWeightChange(i.id, e.target.value)}
                                                            disabled={!i.selected}
                                                            placeholder="%"
                                                            className="w-16 px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-[#f49d1d] disabled:opacity-50 disabled:bg-slate-50"
                                                        />
                                                    </div>
                                                ))}
                                                {stablecoinUserInstruments.filter((i) => i.category === "cefi_savings").length === 0 && (
                                                    <div className="px-4 py-6 text-center text-sm text-slate-500">No CeFi products</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className={`mt-3 text-sm font-medium ${Math.abs((stablecoinIncomeCalc?.totalWeight ?? 0) - 100) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                                        Total: {Math.round((stablecoinIncomeCalc?.totalWeight ?? 0) * 10) / 10}%{Math.abs((stablecoinIncomeCalc?.totalWeight ?? 0) - 100) >= 0.01 ? " (must equal 100%)" : ""}
                                    </p>
                                </>
                            )}
                        </div>
                        )}

                        {/* Section 4 - Income Projection */}
                        <div className="rounded-xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden bg-white dark:bg-white"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <div className="flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-[#f49d1d]/10 to-amber-50/50 dark:from-[#f49d1d]/15 dark:to-amber-950/20 border-b border-slate-100">
                                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f49d1d]/20">
                                    <TrendingUp className="text-[#f49d1d]" size={20} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900">Income Projection</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-500">
                                        {stablecoinIncomeCalc?.isUserDefined
                                            ? `${Math.round(stablecoinIncomeCalc.defiPct || 0)}% DeFi · ${Math.round(stablecoinIncomeCalc.cefiPct || 0)}% CeFi`
                                            : "70% Collateralised Lending · 30% CeFi Savings"}
                                    </p>
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                {stablecoinIncomeCalc.canCompute ? (
                                    <>
                                        {/* Allocation bar (dynamic for User defined) */}
                                        <div className="mb-6">
                                            <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-200">
                                                <div className="h-full bg-emerald-500" style={{ width: `${stablecoinIncomeCalc.defiPct ?? 70}%` }} title="Collateralised Lending" />
                                                <div className="h-full bg-blue-500" style={{ width: `${stablecoinIncomeCalc.cefiPct ?? 30}%` }} title="CeFi Savings" />
                                            </div>
                                            <div className="flex justify-between mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                                                <span>{Math.round(stablecoinIncomeCalc.defiPct ?? 70)}% DeFi</span>
                                                <span>{Math.round(stablecoinIncomeCalc.cefiPct ?? 30)}% CeFi</span>
                                            </div>
                                        </div>

                                        {/* Input rates: APYA/APYB (Modelled) or avg DeFi / avg CeFi + Portfolio APY (User defined) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                                            {stablecoinIncomeCalc.isUserDefined ? (
                                                <>
                                                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-3">
                                                        <Percent className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-500">Avg DeFi APY</p>
                                                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                                                {stablecoinIncomeCalc.APYA != null ? `${stablecoinIncomeCalc.APYA.toFixed(2)}%` : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 px-4 py-3">
                                                        <Percent className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-500">Avg CeFi APY</p>
                                                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                                                                {stablecoinIncomeCalc.APYB != null ? `${stablecoinIncomeCalc.APYB.toFixed(2)}%` : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20 px-4 py-3">
                                                        <Percent className="text-[#f49d1d] shrink-0" size={20} />
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-500">Portfolio APY</p>
                                                            <p className="text-lg font-bold text-slate-900 dark:text-slate-900 tabular-nums">
                                                                {stablecoinIncomeCalc.portfolioAPY != null ? `${stablecoinIncomeCalc.portfolioAPY.toFixed(2)}%` : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-3">
                                                        <Percent className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-500">APYA · DeFi avg</p>
                                                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                                                {stablecoinIncomeCalc.APYA != null ? `${stablecoinIncomeCalc.APYA.toFixed(2)}%` : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 px-4 py-3">
                                                        <Percent className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-500">APYB · CeFi avg</p>
                                                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                                                                {stablecoinIncomeCalc.APYB != null ? `${stablecoinIncomeCalc.APYB.toFixed(2)}%` : "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Main results: DeFi and CeFi yearly/monthly income */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-5">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">DeFi · Collateralised Lending</p>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-500">Expected yearly income</p>
                                                        <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">
                                                            ${(stablecoinIncomeCalc.defiAnnualIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-500">Expected monthly income</p>
                                                        <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">
                                                            ${(stablecoinIncomeCalc.defiMonthlyIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20 p-5">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-3">CeFi · Savings</p>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-500">Expected yearly income</p>
                                                        <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">
                                                            ${(stablecoinIncomeCalc.cefiAnnualIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-500">Expected monthly income</p>
                                                        <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">
                                                            ${(stablecoinIncomeCalc.cefiMonthlyIncome ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-xl bg-[#f49d1d]/10 dark:bg-[#f49d1d]/15 border border-[#f49d1d]/30 p-4">
                                            <p className="text-xs font-semibold text-[#b8720b] dark:text-[#f5b84d] mb-1">Total</p>
                                            <div className="flex flex-wrap gap-6">
                                                <div>
                                                    <p className="text-xs text-slate-600">Annual</p>
                                                    <p className="text-lg font-bold text-slate-900 tabular-nums">
                                                        ${stablecoinIncomeCalc.expectedAnnualIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-600">Monthly</p>
                                                    <p className="text-lg font-bold text-slate-900 tabular-nums">
                                                        ${stablecoinIncomeCalc.expectedMonthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 leading-relaxed">
                                            {stablecoinIncomeCalc.isUserDefined ? (
                                                <><span className="font-medium">Formula:</span> Capital × sum(weight% × APY%). Monthly = Annual ÷ 12.</>
                                            ) : (
                                                <><span className="font-medium">Formula:</span> (Capital × 70% × APYA) + (Capital × 30% × APYB). Monthly = Annual ÷ 12.</>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <div className="py-8 text-center">
                                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-200 mb-3">
                                            <TrendingUp className="text-slate-400 dark:text-slate-500" size={28} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-600">No projection yet</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                                            {stablecoinPlanner.scenarioType === "User defined"
                                                ? "Select instruments, set allocations to sum 100%, and ensure Capital (USD) &gt; 0."
                                                : "Click &quot;Select top providers&quot; to load data. Ensure Capital (USD) &gt; 0 and product APYs contain numbers (e.g. 5%, 4-6%)."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 5 - Footer disclaimer (same as BTC Compliance Note) */}
                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex gap-3">
                                <Info className="text-slate-500 flex-shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-slate-600 dark:text-slate-600 leading-relaxed">
                                    <p className="font-medium mb-1">Micro-disclaimer</p>
                                    <p>Outputs are modelled illustrations based on selected assumptions. They do not constitute financial advice.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Delete Confirmation Modal */}
            {confirmDelete.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-300 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-900">
                                        Delete Plan
                                    </h3>
                                    <button
                                        onClick={cancelDelete}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-600 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-600 mb-6">
                                    Are you sure you want to delete this plan? This action cannot be undone.
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={cancelDelete}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-700 bg-slate-100 dark:bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-200 rounded-md transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeletePlan}
                                        disabled={deletingPlanId !== null}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-md transition"
                                    >
                                        {deletingPlanId ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </>
        </ProtectedFeature>
    );
}
