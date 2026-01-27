import { CheckIcon } from "lucide-react";

export const pricingData = [
    {
        title: "FREE",
        price: 0,
        features: [
            { name: "Run scenarios (1A / 1B / 1C): 1 saved scenario", icon: CheckIcon },
            { name: "Risk overview: Basic warnings only", icon: CheckIcon },
            { name: "Yield Board access: Preview (limited rows)", icon: CheckIcon },
            { name: "Filters & sorting: Limited", icon: CheckIcon },
            { name: "Instrument detail pages: Basic view", icon: CheckIcon },
        ],
        buttonText: "Start Free",
    },
    {
        title: "PRO",
        price: 39,
        priceAnnual: 360,
        mostPopular: true,
        features: [
            { name: "Run scenarios (1A / 1B / 1C): Unlimited scenarios", icon: CheckIcon },
            { name: "Risk overview: Full risk analysis", icon: CheckIcon },
            { name: "Yield Board access: Full Yield Board", icon: CheckIcon },
            { name: "Filters & sorting: Full filters", icon: CheckIcon },
            { name: "Compare mode (Frame 9)", icon: CheckIcon },
            { name: "Instrument detail pages: Full detail", icon: CheckIcon },
            { name: "Suitability PDF (Frame 11)", icon: CheckIcon },
            { name: "Alerts & monitoring", icon: CheckIcon },
            { name: "Save & export", icon: CheckIcon },
        ],
        buttonText: "Unlock Full Access",
    },
];
