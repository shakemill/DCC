"use client"

export default function DisclosuresPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Disclosures & <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Methodology</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-12">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Platform Disclosures</h2>
            <div className="bg-slate-50 dark:bg-slate-50 border-l-4 border-[#f49d1d] p-6 mb-6">
              <p className="text-slate-800 dark:text-slate-800 font-semibold mb-2">
                Digital Credit Compass is an educational analysis platform only.
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-700">
                <li>No advice. No custody. No transactions.</li>
                <li>We do not hold, manage, or control any user assets.</li>
                <li>We do not execute trades or facilitate transactions.</li>
                <li>We do not provide investment recommendations.</li>
                <li>All calculations and analyses are for educational purposes only.</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Risk Scoring Methodology</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Our risk scoring system uses standardized metrics to evaluate Bitcoin-backed income structures. 
              The methodology considers multiple factors:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-6 ml-4">
              <li><strong>Loan-to-Value (LTV) Ratio:</strong> The percentage of collateral value that can be borrowed. Higher LTV ratios indicate higher risk.</li>
              <li><strong>Liquidation Threshold:</strong> The price point at which collateral may be liquidated. Lower thresholds indicate higher risk.</li>
              <li><strong>Platform Risk:</strong> Assessment of counterparty and operational risks associated with lending platforms.</li>
              <li><strong>Market Volatility:</strong> Historical and projected volatility of Bitcoin and related markets.</li>
              <li><strong>Regulatory Environment:</strong> Consideration of applicable regulations and their potential impact.</li>
            </ul>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Risk scores are categorized as:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">Low Risk (0-50%)</h3>
                <p className="text-sm text-green-700">Conservative LTV ratios with significant collateral buffers. Suitable for risk-averse users.</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-bold text-orange-800 mb-2">Medium Risk (51-65%)</h3>
                <p className="text-sm text-orange-700">Moderate LTV ratios with reasonable collateral buffers. Balanced risk-return profile.</p>
              </div>
              <div className="bg-red-50 dark:bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">High Risk (66-100%)</h3>
                <p className="text-sm text-red-700">Aggressive LTV ratios with minimal collateral buffers. High potential for liquidation.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Calculation Methodology</h2>
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-900">Loan-to-Value (LTV) Calculation</h3>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              LTV is calculated as the ratio of the loan amount to the collateral value, expressed as a percentage:
            </p>
            <div className="bg-slate-50 dark:bg-slate-50 p-4 rounded-lg mb-4 font-mono text-sm">
              LTV = (Loan Amount / Collateral Value) × 100%
            </div>

            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-900 mt-6">Required Collateral Calculation</h3>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Required collateral is calculated to account for a 2% buffer above the loan amount to protect against 
              price volatility:
            </p>
            <div className="bg-slate-50 dark:bg-slate-50 p-4 rounded-lg mb-4 font-mono text-sm">
              Required Collateral = (Loan Amount / LTV) × 1.02
            </div>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed text-sm italic">
              Note: The 2% buffer is a standard industry practice but may vary by platform and market conditions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Data Sources and Assumptions</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              <strong>Bitcoin Price Data:</strong> We use publicly available market data for Bitcoin prices. 
              Prices are updated periodically and may not reflect real-time market conditions. Default calculations 
              use a reference price of $40,000 USD, which may differ from current market prices.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              <strong>Yield Rates:</strong> Yield rates displayed on the Yield Board are illustrative and based on 
              publicly available information. Actual rates may vary and are subject to change without notice. 
              Past performance does not guarantee future results.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              <strong>Platform Information:</strong> Information about lending platforms, protocols, and services is 
              gathered from public sources and may not be comprehensive or up-to-date. Users should verify all 
              information independently.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Limitations and Disclaimers</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-600 mb-4 ml-4">
              <li>All calculations are estimates and should not be considered exact or guaranteed.</li>
              <li>Market conditions can change rapidly, affecting the accuracy of any analysis.</li>
              <li>We do not verify the accuracy of data from third-party sources.</li>
              <li>Scenarios and stress tests are hypothetical and may not reflect actual market behavior.</li>
              <li>Regulatory changes may impact the availability or terms of financial products.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Updates to Methodology</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              We may update our methodology, risk scoring algorithms, and calculation methods from time to time. 
              Significant changes will be documented in this section with the date of implementation. Users are 
              encouraged to review this page periodically for updates.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Contact</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              For questions about our methodology or disclosures, please{" "}
              <a href="/contact" className="text-[#f49d1d] hover:underline">contact support</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
