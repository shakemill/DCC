"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Save, Clock, Eye, Trash2, ChevronDown, ChevronUp, AlertTriangle, X, Coins, DollarSign, CircleDollarSign, Info } from "lucide-react";
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
        apr: "9",
        principal: "",
        btcPrice: "40000",
        ltv: 50,
        marginCallLtv: 75,
        liquidationLtv: 85,
    });
    const [hoveredLtv, setHoveredLtv] = useState(null);

    // Fiat Income Planner state
    const [fiatPlanner, setFiatPlanner] = useState({
        targetMonthlyIncome: "",
        targetAnnualIncome: "",
        horizon: 12,
        region: "UAE",
        liquidityPreference: "Market-traded",
        mode: "Guided",
        riskPosture: "Balanced",
        minLiquidity: "",
        excludeDiscretionary: false,
        availableCapital: "",
    });
    const [fiatInstruments, setFiatInstruments] = useState([]);
    const [fiatInstrumentsLoading, setFiatInstrumentsLoading] = useState(false);
    const [fiatWarnings, setFiatWarnings] = useState([]);
    const [redRiskAcknowledged, setRedRiskAcknowledged] = useState(false);

    // Stablecoin Income Planner state
    const [stablecoinPlanner, setStablecoinPlanner] = useState({
        stablecoinAsset: "USDC",
        horizon: 12,
        region: "UAE",
        liquidityPreference: "On-demand",
        mode: "Guided",
        targetMonthlyIncome: "",
        principal: "",
    });
    const [stablecoinInstruments, setStablecoinInstruments] = useState([]);
    const [stablecoinInstrumentsLoading, setStablecoinInstrumentsLoading] = useState(false);
    const [stablecoinRedRiskAcknowledged, setStablecoinRedRiskAcknowledged] = useState(false);

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
    }, [fiatPlanner.mode, fiatPlanner.region, fiatPlanner.excludeDiscretionary, activeTab, fiatInstrumentsLoading]);

    // Apply stablecoin guided allocation when mode changes to Guided or when stablecoin instruments load.
    // Do not include stablecoinInstruments in deps: it would retrigger after setState → infinite loop.
    useEffect(() => {
        if (stablecoinPlanner.mode === "Guided" && activeTab === "stablecoin" && !stablecoinInstrumentsLoading) {
            applyStablecoinGuidedAllocation();
        }
    }, [stablecoinPlanner.mode, stablecoinPlanner.stablecoinAsset, stablecoinPlanner.region, activeTab, stablecoinInstrumentsLoading]);

    // Fetch 1B instruments (fiat) from API
    useEffect(() => {
        if (activeTab !== "fiat") return;
        let cancelled = false;
        setFiatInstrumentsLoading(true);
        fetch("/api/instruments?module=1B")
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
                    return {
                        id: i.id,
                        issuer: i.issuer,
                        name: i.productName,
                        type: i.seniority || "—",
                        rateType: snap.rateType || i.apyLabel || "Variable",
                        apyMin: snap.apyMin != null ? Number(snap.apyMin) : null,
                        apyMax: snap.apyMax != null ? Number(snap.apyMax) : null,
                        paymentFreq: i.paymentFrequency || "—",
                        liquidity: i.lockup === "Market" ? "Market-traded" : (i.lockup || "—"),
                        seniority: i.seniority,
                        region: region.length ? region : ["Global"],
                        rateAsOf: (snap.asOf || new Date()).toString(),
                        selected: false,
                        weight: 0,
                    };
                });
                setFiatInstruments((prev) => {
                    const byId = new Map(prev.map((p) => [p.id, p]));
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
        const apr = parseFloat(btcPlanner.apr) / 100 || 0;
        const principal = parseFloat(btcPlanner.principal) || 0;
        const btcPrice = parseFloat(btcPlanner.btcPrice) || 40000;
        const ltv = btcPlanner.ltv / 100;
        const marginCallLtv = btcPlanner.marginCallLtv / 100;
        const liquidationLtv = btcPlanner.liquidationLtv / 100;

        if (totalNeed12m <= 0 || btcPrice <= 0) return null;

        // Monthly targets
        const targetedMonthlyIncome = totalNeed12m / 12;
        const monthlyInterestPayment = principal > 0 ? (principal * apr) / 12 : 0;

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
            monthlyInterestPayment,
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

    // Fiat Income Planner calculations
    const calculateFiatPlanner = () => {
        const targetMonthly = parseFloat(fiatPlanner.targetMonthlyIncome) || 0;
        const targetAnnual = parseFloat(fiatPlanner.targetAnnualIncome) || 0;
        const targetAnnualIncome = targetAnnual > 0 ? targetAnnual : targetMonthly * 12;
        const horizon = fiatPlanner.horizon || 12;

        if (targetAnnualIncome <= 0) return null;

        // Get selected instruments
        const selected = fiatInstruments.filter(instr => instr.selected);
        const totalWeight = selected.reduce((sum, instr) => sum + (instr.weight || 0), 0);

        if (selected.length === 0 || totalWeight !== 100) return null;

        // Calculate portfolio APY range
        const portfolioApyMin = selected.reduce((sum, instr) => 
            sum + ((instr.weight / 100) * (instr.apyMin || 0)), 0);
        const portfolioApyMax = selected.reduce((sum, instr) => 
            sum + ((instr.weight / 100) * (instr.apyMax || 0)), 0);

        // Calculate required capital
        const requiredCapitalMin = targetAnnualIncome / (portfolioApyMin / 100);
        const requiredCapitalMax = targetAnnualIncome / (portfolioApyMax / 100);

        // Calculate expected income if capital provided
        const availableCapital = parseFloat(fiatPlanner.availableCapital) || 0;
        const expectedIncomeMin = availableCapital > 0 ? (availableCapital * portfolioApyMin / 100) : null;
        const expectedIncomeMax = availableCapital > 0 ? (availableCapital * portfolioApyMax / 100) : null;

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
            if (!instr.region.includes(fiatPlanner.region)) {
                warnings.push({ type: "eligibility", severity: "red", message: `${instr.name}: not available in ${fiatPlanner.region}` });
            }
        });

        const hasRedWarnings = warnings.some(w => w.severity === "red");

        const rateAsOf = selected.length
            ? selected.reduce((latest, instr) => {
                const t = instr.rateAsOf ? new Date(instr.rateAsOf).getTime() : 0;
                return t > latest ? t : latest;
            }, 0)
            : null;

        return {
            targetAnnualIncome,
            targetMonthlyIncome: targetAnnualIncome / 12,
            portfolioApyMin,
            portfolioApyMax,
            requiredCapitalMin,
            requiredCapitalMax,
            expectedIncomeMin,
            expectedIncomeMax,
            warnings,
            hasRedWarnings,
            selected,
            rateAsOf: rateAsOf ? new Date(rateAsOf).toISOString() : new Date().toISOString(),
        };
    };

    const fiatResults = calculateFiatPlanner();

    const handleFiatPlannerChange = (field, value) => {
        setFiatPlanner(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear annual if monthly is set and vice versa
        if (field === "targetMonthlyIncome" && value) {
            setFiatPlanner(prev => ({ ...prev, targetAnnualIncome: "" }));
        }
        if (field === "targetAnnualIncome" && value) {
            setFiatPlanner(prev => ({ ...prev, targetMonthlyIncome: "" }));
        }
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

    const applyGuidedAllocation = () => {
        // Simple guided allocation - can be enhanced
        const eligible = fiatInstruments.filter(instr => 
            instr.region.includes(fiatPlanner.region) &&
            (!fiatPlanner.excludeDiscretionary || instr.rateType !== "Discretionary")
        );
        
        if (eligible.length === 0) return;

        const weights = eligible.length === 1 ? [100] : 
                       eligible.length === 2 ? [50, 50] : 
                       [50, 25, 25];

        setFiatInstruments(prev => prev.map((instr, idx) => {
            const eligibleIdx = eligible.findIndex(e => e.id === instr.id);
            if (eligibleIdx >= 0) {
                return { ...instr, selected: true, weight: weights[eligibleIdx] || 0 };
            }
            return { ...instr, selected: false, weight: 0 };
        }));
    };

    // Stablecoin Income Planner calculations
    const calculateStablecoinPlanner = () => {
        const principal = parseFloat(stablecoinPlanner.principal) || 0;
        const horizon = stablecoinPlanner.horizon || 12;
        const targetMonthly = parseFloat(stablecoinPlanner.targetMonthlyIncome) || 0;

        if (principal <= 0) return null;

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
                                    <p className="text-xs text-slate-500 mt-1">Principal + Total Interest</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Interest Rate (APR %)
                                    </label>
                                    <input
                                        type="number"
                                        value={btcPlanner.apr}
                                        onChange={(e) => handleBtcPlannerChange("apr", e.target.value)}
                                        placeholder="9"
                                        step="0.1"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Principal (USD) <span className="text-slate-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={btcPlanner.principal}
                                        onChange={(e) => handleBtcPlannerChange("principal", e.target.value)}
                                        placeholder="12000"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f49d1d] focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        BTC Spot Price (USD)
                                    </label>
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
                                        {btcPlanner.principal > 0 && (
                                            <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                                <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Monthly Interest Payment</p>
                                                <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                    ${btcResults.monthlyInterestPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        )}
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
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Inputs</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Target Monthly Income (USD)
                                    </label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.targetMonthlyIncome}
                                        onChange={(e) => handleFiatPlannerChange("targetMonthlyIncome", e.target.value)}
                                        placeholder="500"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Target Annual Income (USD) <span className="text-slate-400 font-normal">(alternative)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.targetAnnualIncome}
                                        onChange={(e) => handleFiatPlannerChange("targetAnnualIncome", e.target.value)}
                                        placeholder="6000"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Horizon (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={fiatPlanner.horizon}
                                        onChange={(e) => handleFiatPlannerChange("horizon", parseInt(e.target.value) || 12)}
                                        placeholder="12"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Region
                                    </label>
                                    <select
                                        value={fiatPlanner.region}
                                        onChange={(e) => handleFiatPlannerChange("region", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
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
                                        value={fiatPlanner.liquidityPreference}
                                        onChange={(e) => handleFiatPlannerChange("liquidityPreference", e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    >
                                        <option value="On-demand">On-demand</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Termed">Termed</option>
                                        <option value="Market-traded">Market-traded</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                        Mode
                                    </label>
                                    <div className="flex gap-2">
                                        <button
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
                                {fiatPlanner.mode === "Guided" && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                            Risk Posture
                                        </label>
                                        <select
                                            value={fiatPlanner.riskPosture}
                                            onChange={(e) => handleFiatPlannerChange("riskPosture", e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white"
                                        >
                                            <option value="Conservative">Conservative</option>
                                            <option value="Balanced">Balanced</option>
                                            <option value="Aggressive">Aggressive</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="excludeDiscretionary"
                                        checked={fiatPlanner.excludeDiscretionary}
                                        onChange={(e) => handleFiatPlannerChange("excludeDiscretionary", e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="excludeDiscretionary" className="text-sm text-slate-700 dark:text-slate-700">
                                        Exclude discretionary-rate products
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Instrument Selection */}
                        {fiatPlanner.mode === "Custom" && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Select Instruments</h4>
                                {fiatInstrumentsLoading ? (
                                    <p className="text-slate-500 py-4">Loading instruments…</p>
                                ) : (
                                <div className="space-y-3">
                                    {fiatInstruments.map((instr) => (
                                        <div key={instr.id} className="border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={instr.selected}
                                                    onChange={() => handleInstrumentToggle(instr.id)}
                                                    className="mt-1 w-4 h-4"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <h5 className="font-semibold text-slate-900 dark:text-slate-900">{instr.name}</h5>
                                                            <p className="text-xs text-slate-600 dark:text-slate-600">{instr.issuer} • {instr.type}</p>
                                                        </div>
                                                        {instr.selected && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={instr.weight}
                                                                    onChange={(e) => handleWeightChange(instr.id, e.target.value)}
                                                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-sm font-bold text-slate-900"
                                                                />
                                                                <span className="text-sm text-slate-600">%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-600">
                                                        <div>
                                                            <span className="font-medium">APY:</span> {instr.apyMin != null && instr.apyMax != null ? `${instr.apyMin}% - ${instr.apyMax}%` : (instr.rateType || "—")}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Type:</span> {instr.rateType}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Liquidity:</span> {instr.liquidity}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Seniority:</span> {instr.seniority}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-sm text-slate-600 dark:text-slate-600 mt-2">
                                        Total Weight: {fiatInstruments.filter(i => i.selected).reduce((sum, i) => sum + (i.weight || 0), 0).toFixed(1)}%
                                    </div>
                                </div>
                                )}
                            </div>
                        )}

                        {/* Risk & Warnings Panel */}
                        {fiatResults && fiatResults.warnings.length > 0 && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="text-amber-600" size={20} />
                                    Risk & Warnings
                                </h4>
                                <div className="space-y-2">
                                    {fiatResults.warnings.map((warning, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border ${
                                                warning.severity === "red"
                                                    ? "bg-red-50 border-red-200 text-red-900"
                                                    : "bg-amber-50 border-amber-200 text-amber-900"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={16} />
                                                <span className="text-sm font-medium">{warning.message}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Red Risk Acknowledgement Gate */}
                        {fiatResults && fiatResults.hasRedWarnings && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-red-200 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-red-900 mb-2">Red Risk Acknowledgement Required</h4>
                                        <p className="text-sm text-red-700 mb-4">
                                            Your portfolio contains high-risk elements. Please acknowledge the risks before viewing results.
                                        </p>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={redRiskAcknowledged}
                                                onChange={(e) => setRedRiskAcknowledged(e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-red-900 font-medium">
                                                I acknowledge the risks and understand that these are estimates only
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results - Only shown if no red warnings or acknowledged */}
                        {fiatResults && (!fiatResults.hasRedWarnings || redRiskAcknowledged) && (
                            <>
                                {/* Allocation Summary */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Allocation Summary</h4>
                                    <div className="space-y-3">
                                        {fiatResults.selected.map((instr, idx) => (
                                            <div key={idx} className="border-b border-slate-100 pb-3 last:border-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div>
                                                        <span className="font-semibold text-slate-900 dark:text-slate-900">{instr.name}</span>
                                                        <span className="text-sm text-slate-600 dark:text-slate-600 ml-2">{instr.weight}%</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {instr.rateType} • {instr.liquidity} • {instr.seniority}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    APY: {instr.apyMin != null && instr.apyMax != null ? `${instr.apyMin}% - ${instr.apyMax}%` : (instr.rateType || "—")} • Payment: {instr.paymentFreq}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="text-xs text-slate-500 mt-4">
                                            Rate as of: {new Date(fiatResults.rateAsOf).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Portfolio APY & Required Capital */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Portfolio Analysis</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Portfolio APY Range</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                {fiatResults.portfolioApyMin.toFixed(2)}% - {fiatResults.portfolioApyMax.toFixed(2)}%
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">As of: {new Date(fiatResults.rateAsOf).toLocaleDateString()}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Required Capital (Min APY)</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                ${fiatResults.requiredCapitalMin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Conservative estimate</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Required Capital (Max APY)</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                ${fiatResults.requiredCapitalMax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Optimistic estimate</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Optional: Expected Income if Capital Provided */}
                                <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                                >
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4">Available Capital Analysis</h4>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-700 mb-2">
                                            Available Capital (USD) <span className="text-slate-400 font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={fiatPlanner.availableCapital}
                                            onChange={(e) => handleFiatPlannerChange("availableCapital", e.target.value)}
                                            placeholder="100000"
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                        />
                                    </div>
                                    {fiatResults.expectedIncomeMin && (
                                        <div className="bg-slate-50 dark:bg-slate-50 rounded-lg p-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-600 mb-1">Expected Annual Income Range</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-slate-900">
                                                ${fiatResults.expectedIncomeMin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ${fiatResults.expectedIncomeMax.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

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
                                        Principal (USD)
                                    </label>
                                    <input
                                        type="number"
                                        value={stablecoinPlanner.principal}
                                        onChange={(e) => handleStablecoinPlannerChange("principal", e.target.value)}
                                        placeholder="100000"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-900 bg-white dark:bg-white text-lg font-extrabold"
                                    />
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
                                                            <span className="font-medium">APY:</span> {instr.apyMin != null && instr.apyMax != null ? `${instr.apyMin}% - ${instr.apyMax}%` : (instr.rateType || "—")}
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

                        {/* Risk & Warnings Panel */}
                        {stablecoinResults && stablecoinResults.warnings.length > 0 && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-slate-200/30 dark:border-slate-800/30 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="text-amber-600" size={20} />
                                    Risk & Warnings
                                </h4>
                                <div className="space-y-2">
                                    {stablecoinResults.warnings.map((warning, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border ${
                                                warning.severity === "red"
                                                    ? "bg-red-50 border-red-200 text-red-900"
                                                    : "bg-amber-50 border-amber-200 text-amber-900"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={16} />
                                                <span className="text-sm font-medium">{warning.message}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Red Risk Acknowledgement Gate */}
                        {stablecoinResults && stablecoinResults.hasRedWarnings && (
                            <div className="bg-white dark:bg-white rounded-2xl border border-red-200 p-6 md:p-8"
                                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.025), 0 2px 4px -2px rgba(0, 0, 0, 0.025)' }}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-red-900 mb-2">Red Risk Acknowledgement Required</h4>
                                        <p className="text-sm text-red-700 mb-4">
                                            Your portfolio contains high-risk elements. Please acknowledge the risks before viewing results.
                                        </p>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={stablecoinRedRiskAcknowledged}
                                                onChange={(e) => setStablecoinRedRiskAcknowledged(e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm text-red-900 font-medium">
                                                I acknowledge the risks and understand that these are estimates only
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results - Only shown if no red warnings or acknowledged */}
                        {stablecoinResults && (!stablecoinResults.hasRedWarnings || stablecoinRedRiskAcknowledged) && (
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
                                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-700">{instr.apyMin != null && instr.apyMax != null ? `${instr.apyMin}% - ${instr.apyMax}%` : (instr.rateType || "—")}</td>
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
