"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Save, Clock, Eye, Trash2, ChevronDown, ChevronUp, AlertTriangle, X, Coins, DollarSign, CircleDollarSign, Info, RefreshCw, LayoutList, Calendar, CalendarDays, Award, TrendingUp, Wallet, Percent, Trophy, Activity, Droplets } from "lucide-react";
import ProtectedFeature from "@/components/ProtectedFeature";
import Breadcrumb from "@/components/Breadcrumb";
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

    // Fiat Income Planner state (only Capital, Duration, Allocation mode are user inputs)
    const [fiatPlanner, setFiatPlanner] = useState({
        capital: 100000,
        durationMonths: 12,
        horizon: 12,
        region: "US",
        liquidityPreference: "Market-traded",
        mode: "Guided",
        riskPosture: "Balanced",
        excludeDiscretionary: false,
    });
    const [fiatInstruments, setFiatInstruments] = useState([]);
    const [fiatInstrumentsLoading, setFiatInstrumentsLoading] = useState(false);
    const [fiatWarnings, setFiatWarnings] = useState([]);
    const [fiatPlannerSaves, setFiatPlannerSaves] = useState([]);
    const [fiatSaveMessage, setFiatSaveMessage] = useState("");
    const [fiatDeleteConfirmId, setFiatDeleteConfirmId] = useState(null);
    const [fiatProviderRanking, setFiatProviderRanking] = useState(null);

    // Stablecoin Income Planner state
    const [stablecoinPlanner, setStablecoinPlanner] = useState({
        stablecoinAsset: "USDC",
        horizon: 12,
        region: "UAE",
        liquidityPreference: "On-demand",
        mode: "Guided",
        targetMonthlyIncome: "",
    });
    const [stablecoinInstruments, setStablecoinInstruments] = useState([]);
    const [stablecoinInstrumentsLoading, setStablecoinInstrumentsLoading] = useState(false);
    const [stablecoinPlannerSaves, setStablecoinPlannerSaves] = useState([]);
    const [stablecoinSaveMessage, setStablecoinSaveMessage] = useState("");
    const [stablecoinDeleteConfirmId, setStablecoinDeleteConfirmId] = useState(null);

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

    // Apply guided allocation when mode changes to Guided or when fiat instruments load.
    // Do not include fiatInstruments in deps: it would retrigger after setState → infinite loop.
    useEffect(() => {
        if (fiatPlanner.mode === "Guided" && activeTab === "fiat" && !fiatInstrumentsLoading) {
            applyGuidedAllocation();
        }
    }, [fiatPlanner.mode, fiatPlanner.region, fiatPlanner.excludeDiscretionary, fiatPlanner.durationMonths, activeTab, fiatInstrumentsLoading]);

    // Apply stablecoin guided allocation when mode changes to Guided or when stablecoin instruments load.
    // Do not include stablecoinInstruments in deps: it would retrigger after setState → infinite loop.
    useEffect(() => {
        if (stablecoinPlanner.mode === "Guided" && activeTab === "stablecoin" && !stablecoinInstrumentsLoading) {
            applyStablecoinGuidedAllocation();
        }
    }, [stablecoinPlanner.mode, stablecoinPlanner.stablecoinAsset, stablecoinPlanner.region, activeTab, stablecoinInstrumentsLoading]);

    // Fiat Income Planner: fetch from Crypto Lending Providers database
    useEffect(() => {
        if (activeTab !== "fiat") return;
        let cancelled = false;
        setFiatInstrumentsLoading(true);
        fetch("/api/crypto-lending-providers")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data.success || !Array.isArray(data.providers)) return;
                const mapped = (data.providers || []).map((p) => {
                    const apyMinPct = p.apyMin != null ? Number(p.apyMin) : null;
                    const apyMaxPct = p.apyMax != null ? Number(p.apyMax) : null;
                    const liq = (p.liquidity || "high").toString().toLowerCase();
                    return {
                        id: p.id,
                        name: p.provider || "—",
                        type: p.type || "—",
                        jurisdiction: p.jurisdiction != null ? String(p.jurisdiction).trim() || null : null,
                        apyMinPct,
                        apyMaxPct,
                        apyMin: apyMinPct != null ? apyMinPct / 100 : null,
                        apyMax: apyMaxPct != null ? apyMaxPct / 100 : null,
                        hv30Pct: p.hv30Pct != null ? Number(p.hv30Pct) : null,
                        hv30: p.hv30Pct != null ? Number(p.hv30Pct) / 100 : 0.01,
                        liquidityType: liq,
                        liquidity: p.liquidity || "—",
                        comment: p.comment || "",
                        issuer: "—",
                        rateType: "variable",
                        seniority: "—",
                        region: ["Global"],
                        paymentFreq: "—",
                        selected: false,
                        weight: 0,
                    };
                });
                setFiatInstruments((prev) => {
                    const byId = new Map(prev.map((item) => [item.id, item]));
                    return mapped.map((m) => {
                        const old = byId.get(m.id);
                        return old ? { ...m, selected: old.selected, weight: old.weight } : m;
                    });
                });
            })
            .catch(() => { if (!cancelled) setFiatInstruments([]); })
            .finally(() => { if (!cancelled) setFiatInstrumentsLoading(false); });
        return () => { cancelled = true; };
    }, [activeTab]);

    const FIAT_PLANNER_STORAGE_KEY = "dcc_fiat_planner_saves";
    const BTC_PLANNER_STORAGE_KEY = "dcc_btc_planner_saves";
    const STABLECOIN_PLANNER_STORAGE_KEY = "dcc_stablecoin_planner_saves";
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
    useEffect(() => {
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem(STABLECOIN_PLANNER_STORAGE_KEY) : null;
            if (raw) {
                const parsed = JSON.parse(raw);
                setStablecoinPlannerSaves(Array.isArray(parsed) ? parsed : []);
            }
        } catch (_) {
            setStablecoinPlannerSaves([]);
        }
    }, []);

    // Fetch 1C instruments (stablecoin) from API
    useEffect(() => {
        if (activeTab !== "stablecoin") return;
        let cancelled = false;
        setStablecoinInstrumentsLoading(true);
        fetch("/api/instruments?module=1C")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data.success || !Array.isArray(data.instruments)) return;
                const regionFromJurisdiction = (j) => {
                    if (!j) return [];
                    return j.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
                };
                const mapped = (data.instruments || []).map((i) => {
                    const snap = i.latestSnapshot || {};
                    const region = Array.isArray(i.regionEligibility) && i.regionEligibility.length
                        ? i.regionEligibility
                        : regionFromJurisdiction(i.jurisdiction);
                    const eligibilityStatus = region.length && !region.some((r) => r === "On-chain" || r === "Global")
                        ? "Eligible"
                        : "Check eligibility";
                    return {
                        id: i.id,
                        issuer: i.issuer,
                        productName: i.productName,
                        venueType: i.venueType || "—",
                        supportedAsset: i.supportedAsset || "USDC",
                        chain: i.chain || null,
                        apyMin: snap.apyMin != null ? Number(snap.apyMin) : null,
                        apyMax: snap.apyMax != null ? Number(snap.apyMax) : null,
                        rateType: snap.rateType || "Variable",
                        rateAsOf: (snap.asOf || new Date()).toString(),
                        liquidity: i.lockup || i.noticePeriod || "—",
                        noticePeriod: i.noticePeriod || "None",
                        regionEligibility: region.length ? region : ["Global"],
                        eligibilityStatus,
                        riskTags: Array.isArray(i.riskTags) ? i.riskTags : [],
                        selected: false,
                        weight: 0,
                    };
                });
                setStablecoinInstruments((prev) => {
                    const byId = new Map(prev.map((p) => [p.id, p]));
                    return mapped.map((m) => {
                        const old = byId.get(m.id);
                        return old ? { ...m, selected: old.selected, weight: old.weight } : m;
                    });
                });
            })
            .catch(() => { if (!cancelled) setStablecoinInstruments([]); })
            .finally(() => { if (!cancelled) setStablecoinInstrumentsLoading(false); });
        return () => { cancelled = true; };
    }, [activeTab]);

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

    // Fiat Income Planner calculations (Capital, Duration, Allocation only)
    const calculateFiatPlanner = () => {
        const selected = fiatInstruments.filter(instr => instr.selected);
        const totalWeight = selected.reduce((sum, instr) => sum + (instr.weight || 0), 0);

        if (selected.length === 0 || totalWeight !== 100) return null;

        // Portfolio APY range: same as spec — (weight/100)×APY per instrument, then sum
        // Example: 0.50×6% + 0.30×8% + 0.20×8% = 7.0%; 0.50×8% + 0.30×8% + 0.20×14% = 9.2%
        const pctMin = (instr) => (instr.apyMinPct != null ? Number(instr.apyMinPct) : (instr.apyMin != null ? Number(instr.apyMin) * 100 : 0));
        const pctMax = (instr) => (instr.apyMaxPct != null ? Number(instr.apyMaxPct) : (instr.apyMax != null ? Number(instr.apyMax) * 100 : 0));
        const portfolioApyMin = Math.round(selected.reduce((sum, instr) => sum + (Number(instr.weight) / 100) * pctMin(instr), 0) * 100) / 100;
        const portfolioApyMax = Math.round(selected.reduce((sum, instr) => sum + (Number(instr.weight) / 100) * pctMax(instr), 0) * 100) / 100;

        const capital = Number(fiatPlanner.capital) || 0;
        // Annual income = capital × (APY% / 100); monthly = annual / 12
        const expectedIncomeMin = capital > 0 ? Math.round((capital * portfolioApyMin / 100) * 100) / 100 : null;
        const expectedIncomeMax = capital > 0 ? Math.round((capital * portfolioApyMax / 100) * 100) / 100 : null;
        const requiredCapitalMin = null;
        const requiredCapitalMax = null;
        const targetAnnualIncome = null;
        const targetMonthlyIncome = null;

        // Stability Score (0–100): weighted by volatility (HV30), rate type, seniority
        const volScore = (hv30) => {
            const h = Number(hv30) ?? 0.2;
            if (h < 0.1) return 90;
            if (h < 0.2) return 75;
            if (h < 0.35) return 55;
            return 30;
        };
        const rateScore = (rateType) => ((rateType || "").toString().toLowerCase() === "fixed" ? 85 : 65);
        const seniorityScore = (s) => ((s || "").toString().toLowerCase().includes("preferred") ? 60 : 45);
        const weightSum = selected.reduce((s, i) => s + (i.weight || 0), 0) || 1;
        const stabilityScore = Math.round(Math.min(100, Math.max(0,
            selected.reduce((s, i) => {
                const w = (i.weight || 0) / weightSum;
                return s + w * (0.4 * volScore(i.hv30) + 0.35 * rateScore(i.rateType) + 0.25 * seniorityScore(i.seniority));
            }, 0)
        )));
        const stabilityBadge = stabilityScore >= 75 ? "Low" : stabilityScore >= 55 ? "Moderate" : stabilityScore >= 40 ? "Variable" : "High";

        // Generate warnings
        const warnings = [];
        
        // Issuer concentration
        const issuerWeights = {};
        selected.forEach(instr => {
            issuerWeights[instr.issuer] = (issuerWeights[instr.issuer] || 0) + instr.weight;
        });
        Object.entries(issuerWeights).forEach(([issuer, weight]) => {
            if (weight > 70) {
                warnings.push({ type: "issuer", severity: "red", message: `${issuer} concentration: ${weight.toFixed(1)}% (Red: >70%)` });
            } else if (weight > 50) {
                warnings.push({ type: "issuer", severity: "amber", message: `${issuer} concentration: ${weight.toFixed(1)}% (Amber: >50%)` });
            }
        });

        // Liquidity mismatch
        selected.forEach(instr => {
            if (fiatPlanner.liquidityPreference === "On-demand" && instr.liquidity !== "On-demand") {
                warnings.push({ type: "liquidity", severity: "amber", message: `${instr.name}: liquidity mismatch` });
            }
        });

        // Discretionary-rate concentration
        const discretionaryWeight = selected
            .filter(instr => instr.rateType === "Discretionary")
            .reduce((sum, instr) => sum + instr.weight, 0);
        if (discretionaryWeight > 50) {
            warnings.push({ type: "discretionary", severity: "red", message: `Discretionary-rate concentration: ${discretionaryWeight.toFixed(1)}% (Red: >50%)` });
        } else if (discretionaryWeight > 30) {
            warnings.push({ type: "discretionary", severity: "amber", message: `Discretionary-rate concentration: ${discretionaryWeight.toFixed(1)}% (Amber: >30%)` });
        }

        // Eligibility
        selected.forEach(instr => {
            const eligibleInRegion = instr.region?.includes(fiatPlanner.region) || instr.region?.includes("Global");
            if (!eligibleInRegion) {
                warnings.push({ type: "eligibility", severity: "red", message: `${instr.name}: not available in ${fiatPlanner.region}` });
            }
        });

        // Risk notes: high volatility allocation (HV30; hv30 is stored as decimal e.g. 0.07 = 7%)
        const hv30Pct = (instr) => (instr.hv30 != null ? Number(instr.hv30) * 100 : 0);
        selected.forEach(instr => {
            const pct = hv30Pct(instr);
            const w = instr.weight || 0;
            if (pct >= 25 && w >= 15) {
                warnings.push({ type: "volatility", severity: "amber", message: `${w.toFixed(0)}% allocation to ${instr.name} has higher market volatility (HV30 ~${pct.toFixed(0)}%).` });
            }
        });

        // Risk notes: variable / option-like distributions
        selected.forEach(instr => {
            const isVariable = (instr.rateType || "").toString().toLowerCase() === "variable";
            const name = instr.name || "";
            const looksLikeOption = /YBTC|BTC|option|covered.?call/i.test(name);
            if (isVariable && looksLikeOption) {
                warnings.push({ type: "variable", severity: "amber", message: `${instr.name}: distributions vary due to option premiums; upside may be capped in strong rallies.` });
            }
        });

        // Generic risk note
        warnings.push({ type: "mechanics", severity: "amber", message: "All payouts depend on issuer/fund mechanics; not guaranteed." });

        const hasRedWarnings = warnings.some(w => w.severity === "red");

        const rateAsOf = selected.length
            ? selected.reduce((latest, instr) => {
                const t = instr.rateAsOf ? new Date(instr.rateAsOf).getTime() : 0;
                return t > latest ? t : latest;
            }, 0)
            : null;

        return {
            targetAnnualIncome,
            targetMonthlyIncome: targetAnnualIncome != null ? targetAnnualIncome / 12 : null,
            portfolioApyMin,
            portfolioApyMax,
            requiredCapitalMin,
            requiredCapitalMax,
            expectedIncomeMin,
            expectedIncomeMax,
            stabilityScore,
            stabilityBadge,
            warnings,
            hasRedWarnings,
            selected,
            rateAsOf: rateAsOf ? new Date(rateAsOf).toISOString() : new Date().toISOString(),
        };
    };

    const fiatResults = calculateFiatPlanner();

    const handleFiatPlannerChange = (field, value) => {
        setFiatPlanner(prev => ({ ...prev, [field]: value }));
    };

    const handleInstrumentToggle = (id) => {
        setFiatInstruments(prev => prev.map(instr => 
            instr.id === id 
                ? { ...instr, selected: !instr.selected, weight: !instr.selected ? 0 : instr.weight }
                : instr
        ));
    };

    const handleWeightChange = (id, weight) => {
        setFiatInstruments(prev => prev.map(instr => 
            instr.id === id ? { ...instr, weight: parseFloat(weight) || 0 } : instr
        ));
    };

    // Fiat scoring: duration_factor from Duration (months), liquidity_type factor, score_brut, final_score
    function getDurationFactor(durationMonths) {
        const m = durationMonths != null ? Number(durationMonths) : 12;
        if (m <= 12) return 1;
        if (m < 36) return 1.2;
        return 1.5;
    }
    function getLiquidityFactor(liquidityType) {
        const t = (liquidityType || "high").toString().toLowerCase();
        if (t === "medium") return 1.1;
        if (t === "locked") return 1.3;
        return 1;
    }
    function computeFiatScores(providers, durationMonths) {
        const duration_factor = getDurationFactor(durationMonths);
        return providers
            .map((p) => {
                const hvRaw = p.hv30Pct != null ? Number(p.hv30Pct) : 0;
                // Disqualify providers with HV30 = 0 (or missing)
                if (!hvRaw || hvRaw <= 0) return null;

                const apyMin = p.apyMinPct != null ? Number(p.apyMinPct) : 0;
                const apyMax = p.apyMaxPct != null ? Number(p.apyMaxPct) : apyMin;
                const apy_avg = (apyMin + apyMax) / 2;
                const hv30Pct = hvRaw;
                const score_brut = apy_avg / hv30Pct;
                const score_after_duration = score_brut / duration_factor;
                const liquidity_factor = getLiquidityFactor(p.liquidityType || p.liquidity);
                const final_score = score_after_duration / liquidity_factor;
                return {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    jurisdiction: p.jurisdiction != null ? String(p.jurisdiction).trim() || null : null,
                    apyMinPct: apyMin,
                    apyMaxPct: apyMax,
                    apy_avg,
                    hv30Pct,
                    liquidity: (p.liquidityType || p.liquidity || "high").toString(),
                    score_brut,
                    score_after_duration,
                    final_score,
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.final_score - a.final_score);
    }

    const applyGuidedAllocation = () => {
        if (fiatInstruments.length === 0) {
            setFiatProviderRanking(null);
            return;
        }
        const ranked = computeFiatScores(fiatInstruments, fiatPlanner.durationMonths);
        const top5 = ranked.slice(0, 5);
        const top3 = ranked.slice(0, 3);
        const totalScore = top3.reduce((s, r) => s + r.final_score, 0);
        const cap = 40;
        let weights = totalScore > 0 ? top3.map((r) => (r.final_score / totalScore) * 100) : top3.map(() => 100 / 3);
        weights = weights.map((w) => Math.min(w, cap));
        const sum = weights.reduce((s, w) => s + w, 0);
        const normalized = sum > 0 ? weights.map((w) => (w / sum) * 100) : weights.map(() => 100 / 3);
        const allocation = top3.map((r, i) => ({ ...r, weight: Math.round(normalized[i] * 10) / 10 }));
        let allocSum = allocation.reduce((s, a) => s + a.weight, 0);
        if (allocSum !== 100 && allocation.length > 0) allocation[0].weight = Math.round((allocation[0].weight + (100 - allocSum)) * 10) / 10;
        setFiatProviderRanking({ ranked, top5, allocation });

        const allocationById = new Map(allocation.map((a) => [a.id, a]));
        setFiatInstruments((prev) =>
            prev.map((instr) => {
                const a = allocationById.get(instr.id);
                if (!a) return { ...instr, selected: false, weight: 0 };
                return { ...instr, selected: true, weight: a.weight };
            })
        );
    };

    const fiatScoredRanking = useMemo(
        () => computeFiatScores(fiatInstruments, fiatPlanner.durationMonths),
        [fiatInstruments, fiatPlanner.durationMonths]
    );
    const fiatTop5 = fiatScoredRanking.slice(0, 5);
    const capitalForRevenue = Number(fiatPlanner.capital) || 0;

    const persistFiatPlannerSaves = (list) => {
        setFiatPlannerSaves(list);
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(FIAT_PLANNER_STORAGE_KEY, JSON.stringify(list));
            }
        } catch (_) {}
    };

    const saveFiatPlannerOutput = () => {
        if (!fiatResults) {
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
                mode: fiatPlanner.mode,
            },
            instruments: fiatInstruments.map((i) => ({ id: i.id, selected: i.selected, weight: i.weight ?? 0 })),
            outputs: {
                portfolioApyMin: fiatResults.portfolioApyMin,
                portfolioApyMax: fiatResults.portfolioApyMax,
                expectedIncomeMin: fiatResults.expectedIncomeMin,
                expectedIncomeMax: fiatResults.expectedIncomeMax,
                stabilityScore: fiatResults.stabilityScore,
                stabilityBadge: fiatResults.stabilityBadge,
                rateAsOf: fiatResults.rateAsOf,
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
            setFiatInstruments((prev) =>
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

    const persistStablecoinPlannerSaves = (list) => {
        setStablecoinPlannerSaves(list);
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(STABLECOIN_PLANNER_STORAGE_KEY, JSON.stringify(list));
            }
        } catch (_) {}
    };
    const saveStablecoinPlannerScenario = () => {
        if (!stablecoinResults) {
            setStablecoinSaveMessage("Fill in the fields and select instruments (100% weight) to save.");
            setTimeout(() => setStablecoinSaveMessage(""), 3000);
            return;
        }
        const createdAt = new Date().toISOString();
        const save = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `stablecoin-${Date.now()}`,
            createdAt,
            inputs: {
                stablecoinAsset: stablecoinPlanner.stablecoinAsset,
                horizon: stablecoinPlanner.horizon,
                region: stablecoinPlanner.region,
                liquidityPreference: stablecoinPlanner.liquidityPreference,
                mode: stablecoinPlanner.mode,
                targetMonthlyIncome: stablecoinPlanner.targetMonthlyIncome,
            },
            instruments: stablecoinInstruments.map((i) => ({ id: i.id, selected: i.selected, weight: i.weight ?? 0 })),
            outputs: {
                monthlyIncomeMin: stablecoinResults.monthlyIncomeMin,
                monthlyIncomeMax: stablecoinResults.monthlyIncomeMax,
                totalIncomeMin: stablecoinResults.totalIncomeMin,
                totalIncomeMax: stablecoinResults.totalIncomeMax,
            },
        };
        const next = [save, ...stablecoinPlannerSaves].slice(0, 20);
        persistStablecoinPlannerSaves(next);
        setStablecoinSaveMessage("Scenario saved.");
        setTimeout(() => setStablecoinSaveMessage(""), 3000);
    };
    const recallStablecoinPlannerSave = (save) => {
        if (!save?.inputs) return;
        setStablecoinPlanner((prev) => ({ ...prev, ...save.inputs }));
        if (save.instruments?.length) {
            const byId = new Map(save.instruments.map((s) => [s.id, s]));
            setStablecoinInstruments((prev) =>
                prev.map((m) => {
                    const s = byId.get(m.id);
                    return s ? { ...m, selected: s.selected, weight: s.weight ?? 0 } : m;
                })
            );
        }
        setStablecoinSaveMessage("Scenario recalled.");
        setTimeout(() => setStablecoinSaveMessage(""), 3000);
    };
    const deleteStablecoinPlannerSave = (id) => {
        persistStablecoinPlannerSaves(stablecoinPlannerSaves.filter((s) => s.id !== id));
        setStablecoinDeleteConfirmId(null);
    };

    // Stablecoin Income Planner calculations (uses default principal for income projection)
    const DEFAULT_STABLECOIN_PRINCIPAL = 100000;
    const calculateStablecoinPlanner = () => {
        const principal = parseFloat(stablecoinPlanner.principal) || DEFAULT_STABLECOIN_PRINCIPAL;
        const horizon = stablecoinPlanner.horizon || 12;
        const targetMonthly = parseFloat(stablecoinPlanner.targetMonthlyIncome) || 0;

        // Filter by stablecoin asset
        const filtered = stablecoinInstruments.filter(instr => 
            instr.supportedAsset === stablecoinPlanner.stablecoinAsset
        );

        // Get selected instruments
        const selected = filtered.filter(instr => instr.selected);
        const totalWeight = selected.reduce((sum, instr) => sum + (instr.weight || 0), 0);

        if (selected.length === 0 || totalWeight !== 100) return null;

        // Calculate monthly income range
        const monthlyIncomeMin = selected.reduce((sum, instr) => {
            const eligible = instr.eligibilityStatus === "Eligible";
            if (!eligible || instr.apyMin == null) return sum;
            return sum + (principal * (instr.weight / 100) * (Number(instr.apyMin) / 100) / 12);
        }, 0);
        const monthlyIncomeMax = selected.reduce((sum, instr) => {
            const eligible = instr.eligibilityStatus === "Eligible";
            if (!eligible || instr.apyMax == null) return sum;
            return sum + (principal * (instr.weight / 100) * (Number(instr.apyMax) / 100) / 12);
        }, 0);

        // Total income over horizon
        const totalIncomeMin = monthlyIncomeMin * horizon;
        const totalIncomeMax = monthlyIncomeMax * horizon;

        // Gap vs target
        const gapVsTarget = targetMonthly > 0 ? targetMonthly - monthlyIncomeMin : null;

        // Generate warnings
        const warnings = [];

        // Eligibility warnings
        selected.forEach(instr => {
            if (instr.eligibilityStatus === "Not eligible") {
                warnings.push({ type: "eligibility", severity: "red", message: `${instr.productName}: Not eligible in ${stablecoinPlanner.region}` });
            } else if (instr.eligibilityStatus === "Check eligibility") {
                warnings.push({ type: "eligibility", severity: "amber", message: `${instr.productName}: Check eligibility for ${stablecoinPlanner.region}` });
            }
        });

        // Liquidity mismatch
        selected.forEach(instr => {
            const pref = stablecoinPlanner.liquidityPreference;
            if (pref === "On-demand" && instr.liquidity !== "On-demand" && instr.liquidity !== "Flexible") {
                warnings.push({ type: "liquidity", severity: "amber", message: `${instr.productName}: liquidity mismatch (${instr.liquidity} vs ${pref})` });
            } else if (pref === "24h" && (instr.liquidity === "Weekly" || instr.liquidity === "Monthly" || instr.liquidity === "Locked")) {
                warnings.push({ type: "liquidity", severity: "red", message: `${instr.productName}: significant liquidity mismatch` });
            }
        });

        // Counterparty concentration (CeFi)
        const cefiWeights = {};
        selected.filter(instr => instr.venueType === "CeFi").forEach(instr => {
            cefiWeights[instr.issuer] = (cefiWeights[instr.issuer] || 0) + instr.weight;
        });
        Object.entries(cefiWeights).forEach(([issuer, weight]) => {
            if (weight > 70) {
                warnings.push({ type: "counterparty", severity: "red", message: `${issuer} concentration: ${weight.toFixed(1)}% (Red: >70%)` });
            } else if (weight > 50) {
                warnings.push({ type: "counterparty", severity: "amber", message: `${issuer} concentration: ${weight.toFixed(1)}% (Amber: >50%)` });
            }
        });

        // Smart-contract exposure (DeFi)
        const defiWeight = selected
            .filter(instr => instr.venueType === "DeFi")
            .reduce((sum, instr) => sum + instr.weight, 0);
        if (defiWeight > 85) {
            warnings.push({ type: "smart-contract", severity: "red", message: `DeFi exposure: ${defiWeight.toFixed(1)}% (Red: >85%)` });
        } else if (defiWeight > 70) {
            warnings.push({ type: "smart-contract", severity: "amber", message: `DeFi exposure: ${defiWeight.toFixed(1)}% (Amber: >70%)` });
        }

        // Promo-rate exposure
        const promoWeight = selected
            .filter(instr => instr.rateType === "Promo")
            .reduce((sum, instr) => sum + instr.weight, 0);
        if (promoWeight > 50) {
            warnings.push({ type: "promo", severity: "red", message: `Promo-rate exposure: ${promoWeight.toFixed(1)}% (Red: >50%)` });
        } else if (promoWeight > 30) {
            warnings.push({ type: "promo", severity: "amber", message: `Promo-rate exposure: ${promoWeight.toFixed(1)}% (Amber: >30%)` });
        }

        // Stablecoin concentration (100% in one asset - reminder)
        if (selected.length === 1 && selected[0].weight === 100) {
            warnings.push({ type: "peg", severity: "amber", message: `100% allocation to ${stablecoinPlanner.stablecoinAsset} - consider peg risk and issuer model` });
        }

        const hasRedWarnings = warnings.some(w => w.severity === "red");

        const rateAsOf = selected.length
            ? selected.reduce((latest, instr) => {
                const t = instr.rateAsOf ? new Date(instr.rateAsOf).getTime() : 0;
                return t > latest ? t : latest;
            }, 0)
            : null;

        return {
            monthlyIncomeMin,
            monthlyIncomeMax,
            totalIncomeMin,
            totalIncomeMax,
            gapVsTarget,
            warnings,
            hasRedWarnings,
            selected,
            rateAsOf: rateAsOf ? new Date(rateAsOf).toISOString() : new Date().toISOString(),
        };
    };

    const stablecoinResults = calculateStablecoinPlanner();

    const handleStablecoinPlannerChange = (field, value) => {
        setStablecoinPlanner(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleStablecoinInstrumentToggle = (id) => {
        setStablecoinInstruments(prev => prev.map(instr => 
            instr.id === id 
                ? { ...instr, selected: !instr.selected, weight: !instr.selected ? 0 : instr.weight }
                : instr
        ));
    };

    const handleStablecoinWeightChange = (id, weight) => {
        setStablecoinInstruments(prev => prev.map(instr => 
            instr.id === id ? { ...instr, weight: parseFloat(weight) || 0 } : instr
        ));
    };

    const applyStablecoinGuidedAllocation = () => {
        const eligible = stablecoinInstruments.filter(instr => 
            instr.supportedAsset === stablecoinPlanner.stablecoinAsset &&
            (instr.eligibilityStatus === "Eligible" || instr.eligibilityStatus === "Check eligibility")
        );
        
        if (eligible.length === 0) return;

        // Diversify across venue types
        const defi = eligible.find(e => e.venueType === "DeFi");
        const cefi = eligible.find(e => e.venueType === "CeFi");
        const rwa = eligible.find(e => e.venueType === "RWA");

        const allocation = [];
        if (defi) allocation.push({ id: defi.id, weight: 40 });
        if (cefi) allocation.push({ id: cefi.id, weight: 35 });
        if (rwa) allocation.push({ id: rwa.id, weight: 25 });

        // Normalize weights to 100%
        const totalWeight = allocation.reduce((sum, a) => sum + a.weight, 0);
        if (totalWeight > 0) {
            allocation.forEach(a => a.weight = (a.weight / totalWeight) * 100);
        }

        setStablecoinInstruments(prev => prev.map(instr => {
            const alloc = allocation.find(a => a.id === instr.id);
            if (alloc) {
                return { ...instr, selected: true, weight: alloc.weight };
            }
            return { ...instr, selected: false, weight: 0 };
        }));
    };

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
                        {/* Header */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                        >
                            <div className="mb-4">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-900 mb-2 flex items-center gap-2">
                                    <DollarSign className="text-blue-500" size={24} />
                                    Fiat Income Planner
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-600">
                                    Plan a target FIAT income stream using BTC-linked income wrappers, manager products, and corporate/structured issuances. Risk-first approach with conditional language (estimates only).
                                </p>
                            </div>
                        </div>

                        {/* Inputs Section */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                        >
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">User inputs</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Capital (USD)
                                    </label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.capital === "" ? "" : fiatPlanner.capital}
                                        onChange={(e) => handleFiatPlannerChange("capital", e.target.value === "" ? "" : Number(e.target.value))}
                                        placeholder="100000"
                                        min={0}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Duration (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.durationMonths ?? 12}
                                        onChange={(e) => handleFiatPlannerChange("durationMonths", e.target.value === "" ? "" : parseInt(e.target.value, 10) || 12)}
                                        placeholder="12"
                                        min={1}
                                        max={120}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Allocation mode
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleFiatPlannerChange("mode", "Guided");
                                                if (fiatPlanner.mode !== "Guided") {
                                                    setTimeout(applyGuidedAllocation, 100);
                                                }
                                            }}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                                                fiatPlanner.mode === "Guided"
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            Guided
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFiatPlannerChange("mode", "Custom")}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                                                fiatPlanner.mode === "Custom"
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Instrument Selection */}
                        {fiatPlanner.mode === "Custom" && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/40 dark:border-slate-800/40 p-6 md:p-8 shadow-sm overflow-hidden"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03)' }}
                            >
                                <div className="mb-6 pb-4 border-b-2 border-slate-200">
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-1 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
                                            <Wallet size={22} />
                                        </span>
                                        Choose providers and allocate investments
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-600 flex items-center gap-1.5 mt-2">
                                        <Percent size={14} className="text-emerald-500" />
                                        Total allocation must equal <span className="font-semibold text-emerald-700">100%</span>.
                                    </p>
                                </div>
                                {fiatInstrumentsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                        <RefreshCw size={32} className="animate-spin text-blue-500 mb-3" />
                                        <p>Loading providers…</p>
                                    </div>
                                ) : fiatInstruments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                                        <Wallet size={40} className="text-slate-300 mb-3" />
                                        <p className="text-slate-600 font-medium">No providers yet</p>
                                        <p className="text-sm text-slate-500 mt-1">Add some in Admin → Crypto Lending Providers or use Load top 20 from ChatGPT.</p>
                                    </div>
                                ) : (
                                <div className="space-y-3">
                                    {fiatInstruments.map((instr) => {
                                        const scoreInfo = fiatScoredRanking.find((s) => s.id === instr.id);
                                        const isSelected = instr.selected;
                                        return (
                                        <div
                                            key={instr.id}
                                            className={`rounded-xl border-2 p-4 transition-all duration-200 ${
                                                isSelected
                                                    ? "border-blue-300 bg-blue-50/50 dark:bg-blue-50/20 shadow-sm"
                                                    : "border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/50"
                                            }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <label className="flex-shrink-0 mt-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleInstrumentToggle(instr.id)}
                                                        className="w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                                    />
                                                </label>
                                                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-200/80 text-slate-600 flex-shrink-0">
                                                        <Wallet size={18} />
                                                    </span>
                                                    <h5 className="font-semibold text-slate-900 dark:text-slate-900">{instr.name}</h5>
                                                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-medium tabular-nums">
                                                        <Percent size={11} className="text-emerald-600" />
                                                        {instr.apyMinPct != null && instr.apyMaxPct != null ? `${instr.apyMinPct}% – ${instr.apyMaxPct}%` : (instr.apyMin != null && instr.apyMax != null ? `${Number(instr.apyMin) * 100}% – ${Number(instr.apyMax) * 100}%` : (instr.rateType || "—"))}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-medium tabular-nums">
                                                        <Activity size={11} className="text-amber-600" />
                                                        HV30: {instr.hv30Pct != null ? `${Number(instr.hv30Pct).toFixed(1)}%` : "—"}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{instr.type}</span>
                                                    {scoreInfo != null && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-medium">
                                                            <Award size={10} /> {scoreInfo.final_score.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200/60 text-xs">
                                                        <Droplets size={11} className="text-sky-600" />
                                                        {instr.liquidity}
                                                    </span>
                                                    {isSelected && (
                                                        <div className="flex items-center gap-1 ml-auto bg-white rounded-lg border-2 border-blue-200 px-3 py-1.5 shadow-sm">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={instr.weight}
                                                                onChange={(e) => handleWeightChange(instr.id, e.target.value)}
                                                                className="w-14 text-center text-lg font-bold text-slate-900 bg-transparent border-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <span className="text-sm font-semibold text-blue-600">%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );})}
                                    {(() => {
                                        const total = fiatInstruments.filter(i => i.selected).reduce((sum, i) => sum + (i.weight || 0), 0);
                                        const isComplete = Math.abs(total - 100) < 0.01;
                                        return (
                                    <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border-2 px-4 py-3 ${isComplete ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-50/30" : "border-amber-200 bg-amber-50/50 dark:bg-amber-50/20"}`}>
                                        <span className={`flex items-center gap-2 font-semibold ${isComplete ? "text-emerald-800" : "text-amber-800"}`}>
                                            {isComplete ? (
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-200 text-emerald-800">
                                                    <Percent size={16} />
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800">
                                                    <AlertTriangle size={16} />
                                                </span>
                                            )}
                                            Total weight: <span className="tabular-nums">{total.toFixed(1)}%</span>
                                        </span>
                                        {!isComplete && (
                                            <span className="text-sm text-amber-700">Must be 100% to show results</span>
                                        )}
                                    </div>
                                    );})()}
                                </div>
                                )}
                            </div>
                        )}

                        {/* Top 5 providers by final_score (both modes) */}
                        {fiatTop5.length > 0 && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 flex items-center gap-2">
                                        <Award size={20} className="text-amber-500" /> Top 5 providers (score)
                                    </h4>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <TrendingUp size={12} /> Ranked by final score (APY / HV30 / liquidity)
                                    </p>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-gradient-to-b from-slate-50/80 to-white shadow-inner">
                                    <table className="min-w-full text-xs md:text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-slate-200 bg-slate-100/70 text-slate-700 dark:text-slate-700 text-left">
                                                <th className="py-2.5 pr-3 font-semibold w-12 text-center">
                                                    <span className="inline-flex items-center justify-center gap-1"><Trophy size={14} className="text-amber-500" /> #</span>
                                                </th>
                                                <th className="py-2.5 pr-4 font-semibold">
                                                    <span className="inline-flex items-center gap-1.5"><Wallet size={14} className="text-blue-600" /> Provider</span>
                                                </th>
                                                <th className="py-2.5 pr-4 font-semibold">Jurisdiction</th>
                                                <th className="py-2.5 pr-4 font-semibold">
                                                    <span className="inline-flex items-center gap-1.5"><Percent size={14} className="text-emerald-600" /> APY</span>
                                                </th>
                                                <th className="py-2.5 pr-4 font-semibold">
                                                    <span className="inline-flex items-center gap-1.5"><Activity size={14} className="text-amber-600" /> HV30</span>
                                                </th>
                                                <th className="py-2.5 pr-4 font-semibold">
                                                    <span className="inline-flex items-center gap-1.5"><Droplets size={14} className="text-sky-600" /> Liquidity</span>
                                                </th>
                                                <th className="py-2.5 pr-4 font-semibold">
                                                    <span className="inline-flex items-center gap-1.5"><Award size={14} className="text-emerald-600" /> Score</span>
                                                </th>
                                                <th className="py-2.5 pr-4 font-semibold hidden md:table-cell">
                                                    <span className="inline-flex items-center gap-1.5"><DollarSign size={14} className="text-green-600" /> Income</span>
                                                </th>
                                                <th className="py-2.5 font-semibold hidden md:table-cell">
                                                    <span className="inline-flex items-center gap-1.5"><DollarSign size={14} className="text-green-700" /> Max</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fiatTop5.map((r, idx) => {
                                                const annualMin = capitalForRevenue * r.apy_avg / 100;
                                                const annualMax = capitalForRevenue * (r.apyMaxPct || r.apy_avg) / 100;
                                                const rankBg = idx === 0 ? "bg-amber-100 text-amber-800 border-amber-200" : idx === 1 ? "bg-slate-200 text-slate-700 border-slate-300" : idx === 2 ? "bg-amber-100/80 text-amber-800 border-amber-200/80" : "bg-slate-100 text-slate-600 border-slate-200";
                                                const hv30 = r.hv30Pct;
                                                const hv30Color = hv30 < 12 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : hv30 < 22 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-orange-100 text-orange-800 border-orange-200";
                                                return (
                                                    <tr key={r.id} className="border-b border-slate-100 last:border-0 bg-white/70 hover:bg-slate-50/80 transition-colors">
                                                        <td className="py-2.5 pr-3 text-center">
                                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 font-bold text-sm tabular-nums ${rankBg}`} title={`Rank ${idx + 1}`}>
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                                    <Wallet size={14} className="text-blue-600" />
                                                                </span>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-slate-900 dark:text-slate-900 font-semibold">{r.name}</span>
                                                                    <span className="text-[11px] text-slate-500">Type: {r.type || "N/A"}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-700">
                                                            {r.jurisdiction ?? "—"}
                                                        </td>
                                                        <td className="py-2.5 pr-4 tabular-nums">
                                                            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 bg-emerald-50 text-emerald-800 font-medium border border-emerald-200/60">
                                                                <Percent size={12} className="text-emerald-600" />
                                                                {r.apyMinPct != null && r.apyMaxPct != null
                                                                    ? `${r.apyMinPct.toFixed(1)}% – ${r.apyMaxPct.toFixed(1)}%`
                                                                    : r.apy_avg.toFixed(1) + "%"}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-4">
                                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] tabular-nums font-medium border ${hv30Color}`}>
                                                                <Activity size={11} />
                                                                {r.hv30Pct.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-4">
                                                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] capitalize font-medium bg-sky-50 text-sky-800 border border-sky-200/60">
                                                                <Droplets size={11} className="text-sky-600" />
                                                                {r.liquidity}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-4 tabular-nums">
                                                            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/60">
                                                                <Award size={12} className="text-emerald-600" />
                                                                {r.final_score.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-4 tabular-nums hidden md:table-cell">
                                                            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-700 font-medium">
                                                                <DollarSign size={12} className="text-green-600" />
                                                                ${annualMin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 tabular-nums hidden md:table-cell">
                                                            <span className="inline-flex items-center gap-1 text-green-800 dark:text-green-800 font-semibold">
                                                                <DollarSign size={12} className="text-green-600" />
                                                                ${annualMax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {fiatResults && (
                            <>
                                {/* Allocation Summary — sorted by score, with income ranges */}
                                {(() => {
                                    const capital = Number(fiatPlanner.capital) || 0;
                                    const sortedSelected = [...fiatResults.selected].sort((a, b) => {
                                        const scoreA = fiatScoredRanking.find((s) => s.id === a.id)?.final_score ?? 0;
                                        const scoreB = fiatScoredRanking.find((s) => s.id === b.id)?.final_score ?? 0;
                                        return scoreB - scoreA;
                                    });
                                    const pctMin = (i) => (i.apyMinPct != null ? Number(i.apyMinPct) : (i.apyMin != null ? Number(i.apyMin) * 100 : 0));
                                    const pctMax = (i) => (i.apyMaxPct != null ? Number(i.apyMaxPct) : (i.apyMax != null ? Number(i.apyMax) * 100 : 0));
                                    return (
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/40 dark:border-slate-800/40 p-6 md:p-8 shadow-sm"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03)' }}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 flex items-center gap-2">
                                            <LayoutList className="text-slate-600 dark:text-slate-600" size={22} />
                                            Allocation Summary
                                        </h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <Award size={14} className="text-amber-500" />
                                            Ranked by score • Rate as of: {new Date(fiatResults.rateAsOf).toLocaleString()}
                                        </p>
                                    </div>
                                    {/* Annual & Monthly income range — prominent */}
                                    {fiatResults.expectedIncomeMin != null && fiatResults.expectedIncomeMax != null && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-50/80 border border-emerald-200/60 p-4">
                                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                    <Calendar size={14} /> Annual income range
                                                </p>
                                                <p className="text-xl font-bold text-emerald-900 dark:text-emerald-900 tabular-nums">
                                                    ${fiatResults.expectedIncomeMin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} – ${fiatResults.expectedIncomeMax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </p>
                                                <p className="text-xs text-emerald-600 mt-1">/ year</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 dark:bg-slate-50 border border-slate-200/60 p-4">
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                    <CalendarDays size={14} /> Monthly income range
                                                </p>
                                                <p className="text-xl font-bold text-slate-900 dark:text-slate-900 tabular-nums">
                                                    ${(fiatResults.expectedIncomeMin / 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} – ${(fiatResults.expectedIncomeMax / 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">/ month</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {sortedSelected.map((instr, idx) => {
                                            const ranking = fiatScoredRanking.find((r) => r.id === instr.id);
                                            const finalScore = ranking?.final_score ?? 0;
                                            const recLevel = finalScore > 1 ? "Recommended" : finalScore >= 0.7 ? "Moderate" : "Avoid";
                                            const annualMin = capital * (instr.weight / 100) * (pctMin(instr) / 100);
                                            const annualMax = capital * (instr.weight / 100) * (pctMax(instr) / 100);
                                            return (
                                            <div key={instr.id} className="rounded-xl border border-slate-200/60 bg-slate-50/50 dark:bg-slate-50/30 p-4 flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-200 text-slate-700 dark:text-slate-700 font-bold text-sm flex items-center justify-center tabular-nums" title="Rank">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className="font-semibold text-slate-900 dark:text-slate-900 flex items-center gap-1.5">
                                                                <Wallet size={14} className="text-slate-500" /> {instr.name}
                                                            </span>
                                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-700 tabular-nums">
                                                                {instr.weight}%
                                                            </span>
                                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${
                                                                recLevel === "Recommended" ? "bg-green-100 text-green-800" :
                                                                recLevel === "Moderate" ? "bg-blue-100 text-blue-800" :
                                                                "bg-slate-100 text-slate-700"
                                                            }`}>
                                                                {recLevel}
                                                            </span>
                                                            <span className="text-xs text-slate-500 tabular-nums">score {finalScore.toFixed(2)}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-1">{instr.type} • {String(instr.liquidity || "").toLowerCase()}</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-600 tabular-nums flex items-center gap-1">
                                                            <Percent size={12} className="text-slate-500" />
                                                            APY: {instr.apyMinPct != null && instr.apyMaxPct != null ? `${instr.apyMinPct}% – ${instr.apyMaxPct}%` : (instr.apyMin != null && instr.apyMax != null ? `${Number(instr.apyMin) * 100}% – ${Number(instr.apyMax) * 100}%` : "—")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end text-right flex-shrink-0">
                                                    <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                                                        <DollarSign size={12} /> Est. income (this provider)
                                                    </p>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-900 tabular-nums">
                                                        ${annualMin.toLocaleString('en-US', { maximumFractionDigits: 0 })} – ${annualMax.toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr
                                                    </p>
                                                    <p className="text-xs text-slate-500 tabular-nums">
                                                        ${(annualMin / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} – ${(annualMax / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                                                    </p>
                                                </div>
                                            </div>
                                        );})}
                                    </div>
                                </div>
                                    );
                                })()}

                                {/* Expected results (Guided: allocation across 3 providers; Custom: chosen allocation) */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4 flex items-center gap-2">
                                        <TrendingUp size={20} className="text-slate-600" />
                                        {fiatPlanner.mode === "Guided" ? "Expected results with allocation across 3 providers" : "Expected results"}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1 flex items-center gap-1.5">
                                                <Percent size={14} /> Portfolio APY (min – max)
                                            </p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                {fiatResults.portfolioApyMin.toFixed(1)}% – {fiatResults.portfolioApyMax.toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">As of: {new Date(fiatResults.rateAsOf).toLocaleDateString()}</p>
                                        </div>
                                        {fiatResults.expectedIncomeMin != null && (
                                            <>
                                                <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                                    <p className="text-xs text-slate-600 dark:text-slate-600 mb-1 flex items-center gap-1.5">
                                                        <Calendar size={14} /> Annual income range
                                                    </p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                        ${fiatResults.expectedIncomeMin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} – ${fiatResults.expectedIncomeMax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">/ year</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                                    <p className="text-xs text-slate-600 dark:text-slate-600 mb-1 flex items-center gap-1.5">
                                                        <CalendarDays size={14} /> Monthly income range
                                                    </p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                        ${(fiatResults.expectedIncomeMin / 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} – ${(fiatResults.expectedIncomeMax / 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">/ month</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                            </>
                        )}

                        {/* Save and recall scenario (like BTC Income Planner) */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-900 mb-3">Save and recall a scenario</h4>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={saveFiatPlannerOutput}
                                    disabled={!fiatResults}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <Save size={16} />
                                    Save results
                                </button>
                                {fiatSaveMessage && (
                                    <span className="text-sm text-slate-600 dark:text-slate-600">{fiatSaveMessage}</span>
                                )}
                            </div>
                            {fiatPlannerSaves.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">Saved scenarios</p>
                                    <ul className="space-y-2">
                                        {fiatPlannerSaves.map((save) => {
                                            const d = save.createdAt ? new Date(save.createdAt) : null;
                                            const dateStr = d ? d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
                                            const timeStr = d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
                                            const out = save.outputs;
                                            const summaryStr = out
                                                ? `Portfolio APY: ${out.portfolioApyMin?.toFixed(1) ?? "—"}% – ${out.portfolioApyMax?.toFixed(1) ?? "—"}% · Annual income: $${Number(out.expectedIncomeMin ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} – $${Number(out.expectedIncomeMax ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr`
                                                : "—";
                                            return (
                                                <li key={save.id} className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-50/50">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-slate-500 dark:text-slate-500">
                                                            Saved on {dateStr} at {timeStr}
                                                        </span>
                                                        <span className="text-sm text-slate-700 dark:text-slate-700">{summaryStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {fiatDeleteConfirmId === save.id ? (
                                                            <>
                                                                <span className="text-xs text-slate-600 dark:text-slate-600 mr-1">Delete?</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFiatDeleteConfirmId(null)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteFiatPlannerSave(save.id)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-red-500 text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => recallFiatPlannerSave(save)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                                >
                                                                    Recall
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFiatDeleteConfirmId(save.id)}
                                                                    className="inline-flex items-center p-1.5 text-slate-400 hover:text-red-600 rounded focus:ring-2 focus:ring-red-500"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
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

                        {/* Compliance Note */}
                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex gap-3">
                                <Info className="text-slate-500 flex-shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-slate-600 dark:text-slate-600 leading-relaxed">
                                    <p className="font-medium mb-1">Compliance Note</p>
                                    <p>All calculations are scenario illustrations based on user-defined assumptions and snapshot data. Rates & terms can change. Digital Credit Compass does not provide investment advice and does not execute transactions.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "stablecoin" && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                        >
                            <div className="mb-4">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-900 mb-2 flex items-center gap-2">
                                    <CircleDollarSign className="text-green-500" size={24} />
                                    Stablecoin Income Planner
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-600">
                                    Plan a target stablecoin income stream using DeFi lending, protocol savings rates, CeFi rewards, and RWA pools. Risk-first approach with snapshot-driven rates.
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
                                        Stablecoin Asset
                                    </label>
                                    <select
                                        value={stablecoinPlanner.stablecoinAsset}
                                        onChange={(e) => handleStablecoinPlannerChange("stablecoinAsset", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    >
                                        <option value="USDC">USDC</option>
                                        <option value="USDT">USDT</option>
                                        <option value="DAI">DAI</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Horizon (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={stablecoinPlanner.horizon}
                                        onChange={(e) => handleStablecoinPlannerChange("horizon", parseInt(e.target.value) || 12)}
                                        placeholder="12"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Region
                                    </label>
                                    <select
                                        value={stablecoinPlanner.region}
                                        onChange={(e) => handleStablecoinPlannerChange("region", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    >
                                        <option value="UAE">UAE</option>
                                        <option value="US">US</option>
                                        <option value="EU">EU</option>
                                        <option value="UK">UK</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Liquidity Preference
                                    </label>
                                    <select
                                        value={stablecoinPlanner.liquidityPreference}
                                        onChange={(e) => handleStablecoinPlannerChange("liquidityPreference", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    >
                                        <option value="On-demand">On-demand</option>
                                        <option value="24h">24h</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Locked">Locked</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Mode
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                handleStablecoinPlannerChange("mode", "Guided");
                                                if (stablecoinPlanner.mode !== "Guided") {
                                                    setTimeout(applyStablecoinGuidedAllocation, 100);
                                                }
                                            }}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                                                stablecoinPlanner.mode === "Guided"
                                                    ? "bg-green-500 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            Guided
                                        </button>
                                        <button
                                            onClick={() => handleStablecoinPlannerChange("mode", "Custom")}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                                                stablecoinPlanner.mode === "Custom"
                                                    ? "bg-green-500 text-white"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Target Monthly Income (USD) <span className="text-slate-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={stablecoinPlanner.targetMonthlyIncome}
                                        onChange={(e) => handleStablecoinPlannerChange("targetMonthlyIncome", e.target.value)}
                                        placeholder="120"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Instrument Selection */}
                        {stablecoinPlanner.mode === "Custom" && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Select Instruments</h4>
                                {stablecoinInstrumentsLoading ? (
                                    <p className="text-slate-500 py-4">Loading instruments…</p>
                                ) : (
                                <div className="space-y-3">
                                    {stablecoinInstruments
                                        .filter(instr => instr.supportedAsset === stablecoinPlanner.stablecoinAsset)
                                        .map((instr) => (
                                        <div key={instr.id} className="border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={instr.selected}
                                                    onChange={() => handleStablecoinInstrumentToggle(instr.id)}
                                                    className="mt-1 w-4 h-4"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <h5 className="font-semibold text-slate-900 dark:text-slate-900">{instr.productName}</h5>
                                                            <p className="text-xs text-slate-600 dark:text-slate-600">
                                                                {instr.issuer} • {instr.venueType}
                                                                {instr.chain && ` • ${instr.chain}`}
                                                            </p>
                                                        </div>
                                                        {instr.selected && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={instr.weight}
                                                                    onChange={(e) => handleStablecoinWeightChange(instr.id, e.target.value)}
                                                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-sm font-bold text-slate-900"
                                                                />
                                                                <span className="text-sm text-slate-600">%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-600 mb-2">
                                                        <div>
                                                            <span className="font-medium">APY:</span> {instr.apyMinPct != null && instr.apyMaxPct != null ? `${instr.apyMinPct}% – ${instr.apyMaxPct}%` : (instr.apyMin != null && instr.apyMax != null ? `${Number(instr.apyMin) * 100}% – ${Number(instr.apyMax) * 100}%` : (instr.rateType || "—"))}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Type:</span> {instr.rateType}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Liquidity:</span> {instr.liquidity}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Eligibility:</span> {instr.eligibilityStatus}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Risks: {Array.isArray(instr.riskTags) ? instr.riskTags.join(", ") : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-sm text-slate-600 dark:text-slate-600 mt-2">
                                        Total Weight: {stablecoinInstruments.filter(i => i.selected).reduce((sum, i) => sum + (i.weight || 0), 0).toFixed(1)}%
                                    </div>
                                </div>
                                )}
                            </div>
                        )}

                        {/* Results */}
                        {stablecoinResults && (
                            <>
                                {/* Allocation Table */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Allocation Summary</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Issuer</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Product</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Venue</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Chain</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Liquidity</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">APY Range</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Rate Type</th>
                                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-700">Weight</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stablecoinResults.selected.map((instr, idx) => (
                                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="py-3 px-4 text-sm text-slate-900 dark:text-slate-900">{instr.issuer}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.productName}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.venueType}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.chain || "N/A"}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.liquidity}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.apyMinPct != null && instr.apyMaxPct != null ? `${instr.apyMinPct}% – ${instr.apyMaxPct}%` : (instr.apyMin != null && instr.apyMax != null ? `${Number(instr.apyMin) * 100}% – ${Number(instr.apyMax) * 100}%` : (instr.rateType || "—"))}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.rateType}</td>
                                                        <td className="py-3 px-4 text-sm font-semibold text-slate-900 dark:text-slate-900">{instr.weight}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-4">
                                        Rate as of: {new Date(stablecoinResults.rateAsOf).toLocaleString()}
                                    </div>
                                </div>

                                {/* Estimated Income Range */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Estimated Income</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Monthly Income Range</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                ${stablecoinResults.monthlyIncomeMin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${stablecoinResults.monthlyIncomeMax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Total Income Over {stablecoinPlanner.horizon} Months</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                ${stablecoinResults.totalIncomeMin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${stablecoinResults.totalIncomeMax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Gap vs Target */}
                                {stablecoinResults.gapVsTarget !== null && (
                                    <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                    >
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Gap vs Target</h4>
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Monthly Income Gap (using conservative estimate)</p>
                                            <p className={`text-xl font-bold ${
                                                stablecoinResults.gapVsTarget >= 0 
                                                    ? "text-green-600" 
                                                    : "text-red-600"
                                            }`}>
                                                {stablecoinResults.gapVsTarget >= 0 ? "+" : ""}${stablecoinResults.gapVsTarget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Target: ${stablecoinPlanner.targetMonthlyIncome} | Estimated (min): ${stablecoinResults.monthlyIncomeMin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Save and recall scenario (Stablecoin) */}
                        <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                            style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)" }}
                        >
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-900 mb-3">Save and recall a scenario</h4>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={saveStablecoinPlannerScenario}
                                    disabled={!stablecoinResults}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                >
                                    <Save size={16} />
                                    Save
                                </button>
                                {stablecoinSaveMessage && (
                                    <span className="text-sm text-slate-600 dark:text-slate-600">{stablecoinSaveMessage}</span>
                                )}
                            </div>
                            {stablecoinPlannerSaves.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">Saved scenarios</p>
                                    <ul className="space-y-2">
                                        {stablecoinPlannerSaves.map((save) => {
                                            const d = save.createdAt ? new Date(save.createdAt) : null;
                                            const dateStr = d ? d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
                                            const timeStr = d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
                                            const out = save.outputs;
                                            const summaryStr = out
                                                ? `Monthly income: $${Number(out.monthlyIncomeMin ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} – $${Number(out.monthlyIncomeMax ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                                                : "—";
                                            return (
                                                <li key={save.id} className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-50/50">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-slate-500 dark:text-slate-500">
                                                            {dateStr} at {timeStr}
                                                        </span>
                                                        <span className="text-sm text-slate-700 dark:text-slate-700">{summaryStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {stablecoinDeleteConfirmId === save.id ? (
                                                            <>
                                                                <span className="text-xs text-slate-600 dark:text-slate-600 mr-1">Delete?</span>
                                                                <button type="button" onClick={() => setStablecoinDeleteConfirmId(null)} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</button>
                                                                <button type="button" onClick={() => deleteStablecoinPlannerSave(save.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-lg border border-red-500 text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500">Delete</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button type="button" onClick={() => recallStablecoinPlannerSave(save)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-green-500 text-green-600 hover:bg-green-500 hover:text-white focus:ring-2 focus:ring-green-500 focus:ring-offset-2">Recall</button>
                                                                <button type="button" onClick={() => setStablecoinDeleteConfirmId(save.id)} className="inline-flex items-center p-1.5 text-slate-400 hover:text-red-600 rounded focus:ring-2 focus:ring-red-500" title="Delete"><Trash2 size={16} /></button>
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

                        {/* Compliance Note */}
                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex gap-3">
                                <Info className="text-slate-500 flex-shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-slate-600 dark:text-slate-600 leading-relaxed">
                                    <p className="font-medium mb-1">Compliance Note</p>
                                    <p>All calculations are scenario illustrations based on user-defined assumptions and snapshot data. Rates change frequently and are snapshot-driven with "as of" timestamps. Digital Credit Compass does not provide investment advice and does not execute transactions.</p>
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
