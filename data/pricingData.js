import { CheckIcon } from "lucide-react";

export const pricingData = [
    {
        title: "FREE",
        price: 0,
        features: [
            { name: "Bitcoin, USD, and Stablecoin income planner", icon: CheckIcon },
            { name: "Save 1 scenario", icon: CheckIcon },
            { name: "Basic risk overview", icon: CheckIcon },
            { name: "Yield Board preview", icon: CheckIcon },
            { name: "Limited filters", icon: CheckIcon },
        ],
        buttonText: "Start Free",
    },
    {
        title: "PRO",
        price: 39,
        priceAnnual: 360,
        mostPopular: true,
        features: [
            { name: "Unlimited income scenarios", icon: CheckIcon },
            { name: "Full risk intelligence", icon: CheckIcon },
            { name: "Full Yield Board access", icon: CheckIcon },
            { name: "Strategy comparison", icon: CheckIcon },
            { name: "Full instrument details", icon: CheckIcon },
            { name: "PDF report export", icon: CheckIcon },
            { name: "Alerts & monitoring", icon: CheckIcon },
        ],
        buttonText: "Unlock Full Access",
    },
];
