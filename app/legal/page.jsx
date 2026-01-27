"use client"

export default function LegalPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Legal <span className="bg-gradient-to-r from-[#f49d1d] dark:from-[#f5b84d] to-[#e88a0f] dark:to-[#f5a842] bg-clip-text text-transparent">Information</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-12">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Legal Disclaimer</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Digital Credit Compass ("DCC", "we", "us", or "our") is an independent educational analysis platform. 
              The information, tools, and services provided on this platform are for informational and educational 
              purposes only and do not constitute financial, investment, legal, or tax advice.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              DCC does not provide investment advisory services, does not execute transactions, does not hold custody 
              of any assets, and does not make recommendations regarding specific financial products or services. 
              All calculations, simulations, and analyses presented on this platform are illustrative and should not 
              be relied upon as the sole basis for making financial decisions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">No Investment Advice</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              The content on this platform is not intended to be, and should not be construed as, investment advice, 
              a recommendation, or an offer to buy or sell any securities, digital assets, or financial instruments. 
              Past performance is not indicative of future results.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              You should consult with qualified financial, legal, and tax professionals before making any investment 
              decisions. DCC is not registered as an investment adviser, broker-dealer, or financial planner with any 
              regulatory authority.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Risk Disclosure</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              All investments, including Bitcoin and other digital assets, carry inherent risks. The value of 
              investments can fluctuate, and you may lose some or all of your invested capital. Bitcoin and other 
              cryptocurrencies are highly volatile and subject to regulatory changes, technological risks, and market 
              manipulation.
            </p>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              Using Bitcoin as collateral for loans or engaging in yield-generating activities involves significant 
              risks, including but not limited to liquidation risk, counterparty risk, smart contract risk, and 
              regulatory risk. DCC does not guarantee the accuracy of any risk assessments or calculations provided 
              on this platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Limitation of Liability</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              To the fullest extent permitted by law, DCC, its affiliates, officers, directors, employees, and agents 
              shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any 
              loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, 
              or other intangible losses resulting from your use of this platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Jurisdiction</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              This platform is operated from [Your Jurisdiction]. By using this platform, you agree that any disputes 
              arising from or related to your use of DCC shall be governed by the laws of [Your Jurisdiction], without 
              regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-900">Contact</h2>
            <p className="text-slate-700 dark:text-slate-600 mb-4 leading-relaxed">
              If you have any questions about this legal information, please contact us at{" "}
              <a href="/contact" className="text-[#f49d1d] hover:underline">contact support</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
